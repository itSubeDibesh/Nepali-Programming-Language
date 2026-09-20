const path = require('path');

module.exports = {
  apps: [
    {
      name: 'nepali-studio',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 8468',
      cwd: path.join(__dirname, '..', 'studio'),
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 8468,
        HOSTED_STUDIO: 'true',
        NEXT_PUBLIC_WEB_STUDIO: 'true',
        NEPALI_SCRIPT: 'devanagari',
        NEPALI_DIGITS: 'devanagari',
        // Binary path: installed by deploy/setup.sh
        NEPALI_BIN: '/usr/local/bin/nepali',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8468,
        HOSTED_STUDIO: 'true',
        NEXT_PUBLIC_WEB_STUDIO: 'true',
        NEPALI_SCRIPT: 'devanagari',
        NEPALI_DIGITS: 'devanagari',
        NEPALI_BIN: '/usr/local/bin/nepali',
      },
      error_file: '/var/log/nepali-studio/pm2-error.log',
      out_file: '/var/log/nepali-studio/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
