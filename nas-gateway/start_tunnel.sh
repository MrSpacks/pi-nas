#!/bin/bash
# Запуск cloudflared с логированием в файл; после появления URL — регистрация в Vercel.
# Использование: VERCEL_REGISTER_URL=... NAS_REGISTER_SECRET=... ./start_tunnel.sh

LOG_DIR="${LOG_DIR:-/var/log/nas-gateway}"
LOG_FILE="$LOG_DIR/cloudflared.log"
mkdir -p "$LOG_DIR"

# Запуск cloudflared в фоне с выводом в лог
cloudflared tunnel --url http://127.0.0.1:8080 2>&1 | tee "$LOG_FILE" &
CF_PID=$!

# Даём время на вывод URL
sleep 8
# Регистрация (скрипт ищет URL в логе)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export VERCEL_REGISTER_URL REGISTER_SECRET="${NAS_REGISTER_SECRET}"
"$SCRIPT_DIR/register_tunnel.sh" "$LOG_FILE" || true

wait $CF_PID
