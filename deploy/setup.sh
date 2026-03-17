#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GPS Fleet Tracker — One-time VPS Setup Script
# Run this ONCE on a fresh Ubuntu 22.04 VPS as root (or with sudo).
#
# Usage:
#   chmod +x setup.sh && sudo bash setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "=== GPS Fleet Tracker — VPS Setup ==="
echo ""

# ── 1. System update ──────────────────────────────────────────────────────────
echo "[1/6] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Node.js 20 (via NodeSource) ───────────────────────────────────────────
echo "[2/6] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
npm --version

# ── 3. PM2 process manager ───────────────────────────────────────────────────
echo "[3/6] Installing PM2..."
npm install -g pm2
pm2 --version

# ── 4. Nginx ─────────────────────────────────────────────────────────────────
echo "[4/6] Installing nginx..."
apt-get install -y nginx
systemctl enable nginx

# ── 5. UFW firewall rules ─────────────────────────────────────────────────────
echo "[5/6] Configuring firewall..."
apt-get install -y ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP'
ufw allow 443/tcp   comment 'HTTPS'
ufw allow 5023/tcp  comment 'GT06N GPS Tracker TCP'
ufw --force enable
ufw status

# ── 6. Create app directory ───────────────────────────────────────────────────
echo "[6/6] Creating app directory..."
mkdir -p /opt/gps-tracker
chown -R "$SUDO_USER:$SUDO_USER" /opt/gps-tracker 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next step: run  bash deploy.sh  to deploy the application."
echo "You will be prompted for DATABASE_URL and SESSION_SECRET."
