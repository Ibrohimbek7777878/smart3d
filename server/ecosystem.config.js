// PM2 — Smart3D (TZ-07). Ishlaydigan server: index.js (SQLite).
// Bitta jarayon (fork): SQLite, xotiradagi rate-limit va SMS cheklovlari bitta jarayon uchun.
// Ishlatish: cd server && pm2 start ecosystem.config.js --env production
// Maxfiy qiymatlar (JWT_SECRET, ESKIZ_*) bu faylga YOZILMAYDI — server muhitida beriladi.
module.exports = {
  apps: [
    {
      name: 'smart3d',
      script: 'index.js',
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'development', PORT: 3000 },
      env_production: { NODE_ENV: 'production', PORT: 3000, TRUST_PROXY: 1 },
      time: true,
      kill_timeout: 5000
    }
  ]
};
