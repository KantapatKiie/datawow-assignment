# Free Concert Ticket

A small booking system for free concerts. Attendees browse what is on and hold one seat per
concert; administrators publish listings and watch every reservation as it happens.

Monorepo: **Next.js 15** (App Router) on the front, **NestJS 11** + **PostgreSQL 16** behind it,
both containerised.

---

## Table of contents

- [Running it](#running-it)
- [Demo accounts](#demo-accounts)
- [Architecture](#architecture)
- [Data model and the booking rules](#data-model-and-the-booking-rules)
- [API](#api)
- [Tests](#tests)
- [Libraries](#libraries)
- [Branching policy](#branching-policy)
- [Bonus tasks](#bonus-tasks)

---

## Running it

### With Docker (the intended path)

```bash
cp .env.example .env
docker compose up --build -d
```

That is the whole setup. Compose starts Postgres, waits for it to accept queries, then the API
container applies the migrations, seeds the two demo accounts plus three concerts, and starts
serving. The web container waits for the API healthcheck before it comes up.

| Service     | URL                              |
| ----------- | -------------------------------- |
| Web         | http://localhost:3000            |
| API         | http://localhost:4000/api        |
| Swagger     | http://localhost:4000/api/docs   |
| Postgres    | localhost:5432                   |

```bash
docker compose logs -f api web   # follow logs
docker compose down              # stop
docker compose down -v           # stop and wipe the database volume
```

### Without Docker

Node 20.9+ and a reachable Postgres are required.

```bash
npm install
docker compose up -d postgres          # or point DATABASE_URL at your own instance
npm run db:migrate                     # applies prisma migrations
npm run db:seed                        # demo accounts + concerts
npm run dev                            # api on :4000, web on :3000
```

### Environment

Every variable is documented in [.env.example](.env.example). The ones that matter:

| Variable              | Purpose                                                        |
| --------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`        | Postgres connection string                                      |
| `JWT_SECRET`          | Signing secret. **Change it outside local development.**        |
| `JWT_EXPIRES_IN`      | Token lifetime, default `1d`                                    |
| `CORS_ORIGIN`         | Comma-separated list of allowed origins                         |
| `API_URL`             | Where the Next.js server reaches the API                        |
| `AUTH_COOKIE_SECURE`  | `true` behind HTTPS                                             |
| `THROTTLE_LIMIT`      | Global requests/minute per IP, default 240                      |
| `AUTH_THROTTLE_LIMIT` | Login and register attempts/minute per IP, default 20           |

---

## Demo accounts

| Role  | Email               | Password    |
| ----- | ------------------- | ----------- |
| Admin | `admin@datawow.io`  | `Admin@1234` |
| User  | `user@datawow.io`   | `User@1234`  |

Anyone registering through the UI gets the `USER` role. The role is never read from the request
body, so the endpoint cannot be used to mint an admin.

---

## Architecture

```
apps/
  api/                     NestJS
    prisma/                schema + versioned migrations
    src/
      auth/                JWT strategy, login/register, token issuing
      users/               user lookups
      concerts/            listing, creation, soft delete, dashboard totals
      reservations/        reserve / cancel / history, the concurrency-critical path
      common/              guards, decorators, exception filter, pagination
      config/              typed env access
      database/seed.ts     idempotent seed
    test/k6/               load and race scripts
  web/                     Next.js App Router
    src/app/
      (auth)/              login, register
      (app)/               authenticated shell: concerts, history, admin
      api/                 route handlers: auth cookie exchange + BFF proxy
    src/components/        ui kit, layout shell, feature components
    src/lib/               api clients, session, zod schemas, formatting
    src/middleware.ts      route-level role gate
```

**Layering on the API.** Controllers only bind HTTP to a service call: no query, no branching.
Services own the rules and talk to Prisma. DTOs validate at the boundary with `class-validator`
and a global `ValidationPipe` set to `whitelist` + `forbidNonWhitelisted`, so unknown fields are
rejected rather than silently ignored. One `AllExceptionsFilter` maps everything - including
Prisma error codes - onto a single response shape:

```json
{ "statusCode": 400, "error": "Bad Request", "message": ["name must be at least 3 characters"],
  "path": "/api/concerts", "timestamp": "2026-08-27T09:00:00.000Z" }
```

**Auth.** Login returns a JWT carrying `sub`, `email` and `role`. `JwtAuthGuard` and `RolesGuard`
are registered globally, so a route is private unless it is marked `@Public()`; `@Roles(ADMIN)`
narrows it further. The strategy re-reads the user from the database on every request, so a role
change or a deleted account takes effect immediately instead of at token expiry.

**Where the token lives.** The browser never sees it. `POST /api/auth/login` on the Next side
forwards the credentials, then stores the JWT in an `httpOnly` cookie. Server components attach
it directly; client components call `/api/backend/*`, a thin proxy that turns the cookie into an
`Authorization` header. An XSS bug therefore cannot exfiltrate the token.

**Responsive design.** Layout is Tailwind; anything with state (buttons, fields, the seat meter,
toasts, tables) is hand-written CSS on design tokens in
[globals.css](apps/web/src/app/globals.css). One breakpoint set: cards go 1 → 2 → 3 columns, the
sidebar collapses into a drawer under `lg`, and the history table turns into stacked label/value
rows under 640px so nothing scrolls sideways on a phone.

---

## Data model and the booking rules

```
users ──< reservations >── concerts
  └────< reservation_events >──┘
```

- **`concerts.reserved_seats`** is a denormalised counter. It makes availability an O(1) read and,
  more importantly, lets a seat be claimed in a single statement.
- **`reservations`** holds current state: one active row per user per concert.
- **`reservation_events`** is an append-only log of every reserve and cancel. The audit trail and
  the personal history read from it, so they stay complete after a cancellation.
- Concerts are **soft-deleted** (`deleted_at`), so the audit trail never points at a missing row.

Two guarantees live in the database itself, not just in application code
([migration](apps/api/prisma/migrations/20260827085500_booking_constraints/migration.sql)):

```sql
CREATE UNIQUE INDEX reservations_one_active_per_user_concert
  ON reservations (user_id, concert_id) WHERE status = 'RESERVED';

ALTER TABLE concerts ADD CONSTRAINT concerts_reserved_seats_within_capacity
  CHECK (reserved_seats >= 0 AND reserved_seats <= total_seats);
```

The partial index enforces *one seat per user per concert* while still allowing cancel → reserve
again. The check constraint means even a bad release cannot push a concert past capacity.

**Deleting a concert** releases every seat still held for it and writes a `CANCEL` event per
holder, inside one transaction, so the dashboard totals and the users' histories stay honest.

---

## API

All routes are prefixed `/api`. Everything except `/health`, `/auth/login` and `/auth/register`
requires a bearer token.

| Method   | Route                  | Role  | Notes                                        |
| -------- | ---------------------- | ----- | -------------------------------------------- |
| `POST`   | `/auth/register`       | -     | Always creates a `USER`                      |
| `POST`   | `/auth/login`          | -     | Returns `{ accessToken, user }`              |
| `GET`    | `/auth/me`             | any   | Profile behind the current token             |
| `GET`    | `/concerts`            | any   | Paginated, includes sold-out concerts        |
| `GET`    | `/concerts/:id`        | any   |                                              |
| `GET`    | `/concerts/stats`      | ADMIN | Seats / reserved / cancelled totals          |
| `POST`   | `/concerts`            | ADMIN | Create a listing                             |
| `DELETE` | `/concerts/:id`        | ADMIN | Soft delete, releases held seats             |
| `POST`   | `/reservations`        | USER  | Reserve one seat                             |
| `DELETE` | `/reservations/:id`    | USER  | Cancel your own reservation                  |
| `GET`    | `/reservations/me`     | USER  | Your own history                             |
| `GET`    | `/reservations`        | ADMIN | Audit trail across all users                 |
| `GET`    | `/health`              | -     | Liveness + database probe                    |

Interactive docs: <http://localhost:4000/api/docs>.

Notable responses: `400` on validation failure, `401` without a valid token, `403` for the wrong
role, `409` for a duplicate seat or a full concert, `429` when rate limited.

---

## Tests

```bash
npm test                 # API unit tests (jest)
npm run test:web         # web unit + component tests (vitest)
npm run lint             # eslint across both workspaces
npm run typecheck        # tsc --noEmit across both workspaces
```

**API - 38 unit tests.** Services are tested against a mocked Prisma client, so the edge cases
run fast and deterministically: booking a concert that just filled up, the same user racing
themselves into a duplicate, cancelling twice, a `USER` reaching an `ADMIN` endpoint, deleting a
concert that still has seats held, and the unique-index violation being translated into a `409`
rather than a `500`.

**Web - 38 tests.** Zod schemas, token decoding (expired, malformed, missing claims), error
mapping, and the concert card itself: sold-out disables booking, a lost race shows the API
message and re-fetches, and holding a seat swaps Reserve for Cancel.

### Load and race tests (k6)

[k6](https://k6.io) scripts live in [apps/api/test/k6](apps/api/test/k6).

```bash
npm run k6:smoke    # happy path + rejection paths, for CI
npm run k6:race     # the overbooking scenario
npm run k6:load     # ramping read load on the listing endpoint
```

The rate limiter sees one IP for the whole run, so open it up first:

```bash
THROTTLE_LIMIT=1000000 AUTH_THROTTLE_LIMIT=100000 docker compose up -d api
k6 run -e SEATS=10 -e USERS=1000 apps/api/test/k6/booking-race.js
```

`booking-race.js` provisions the users, points all of them at one small concert at the same
moment, and fails the run unless `seats_reserved == SEATS` and `overbooked_seats == 0`. Measured
result at 200 users / 10 seats: 10 reserved, 190 rejected with `409`, `reserved=10 capacity=10`,
no `5xx`.

---

## Libraries

**API**

| Package                                  | Why                                                   |
| ---------------------------------------- | ----------------------------------------------------- |
| `@nestjs/core`, `common`, `platform-express` | Framework and DI                                   |
| `@nestjs/config`                         | Typed environment access                              |
| `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` | JWT issuing and verification                 |
| `@nestjs/swagger`                        | OpenAPI docs from the decorators already present      |
| `@nestjs/throttler`                      | Rate limiting, tighter on the auth routes             |
| `prisma`, `@prisma/client`               | Typed data access and versioned migrations            |
| `class-validator`, `class-transformer`   | Request validation and transformation at the boundary |
| `bcryptjs`                               | Password hashing without a native build step          |
| `helmet`                                 | Standard security headers                             |
| `jest`, `ts-jest`                        | Unit tests                                            |

**Web**

| Package                    | Why                                                          |
| -------------------------- | ------------------------------------------------------------ |
| `next`, `react`            | App Router, server components, route handlers                 |
| `tailwindcss` v4           | Layout utilities on top of hand-written component CSS         |
| `zod`                      | Client-side mirror of the server validation rules             |
| `lucide-react`             | Icon set                                                      |
| `clsx`, `tailwind-merge`   | Conditional class names without duplicate utilities           |
| `vitest`, `@testing-library/react` | Unit and component tests                              |

---

## Branching policy

`main`, `develop`, `uat`, `production` and `release/*`, described in
[docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md). Operational procedures - deploys, rollbacks, common
failures - are in [docs/RUNBOOK.md](docs/RUNBOOK.md).

---

## Bonus tasks

### 1. Performance, once the dataset is large and traffic is heavy

The listing page is read-dominated and the same for everybody, so the work is mostly about not
recomputing or re-fetching what has not changed.

**Indexing and query shape first.** Cheapest wins before any infrastructure. The listing filters
on `deleted_at IS NULL` and sorts by `created_at`, which is why the composite index
`(deleted_at, created_at)` exists. Reservation lookups are covered by `(user_id, status)` and
`(concert_id, status)`. Availability is already denormalised onto `concerts.reserved_seats`, so
the list never counts rows in a subquery - that single decision is what stops the listing
degrading as reservations grow. Offset pagination is fine at this size; past roughly a hundred
thousand rows I would move the history tables to keyset pagination
(`WHERE created_at < :cursor ORDER BY created_at DESC LIMIT n`) because `OFFSET` has to walk
every skipped row.

**Caching, in layers.**

- *HTTP / CDN.* Static assets and the landing page are immutable per build and belong on a CDN.
- *Application cache.* Put the concert listing and the admin totals in Redis with a short TTL
  (15-30s), keyed by page and role, and invalidate on create/delete/reserve/cancel. Reads then
  stop touching Postgres almost entirely. The dashboard totals are the best candidate: three
  aggregates recomputed on every dashboard load today.
- *Next.js.* Swap `force-dynamic` on the listing for a revalidating fetch plus
  `revalidateTag('concerts')` on mutation, so the rendered payload is reused across users.

**Do not cache the seat count on the write path.** Availability shown in a list can be a few
seconds stale - the reserve call re-checks it atomically anyway - but the reservation itself must
always read the live row.

**Then the boring infrastructure work:** a read replica for listing and history queries while
writes stay on the primary; PgBouncer, since each API instance holds a pool and Postgres does not
enjoy thousands of connections; horizontal scaling of the stateless API behind a load balancer
(there is no in-process state, so this is free); and the audit trail partitioned by month once it
gets big, so old partitions can be dropped or archived instead of vacuumed.

**Measure before and after.** `EXPLAIN ANALYZE` on the top queries, `pg_stat_statements` for the
real hot list, and the k6 scripts in this repo as the before/after harness.

### 2. Concurrency: 1,000 users going for the last 10 seats

**The rule: never read a count and then write based on it.** A `SELECT count(*)` followed by an
`INSERT` is two statements with a gap in between, and under load a thousand requests all read
"9 taken" before any of them writes. Every fix is a variation on closing that gap.

**What this project does.** The check and the increment are the same statement:

```sql
UPDATE concerts
SET reserved_seats = reserved_seats + 1
WHERE id = $1 AND deleted_at IS NULL AND reserved_seats < total_seats;
```

Postgres takes a row lock on that concert for the duration of the statement, so the thousand
requests are serialised on it. Each either updates one row - it got a seat - or updates zero
rows, which means capacity was already reached and the transaction rolls back with `409 Conflict`.
There is no window in which two requests can both believe seat 10 is free. This is pessimistic
locking, expressed as a conditional update rather than an explicit `SELECT ... FOR UPDATE`; same
guarantee, one round trip instead of two.

The statement runs inside a transaction together with the `reservations` insert and the audit
event, so a failure anywhere gives the seat straight back.

**The second race is the same user, not different users.** Someone double-clicking Reserve, or a
retrying client, sends two requests that both pass the "do you already hold a seat" check. The
partial unique index catches that at the database level: the loser gets a unique violation, which
is translated into `409` instead of leaking as a `500`.

**Why not the alternatives.**

- *Optimistic locking* (a `version` column, retry on mismatch) works, but with a thousand writers
  on one row nearly every attempt collides and the retry storm is worse than just queueing on the
  lock.
- *`SERIALIZABLE` isolation* is correct but pushes the failure into serialisation errors the
  application has to retry, for no gain over a conditional update on a single row.
- *A message queue* (push every request, one consumer per concert allocates seats) is the right
  answer at ticketing-platform scale, because it also absorbs the traffic spike and lets you show
  a queue position. It costs asynchronous booking - the user no longer gets a yes or no in the
  response - so it is not worth it here.
- *Application-level locks or a mutex in Node* would break the moment a second API instance
  starts. The invariant has to live where the data lives.

**Belt and braces.** The `CHECK (reserved_seats <= total_seats)` constraint means that even if
someone later writes a code path that bypasses the conditional update, the database refuses the
write rather than quietly overbooking.

**Verified, not asserted.** [`booking-race.js`](apps/api/test/k6/booking-race.js) runs this exact
scenario and fails the build unless the final row reads `reserved_seats == total_seats` with zero
surplus.
