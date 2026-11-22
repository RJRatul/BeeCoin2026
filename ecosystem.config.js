// PM2 process file — keeps backend + frontend running and restarts them on crash/reboot.
// Usage on the server (from /var/www/cryptax):  pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'cryptax-backend',
      cwd: './backend',
      script: 'dist/index.js',
      env: { NODE_ENV: 'production', PORT: 5000 },
      max_memory_restart: '500M',
    },
    {
      name: 'cryptax-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '700M',
    },
  ],
};
