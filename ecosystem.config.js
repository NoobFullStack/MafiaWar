module.exports = {
  apps: [
    {
      name: 'mafia-war-bot',
      script: 'dist/bot.js',
      cwd: '/var/www/MafiaWar',  // Update this path to match your VPS structure
      instances: 1,  // Discord bots must run single instance
      exec_mode: 'fork',  // Not cluster mode for Discord bots
      
      // Environment configuration
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      
      // Auto-restart configuration
      watch: false,  // Don't watch files in production
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: '10s',
      
      // Logging configuration
      log_file: './logs/bot.log',
      out_file: './logs/bot-out.log',
      error_file: './logs/bot-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Memory management
      max_memory_restart: '300M',
      
      // Process management
      kill_timeout: 5000,
      listen_timeout: 3000,
      wait_ready: true,
      
      // Files to ignore when watching (disabled in production anyway)
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        'docs',
        'prisma/migrations',
        '*.md'
      ],
      
      // Instance variables
      instance_var: 'INSTANCE_ID',
      
      // Advanced PM2 features
      vizion: false,  // Disable git metadata collection
      autorestart: true,
      
      // Time zones
      time: true,
      
      // Error handling
      exp_backoff_restart_delay: 100,
      
      // Advanced options for Discord bots
      source_map_support: true,
      
      // Custom start command (alternative to script)
      // interpreter: 'node',
      // interpreter_args: '--max-old-space-size=200',
      
      // Environment variables (use .env file instead for secrets)
      env_file: '.env'
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'root',  // Your VPS user
      host: 'your-vps-ip',  // Your VPS IP
      ref: 'origin/main',
      repo: 'https://github.com/NoobFullStack/MafiaWar.git',
      path: '/var/www/MafiaWar',
      'post-deploy': 'npm install && npm run build && npm run db:migrate && pm2 reload ecosystem.config.js --env production && pm2 save'
    }
  }
};
