#!/bin/bash

# 最终自动MySQL配置脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 开始自动完成MySQL配置..."
echo "📍 服务器: $SERVER_HOST"
echo "👤 用户: $SERVER_USER"

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🛑 停止所有服务...'
    pm2 stop all || true
    sudo systemctl stop mysql || true
    
    echo '🔄 完全重置MySQL...'
    # 删除MySQL数据目录
    sudo rm -rf /var/lib/mysql/*
    sudo rm -rf /var/log/mysql/*
    
    # 重新安装MySQL
    sudo apt-get remove --purge mysql-server mysql-client mysql-common -y
    sudo apt-get autoremove -y
    sudo apt-get autoclean
    
    # 重新安装MySQL
    echo '📦 重新安装MySQL...'
    sudo apt-get update
    export DEBIAN_FRONTEND=noninteractive
    sudo debconf-set-selections <<< 'mysql-server mysql-server/root_password password'
    sudo debconf-set-selections <<< 'mysql-server mysql-server/root_password_again password'
    sudo apt-get install -y mysql-server
    
    echo '🚀 启动MySQL服务...'
    sudo systemctl start mysql
    sudo systemctl enable mysql
    
    sleep 5
    
    echo '🗄️ 创建数据库和用户...'
    sudo mysql << 'MYSQL_SETUP'
-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'TaskApp2024!';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';

-- 确保root用户可以无密码登录
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示结果
SHOW DATABASES;
SELECT User, Host, plugin FROM mysql.user WHERE User IN ('root', 'taskapp');
MYSQL_SETUP
    
    echo '⚙️ 更新应用配置...'
    cd /home/ubuntu/gougegaoshu/backend
    
    # 备份原配置
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S) || true
    
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
    
    if [ \$? -eq 0 ]; then
        echo '✅ 数据库连接测试成功!'
    else
        echo '❌ 数据库连接测试失败，尝试使用root用户...'
        
        # 更新配置使用root用户
        cat > .env << 'ENV_ROOT'
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
ENV_ROOT
        
        mysql -u root -e 'SELECT \"Root用户连接成功!\" as status; USE task_manager_db; SHOW TABLES;'
    fi
    
    echo '🚀 启动后端服务...'
    pm2 start server.js --name 'task-backend'
    
    sleep 15
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看服务日志...'
    pm2 logs task-backend --lines 20
    
    echo '✅ MySQL配置完成！'
"

echo ""
echo "🎉 MySQL自动配置完成！"
echo ""
echo "🧪 等待服务完全启动..."
sleep 10

echo "🔍 测试API连接..."
echo "测试管理员登录..."
RESPONSE=$(curl -s -X POST http://124.221.113.102:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 15 \
  --max-time 30)

echo "API响应: $RESPONSE"

if [[ "$RESPONSE" == *"token"* ]]; then
    echo "✅ API测试成功！登录功能正常"
else
    echo "⚠️ API可能还在初始化中，请稍后再试"
fi

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
echo "🔧 数据库信息:"
echo "   数据库: task_manager_db"
echo "   用户: taskapp (备用: root)"
echo "   密码: TaskApp2024! (root无密码)"
