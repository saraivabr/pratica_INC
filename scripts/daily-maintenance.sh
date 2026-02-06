#!/bin/bash
# Daily Maintenance Cron
# Runs: contact sync + batch AI analysis for new conversations
# Schedule: daily at 3:30 AM via crontab
#
# crontab entry:
# 30 3 * * * /var/www/pratica/scripts/daily-maintenance.sh >> /var/log/pratica/maintenance.log 2>&1

cd /var/www/pratica

echo "====================================="
echo "[$(date)] Starting daily maintenance"
echo "====================================="

# 1. Sync contacts (names + profile pictures from Evolution API)
echo ""
echo "[$(date)] Step 1: Syncing contacts..."
npx tsx scripts/sync-contacts.ts 2>&1

# 2. AI analysis for conversations without analysis
echo ""
echo "[$(date)] Step 2: Running AI analysis on new conversations..."
npx tsx scripts/batch-ai-analysis.ts 2>&1

echo ""
echo "[$(date)] Daily maintenance complete"
echo "====================================="
