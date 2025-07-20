#!/bin/bash

# 最终修复脚本 - 使用TCP连接MySQL
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 最终修复MySQL连接问题..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    cd /home/ubuntu/gougegaoshu/backend
    
    echo '⚙️ 更新数据库配置为TCP连接...'
    cat > .env << 'EOF'
# 生产环境配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=task_manager_db

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random_for_security_2024
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=production

# 初始密码配置
INITIAL_PASSWORD=Hello888
ADMIN_PASSWORD=AdminPass123
EOF
    
    echo '🗄️ 重新配置MySQL...'
    sudo systemctl restart mysql
    sleep 5
    
    # 确保MySQL监听TCP端口
    sudo sed -i 's/^bind-address.*/bind-address = 127.0.0.1/' /etc/mysql/mysql.conf.d/mysqld.cnf || true
    sudo systemctl restart mysql
    sleep 5
    
    # 创建数据库和用户
    mysql -h 127.0.0.1 -u root << 'MYSQL_EOF'
CREATE DATABASE IF NOT EXISTS task_manager_db;
SHOW DATABASES;
MYSQL_EOF
    
    echo '🚀 重启后端服务...'
    pm2 stop task-backend
    pm2 delete task-backend
    pm2 start server.js --name 'task-backend'
    
    sleep 5
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看最新日志...'
    pm2 logs task-backend --lines 5
    
    echo '✅ 最终修复完成！'
"

echo "🎉 最终修复完成！"
