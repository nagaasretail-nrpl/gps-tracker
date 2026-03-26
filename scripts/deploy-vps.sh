#!/bin/bash
# =============================================================================
# NistaGPS — VPS Deployment Script
# Server: 34.133.128.65  |  App dir: /opt/gps-tracker
# =============================================================================
#
# PREREQUISITES (one-time setup on the VPS — do this before first deploy):
#
#   1. Set secrets as persistent system environment variables on the VPS:
#
#      Recommended (survives reboots, PM2 startup systemd service picks it up):
#        sudo -e /etc/environment
#        # Add the following lines (no "export", just KEY=VALUE):
#        DATABASE_URL="postgres://user:pass@host/db?sslmode=require"
#        SESSION_SECRET="<random-32-char-string>"
#        VAPID_PRIVATE_KEY="<your-vapid-private-key>"
#
#      Alternative (current user shell only — may not persist through reboots):
#        echo 'export VAPID_PRIVATE_KEY="<your-vapid-private-key>"' >> ~/.bashrc
#        source ~/.bashrc
#
#      The VAPID_PRIVATE_KEY value is in your Replit project's Secrets.
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

  echo ""
  echo "==> Verifying VAPID_PRIVATE_KEY is set in PM2 process environment..."
  PROC_ID=$(pm2 id gps-tracker 2>/dev/null | tr -d '[],' | awk '{print $1}' | head -1)
  if [ -n "$PROC_ID" ]; then
    if pm2 env "$PROC_ID" 2>/dev/null | grep -q "VAPID_PRIVATE_KEY"; then
      VAPID_VAL=$(pm2 env "$PROC_ID" 2>/dev/null | grep "VAPID_PRIVATE_KEY" | awk '{print $NF}')
      if [ -z "$VAPID_VAL" ] || [ "$VAPID_VAL" = '""' ] || [ "$VAPID_VAL" = "''" ]; then
        echo "WARNING: VAPID_PRIVATE_KEY is empty in PM2 env. Push notifications will be disabled."
        echo "         Set it via /etc/environment or ~/.bashrc and re-run with --update-env."
      else
        echo "✓ VAPID_PRIVATE_KEY is set (non-empty). Push notifications will be active."
      fi
    else
      echo "WARNING: VAPID_PRIVATE_KEY not found in PM2 env for process ${PROC_ID}."
    fi
  fi
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

    echo ''
    echo '==> Verifying VAPID_PRIVATE_KEY is set in PM2 process environment...'
    PROC_ID=\$(pm2 id gps-tracker 2>/dev/null | tr -d '[],' | awk '{print \$1}' | head -1)
    if [ -n \"\$PROC_ID\" ]; then
      VAPID_VAL=\$(pm2 env \"\$PROC_ID\" 2>/dev/null | grep VAPID_PRIVATE_KEY | awk '{print \$NF}')
      if [ -z \"\$VAPID_VAL\" ] || [ \"\$VAPID_VAL\" = '\"\"' ]; then
        echo 'WARNING: VAPID_PRIVATE_KEY is empty. Push notifications will be disabled.'
        echo '         Add it to /etc/environment and re-run: pm2 reload ecosystem.config.cjs --update-env'
      else
        echo '✓ VAPID_PRIVATE_KEY is set. Push notifications will be active.'
      fi
    fi
  "
fi
