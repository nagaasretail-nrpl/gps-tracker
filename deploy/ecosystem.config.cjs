/**
 * PM2 Ecosystem Config — GPS Fleet Tracker
 *
 * Manages two processes:
 *   gps-tracker  — Express HTTP server + GT06N TCP server (everything in one process)
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart gps-tracker
 *   pm2 logs gps-tracker
 *   pm2 monit
 */

module.exports = {
  apps: [
    {
      name: "gps-tracker",
      script: "dist/index.js",
      cwd: "/opt/gps-tracker",

      // Load environment from .env file
      env_file: "/opt/gps-tracker/.env",

      // Process behaviour
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,   // wait 3s before restarting on crash
      max_memory_restart: "512M",

      // Logging
      output: "/var/log/gps-tracker/out.log",
      error:  "/var/log/gps-tracker/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
