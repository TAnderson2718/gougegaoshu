#!/bin/bash

# 修复MySQL配置脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复MySQL配置..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    cd /home/ubuntu/gougegaoshu/backend
    
    echo '🔍 查找MySQL socket路径...'
    MYSQL_SOCKET=\$(sudo find /var -name 'mysql*.sock' 2>/dev/null | head -1)
    if [ -z \"\$MYSQL_SOCKET\" ]; then
        MYSQL_SOCKET='/var/run/mysqld/mysqld.sock'
    fi
    echo \"MySQL socket路径: \$MYSQL_SOCKET\"
    
    echo '⚙️ 更新数据库配置...'
    cat > .env << EOF
# 生产环境配置
DB_HOST=localhost
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

# MySQL Socket路径
MYSQL_SOCKET=\$MYSQL_SOCKET
EOF
    
    echo '🗄️ 配置MySQL数据库...'
    # 重置MySQL root密码
    sudo systemctl stop mysql
    sudo mysqld_safe --skip-grant-tables --skip-networking &
    sleep 5
    
    mysql -u root << 'MYSQL_EOF'
USE mysql;
UPDATE user SET authentication_string=PASSWORD('') WHERE User='root';
UPDATE user SET plugin='mysql_native_password' WHERE User='root';
FLUSH PRIVILEGES;
MYSQL_EOF
    
    sudo pkill mysqld
    sudo systemctl start mysql
    sleep 3
    
    # 创建数据库和用户
    mysql -u root << 'MYSQL_EOF'
CREATE DATABASE IF NOT EXISTS task_manager_db;
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';
FLUSH PRIVILEGES;
MYSQL_EOF
    
    echo '🚀 重启后端服务...'
    pm2 stop task-backend
    pm2 start server.js --name 'task-backend'
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '✅ MySQL配置修复完成！'
"

echo "🎉 MySQL配置修复完成！"
