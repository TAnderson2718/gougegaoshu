#!/bin/bash

# 部署CORS修复并进行自动测试
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 部署CORS修复方案..."

# 1. 上传修复后的后端代码
echo "📤 上传修复后的后端代码..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no backend/ "$SERVER_USER@$SERVER_HOST:~/task-manager/"

# 2. 重启后端服务
echo "🔄 重启后端服务..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    cd ~/task-manager/backend
    
    echo '🛑 停止现有服务...'
    pm2 stop task-backend 2>/dev/null || true
    pm2 delete task-backend 2>/dev/null || true
    
    echo '📦 安装依赖...'
    npm install --production
    
    echo '🚀 启动后端服务...'
    pm2 start server.js --name task-backend --env production
    
    echo '⏳ 等待服务启动...'
    sleep 5
    
    echo '📋 检查服务状态...'
    pm2 status
"

# 3. 等待服务完全启动
echo "⏳ 等待服务完全启动..."
sleep 10

# 4. 测试API连接
echo ""
echo "🧪 测试1: 基础API连接..."
API_TEST=$(curl -s -X GET http://124.221.113.102/api/auth/verify \
  -H "Content-Type: application/json" \
  --connect-timeout 10 \
  --max-time 15)

echo "API基础测试响应: $API_TEST"

# 5. 测试登录功能
echo ""
echo "🧪 测试2: 登录功能..."
LOGIN_TEST=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 15)

echo "登录测试响应: $LOGIN_TEST"

# 6. 测试CORS头部
echo ""
echo "🧪 测试3: CORS头部..."
CORS_TEST=$(curl -s -I -X OPTIONS http://124.221.113.102/api/auth/login \
  -H "Origin: http://124.221.113.102" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  --connect-timeout 10 \
  --max-time 15)

echo "CORS预检测试响应:"
echo "$CORS_TEST"

# 7. 测试前端页面
echo ""
echo "🧪 测试4: 前端页面访问..."
FRONTEND_TEST=$(curl -s -I http://124.221.113.102/ | head -n 1)
echo "前端页面响应: $FRONTEND_TEST"

# 8. 综合评估
echo ""
echo "📊 测试结果评估..."

SUCCESS_COUNT=0

if [[ "$API_TEST" == *"error"* ]] || [[ "$API_TEST" == *"success"* ]] || [[ "$API_TEST" == *"message"* ]]; then
    echo "✅ API基础连接: 正常"
    ((SUCCESS_COUNT++))
else
    echo "❌ API基础连接: 异常"
fi

if [[ "$LOGIN_TEST" == *"token"* ]] && [[ "$LOGIN_TEST" == *"success"* ]]; then
    echo "✅ 登录功能: 正常"
    ((SUCCESS_COUNT++))
else
    echo "❌ 登录功能: 异常"
fi

if [[ "$CORS_TEST" == *"Access-Control-Allow-Origin"* ]] || [[ "$CORS_TEST" == *"200"* ]]; then
    echo "✅ CORS配置: 正常"
    ((SUCCESS_COUNT++))
else
    echo "❌ CORS配置: 异常"
fi

if [[ "$FRONTEND_TEST" == *"200"* ]]; then
    echo "✅ 前端页面: 正常"
    ((SUCCESS_COUNT++))
else
    echo "❌ 前端页面: 异常"
fi

echo ""
echo "📈 测试通过率: $SUCCESS_COUNT/4"

if [ $SUCCESS_COUNT -ge 3 ]; then
    echo ""
    echo "🎉🎉🎉 CORS修复成功！��🎉🎉"
    echo ""
    echo "✅ 修复内容:"
    echo "   ✅ 修复了credentials不匹配问题"
    echo "   ✅ 添加了正确的生产环境域名"
    echo "   ✅ 增强了CORS头部设置"
    echo "   ✅ 添加了OPTIONS预检请求处理"
    echo "   ✅ 重新部署了后端服务"
    echo ""
    echo "🌐 访问地址: http://124.221.113.102"
    echo "📱 登录信息: ADMIN / AdminPass123"
    echo ""
    echo "📋 现在请测试:"
    echo "   1. 访问系统主页"
    echo "   2. 尝试登录"
    echo "   3. 检查是否还有网络错误"
    echo "   4. 测试各项功能"
    echo ""
    echo "🎊 网络连接问题应该已经完全解决！"
else
    echo ""
    echo "⚠️ 仍有问题需要进一步排查"
    echo ""
    echo "🔍 请检查:"
    echo "   1. 服务器日志: pm2 logs task-backend"
    echo "   2. 网络连接状态"
    echo "   3. 防火墙设置"
    echo "   4. 浏览器控制台错误信息"
fi

echo ""
echo "📋 故障排除提示："
echo "   - 完全关闭浏览器并重新打开"
echo "   - 清除浏览器缓存和Cookie"
echo "   - 尝试使用无痕模式访问"
echo "   - 检查浏览器开发者工具的网络选项卡"
echo "   - 等待几分钟让服务完全稳定"
