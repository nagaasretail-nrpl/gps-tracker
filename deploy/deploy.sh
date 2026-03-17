#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GPS Fleet Tracker — Deploy Script
# Run this to deploy or update the app on your VPS.
#
# Usage (first time):
#   bash /opt/gps-tracker/deploy/deploy.sh
#
# Usage (update to latest code):
#   bash /opt/gps-tracker/deploy/deploy.sh
#
# Required environment variables (you will be prompted if not set):
#   DATABASE_URL    - Neon PostgreSQL connection string
#   SESSION_SECRET  - Random secret for session encryption (any long string)
#
# Optional:
#   REPO_URL        - Git repo URL (prompt if /opt/gps-tracker is not already cloned)
#   GT06_PORT       - Port for GT06N TCP server (default: 5023)
#   PORT            - Port for HTTP server (default: 5000)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

APP_DIR="/opt/gps-tracker"
REPO_URL="${REPO_URL:-}"
GT06_PORT="${GT06_PORT:-5023}"
APP_PORT="${PORT:-5000}"

echo "=== GPS Fleet Tracker — Deploy ==="
echo ""

# ── Collect environment variables ─────────────────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  read -rp "Enter DATABASE_URL (Neon PostgreSQL connection string): " DATABASE_URL
fi
if [ -z "${SESSION_SECRET:-}" ]; then
  echo "Generating a random SESSION_SECRET..."
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo "SESSION_SECRET = $SESSION_SECRET"
  echo "(Save this value — you will need it if you redeploy manually)"
fi

# ── Clone or update the repository ───────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "[1/6] Pulling latest code..."
  git -C "$APP_DIR" pull
else
  if [ -z "$REPO_URL" ]; then
    read -rp "Enter your Git repository URL (e.g. https://github.com/your/repo.git): " REPO_URL
  fi
  echo "[1/6] Cloning repository to $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# ── Install dependencies ──────────────────────────────────────────────────────
echo "[2/6] Installing dependencies..."
npm ci --include=dev

# ── Build the app ─────────────────────────────────────────────────────────────
echo "[3/6] Building application (frontend + backend)..."
npm run build

# ── Write .env file ───────────────────────────────────────────────────────────
echo "[4/6] Writing .env file..."
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$SESSION_SECRET
GT06_PORT=$GT06_PORT
PORT=$APP_PORT
# Set to "false" if you are NOT using HTTPS yet (HTTP-only VPS).
# Change to "true" after setting up SSL with certbot, then: pm2 restart gps-tracker
COOKIE_SECURE=false
EOF
echo ".env written to $APP_DIR/.env"

# ── Copy PM2 ecosystem config and (re)start with PM2 ──────────────────────────
echo "[5/6] Starting application with PM2..."
cp "$APP_DIR/deploy/ecosystem.config.cjs" "$APP_DIR/ecosystem.config.cjs"

# Create log directory PM2 needs
sudo mkdir -p /var/log/gps-tracker
sudo chown -R "$(whoami):$(whoami)" /var/log/gps-tracker 2>/dev/null || true

# Stop existing instance if running
pm2 delete gps-tracker 2>/dev/null || true

# Start fresh
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save

# ── Configure PM2 to start on system reboot ───────────────────────────────────
# pm2 startup generates a system-specific command that must be run as root.
# We print it so the user can copy-paste and run it once.
echo "[6/6] Configuring PM2 to restart on system reboot..."
STARTUP_CMD=$(pm2 startup 2>&1 | grep -E "^\s*sudo" | head -1 | xargs)
if [ -n "$STARTUP_CMD" ]; then
  echo ""
  echo "  ┌─────────────────────────────────────────────────────────────────────"
  echo "  │  ACTION REQUIRED — Run this command to survive reboots:"
  echo "  │"
  echo "  │    $STARTUP_CMD"
  echo "  │"
  echo "  │  Then run:  pm2 save"
  echo "  └─────────────────────────────────────────────────────────────────────"
  echo ""
else
  # Already running as root or pm2 startup output was unexpected; try directly.
  pm2 startup 2>/dev/null && pm2 save || true
fi

VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo '<your-vps-ip>')

echo ""
echo "✅ Deployment complete!"
echo ""
echo "── Health check ─────────────────────────────────────────────────────────"
pm2 status
echo ""
echo "  HTTP server  : $(ss -ltnp 2>/dev/null | grep ":$APP_PORT" | head -1 || echo "(check with: ss -ltnp | grep $APP_PORT)")"
echo "  GT06 TCP     : $(ss -ltnp 2>/dev/null | grep ":$GT06_PORT" | head -1 || echo "(check with: ss -ltnp | grep $GT06_PORT)")"
echo "  API ping     : $(curl -s -o /dev/null -w "%{http_code}" http://localhost:$APP_PORT/ 2>/dev/null || echo "pending") (HTTP status)"
echo ""
echo "── Next steps ───────────────────────────────────────────────────────────"
echo "  Nginx (web proxy) : sudo bash $APP_DIR/deploy/nginx-install.sh"
echo "  Web app URL       : http://$VPS_IP"
echo ""
echo "── Point your GT06N device at this VPS ──────────────────────────────────"
echo "  Send these SMS messages to your device's SIM:"
echo ""
echo "    SERVER,1,$VPS_IP,$GT06_PORT#"
echo "    RESET#"
echo ""
echo "  Then watch the logs:  pm2 logs gps-tracker"
