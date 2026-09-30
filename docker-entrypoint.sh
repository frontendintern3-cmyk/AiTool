#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy --schema=prisma-postgres/schema.prisma

echo "Starting app..."
exec "$@"
