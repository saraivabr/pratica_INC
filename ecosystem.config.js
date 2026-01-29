module.exports = {
  apps: [
    {
      name: 'pratica',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/pratica',
      
      // Cluster mode para aproveitar múltiplos cores
      instances: 'max', // usa todos os cores disponíveis
      exec_mode: 'cluster',
      
      // Environment variables (merged com .env.local)
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        APP_VERSION: '1.0.0',
      },
      
      // Logging estruturado
      error_file: '/var/log/pratica/error.log',
      out_file: '/var/log/pratica/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true, // timestamp em cada log
      
      // Auto-restart e monitoring
      autorestart: true,
      watch: false, // não usar watch em produção (performance)
      max_memory_restart: '1G', // restart se exceder 1GB de RAM
      max_restarts: 10, // máx 10 restarts em 1 minuto antes de desistir
      min_uptime: '10s', // considerar "crashed" se morrer em < 10s
      
      // Restart policy
      restart_delay: 4000, // 4s entre restarts
      kill_timeout: 5000, // 5s para graceful shutdown antes de SIGKILL
      listen_timeout: 3000, // timeout para app iniciar
      
      // Health monitoring
      // PM2 pode fazer HTTP health check (requer pm2 plus ou custom script)
      // Por enquanto, monitorar externamente via /api/health/detailed
      
      // Environment-specific overrides
      env_production: {
        NODE_ENV: 'production',
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
      
      // Performance tuning
      node_args: [
        '--max-old-space-size=2048', // 2GB heap size
        '--max-http-header-size=16384', // 16KB headers (webhooks grandes)
      ],
      
      // Logs rotation (requer PM2 log rotation module)
      // pm2 install pm2-logrotate
      log_type: 'json', // JSON structured logs
    },
    
    // Worker separado para WhatsApp (se necessário)
    {
      name: 'pratica-whatsapp-worker',
      script: 'services/whatsapp-worker/worker.mjs',
      cwd: '/var/www/pratica',
      instances: 1,
      exec_mode: 'fork', // não cluster (worker stateful)
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/pratica/whatsapp-error.log',
      out_file: '/var/log/pratica/whatsapp-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      // Desabilitar se não usar WhatsApp worker
      // autorestart: false,
    },
  ],
  
  // PM2 deploy configuration (opcional)
  deploy: {
    production: {
      user: 'root',
      host: 'vmi3049706',
      ref: 'origin/main',
      repo: 'git@github.com:seu-repo/pratica.git',
      path: '/var/www/pratica',
      'post-deploy': 'pnpm install && pnpm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/log/pratica',
    },
  },
};
