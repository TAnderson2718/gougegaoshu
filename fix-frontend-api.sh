#!/bin/bash

# 修复前端API配置脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复前端API配置..."

# 1. 重新构建前端
echo "🏗️ 重新构建前端..."
cd frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

echo "✅ 前端构建成功"

# 2. 上传构建后的文件
echo "📤 上传前端文件..."
cd ..
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no frontend/build/* "$SERVER_USER@$SERVER_HOST:/var/www/html/"

# 3. 检查服务器状态并重启服务
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '📊 检查后端服务状态...'
    pm2 status
    
    echo ''
    echo '🔄 重启后端服务以确保配置生效...'
    cd /home/ubuntu/gougegaoshu/backend
    pm2 restart task-backend
    
    echo '⏳ 等待服务启动...'
    sleep 10
    
    echo '🧪 测试API连接...'
    curl -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '🌐 测试Nginx代理...'
    curl -X POST http://localhost/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '📋 检查Nginx状态...'
    systemctl status nginx --no-pager -l
    
    echo ''
    echo '📋 检查Nginx配置...'
    nginx -t
    
    echo ''
    echo '🔄 重新加载Nginx配置...'
    systemctl reload nginx
    
    echo ''
    echo '✅ 前端API修复完成！'
"

echo ""
echo "🎉 前端API修复完成！"
echo ""
echo "🧪 等待服务稳定..."
sleep 10

echo "🔍 测试外部API连接..."
RESPONSE=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 15)

echo "API响应: $RESPONSE"

if [[ "$RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉🎉🎉 前端API连接修复成功！🎉🎉🎉"
    echo ""
    echo "✅ 现在您可以正常使用系统了："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 访问地址: http://124.221.113.102"
    echo ""
    echo "📱 登录信息:"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / Hello888"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 修复内容:"
    echo "   ✅ 修复了前端API baseURL配置"
    echo "   ✅ 统一了登录API调用"
    echo "   ✅ 使用相对路径调用API"
    echo "   ✅ 重新构建并部署了前端"
    echo "   ✅ 确保Nginx代理正常工作"
    echo ""
    echo "📋 下一步操作:"
    echo "   1. 刷新浏览器页面 (F5)"
    echo "   2. 清除浏览器缓存 (Ctrl+F5 或 Cmd+Shift+R)"
    echo "   3. 使用上述登录信息登录系统"
    echo ""
    echo "🎊 恭喜！前端API连接问题已完全解决！"
    echo "🎊 您现在可以正常使用考研任务管理系统了！"
else
    echo ""
    echo "⚠️ API连接仍有问题"
    echo "响应: $RESPONSE"
    echo ""
    echo "🔍 请检查："
    echo "   1. 刷新浏览器页面并清除缓存"
    echo "   2. 检查浏览器开发者工具的网络选项卡"
    echo "   3. 确认API请求的URL是否正确"
    echo "   4. 等待几分钟后重试"
fi

echo ""
echo "📋 故障排除提示："
echo "   - 如果仍有网络错误，请检查浏览器开发者工具"
echo "   - 确保清除了浏览器缓存"
echo "   - 检查API请求是否使用了正确的相对路径"
echo "   - 确认Nginx代理配置正确"
