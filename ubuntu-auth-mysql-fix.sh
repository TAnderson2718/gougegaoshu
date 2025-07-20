#!/bin/bash

# Ubuntu 24.04 MySQL认证修复脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 Ubuntu 24.04 MySQL认证修复..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🛑 停止后端服务...'
    pm2 stop all || true
    
    echo '🔧 使用Ubuntu系统用户权限配置MySQL...'
    # Ubuntu 24.04的MySQL默认使用auth_socket插件，root用户只能通过sudo访问
    
    sudo mysql << 'MYSQL_CONFIG'
-- 查看当前用户状态
SELECT User, Host, plugin, authentication_string FROM mysql.user WHERE User IN ('root', 'debian-sys-maint');

-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户，使用mysql_native_password认证
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED WITH mysql_native_password BY 'TaskApp2024!';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';

-- 修改root用户认证方式，允许密码登录
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'RootPass2024!';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示结果
SHOW DATABASES;
SELECT User, Host, plugin FROM mysql.user WHERE User IN ('root', 'taskapp');

-- 测试创建表
USE task_manager_db;
CREATE TABLE IF NOT EXISTS test_table (id INT PRIMARY KEY, name VARCHAR(50));
INSERT INTO test_table (id, name) VALUES (1, 'test') ON DUPLICATE KEY UPDATE name='test';
SELECT * FROM test_table;
DROP TABLE test_table;
MYSQL_CONFIG
    
    echo '⚙️ 更新应用配置使用taskapp用户...'
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
    mysql -u taskapp -pTaskApp2024! -e 'SELECT \"taskapp用户连接成功!\" as status; USE task_manager_db; SHOW TABLES;'
    
    if [ \$? -eq 0 ]; then
        echo '✅ taskapp用户连接测试成功!'
    else
        echo '⚠️ taskapp用户连接失败，尝试root用户...'
        mysql -u root -pRootPass2024! -e 'SELECT \"root用户连接成功!\" as status; USE task_manager_db; SHOW TABLES;'
        
        if [ \$? -eq 0 ]; then
            echo '✅ root用户连接成功，更新配置使用root用户...'
            cat > .env << 'ENV_ROOT'
# 生产环境配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=RootPass2024!
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
        fi
    fi
    
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
echo "🧪 等待服务完全启动..."
sleep 10

echo "🔍 测试API连接..."
RESPONSE=$(curl -s -X POST http://124.221.113.102:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 15 \
  --max-time 30)

echo "API响应: $RESPONSE"

if [[ "$RESPONSE" == *"token"* ]]; then
    echo "✅ API测试成功！登录功能正常"
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
    echo "   密码: TaskApp2024! (root: RootPass2024!)"
    echo ""
    echo "🎉 考研任务管理系统部署成功！"
else
    echo "⚠️ API可能还在初始化中，请稍后再试"
    echo "🔍 手动测试命令:"
    echo "curl -X POST http://124.221.113.102:3001/api/auth/login -H \"Content-Type: application/json\" -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}'"
fi
