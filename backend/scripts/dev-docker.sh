#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
DATABASE_URL="postgresql://postgres:rito@127.0.0.1:5434/rito_dev"
export DATABASE_URL

sh "$SCRIPT_DIR/dev-db.sh" start

echo "Generating Prisma Client"
pnpm exec prisma generate

echo "Applying database migrations"
pnpm exec prisma migrate deploy

echo "Synchronizing the local database with the current Prisma schema"
pnpm exec prisma db push

echo "Starting backend with local Docker PostgreSQL"
exec pnpm dev
