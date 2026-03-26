/**
 * PM2 Ecosystem Config — NistaGPS (gps-tracker)
 *
 * Usage on the VPS:
 *   pm2 start ecosystem.config.cjs
 *   pm2 reload ecosystem.config.cjs --update-env   # to apply env changes
 *   pm2 save                                        # persist across reboots
 *   pm2 startup                                     # enable auto-start
 *
 * SECRETS (never commit real values here — set them directly on the VPS):
 *   DATABASE_URL      — set as a system env var in /etc/environment or ~/.bashrc
 *   SESSION_SECRET    — set as a system env var in /etc/environment or ~/.bashrc
 *   VAPID_PRIVATE_KEY — set as a system env var in /etc/environment or ~/.bashrc
 *
 * Quick one-liner to set a system env var persistently (then re-login or source):
 *   echo 'export VAPID_PRIVATE_KEY="<your-key>"' >> ~/.bashrc && source ~/.bashrc
 *   pm2 reload ecosystem.config.cjs --update-env
 *
 * PM2 inherits the process's environment, so any var exported before `pm2 start`
 * (or set in /etc/environment) will be available inside the app.
 */

module.exports = {
  apps: [
    {
      name: "gps-tracker",
      script: "dist/index.js",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",

      env: {
        NODE_ENV: "production",
        PORT: "5000",
        GT06_PORT: "5023",
        COOKIE_SECURE: "true",

        // VAPID public key — safe to commit, used by the frontend subscription flow
        VAPID_PUBLIC_KEY: "BNLm4iaibNIMx49PfmWQKtW79kS43pqavN4jZrWNOKTQIdI_C6GpiLM2gURN4_CBLrtF4j48tOYRhMPEYtMejj8",
        VAPID_EMAIL: "mailto:admin@nistagps.com",

        // ── SECRETS ── Do NOT put real values here. Set these as persistent
        //              system environment variables on the VPS instead:
        //
        //   Recommended (survives reboots reliably, PM2 startup picks it up):
        //     sudo -e /etc/environment
        //     Add lines:
        //       DATABASE_URL="postgres://..."
        //       SESSION_SECRET="<random-32-char-string>"
        //       VAPID_PRIVATE_KEY="<your-vapid-private-key>"
        //
        //   Alternative (for the current shell / ~/.bashrc):
        //     echo 'export VAPID_PRIVATE_KEY="<value>"' >> ~/.bashrc
        //     source ~/.bashrc
        //
        //   After setting secrets, apply them to the running PM2 process:
        //     pm2 reload ecosystem.config.cjs --update-env
        //
        //   Verify the key was injected correctly:
        //     pm2 env $(pm2 id gps-tracker | head -1) | grep VAPID_PRIVATE_KEY
        //
        // Placeholder — PM2 inherits the real value from the system environment:
        VAPID_PRIVATE_KEY: "",
      },

      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/var/log/gps-tracker/error.log",
      out_file: "/var/log/gps-tracker/out.log",
      merge_logs: true,
    },
  ],
};
