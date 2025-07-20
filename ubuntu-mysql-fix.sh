#!/bin/bash

# Ubuntu MySQL配置解决方案
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 Ubuntu MySQL配置解决方案..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🛑 停止后端服务...'
    pm2 stop all || true
    
    echo '🔧 使用sudo权限配置MySQL...'
    # 使用sudo权限直接配置MySQL
    sudo mysql << 'MYSQL_SUDO_CONFIG'
-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'TaskApp2024!';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';

-- 允许root用户使用密码认证
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'RootPass2024!';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示结果
SHOW DATABASES;
SELECT User, Host, plugin FROM mysql.user WHERE User IN ('root', 'taskapp');
MYSQL_SUDO_CONFIG
    
    echo '⚙️ 更新应用配置使用新的数据库用户...'
    cd /home/ubuntu/gougegaoshu/backend
    
    cat > .env << 'ENV_CONFIG'
# 生产环境配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=taskapp
DB_PASSWORD=TaskApp2024!
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
    mysql -u taskapp -pTaskApp2024! -e 'SELECT \"数据库连接成功!\" as status; USE task_manager_db; SHOW TABLES;'
    
    echo '🚀 启动后端服务...'
    pm2 start server.js --name 'task-backend'
    
    sleep 15
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看服务日志...'
    pm2 logs task-backend --lines 15
    
    echo '✅ MySQL配置完成！'
"

echo ""
echo "🎉 MySQL配置完成！"
echo ""
echo "🧪 等待服务启动..."
sleep 10

echo "测试API连接..."
curl -X POST http://124.221.113.102:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 15 \
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
echo ""
echo "🔧 数据库配置信息:"
echo "   数据库: task_manager_db"
echo "   用户: taskapp"
echo "   密码: TaskApp2024!"
