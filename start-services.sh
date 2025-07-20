#!/bin/bash

# 启动服务脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🚀 启动服务器上的应用..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    cd /home/ubuntu/gougegaoshu
    
    echo '🔧 配置MySQL数据库...'
    # 设置MySQL root密码
    sudo mysql -e \"ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';\" || true
    sudo mysql -e \"FLUSH PRIVILEGES;\" || true
    
    # 创建数据库和用户
    sudo mysql -u root -ppassword -e \"CREATE DATABASE IF NOT EXISTS task_manager_db;\" || true
    sudo mysql -u root -ppassword -e \"CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';\" || true
    sudo mysql -u root -ppassword -e \"GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';\" || true
    sudo mysql -u root -ppassword -e \"FLUSH PRIVILEGES;\" || true
    
    echo '🗄️ 初始化数据库...'
    cd backend
    node setup.js || true
    
    echo '🚀 启动后端服务...'
    pm2 stop all || true
    pm2 start server.js --name 'task-backend' --watch
    
    echo '🌐 配置Nginx...'
    # 创建Nginx配置
    sudo tee /etc/nginx/sites-available/gougegaoshu << 'EOF'
server {
    listen 80;
    server_name 124.221.113.102;

    # 前端静态文件
    location / {
        root /home/ubuntu/gougegaoshu/frontend/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/gougegaoshu /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 重启Nginx
    sudo nginx -t && sudo systemctl restart nginx
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '✅ 服务启动完成！'
"

echo "🎉 服务启动完成！"
echo "🌐 前端访问地址: http://$SERVER_HOST"
echo "🔗 API访问地址: http://$SERVER_HOST/api"
echo "📱 管理员登录: ADMIN / AdminPass123"
echo "👨‍🎓 学生登录: ST001 / Hello888, ST002 / NewPass123"
