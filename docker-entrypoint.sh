#!/bin/sh
set -e

echo "Recovering any failed initial migrations..."
./node_modules/.bin/prisma migrate resolve --rolled-back 00000000000000_init --schema=prisma/schema.prisma 2>/dev/null || true

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma

echo "Starting app..."
exec "$@"
