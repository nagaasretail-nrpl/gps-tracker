#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# GPS Fleet Tracker — Deploy Script
# Run this to deploy or update the app on your VPS.
#
# Usage (first time):
#   bash deploy.sh
#
# Usage (update to latest code):
#   bash deploy.sh
#
# Required environment variables (you will be prompted if not set):
#   DATABASE_URL    - Neon PostgreSQL connection string
#   SESSION_SECRET  - Random secret for session encryption (any long string)
#
# Optional:
#   REPO_URL        - Git repo URL (default: auto-detected from git remote)
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
  echo "(Save this value — you will need it if you redeploy)"
fi

# ── Clone or update the repository ───────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "[1/5] Pulling latest code..."
  git -C "$APP_DIR" pull
else
  if [ -z "$REPO_URL" ]; then
    read -rp "Enter your Git repository URL (e.g. https://github.com/your/repo.git): " REPO_URL
  fi
  echo "[1/5] Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# ── Install dependencies ──────────────────────────────────────────────────────
echo "[2/5] Installing dependencies..."
npm ci --include=dev

# ── Build the app ─────────────────────────────────────────────────────────────
echo "[3/5] Building application (frontend + backend)..."
npm run build

# ── Write .env file ───────────────────────────────────────────────────────────
echo "[4/5] Writing .env file..."
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$SESSION_SECRET
GT06_PORT=$GT06_PORT
PORT=$APP_PORT
# Set to "false" if you are NOT using HTTPS yet (HTTP-only VPS).
# Change to "true" after setting up SSL with certbot.
COOKIE_SECURE=false
EOF

echo ".env written to $APP_DIR/.env"

# ── Copy PM2 ecosystem config and (re)start with PM2 ──────────────────────────
echo "[5/5] Starting application with PM2..."
cp "$APP_DIR/deploy/ecosystem.config.cjs" "$APP_DIR/ecosystem.config.cjs"

# Create log directory
sudo mkdir -p /var/log/gps-tracker
sudo chown -R "$(whoami):$(whoami)" /var/log/gps-tracker 2>/dev/null || true

# Stop existing instance if running
pm2 delete gps-tracker 2>/dev/null || true

# Start fresh
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save

# Ensure PM2 restarts on system boot
pm2 startup | tail -1 | bash || true

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Web app : http://$(curl -s ifconfig.me 2>/dev/null || echo '<your-vps-ip>')"
echo "GT06N   : TCP port $GT06_PORT — send this SMS to your device:"
echo ""
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo '<your-vps-ip>')
echo "  SERVER,1,$VPS_IP,$GT06_PORT#"
echo "  RESET#"
echo ""
echo "Configure nginx: sudo bash $APP_DIR/deploy/nginx-install.sh"
