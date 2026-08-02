#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Only push the DB schema when a database is actually configured (Postgres
# migration is optional; the app also runs fully file-based under DATA_DIR).
if [ -n "${DATABASE_URL:-}" ]; then
  pnpm --filter db push
else
  echo "DATABASE_URL not set; skipping DB schema push (running file-based)."
fi
