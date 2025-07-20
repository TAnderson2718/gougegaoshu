#!/bin/bash

# 最终MySQL配置脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 执行最终MySQL配置步骤..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🛑 停止后端服务...'
    pm2 stop all || true
    
    echo '🔧 使用sudo权限配置MySQL数据库...'
    # 使用sudo权限直接配置MySQL，这是Ubuntu 24.04的标准方式
    sudo mysql << 'MYSQL_FINAL_CONFIG'
-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED WITH mysql_native_password BY 'TaskApp2024!';
GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 验证创建结果
SHOW DATABASES;
SELECT User, Host, plugin FROM mysql.user WHERE User = 'taskapp';

-- 测试数据库操作
USE task_manager_db;
CREATE TABLE IF NOT EXISTS test_connection (id INT PRIMARY KEY, status VARCHAR(50));
INSERT INTO test_connection (id, status) VALUES (1, 'MySQL配置成功') ON DUPLICATE KEY UPDATE status='MySQL配置成功';
SELECT * FROM test_connection;
DROP TABLE test_connection;

SELECT 'MySQL配置完成!' as result;
MYSQL_FINAL_CONFIG
    
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
    
    echo '🧪 验证数据库连接...'
    mysql -u taskapp -pTaskApp2024! -e 'SELECT \"数据库连接验证成功!\" as status; USE task_manager_db; SHOW TABLES;'
    
    if [ \$? -eq 0 ]; then
        echo '✅ 数据库连接验证成功!'
    else
        echo '❌ 数据库连接验证失败'
        exit 1
    fi
    
    echo '🚀 重启后端服务...'
    pm2 restart task-backend
    
    sleep 20
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看服务日志...'
    pm2 logs task-backend --lines 20
    
    echo '✅ 最终配置完成！'
"

echo ""
echo "🎉 最终MySQL配置完成！"
echo ""
echo "🧪 等待服务完全启动..."
sleep 15

echo "🔍 测试API连接..."
echo "测试管理员登录..."

RESPONSE=$(curl -s -w "\\n%{http_code}" -X POST http://124.221.113.102:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 15 \
  --max-time 30)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP状态码: $HTTP_CODE"
echo "API响应: $BODY"

if [[ "$HTTP_CODE" == "200" && "$BODY" == *"token"* ]]; then
    echo ""
    echo "🎉 部署完全成功！"
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
    echo "   用户: taskapp"
    echo "   密码: TaskApp2024!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎊 恭喜！考研任务管理系统已成功部署到腾讯云服务器！"
    echo ""
    echo "📋 后续步骤（可选）:"
    echo "   1. 配置域名和SSL证书"
    echo "   2. 设置定时备份"
    echo "   3. 配置监控告警"
    echo ""
    echo "🧪 测试建议:"
    echo "   1. 测试管理员登录和任务导入功能"
    echo "   2. 测试学生登录和任务完成功能"
    echo "   3. 测试密码修改功能"
elif [[ "$HTTP_CODE" == "200" ]]; then
    echo "⚠️ API响应成功但格式异常，请检查服务状态"
    echo "🔍 手动测试命令:"
    echo "curl -X POST http://124.221.113.102:3001/api/auth/login -H \"Content-Type: application/json\" -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}'"
else
    echo "⚠️ API测试失败，HTTP状态码: $HTTP_CODE"
    echo "🔍 请检查服务状态或稍后再试"
    echo "🔍 手动测试命令:"
    echo "curl -X POST http://124.221.113.102:3001/api/auth/login -H \"Content-Type: application/json\" -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}'"
fi
