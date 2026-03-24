#!/bin/sh
set -e

echo "[startup] Running Prisma migrations..."
npx prisma migrate deploy

echo "[startup] Initializing database (if needed)..."
node prisma/init.js

echo "[startup] Starting server..."
exec node dist/server.js
