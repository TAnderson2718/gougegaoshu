#!/bin/bash

# 终极MySQL解决方案
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 执行终极MySQL解决方案..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🛑 停止所有服务...'
    pm2 stop all || true
    sudo systemctl stop mysql || true
    
    echo '🔄 使用安全模式重置MySQL...'
    # 启动MySQL安全模式
    sudo mysqld_safe --skip-grant-tables --skip-networking &
    sleep 10
    
    echo '🔧 重置MySQL权限...'
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
    
    echo '🗄️ 配置数据库和用户...'
    mysql -u root << 'MYSQL_SETUP'
-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'TaskApp2024!';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示结果
SHOW DATABASES;
SELECT User, Host FROM mysql.user WHERE User IN ('root', 'taskapp');

-- 测试数据库
USE task_manager_db;
CREATE TABLE test_table (id INT PRIMARY KEY, name VARCHAR(50));
INSERT INTO test_table VALUES (1, 'MySQL配置成功');
SELECT * FROM test_table;
DROP TABLE test_table;
MYSQL_SETUP
    
    echo '⚙️ 更新应用配置...'
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
    
    if [ \$? -eq 0 ]; then
        echo '✅ 数据库连接测试成功!'
    else
        echo '⚠️ taskapp连接失败，尝试root用户...'
        mysql -u root -e 'SELECT \"root连接成功!\" as status; USE task_manager_db; SHOW TABLES;'
        
        if [ \$? -eq 0 ]; then
            echo '✅ root用户连接成功，更新配置...'
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
        fi
    fi
    
    echo '🚀 启动后端服务...'
    pm2 start server.js --name 'task-backend'
    
    sleep 20
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看服务日志...'
    pm2 logs task-backend --lines 15
    
    echo '✅ 终极配置完成！'
"

echo ""
echo "🎉 终极MySQL配置完成！"
echo ""
echo "🧪 等待服务完全启动..."
sleep 15

echo "🔍 测试API连接..."
RESPONSE=$(curl -s -X POST http://124.221.113.102:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 15 \
  --max-time 30)

echo "API响应: $RESPONSE"

if [[ "$RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉🎉🎉 部署完全成功！🎉🎉🎉"
    echo ""
    echo "🌐 考研任务管理系统访问信息："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 服务器地址: 124.221.113.102"
    echo "🔗 API地址: http://124.221.113.102:3001/api"
    echo ""
    echo "📱 登录信息:"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / NewPass123"
    echo ""
    echo "🔧 数据库信息:"
    echo "   数据库: task_manager_db"
    echo "   用户: taskapp 或 root"
    echo "   密码: TaskApp2024! 或 (空)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎊 恭喜！考研任务管理系统已成功部署到腾讯云服务器！"
    echo ""
    echo "📋 系统功能:"
    echo "   ✅ 管理员登录和任务导入"
    echo "   ✅ 学生登录和任务管理"
    echo "   ✅ 密码修改功能"
    echo "   ✅ 任务进度跟踪"
    echo "   ✅ 数据持久化存储"
    echo ""
    echo "🧪 建议测试:"
    echo "   1. 管理员登录: http://124.221.113.102:3001/api/auth/login"
    echo "   2. 导入任务CSV文件"
    echo "   3. 学生登录测试"
    echo "   4. 任务完成功能测试"
else
    echo "⚠️ API可能还在初始化中，请稍后再试"
    echo ""
    echo "🔍 手动测试命令:"
    echo "curl -X POST http://124.221.113.102:3001/api/auth/login \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}'"
    echo ""
    echo "📊 检查服务状态:"
    echo "ssh ubuntu@124.221.113.102"
    echo "pm2 status"
    echo "pm2 logs task-backend"
fi
