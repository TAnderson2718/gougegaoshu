module.exports = {
  apps: [
    {
      name: 'task-manager-backend',
      script: './backend/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_USER: 'taskapp',
        DB_PASSWORD: 'password',
        DB_NAME: 'task_manager_db',
        JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'task-manager-frontend',
      script: 'serve',
      args: '-s build -l 3000 --cors',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '500M'
    }
  ],

  deploy: {
    production: {
      user: 'dev_user',
      host: '124.221.113.102',
      ref: 'origin/main',
      repo: 'https://github.com/TAnderson2718/gougegaoshu.git',
      path: '/home/dev_user/gougegaoshu',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install --production && cd ../frontend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
