# GPS Fleet Tracker — VPS Deployment Guide

Deploy the full GPS tracking server on an Oracle Cloud free VPS so your GT06N device connects **directly** on TCP port 5023 — no relay, no middleman, permanently stable.

---

## Architecture (after this setup)

```
GT06N Device
    │  Raw TCP binary on port 5023
    ▼
Oracle VPS (your static IP)
  ├── Node.js app (port 5000)
  │     ├── Express HTTP API
  │     ├── GT06N binary TCP server (port 5023)
  │     └── Serves React frontend (static files)
  └── Nginx (port 80 → proxies to 5000)
         ↕ WebSocket support for live tracking
Your Browser → http://<vps-ip>  or  https://yourdomain.com
```

---

## Step 1 — Create Oracle Cloud Free VM (10 min)

1. Sign up at **[cloud.oracle.com](https://cloud.oracle.com)** (free forever, credit card for verification only)
2. Go to **Compute → Instances → Create Instance**
3. Settings:
   - **Image**: Ubuntu 22.04 (Canonical)
   - **Shape**: VM.Standard.E2.1.Micro (Always Free)
   - **SSH keys**: Upload your public key (or generate one in the console)
4. Click **Create** — note the **Public IP address**

### Open firewall ports in Oracle's Security List

Go to **Networking → Virtual Cloud Networks → your VCN → Security Lists → Default Security List** and add **Ingress Rules**:

| Protocol | Port  | Description       |
|----------|-------|-------------------|
| TCP      | 22    | SSH               |
| TCP      | 80    | HTTP (web app)    |
| TCP      | 443   | HTTPS (optional)  |
| TCP      | 5023  | GT06N GPS tracker |

> **Important:** Oracle Cloud has TWO firewalls — the Security List above AND the VM's internal `iptables`. The setup script handles `iptables`/UFW for you.

---

## Step 2 — SSH into the VPS

```bash
ssh ubuntu@<your-vps-ip>
```

---

## Step 3 — Run the setup script (once only)

This installs Node.js 20, PM2, nginx, and opens the firewall:

```bash
# Download setup script from your repo
curl -o setup.sh https://raw.githubusercontent.com/<your-username>/<your-repo>/main/deploy/setup.sh
chmod +x setup.sh
sudo bash setup.sh
```

Or if you clone the repo first:
```bash
git clone https://github.com/<your-username>/<your-repo>.git /opt/gps-tracker
sudo bash /opt/gps-tracker/deploy/setup.sh
```

---

## Step 4 — Deploy the application

```bash
export DATABASE_URL="postgresql://..."     # Your Neon PostgreSQL connection string
export SESSION_SECRET="any-long-random-string-here"
export REPO_URL="https://github.com/<your-username>/<your-repo>.git"

bash /opt/gps-tracker/deploy/deploy.sh
```

The script will:
- Clone/pull your repository
- Install dependencies
- Build the frontend and backend
- Write a `.env` file with your credentials
- Start the app with PM2 (auto-restarts on crash or reboot)

---

## Step 5 — Configure nginx

```bash
sudo bash /opt/gps-tracker/deploy/nginx-install.sh
```

Your web app is now live at: **`http://<your-vps-ip>`**

---

## Step 6 — Point your GT06N device at the VPS

Send these SMS messages **one at a time** to your GT06N's SIM:

```
SERVER,1,<your-vps-ip>,5023#
```
Wait 10 seconds, then:
```
RESET#
```

The device will reboot, reconnect to your VPS on port 5023, and start sending live location data immediately. You will see the vehicle go **online** on the map.

To confirm the device connected, check the server logs:
```bash
pm2 logs gps-tracker
```
You should see:
```
[GT06] New connection from <device-ip>:...
[GT06] Login from IMEI: 353701090621364
[GT06] Matched vehicle: TN37DF3970
[GT06] Location 353701090621364: lat=..., lng=..., speed=... km/h
```

---

## Useful commands

```bash
# View live logs
pm2 logs gps-tracker

# Restart the app
pm2 restart gps-tracker

# Check app status
pm2 status

# Update to latest code
cd /opt/gps-tracker && git pull && npm ci && npm run build && pm2 restart gps-tracker

# Edit environment variables
nano /opt/gps-tracker/.env
pm2 restart gps-tracker   # apply changes
```

---

## Step 7 (Optional) — Add HTTPS with a free SSL certificate

If you have a domain name pointing to your VPS IP:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Then enable secure cookies:
```bash
nano /opt/gps-tracker/.env
# Change:  COOKIE_SECURE=false
# To:      COOKIE_SECURE=true
pm2 restart gps-tracker
```

---

## Environment Variables Reference

| Variable         | Required | Description                                      |
|------------------|----------|--------------------------------------------------|
| `DATABASE_URL`   | Yes      | Neon PostgreSQL connection string                |
| `SESSION_SECRET` | Yes      | Random secret for session encryption             |
| `GT06_PORT`      | No       | GT06N TCP port (default: `5023`)                 |
| `PORT`           | No       | HTTP server port (default: `5000`)               |
| `COOKIE_SECURE`  | No       | Set `false` for HTTP, `true` after HTTPS is set up |
| `NODE_ENV`       | No       | Set to `production` by deploy.sh automatically   |

---

## Troubleshooting

**Device not connecting:**
- Check Oracle Security List has port 5023 open
- Run `sudo ufw status` on VPS — port 5023 should show ALLOW
- Run `pm2 logs gps-tracker` and re-send `SERVER` and `RESET` SMS to device

**Web app not loading:**
- Run `pm2 status` — gps-tracker should show `online`
- Run `sudo nginx -t` — nginx config should be valid
- Run `sudo systemctl status nginx` — nginx should be active

**Cannot login / session not persisting:**
- If using HTTP (no SSL), ensure `.env` has `COOKIE_SECURE=false`
- After adding HTTPS, change `COOKIE_SECURE=true` and `pm2 restart gps-tracker`
