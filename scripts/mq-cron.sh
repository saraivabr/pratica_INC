#!/bin/bash
# Message Queue Processor Cron
# Calls the process-message-queue endpoint every 5 seconds
# Managed by PM2 as a separate process

SECRET="salva-leads-cron-secret-2025"
URL="http://localhost:3000/api/cron/process-message-queue?secret=${SECRET}"

while true; do
  RESPONSE=$(curl -s -m 10 "$URL" 2>/dev/null)
  PROCESSED=$(echo "$RESPONSE" | grep -o '"processed":[0-9]*' | cut -d: -f2)
  if [ -n "$PROCESSED" ] && [ "$PROCESSED" -gt 0 ] 2>/dev/null; then
    echo "[MQ] Processed $PROCESSED items"
  fi
  sleep 5
done
