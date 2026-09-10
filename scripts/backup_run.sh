#!/bin/bash
# Nightly AIMS backup: mongo dump + uploaded documents to /home/aims/backups, keep 7 days
set -u
cd /home/aims/aims-backend-node.js
node /home/aims/scripts/backup_dump.js >> /home/aims/backups/backup.log 2>&1
tar -czf /home/aims/backups/uploads-$(date +%F).tar.gz -C /home/aims uploads 2>> /home/aims/backups/backup.log
echo "$(date "+%F %T") uploads archive: $(du -h /home/aims/backups/uploads-$(date +%F).tar.gz | cut -f1)" >> /home/aims/backups/backup.log
find /home/aims/backups -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null
find /home/aims/backups -maxdepth 1 -name "uploads-*.tar.gz" -mtime +7 -delete
