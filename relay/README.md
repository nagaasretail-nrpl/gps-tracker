# GT06N TCP Relay

Accepts GT06N binary TCP connections and forwards location data to the GPS Fleet Tracker app via HTTP.

**Why is this needed?**  
Replit production deployments only expose HTTPS (port 443). The GT06N tracker requires a raw TCP port (typically 5023). This lightweight relay bridges the gap — it runs on any free VPS or PaaS that supports TCP, and forwards parsed location data to the Replit app's HTTP endpoint.

## Architecture

```
GT06N Device  ──TCP:5023──▶  Relay Server  ──HTTPS──▶  GPS Fleet Tracker (Replit)
(binary GT06 protocol)        (Railway/Fly.io)           (/api/device/location)
```

## Deploy on Railway.app (Free — 5 min setup)

1. **Create a new GitHub repo** called `gt06n-relay` and upload these files:
   - `index.js`
   - `package.json`
   - `Dockerfile`
   - `railway.toml`

2. **Go to [railway.app](https://railway.app)** → New Project → Deploy from GitHub → select your relay repo

3. **Set environment variables** in Railway's project Settings → Variables:
   ```
   TARGET_URL = https://gp-sserver-mobile-clone.replit.app
   PORT       = 5023
   ```

4. **Expose the TCP port**: In Railway, go to Settings → Networking → Add a TCP Proxy on port 5023.
   Railway will give you a hostname like `viaduct.railway.app` and a random public port, e.g. `12345`.

5. **Send this SMS to your GT06N** (replace with your Railway hostname and port):
   ```
   SERVER,1,viaduct.railway.app,12345#
   ```

6. **Register your vehicle** in the GPS Fleet Tracker with the GT06N's IMEI as the Device ID.

## Deploy on Fly.io (Alternative)

```bash
cd relay
fly launch   # follow prompts, choose a region close to you
fly scale count 1
fly env set TARGET_URL=https://gp-sserver-mobile-clone.replit.app
```

Then allocate a dedicated IP for raw TCP:
```bash
fly ips allocate-v4
```

## Environment Variables

| Variable     | Required | Description |
|--------------|----------|-------------|
| `TARGET_URL` | Yes      | Full URL of your Replit app |
| `PORT`       | No       | TCP port to listen on (default: 5023) |

## Supported GT06 Packets

| Protocol | Type | Handled |
|----------|------|---------|
| 0x01 | Login (IMEI) | Decoded, ACKed |
| 0x12 | GPS Location | Parsed, forwarded to Fleet Tracker |
| 0x13 | Heartbeat | ACKed |
| 0x16 | Alarm | ACKed |
