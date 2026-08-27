# Runbook

Operational notes for Free Concert Ticket. Assumes `docker compose` on the target host.

## Services

| Container     | Port | Depends on           | Health                                |
| ------------- | ---- | -------------------- | ------------------------------------- |
| `dw_postgres` | 5432 | -                    | `pg_isready`                          |
| `dw_api`      | 4000 | postgres healthy     | `GET /api/health`                     |
| `dw_web`      | 3000 | api healthy          | `GET /`                               |

The API applies pending migrations on boot, then seeds if `RUN_SEED` is not `false`. The seed is
idempotent (upsert on email, concerts only when the table is empty), so restarts are safe.

## Start, stop, inspect

```bash
docker compose up --build -d          # start everything
docker compose ps                     # status and health
docker compose logs -f api            # follow one service
docker compose restart api            # restart after an env change
docker compose down                   # stop, keep data
docker compose down -v                # stop and delete the database volume
```

## Deploying a new version

```bash
git switch production && git pull
docker compose build
docker compose up -d
docker compose ps                     # wait for api to report healthy
curl -fsS localhost:4000/api/health
```

Migrations run automatically as the API container starts. If one fails the container exits and
the previous web container keeps serving, so a broken migration does not take the site down - it
blocks the deploy instead.

## Rolling back

```bash
git switch production && git reset --hard <previous-tag>
docker compose build && docker compose up -d
```

Rolling *code* back is safe. Rolling a *migration* back is not automatic: Prisma has no down
migrations, so a schema change that has to be reverted needs a new forward migration. That is why
migrations must stay backward compatible for one release - add columns, do not rename or drop
them in the same version that stops using them.

## Common failures

**`dw_api` restarts in a loop.**
`docker compose logs api`. Usually one of:
- `Missing required environment variable: DATABASE_URL` → `.env` was not created; `cp .env.example .env`.
- `Can't reach database server` → Postgres is not healthy yet, or `DATABASE_URL` points at
  `localhost` from inside the container (it must be `postgres:5432`).
- A migration error → fix the migration, rebuild. Do not edit an already-applied migration file.

**Web loads but every page errors.**
The API is unreachable from the web container. Check `API_URL` is `http://api:4000/api` (compose
network name), not `localhost`.

**Everything returns `429`.**
Rate limiting. Defaults are 240 requests/minute per IP and 20 auth attempts/minute. Behind a
proxy every request looks like one IP - set `app.set('trust proxy', 1)` or raise
`THROTTLE_LIMIT`. Raise `AUTH_THROTTLE_LIMIT` before load tests.

**Users report "session expired" straight after signing in.**
`AUTH_COOKIE_SECURE=true` while serving over plain HTTP: the browser drops the cookie. Either
terminate TLS or set it to `false`.

**Seat counts look wrong.**
The counter and the reservation rows should always agree. To check:

```sql
SELECT c.id, c.name, c.reserved_seats,
       (SELECT count(*) FROM reservations r
         WHERE r.concert_id = c.id AND r.status = 'RESERVED') AS actual
FROM concerts c
WHERE c.deleted_at IS NULL;
```

Any row where `reserved_seats <> actual` means something wrote outside the transactional path.
Repair with an `UPDATE ... SET reserved_seats = actual`, then find the code path that did it.
The `CHECK (reserved_seats <= total_seats)` constraint makes overbooking impossible, so the
worst case is an undercount, never a sold seat that does not exist.

## Database

```bash
# shell
docker compose exec postgres psql -U postgres -d concert

# backup
docker compose exec -T postgres pg_dump -U postgres concert | gzip > backup-$(date +%F).sql.gz

# restore
gunzip -c backup-2026-08-27.sql.gz | docker compose exec -T postgres psql -U postgres -d concert

# migration status
npm run prisma:deploy --workspace=api   # apply pending
docker compose exec api npx prisma migrate status --schema apps/api/prisma/schema.prisma
```

## Smoke test after a deploy

```bash
curl -fsS localhost:4000/api/health
k6 run apps/api/test/k6/smoke.js
```

The smoke script covers login, listing, reserving, the duplicate-seat rejection, the role check
and cancellation. It exits non-zero on any failed check, so it can gate the deploy.

## Secrets

`JWT_SECRET` must be a long random string in anything but local development. Rotating it
invalidates every issued token, so users are signed out - schedule it. Seed passwords
(`SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD`) are for demo data only and should be changed or the
seed disabled with `RUN_SEED=false` outside development.
