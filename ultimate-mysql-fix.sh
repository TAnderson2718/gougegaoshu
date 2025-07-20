#!/bin/bash

# 终极MySQL修复脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 终极MySQL修复..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    cd /home/ubuntu/gougegaoshu/backend
    
    echo '🛑 停止MySQL服务...'
    sudo systemctl stop mysql
    
    echo '🔓 启动MySQL安全模式...'
    sudo mysqld_safe --skip-grant-tables --skip-networking &
    sleep 10
    
    echo '🔑 重置root密码...'
    mysql -u root << 'MYSQL_RESET'
USE mysql;
UPDATE user SET authentication_string='' WHERE User='root';
UPDATE user SET plugin='mysql_native_password' WHERE User='root';
FLUSH PRIVILEGES;
MYSQL_RESET
    
    echo '🛑 停止安全模式...'
    sudo pkill mysqld
    sleep 5
    
    echo '🚀 重启MySQL服务...'
    sudo systemctl start mysql
    sleep 5
    
    echo '🗄️ 创建数据库和用户...'
    mysql -u root << 'MYSQL_SETUP'
CREATE DATABASE IF NOT EXISTS task_manager_db;
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'taskpass123';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';
FLUSH PRIVILEGES;
SHOW DATABASES;
MYSQL_SETUP
    
    echo '⚙️ 更新应用配置...'
    cat > .env << 'ENV_CONFIG'
# 生产环境配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=taskapp
DB_PASSWORD=taskpass123
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
ENV_CONFIG
    
    echo '🚀 重启后端服务...'
    pm2 stop task-backend
    pm2 start server.js --name 'task-backend'
    
    sleep 10
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看最新日志...'
    pm2 logs task-backend --lines 5
    
    echo '✅ MySQL修复完成！'
"

echo "🎉 终极MySQL修复完成！"
echo "🧪 测试API连接..."

sleep 5

# 测试API
curl -X POST http://124.221.113.102:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 30

echo ""
echo "🌐 部署完成！访问地址："
echo "   前端: http://124.221.113.102:3000 (需要配置Nginx)"
echo "   API: http://124.221.113.102:3001"
echo "📱 登录信息："
echo "   管理员: ADMIN / AdminPass123"
echo "   学生: ST001 / Hello888, ST002 / NewPass123"
