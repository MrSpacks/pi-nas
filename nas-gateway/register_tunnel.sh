#!/bin/bash
# Регистрирует текущий URL туннеля cloudflared в Vercel (API сохраняет в KV).
# Запускается после старта cloudflared, когда в логе уже есть URL.

set -e
LOG_FILE="${1:-/var/log/nas-gateway/cloudflared.log}"
VERCEL_REGISTER_URL="${VERCEL_REGISTER_URL}"
REGISTER_SECRET="${NAS_REGISTER_SECRET}"

if [ -z "$VERCEL_REGISTER_URL" ] || [ -z "$REGISTER_SECRET" ]; then
  echo "Set VERCEL_REGISTER_URL and NAS_REGISTER_SECRET (or NAS_REGISTER_SECRET in env)"
  exit 1
fi

# Ждём появления URL в логе (trycloudflare.com)
for i in {1..30}; do
  if [ -f "$LOG_FILE" ]; then
    url=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$LOG_FILE" | tail -1)
    if [ -n "$url" ]; then
      echo "Registering tunnel URL: $url"
      curl -s -X POST "$VERCEL_REGISTER_URL" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$url\",\"secret\":\"$REGISTER_SECRET\"}"
      echo ""
      exit 0
    fi
  fi
  sleep 2
done
echo "Timeout: no tunnel URL found in $LOG_FILE"
exit 1
