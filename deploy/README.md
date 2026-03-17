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
  │     ├── Express HTTP API + React frontend (static files)
  │     └── GT06N binary TCP server (port 5023, bypasses nginx)
  └── Nginx (port 80 → proxies to 5000, WebSocket support)

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

Go to **Networking → Virtual Cloud Networks → your VCN → Security Lists → Default Security List → Add Ingress Rules**:

| Protocol | Port  | Description       |
|----------|-------|-------------------|
| TCP      | 22    | SSH               |
| TCP      | 80    | HTTP (web app)    |
| TCP      | 443   | HTTPS (optional)  |
| TCP      | 5023  | GT06N GPS tracker |

> **Important:** Oracle Cloud has TWO firewalls — the Security List above AND the VM's internal `iptables`/UFW. The setup script handles UFW for you.

---

## Step 2 — SSH into the VPS

```bash
ssh ubuntu@<your-vps-ip>
```

---

## Step 3 — Clone the repo and run the one-time setup script

```bash
# Clone into /opt/gps-tracker (this is where everything lives)
sudo git clone https://github.com/<your-username>/<your-repo>.git /opt/gps-tracker
sudo chown -R ubuntu:ubuntu /opt/gps-tracker

# Run the setup script once — installs Node.js 20, PM2, nginx, UFW
sudo bash /opt/gps-tracker/deploy/setup.sh
```

---

## Step 4 — Deploy the application

```bash
export DATABASE_URL="postgresql://..."     # Your Neon PostgreSQL connection string
export SESSION_SECRET="any-long-random-string-here"   # Skip to auto-generate one

bash /opt/gps-tracker/deploy/deploy.sh
```

The script will:
1. Pull the latest code (or clone if not already present)
2. Install npm dependencies
3. Build the frontend and backend
4. Write `/opt/gps-tracker/.env` with your credentials
5. Start the app with PM2 and save the process list
6. Print a `sudo` command to run for reboot persistence (copy-paste it!)

> **Reboot persistence:** After deploy.sh finishes it prints something like:
> ```
> sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
> ```
> Run that command once with `sudo`, then run `pm2 save`. PM2 will then restart automatically after a VPS reboot.

---

## Step 5 — Configure nginx

```bash
sudo bash /opt/gps-tracker/deploy/nginx-install.sh
```

Your web app is now live at: **`http://<your-vps-ip>`**

---

## Step 6 — Health check

Run these to confirm everything is up:

```bash
# PM2 process status (should show gps-tracker as "online")
pm2 status

# Confirm both ports are listening
ss -ltnp | grep -E '5000|5023'

# Quick HTTP ping (should return 200)
curl -o /dev/null -s -w "%{http_code}\n" http://localhost:5000/

# Live application logs
pm2 logs gps-tracker
```

---

## Step 7 — Point your GT06N device at the VPS

Send these SMS messages **one at a time** to your GT06N's SIM:

```
SERVER,1,<your-vps-ip>,5023#
```

Wait ~10 seconds, then:

```
RESET#
```

The device reboots, reconnects on port 5023, and starts sending location data. You should see it go **online** on the map in seconds. Confirm by watching logs:

```bash
pm2 logs gps-tracker
```

Expected output:
```
[GT06] New connection from <device-ip>:...
[GT06] Login from IMEI: 353701090621364
[GT06] Matched vehicle: TN37DF3970
[GT06] Location 353701090621364: lat=..., lng=..., speed=... km/h
```

---

## Step 8 (Optional) — Add HTTPS with a free SSL certificate

If you have a domain name pointing to your VPS IP:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Then enable secure cookies so login sessions work properly over HTTPS:

```bash
nano /opt/gps-tracker/.env
# Change:  COOKIE_SECURE=false
# To:      COOKIE_SECURE=true
pm2 restart gps-tracker
```

---

## Useful commands

```bash
# View live logs
pm2 logs gps-tracker

# Restart the app (e.g. after editing .env)
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

## Environment Variables Reference

| Variable         | Required | Description                                                              |
|------------------|----------|--------------------------------------------------------------------------|
| `DATABASE_URL`   | Yes      | Neon PostgreSQL connection string                                        |
| `SESSION_SECRET` | Yes      | Random secret for session encryption                                     |
| `GT06_PORT`      | No       | GT06N TCP port (default: `5023`)                                         |
| `PORT`           | No       | HTTP server port (default: `5000`)                                       |
| `COOKIE_SECURE`  | No       | `false` for HTTP-only VPS; `true` after HTTPS/certbot is set up         |
| `NODE_ENV`       | No       | Set to `production` by deploy.sh — enables static file serving           |

---

## Troubleshooting

**Device not connecting / no login in logs:**
- Check Oracle Security List has TCP port 5023 open
- Run `sudo ufw status` on VPS — port 5023 should show ALLOW
- Re-send `SERVER,1,<ip>,5023#` then `RESET#` to the device

**Web app not loading:**
- Run `pm2 status` — gps-tracker should show `online`
- Run `ss -ltnp | grep 5000` — port 5000 should be listening
- Run `sudo nginx -t` — nginx config should say "ok"
- Run `sudo systemctl status nginx` — nginx should be active

**Cannot login / "session not saved" after login:**
- If using HTTP (no SSL), ensure `/opt/gps-tracker/.env` has `COOKIE_SECURE=false`
- After adding HTTPS, change `COOKIE_SECURE=true` and `pm2 restart gps-tracker`

**App doesn't restart after VPS reboot:**
- Run the `sudo env PATH=...` command printed by deploy.sh
- Then run `pm2 save`
- Verify with `sudo systemctl status pm2-ubuntu` (or `pm2-$USER`)
