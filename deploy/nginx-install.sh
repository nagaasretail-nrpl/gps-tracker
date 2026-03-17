#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GPS Fleet Tracker — Nginx Configuration Installer
# Run after deploy.sh to configure nginx as a reverse proxy.
#
# Usage:
#   sudo bash nginx-install.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP_PORT="${PORT:-5000}"
NGINX_CONF="/etc/nginx/sites-available/gps-tracker"

echo "Installing nginx configuration..."

# Substitute the app port into the template
sed "s|__APP_PORT__|$APP_PORT|g" /opt/gps-tracker/deploy/nginx.conf > "$NGINX_CONF"

# Enable the site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/gps-tracker

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl reload nginx

VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo '<your-vps-ip>')
echo ""
echo "✅ Nginx configured!"
echo "Web app: http://$VPS_IP"
echo ""
echo "To add HTTPS (free SSL certificate):"
echo "  sudo apt-get install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d yourdomain.com"
echo ""
echo "After HTTPS is set up, edit /opt/gps-tracker/.env and set:"
echo "  COOKIE_SECURE=true"
echo "Then restart: pm2 restart gps-tracker"
