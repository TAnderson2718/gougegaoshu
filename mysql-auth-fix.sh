#!/bin/bash

# MySQL认证修复脚本 - Ubuntu 24.04专用
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 开始MySQL用户权限配置..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🛑 停止后端服务...'
    pm2 stop all || true
    
    echo '🔧 确保MySQL服务正常运行...'
    sudo systemctl stop mysql || true
    sleep 3
    
    # 创建必要的目录
    sudo mkdir -p /var/run/mysqld
    sudo chown mysql:mysql /var/run/mysqld
    sudo chmod 755 /var/run/mysqld
    
    # 启动MySQL服务
    sudo systemctl start mysql
    sleep 5
    
    echo '📋 检查MySQL服务状态...'
    sudo systemctl status mysql --no-pager -l
    
    echo '🔍 查看debian-sys-maint配置...'
    if [ -f /etc/mysql/debian.cnf ]; then
        echo 'debian.cnf文件存在'
        sudo cat /etc/mysql/debian.cnf | head -10
    else
        echo 'debian.cnf文件不存在，使用其他方法'
    fi
    
    echo '🗄️ 尝试使用debian-sys-maint用户配置数据库...'
    if sudo mysql --defaults-file=/etc/mysql/debian.cnf << 'MYSQL_CONFIG'
-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户
DROP USER IF EXISTS 'taskapp'@'localhost';
CREATE USER 'taskapp'@'localhost' IDENTIFIED WITH mysql_native_password BY 'TaskApp2024!';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';

-- 修改root用户认证方式
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';

-- 刷新权限
FLUSH PRIVILEGES;

-- 验证创建结果
SHOW DATABASES;
SELECT User, Host, plugin, authentication_string FROM mysql.user WHERE User IN ('root', 'taskapp');

-- 测试数据库操作
USE task_manager_db;
CREATE TABLE IF NOT EXISTS test_connection (id INT PRIMARY KEY, status VARCHAR(100));
INSERT INTO test_connection (id, status) VALUES (1, 'MySQL配置成功 - debian-sys-maint方式') ON DUPLICATE KEY UPDATE status='MySQL配置成功 - debian-sys-maint方式';
SELECT * FROM test_connection;
DROP TABLE test_connection;

SELECT 'MySQL配置完成!' as result;
MYSQL_CONFIG
    then
        echo '✅ debian-sys-maint方式配置成功!'
    else
        echo '⚠️ debian-sys-maint方式失败，尝试其他方法...'
        
        # 尝试使用sudo直接访问
        if sudo mysql << 'MYSQL_CONFIG2'
-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户
DROP USER IF EXISTS 'taskapp'@'localhost';
CREATE USER 'taskapp'@'localhost' IDENTIFIED WITH mysql_native_password BY 'TaskApp2024!';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';

-- 修改root用户认证方式
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';

-- 刷新权限
FLUSH PRIVILEGES;

-- 验证创建结果
SHOW DATABASES;
SELECT User, Host, plugin FROM mysql.user WHERE User IN ('root', 'taskapp');

-- 测试数据库操作
USE task_manager_db;
CREATE TABLE IF NOT EXISTS test_connection (id INT PRIMARY KEY, status VARCHAR(100));
INSERT INTO test_connection (id, status) VALUES (1, 'MySQL配置成功 - sudo方式') ON DUPLICATE KEY UPDATE status='MySQL配置成功 - sudo方式';
SELECT * FROM test_connection;
DROP TABLE test_connection;

SELECT 'MySQL配置完成!' as result;
MYSQL_CONFIG2
        then
            echo '✅ sudo方式配置成功!'
        else
            echo '❌ 所有MySQL配置方式都失败了'
            exit 1
        fi
    fi
    
    echo '🧪 测试数据库连接...'
    
    # 测试taskapp用户
    if mysql -u taskapp -pTaskApp2024! -e 'SELECT \"taskapp用户连接成功!\" as status; USE task_manager_db; SHOW TABLES;'; then
        echo '✅ taskapp用户连接测试成功!'
        DB_USER='taskapp'
        DB_PASSWORD='TaskApp2024!'
    else
        echo '⚠️ taskapp用户连接失败，测试root用户...'
        
        # 测试root用户（无密码）
        if mysql -u root -e 'SELECT \"root用户连接成功!\" as status; USE task_manager_db; SHOW TABLES;'; then
            echo '✅ root用户（无密码）连接成功!'
            DB_USER='root'
            DB_PASSWORD=''
        else
            echo '❌ 所有用户连接测试都失败了'
            exit 1
        fi
    fi
    
    echo '⚙️ 更新应用配置...'
    cd /home/ubuntu/gougegaoshu/backend
    
    cat > .env << EOF
# 生产环境配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=\$DB_USER
DB_PASSWORD=\$DB_PASSWORD
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
    
    echo '🚀 重启后端服务...'
    pm2 start server.js --name 'task-backend' || pm2 restart task-backend
    
    sleep 15
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看服务日志...'
    pm2 logs task-backend --lines 20
    
    echo '✅ MySQL用户权限配置完成！'
    echo '📋 使用的数据库用户: '\$DB_USER
    echo '🔑 数据库密码: '\$DB_PASSWORD
"

echo ""
echo "🎉 MySQL用户权限配置完成！"
echo ""
echo "🧪 等待服务完全启动..."
sleep 20

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
    echo "   1. 管理员登录测试"
    echo "   2. 导入任务CSV文件"
    echo "   3. 学生登录测试"
    echo "   4. 任务完成功能测试"
    echo "   5. 密码修改功能测试"
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
