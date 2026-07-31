module.exports = {
  apps: [
    {
      name: "taal-whatsapp",
      script: "server/whatsapp_server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 5001
      }
    },
    {
      name: "taal-auto-reports",
      script: "server/auto_daily_reports.js",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
