#!/bin/bash

# 调试认证错误脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 调试认证错误..."

# 1. 重新上传修复后的认证文件
echo "📤 重新上传修复后的认证文件..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no backend/routes/auth.js "$SERVER_USER@$SERVER_HOST:/home/ubuntu/gougegaoshu/backend/routes/"

# 2. 重启服务并查看详细日志
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🔄 重启后端服务...'
    cd /home/ubuntu/gougegaoshu/backend
    pm2 restart task-backend
    
    echo '⏳ 等待服务启动...'
    sleep 10
    
    echo '📊 检查服务状态...'
    pm2 status
    
    echo ''
    echo '🧪 测试一次登录并查看实时日志...'
    # 在后台启动日志监控
    pm2 logs task-backend --lines 0 &
    LOG_PID=\$!
    
    sleep 2
    
    # 发送测试请求
    curl -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    sleep 3
    
    # 停止日志监控
    kill \$LOG_PID 2>/dev/null || true
    
    echo ''
    echo '📋 查看最近的错误日志...'
    pm2 logs task-backend --lines 20 --nostream
    
    echo ''
    echo '🔍 检查数据库连接...'
    node -e \"
        const { query } = require('./config/database');
        require('dotenv').config();
        
        async function testDB() {
            try {
                console.log('🔍 测试数据库连接...');
                const result = await query('SELECT 1 as test');
                console.log('✅ 数据库连接正常:', result);
                
                console.log('🔍 检查管理员表...');
                const admins = await query('SELECT id, name, role FROM admins LIMIT 1');
                console.log('👤 管理员数据:', admins);
                
                process.exit(0);
            } catch (error) {
                console.error('❌ 数据库错误:', error);
                process.exit(1);
            }
        }
        
        testDB();
    \"
    
    echo ''
    echo '✅ 调试信息收集完成！'
"

echo ""
echo "🎉 调试完成！"
echo ""
echo "📋 如果仍有问题，请检查上面的日志输出"
