// PM2 Ecosystem — Cluster mode (CPU core sonida worker)
// Ishlatish: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'smart3d-api',
      script: 'production.js',
      instances: 'max',           // CPU core sonida
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgres://user:pass@localhost:5432/smart3d',
        REDIS_URL: 'redis://localhost:6379',
        CORS_ORIGINS: 'https://smart3d.uz',
      },
      // Log fayllar
      log_file: '/var/log/smart3d/combined.log',
      error_file: '/var/log/smart3d/error.log',
      out_file: '/var/log/smart3d/out.log',
      time: true,
      // Graceful restart
      kill_timeout: 5000,
      listen_timeout: 10000,
      // Health check
      health_check_grace_period: 3000,
    },
  ],
};
