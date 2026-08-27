# Branching policy

Long-lived branches map to environments; everything else is short-lived and deleted after merge.

```
feature/*  ─┐
bugfix/*   ─┼─▶ develop ──▶ release/x.y.z ──▶ uat ──▶ main ──▶ production
             │                    │                    ▲
hotfix/*  ───┴────────────────────┴────────────────────┘
```

## Long-lived branches

| Branch       | Environment | Who writes to it              | Protection                                  |
| ------------ | ----------- | ----------------------------- | ------------------------------------------- |
| `develop`    | dev         | merges from `feature/*`       | PR + green CI                               |
| `release/*`  | staging     | cut from `develop`            | PR, only fixes for that release             |
| `uat`        | UAT         | merges from `release/*`       | PR + CI + one approval                      |
| `main`       | pre-prod    | merges from `uat`, `hotfix/*` | PR + CI + one approval, linear history      |
| `production` | production  | fast-forward from `main`      | PR + CI + two approvals, deploy on tag only |

`main` is the source of truth: whatever it points at has passed UAT. `production` only ever moves
forward to a commit that already exists on `main`, so the two never diverge.

## Short-lived branches

| Prefix      | Cut from | Merges into            | For                                       |
| ----------- | -------- | ---------------------- | ----------------------------------------- |
| `feature/*` | develop  | develop                | new work                                  |
| `bugfix/*`  | develop  | develop                | defects found before a release is cut     |
| `release/*` | develop  | uat, then main         | stabilising a version                     |
| `hotfix/*`  | main     | main **and** develop   | production is broken and cannot wait      |

Name them `feature/<ticket>-<slug>`, e.g. `feature/DW-42-reservation-cancel`.

## The normal flow

```bash
git switch develop && git pull
git switch -c feature/DW-42-reservation-cancel
# ... commits ...
git push -u origin feature/DW-42-reservation-cancel
# open a PR into develop, merge when CI is green
```

## Cutting a release

```bash
git switch develop && git pull
git switch -c release/1.2.0
# only stabilisation commits from here: no new features
git push -u origin release/1.2.0
```

PR `release/1.2.0` → `uat`. Once UAT signs off, PR `release/1.2.0` → `main`, tag it, then
fast-forward `production`:

```bash
git switch main && git pull
git tag -a v1.2.0 -m "Release 1.2.0" && git push origin v1.2.0
git switch production && git merge --ff-only main && git push
```

Merge `main` back into `develop` afterwards so the release commits are not orphaned.

## Hotfix

```bash
git switch main && git pull
git switch -c hotfix/DW-99-booking-500
# fix + test
```

PR into `main`, tag a patch version, fast-forward `production`, then **also** merge into
`develop` (and any open `release/*`) so the fix is not lost at the next release.

## Rules

1. Never commit directly to `develop`, `uat`, `main` or `production`.
2. A PR needs green CI: `lint`, `typecheck`, `test`, `build`.
3. Squash-merge into `develop`; merge commits into `uat` / `main` / `production` so the
   environment history stays readable.
4. Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `perf:`.
5. Delete the branch after merge.
6. Database migrations go out with the release that needs them and must be backward compatible
   for one version, so a rollback does not strand the schema.
