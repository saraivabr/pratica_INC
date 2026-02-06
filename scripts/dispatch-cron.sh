#!/bin/bash
# Dispatch Disparos Cron
# Calls the dispatch-disparos endpoint every 30 seconds
# Managed by PM2 as a separate process

SECRET="salva-leads-cron-secret-2025"
URL="http://localhost:3000/api/cron/dispatch-disparos"

while true; do
  RESPONSE=$(curl -s -m 60 -H "x-cron-secret: ${SECRET}" "$URL" 2>/dev/null)

  # Log only if something was processed
  SENT=$(echo "$RESPONSE" | grep -o '"sent":[0-9]*' | head -1 | cut -d: -f2)
  STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -n "$SENT" ] && [ "$SENT" -gt 0 ] 2>/dev/null; then
    echo "[Dispatch] Sent $SENT messages (status: $STATUS)"
  fi

  sleep 30
done
