module.exports = {
  apps: [{
    name: 'pratica',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/pratica',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pratica/error.log',
    out_file: '/var/log/pratica/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
