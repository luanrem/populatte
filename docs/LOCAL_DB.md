# Local Database (Docker) — POP-6

Populatte uses **PostgreSQL** as its only database. The application is driven
**solely by `DATABASE_URL`** — switching between a local Docker Postgres and the
production Supabase instance requires changing that one variable and nothing
else (no code changes, no rebuild). Auth is handled by Clerk and is independent
of the database.

- **Development:** local Postgres in Docker (this document).
- **Production:** Supabase (cloud Postgres).

## Prerequisites

- Docker + Docker Compose v2 (`docker compose version`).

## Quick start

From the **repo root**:

```bash
# 1. Start the local Postgres (detached). Healthy when pg_isready passes.
npm run db:up

# 2. Point the API at the local DB.
#    In apps/api/.env set:
#    DATABASE_URL=postgresql://populatte:populatte@localhost:5432/populatte
#    (copy apps/api/.env.example if you don't have one yet)

# 3. Apply the schema to the empty local DB (creates all tables + enums).
npm run db:push:local

# 4. Run the API.
cd apps/api && npm run start:dev
```

> **Why `db:push` and not `db:migrate` for the local bootstrap?** See
> [Bootstrap vs. migrations](#bootstrap-db-push-vs-migrations-db-migrate) below.
> Short version: `db:push` materializes the current schema state directly and is
> the reliable way to provision a fresh, empty database.

Open `http://localhost:3000/projects` logged in via Clerk → should return data
(200) instead of the 503 you get when the Supabase pooler is paused.

## Convenience scripts (repo root `package.json`)

| Script | What it does |
| --- | --- |
| `npm run db:up` | `docker compose up -d db` — start local Postgres |
| `npm run db:down` | `docker compose down` — stop containers (volume kept) |
| `npm run db:logs` | `docker compose logs -f db` — tail DB logs |
| `npm run db:reset` | `docker compose down -v && up -d db` — **drops the volume** (wipes all local data) and recreates a fresh DB |
| `npm run db:push:local` | `drizzle-kit push --force` against the local DB — materializes the current schema state. **Use this to provision a fresh local DB.** |
| `npm run db:migrate:local` | `drizzle-kit migrate` against the local DB — runs versioned migrations (see caveat below) |

> Both `:local` scripts export `DATABASE_URL` inline. `drizzle-kit` loads
> `apps/api/.env` via dotenv, which does **not** override an already-set
> variable — so the inline local URL always wins. This lets you target the local
> DB even while `apps/api/.env` is pointed at Supabase.

## Configuration

The Compose service reads dev defaults that can be overridden via a root `.env`
(copy from `.env.example`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `POSTGRES_USER` | `populatte` | DB user |
| `POSTGRES_PASSWORD` | `populatte` | DB password (dev only) |
| `POSTGRES_DB` | `populatte` | Database name |
| `DB_PORT` | `5432` | Host port (container always listens on 5432) |

Data persists in the named volume `populatte_pgdata`. SQL in
`docker/postgres/init/` runs **once** on first boot of an empty volume (and
again after `db:reset`).

## Switching local ↔ Supabase

There is **one** switch: `DATABASE_URL` in `apps/api/.env`.

```dotenv
# Local (Docker)
DATABASE_URL=postgresql://populatte:populatte@localhost:5432/populatte

# Production (Supabase) — comment out the local line and use:
# DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Restart the API after changing it. No other change is needed — `DrizzleService`
builds its `pg` Pool straight from `DATABASE_URL`.

## Resetting the local DB

```bash
npm run db:reset       # drops volume, recreates empty DB, re-runs init SQL
npm run db:push:local  # re-apply schema to the fresh DB
```

## Seeding test data

Projects are scoped to a Clerk-synced user (FK `projects.user_id → users.id`),
so the cleanest seed is through the real flow:

1. Sign in to the web app via Clerk — the Clerk webhook upserts your `users` row.
2. Create a project from the dashboard UI.

If you need a quick standalone project row without the UI, insert a user first:

```bash
docker compose exec db psql -U populatte -d populatte -c "
  INSERT INTO users (clerk_id, email, source)
  VALUES ('local_dev_user', 'dev@populatte.local', 'manual')
  ON CONFLICT (clerk_id) DO NOTHING;
  INSERT INTO projects (user_id, name, description)
  SELECT id, 'Local Test Project', 'Seeded for local dev'
  FROM users WHERE clerk_id = 'local_dev_user';
"
```

> Note: a manually seeded user won't match your real Clerk identity, so its
> projects won't show in the UI until the Clerk webhook creates your actual
> user. Prefer the UI path for end-to-end testing.

## Bootstrap (db:push) vs. migrations (db:migrate)

These are two different tools and both have a place here:

- **`db:push`** diffs the Drizzle schema against the live DB and applies the
  difference directly. It creates each type/table in its final state (e.g. an
  enum is created with *all* its values at once). It is the reliable way to
  provision a **fresh, empty** database — which is exactly the local-dev case.
- **`db:migrate`** replays the committed SQL files in `apps/api/drizzle/` in
  order, inside a **single transaction for the whole run**
  (`drizzle-orm` wraps the migration loop in one `tx`).

### Why a from-scratch `db:migrate` does not work for this repo

Migration `0003_ancient_trish_tilby.sql` does, in one file:

```sql
ALTER TYPE "public"."row_status" ADD VALUE 'DRAFT' BEFORE 'VALID';
ALTER TABLE "ingestion_rows" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
```

PostgreSQL forbids **using** a newly added enum value in the same transaction
that added it (`unsafe use of new value "DRAFT"`). Because Drizzle runs the
entire migration run in one transaction, replaying the full history from an
empty DB fails on this file. This is a pre-existing property of the migration
history (the cloud DB was originally provisioned with `db:push`, not `migrate`),
**not** something introduced by the local-DB setup.

**Consequence:** use `db:push:local` to provision a fresh local DB. `db:migrate`
still works for *incremental* changes applied to an already-provisioned DB
(local or Supabase), as long as a single migration run does not both add and use
an enum value.

## Ongoing schema-change workflow

Schema definitions live in
`apps/api/src/infrastructure/database/drizzle/schema/`. Recommended flow:

1. **Author** the change in the schema files.
2. **Apply locally** to iterate quickly:
   ```bash
   npm run db:push:local   # from repo root
   ```
3. **Generate** a versioned migration so the change is reproducible and
   deployable (from `apps/api/`):
   ```bash
   cd apps/api && npm run db:generate
   ```
   ⚠️ If the change adds an **enum value and uses it** (e.g. as a default),
   split it across **two separate `db:migrate` runs** (add the value, deploy,
   then use it) — otherwise the migration cannot be applied in one transaction.
4. **Commit** the generated SQL + `meta/` files — they are the source of truth.
5. **Deploy to Supabase:** point `DATABASE_URL` at the Supabase connection
   string and run `npm run db:migrate` from `apps/api/`. Supabase is already
   provisioned, so incremental migrations apply cleanly and keep cloud in sync.

## Troubleshooting

### `role "populatte" does not exist` on migrate/push

This means a **different Postgres** is already listening on the host port and the
client connected to it instead of the container. Common cause: a native
(Homebrew/Postgres.app) instance bound to `localhost:5432`.

Check what owns the port:

```bash
lsof -nP -iTCP:5432 -sTCP:LISTEN
```

Fix by running the container on a free port and pointing the API at it — no
code changes, just configuration:

```bash
# Root .env (copy from .env.example) or inline:
DB_PORT=5433 npm run db:up
# apps/api/.env:
DATABASE_URL=postgresql://populatte:populatte@localhost:5433/populatte
```

(Or stop the conflicting native Postgres and keep the default `5432`.)

### Connection refused

The container may still be starting. Confirm health before connecting:

```bash
docker compose ps          # STATUS should say (healthy)
npm run db:logs            # inspect startup logs
```

## Verifying the schema

```bash
docker compose exec db psql -U populatte -d populatte -c '\dt'   # tables
docker compose exec db psql -U populatte -d populatte -c '\dT'   # enum types
```

Expected tables: `users`, `projects`, `ingestion_batches`, `ingestion_rows`,
`mappings`, `steps`, `extension_codes`, plus the drizzle migrations bookkeeping
table. Expected enums: `project_status`, `batch_status`, `batch_mode`,
`row_status`, `fill_status`, `success_trigger`, `step_action`.
