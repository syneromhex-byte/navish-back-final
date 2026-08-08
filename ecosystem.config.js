module.exports = {
  apps: [
    {
      name: 'navish-arc',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_file: './src/logs/pm2-combined.log',
      out_file: './src/logs/pm2-out.log',
      error_file: './src/logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
