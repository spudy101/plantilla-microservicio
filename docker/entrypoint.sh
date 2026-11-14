#!/bin/sh
# IMPORTANTE: guardar con LF (Unix), no CRLF.
#
# 1. (opcional) migraciones del servicio — RUN_MIGRATIONS=true
# 2. (opcional) seeders                — RUN_SEEDS=true
# 3. arranca el servidor (exec → recibe SIGTERM directo)
#
# En AWS las variables llegan como env vars del task de ECS (Secrets Manager →
# "secrets" del task definition), no hace falta leerlas acá.
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ${SERVICE_NAME:-servicio} — iniciando (${NODE_ENV:-development})"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$RUN_MIGRATIONS" = "true" ] && [ -f scripts/ensure-schema.js ]; then
  echo "🗄️  Migraciones..."
  node scripts/ensure-schema.js
  npx --no-install sequelize-cli db:migrate
fi

if [ "$RUN_SEEDS" = "true" ] && [ -d seeders ]; then
  echo "🌱 Seeders..."
  npx --no-install sequelize-cli db:seed:all
fi

exec node src/server.js
