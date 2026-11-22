#!/usr/bin/env bash
# Pull the latest code from GitHub, rebuild, and restart. Run on the server:
#   bash /var/www/cryptax/deploy/update.sh
set -euo pipefail
cd /var/www/cryptax

git pull

echo "==> Backend"
cd backend
npm ci
npm run build
cd ..

echo "==> Frontend"
cd frontend
npm ci
npm run build
cd ..

pm2 reload ecosystem.config.js
pm2 save
echo "Done. Check: pm2 status"
