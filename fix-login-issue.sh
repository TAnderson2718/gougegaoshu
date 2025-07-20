#!/bin/bash

# 修复登录问题脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复登录问题..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '📊 检查后端服务状态...'
    pm2 status
    
    echo ''
    echo '🔍 检查后端日志...'
    pm2 logs task-backend --lines 20 --nostream
    
    echo ''
    echo '🌐 检查端口监听状态...'
    netstat -tlnp | grep :3002
    
    echo ''
    echo '🧪 测试本地API连接...'
    curl -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '🔧 检查Nginx配置...'
    sudo nginx -t
    
    echo ''
    echo '📋 检查Nginx代理配置...'
    cat /etc/nginx/sites-available/task-manager | grep -A 10 'location /api/'
    
    echo ''
    echo '🔄 重启服务...'
    # 重启后端服务
    pm2 restart task-backend
    
    # 重新加载Nginx
    sudo systemctl reload nginx
    
    sleep 10
    
    echo ''
    echo '🧪 再次测试API连接...'
    curl -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '🌐 测试通过Nginx代理的API...'
    curl -X POST http://localhost/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '✅ 服务检查完成！'
"

echo ""
echo "🎉 服务修复完成！"
echo ""
echo "🧪 等待服务稳定..."
sleep 10

echo "🔍 测试外部API访问..."
RESPONSE=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 15)

echo "API响应: $RESPONSE"

if [[ "$RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉 登录问题已修复！"
    echo ""
    echo "✅ 现在您可以正常登录系统了："
    echo "   1. 刷新浏览器页面"
    echo "   2. 使用以下登录信息："
    echo "      👨‍💼 管理员: ADMIN / AdminPass123"
    echo "      👨‍🎓 学生1: ST001 / Hello888"
    echo "      👨‍🎓 学生2: ST002 / NewPass123"
elif [[ "$RESPONSE" == *"success"* ]]; then
    echo ""
    echo "🎉 API连接正常！"
    echo ""
    echo "✅ 请刷新浏览器页面并重试登录"
else
    echo ""
    echo "⚠️ API仍有问题，响应: $RESPONSE"
    echo ""
    echo "🔍 请检查："
    echo "   1. 刷新浏览器页面"
    echo "   2. 清除浏览器缓存"
    echo "   3. 检查网络连接"
    echo "   4. 如果问题持续，请等待几分钟后重试"
fi
