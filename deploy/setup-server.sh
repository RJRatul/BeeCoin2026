#!/usr/bin/env bash
# One-time server preparation for a fresh Ubuntu 22.04/24.04 VPS. Run as root:
#   bash deploy/setup-server.sh
set -euo pipefail

echo "==> Updating system packages"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
apt-get install -y curl git nginx ufw ca-certificates

echo "==> Installing Node.js 20 LTS"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v && npm -v

echo "==> Installing PM2 (process manager)"
npm install -g pm2

echo "==> Installing Certbot (free HTTPS certificates)"
apt-get install -y certbot python3-certbot-nginx

echo "==> Adding 2GB swap (Next.js builds need memory on small VPSes)"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Firewall: allow SSH + web only"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Removing nginx default site"
rm -f /etc/nginx/sites-enabled/default
systemctl enable --now nginx

echo
echo "Server ready. Your public IP is: $(curl -s https://api.ipify.org || echo '<check provider dashboard>')"
