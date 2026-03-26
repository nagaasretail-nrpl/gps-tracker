#!/bin/bash
# =============================================================================
# NistaGPS — VPS Deployment Script
# Server: 34.133.128.65  |  App dir: /opt/gps-tracker
# =============================================================================
#
# PREREQUISITES (one-time setup on the VPS — do this before first deploy):
#
#   1. Set secrets as persistent environment variables on the VPS:
#
#        ssh user@34.133.128.65
#        echo 'export DATABASE_URL="postgres://user:pass@host/db?sslmode=require"' >> ~/.bashrc
#        echo 'export SESSION_SECRET="<random-32-char-string>"' >> ~/.bashrc
#        echo 'export VAPID_PRIVATE_KEY="<your-vapid-private-key>"' >> ~/.bashrc
#        source ~/.bashrc
#
#      The VAPID private key can be found in your Replit Secrets as VAPID_PRIVATE_KEY.
#
#   2. Ensure the log directory exists:
#        sudo mkdir -p /var/log/gps-tracker
#        sudo chown $USER /var/log/gps-tracker
#
#   3. On the first deploy, start PM2 and save it:
#        cd /opt/gps-tracker
#        pm2 start ecosystem.config.cjs
#        pm2 save
#        pm2 startup   # follow the printed instructions to enable auto-start
#
# USAGE (subsequent deploys):
#
#   Local machine (with SSH access to the VPS):
#     chmod +x scripts/deploy-vps.sh
#     ./scripts/deploy-vps.sh
#
#   Or run directly on the VPS:
#     cd /opt/gps-tracker && bash scripts/deploy-vps.sh --local
#
# =============================================================================

set -euo pipefail

VPS_HOST="34.133.128.65"
VPS_USER="${VPS_USER:-root}"           # override with: VPS_USER=ubuntu ./scripts/deploy-vps.sh
APP_DIR="/opt/gps-tracker"
LOG_DIR="/var/log/gps-tracker"

LOCAL_MODE=false
if [[ "${1:-}" == "--local" ]]; then
  LOCAL_MODE=true
fi

run_remote() {
  # shellcheck disable=SC2029
  ssh "${VPS_USER}@${VPS_HOST}" "$@"
}

deploy() {
  echo "==> [1/5] Pulling latest code..."
  git pull origin main

  echo "==> [2/5] Installing dependencies..."
  source ~/.nvm/nvm.sh
  nvm use 20
  npm install --production=false

  echo "==> [3/5] Building frontend (Vite)..."
  npx vite build

  echo "==> [4/5] Building backend (esbuild)..."
  node_modules/.bin/esbuild server/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outdir=dist

  echo "==> [5/5] Reloading PM2 process (picks up env + new code)..."
  # --update-env re-reads the shell environment so VAPID_PRIVATE_KEY etc. take effect
  pm2 reload ecosystem.config.cjs --update-env

  echo ""
  echo "✓ Deploy complete. PM2 status:"
  pm2 list
}

if $LOCAL_MODE; then
  cd "$APP_DIR"
  deploy
else
  echo "==> Deploying NistaGPS to ${VPS_USER}@${VPS_HOST}:${APP_DIR}"
  run_remote "
    set -euo pipefail
    source ~/.bashrc 2>/dev/null || true
    source ~/.nvm/nvm.sh 2>/dev/null || true
    cd ${APP_DIR}

    echo '==> [1/5] Pulling latest code...'
    git pull origin main

    echo '==> [2/5] Installing dependencies...'
    nvm use 20
    npm install --production=false

    echo '==> [3/5] Building frontend (Vite)...'
    npx vite build

    echo '==> [4/5] Building backend (esbuild)...'
    node_modules/.bin/esbuild server/index.ts \
      --platform=node \
      --packages=external \
      --bundle \
      --format=esm \
      --outdir=dist

    echo '==> [5/5] Reloading PM2...'
    pm2 reload ${APP_DIR}/ecosystem.config.cjs --update-env

    echo ''
    echo '✓ Deploy complete. PM2 status:'
    pm2 list
  "
fi
