#!/bin/bash
# cleanup-media.sh — Remove old WhatsApp media files to prevent disk bloat
# Runs daily via crontab: 0 4 * * *

MEDIA_DIR="/var/www/pratica/public/media/whatsapp"
LOG_PREFIX="[MediaCleanup]"

echo "$LOG_PREFIX Starting at $(date)"

# Remove media files older than 90 days
if [ -d "$MEDIA_DIR" ]; then
  count=$(find "$MEDIA_DIR" -type f -mtime +90 | wc -l)
  if [ "$count" -gt 0 ]; then
    find "$MEDIA_DIR" -type f -mtime +90 -delete
    echo "$LOG_PREFIX Removed $count files older than 90 days"
  else
    echo "$LOG_PREFIX No files older than 90 days"
  fi

  # Remove empty directories
  find "$MEDIA_DIR" -type d -empty -delete 2>/dev/null

  # Remove upload temp files older than 24h
  UPLOAD_DIR="$MEDIA_DIR/uploads"
  if [ -d "$UPLOAD_DIR" ]; then
    tmp_count=$(find "$UPLOAD_DIR" -type f -mtime +1 | wc -l)
    if [ "$tmp_count" -gt 0 ]; then
      find "$UPLOAD_DIR" -type f -mtime +1 -delete
      echo "$LOG_PREFIX Removed $tmp_count temp upload files"
    fi
  fi
else
  echo "$LOG_PREFIX Media directory does not exist: $MEDIA_DIR"
fi

echo "$LOG_PREFIX Done at $(date)"
