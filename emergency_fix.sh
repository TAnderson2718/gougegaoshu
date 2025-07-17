#!/bin/bash

echo "🚨 紧急修复登录问题..."

# 1. 强制清理所有进程
echo "🧹 强制清理所有相关进程..."
pkill -9 -f "react-scripts" 2>/dev/null || true
pkill -9 -f "node.*server" 2>/dev/null || true
pkill -9 -f "npm.*start" 2>/dev/null || true

# 清理端口
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "⏳ 等待进程清理..."
sleep 5

# 2. 启动后端
echo "🚀 启动后端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/backend
node server.js &
BACKEND_PID=$!
echo "后端PID: $BACKEND_PID"

# 3. 等待并验证后端
echo "⏳ 等待后端启动..."
sleep 10

echo "🧪 验证后端服务..."
BACKEND_STATUS=$(curl -s -w "%{http_code}" http://localhost:3001/health -o /dev/null)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败 (状态码: $BACKEND_STATUS)"
    echo "🔧 尝试重新启动后端..."
    kill $BACKEND_PID 2>/dev/null || true
    sleep 2
    node server.js &
    BACKEND_PID=$!
    sleep 10
fi

# 4. 启动前端
echo "🌐 启动前端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/frontend
BROWSER=none npm start &
FRONTEND_PID=$!
echo "前端PID: $FRONTEND_PID"

# 5. 等待前端启动
echo "⏳ 等待前端启动..."
sleep 25

# 6. 验证前端服务
echo "🧪 验证前端服务..."
FRONTEND_STATUS=$(curl -s -w "%{http_code}" http://localhost:3000 -o /dev/null)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ 前端服务启动成功"
else
    echo "❌ 前端服务启动失败 (状态码: $FRONTEND_STATUS)"
fi

# 7. 测试API代理
echo "🔗 测试API代理..."
sleep 5
API_STATUS=$(curl -s -w "%{http_code}" -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"studentId":"ST001","password":"Hello888"}' \
    -o /dev/null)

if [ "$API_STATUS" = "200" ] || [ "$API_STATUS" = "401" ]; then
    echo "✅ API代理工作正常 (状态码: $API_STATUS)"
else
    echo "❌ API代理有问题 (状态码: $API_STATUS)"
fi

echo ""
echo "🎉 紧急修复完成！"
echo "📱 访问地址: http://localhost:3000"
echo "📊 进程信息:"
echo "   后端PID: $BACKEND_PID"
echo "   前端PID: $FRONTEND_PID"
echo ""
echo "💡 现在请："
echo "   1. 刷新浏览器页面 (Ctrl+F5 或 Cmd+Shift+R)"
echo "   2. 尝试快速登录按钮"
echo "   3. 如果仍有问题，请检查浏览器控制台"
