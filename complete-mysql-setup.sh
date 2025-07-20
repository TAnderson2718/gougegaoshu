#!/bin/bash

# 完整MySQL配置脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 开始完整MySQL配置..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🛑 停止所有相关服务...'
    pm2 stop all || true
    sudo systemctl stop mysql || true
    
    echo '🗑️ 清理MySQL数据目录...'
    sudo rm -rf /var/lib/mysql/*
    
    echo '🔄 重新初始化MySQL...'
    sudo mysqld --initialize-insecure --user=mysql --datadir=/var/lib/mysql
    
    echo '🚀 启动MySQL服务...'
    sudo systemctl start mysql
    sudo systemctl enable mysql
    
    sleep 5
    
    echo '🔐 配置MySQL root用户...'
    mysql -u root << 'MYSQL_CONFIG'
-- 设置root密码为空（用于应用连接）
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;

-- 创建应用数据库
CREATE DATABASE IF NOT EXISTS task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户（备用）
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'taskpass123';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';

-- 显示创建结果
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User IN ('root', 'taskapp');

FLUSH PRIVILEGES;
MYSQL_CONFIG
    
    echo '⚙️ 更新应用配置使用root用户...'
    cd /home/ubuntu/gougegaoshu/backend
    
    cat > .env << 'ENV_CONFIG'
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
ENV_CONFIG
    
    echo '🧪 测试数据库连接...'
    mysql -u root -e 'SELECT \"MySQL连接成功!\" as status; SHOW DATABASES;'
    
    echo '🚀 启动后端服务...'
    pm2 start server.js --name 'task-backend'
    
    sleep 10
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看服务日志...'
    pm2 logs task-backend --lines 10
    
    echo '✅ MySQL配置完成！'
"

echo ""
echo "🎉 MySQL配置完成！"
echo ""
echo "🧪 测试API连接..."
sleep 5

# 测试API连接
echo "测试管理员登录..."
curl -X POST http://124.221.113.102:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 30

echo ""
echo ""
echo "🌐 部署完成！访问信息："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 服务器地址: 124.221.113.102"
echo "🔗 API地址: http://124.221.113.102:3001/api"
echo "📱 登录信息:"
echo "   👨‍💼 管理员: ADMIN / AdminPass123"
echo "   👨‍🎓 学生1: ST001 / Hello888"
echo "   👨‍🎓 学生2: ST002 / NewPass123"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
