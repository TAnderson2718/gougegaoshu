#!/bin/bash

# 检查服务状态脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔍 检查服务状态..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '📊 查看PM2服务状态...'
    pm2 status
    
    echo ''
    echo '🔍 查看服务日志...'
    pm2 logs task-backend --lines 20
    
    echo ''
    echo '🌐 检查端口监听状态...'
    echo '端口3001:'
    netstat -tlnp | grep :3001 || echo '端口3001未在监听'
    echo '端口3002:'
    netstat -tlnp | grep :3002 || echo '端口3002未在监听'
    
    echo ''
    echo '🔧 检查环境配置...'
    cd /home/ubuntu/gougegaoshu/backend
    cat .env | head -10
    
    echo ''
    echo '🧪 测试数据库连接...'
    mysql -u taskapp -pTaskApp2024! -e 'SELECT \"数据库连接正常\" as status; USE task_manager_db; SHOW TABLES;'
    
    echo ''
    echo '🚀 如果服务未运行，重新启动...'
    if ! pm2 list | grep -q 'online'; then
        echo '重新启动服务...'
        pm2 start server.js --name 'task-backend'
        sleep 10
        pm2 status
        pm2 logs task-backend --lines 10
    fi
"

echo ""
echo "🧪 等待服务稳定..."
sleep 10

echo "🔍 测试API连接（端口3002）..."
RESPONSE=$(curl -s -X POST http://124.221.113.102:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 20)

echo "API响应: $RESPONSE"

if [[ "$RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉🎉🎉 部署完全成功！🎉🎉🎉"
    echo ""
    echo "🌐 考研任务管理系统访问信息："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 服务器地址: 124.221.113.102"
    echo "🔗 API地址: http://124.221.113.102:3002/api"
    echo ""
    echo "📱 登录信息:"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / NewPass123"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎊 恭喜！考研任务管理系统已成功部署到腾讯云服务器！"
elif [[ -z "$RESPONSE" ]]; then
    echo ""
    echo "⚠️ 无法连接到API，可能的原因："
    echo "   1. 服务还在启动中"
    echo "   2. 防火墙未开放端口3002"
    echo "   3. 服务启动失败"
    echo ""
    echo "🔍 手动检查步骤："
    echo "   1. ssh ubuntu@124.221.113.102"
    echo "   2. pm2 status"
    echo "   3. pm2 logs task-backend"
    echo "   4. netstat -tlnp | grep :3002"
    echo "   5. sudo ufw status"
else
    echo ""
    echo "⚠️ API响应异常: $RESPONSE"
    echo ""
    echo "🔍 手动测试命令:"
    echo "curl -X POST http://124.221.113.102:3002/api/auth/login \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}'"
fi
