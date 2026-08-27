#!/bin/sh
set -e

echo "> applying database migrations"
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "> seeding baseline data"
  node apps/api/dist/database/seed.js
fi

echo "> starting api"
exec node apps/api/dist/main.js
