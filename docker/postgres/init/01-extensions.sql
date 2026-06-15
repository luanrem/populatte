-- Runs once on first boot of an empty data volume (docker-entrypoint-initdb.d).
-- pgcrypto is not strictly required on Postgres 16 (gen_random_uuid() is in
-- core), but creating it explicitly keeps the local image reproducible and
-- aligned with managed providers where the function may live in pgcrypto.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
