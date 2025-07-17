#!/bin/bash

echo "🚨 终极修复快速登录问题..."

# 1. 彻底清理
echo "🧹 彻底清理所有进程和端口..."
sudo pkill -9 -f "react-scripts" 2>/dev/null || true
sudo pkill -9 -f "node.*server" 2>/dev/null || true
sudo pkill -9 -f "npm.*start" 2>/dev/null || true
sudo lsof -ti:3000 | xargs sudo kill -9 2>/dev/null || true
sudo lsof -ti:3001 | xargs sudo kill -9 2>/dev/null || true

echo "⏳ 等待端口释放..."
sleep 5

# 2. 验证端口清理
echo "🔍 验证端口状态..."
if lsof -i:3000 2>/dev/null; then
    echo "⚠️ 端口3000仍被占用"
else
    echo "✅ 端口3000已释放"
fi

if lsof -i:3001 2>/dev/null; then
    echo "⚠️ 端口3001仍被占用"
else
    echo "✅ 端口3001已释放"
fi

# 3. 启动后端并验证
echo "🚀 启动后端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/backend
node server.js &
BACKEND_PID=$!
echo "后端PID: $BACKEND_PID"

# 等待后端启动
echo "⏳ 等待后端启动..."
for i in {1..10}; do
    sleep 2
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ 后端服务启动成功 (尝试 $i/10)"
        break
    else
        echo "⏳ 等待后端启动... ($i/10)"
    fi
done

# 验证后端API
echo "🧪 测试后端API..."
BACKEND_RESPONSE=$(curl -s -w "%{http_code}" http://localhost:3001/health -o /dev/null)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo "✅ 后端API正常响应"
else
    echo "❌ 后端API异常 (状态码: $BACKEND_RESPONSE)"
    echo "🔧 尝试重启后端..."
    kill $BACKEND_PID 2>/dev/null || true
    sleep 3
    node server.js &
    BACKEND_PID=$!
    sleep 10
fi

# 4. 启动前端并验证
echo "🌐 启动前端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/frontend
BROWSER=none npm start &
FRONTEND_PID=$!
echo "前端PID: $FRONTEND_PID"

# 等待前端启动
echo "⏳ 等待前端启动..."
for i in {1..15}; do
    sleep 3
    if curl -s -I http://localhost:3000 | head -1 | grep -q "200"; then
        echo "✅ 前端服务启动成功 (尝试 $i/15)"
        break
    else
        echo "⏳ 等待前端启动... ($i/15)"
    fi
done

# 5. 测试API代理
echo "🔗 测试API代理..."
sleep 5
API_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"studentId":"ST001","password":"Hello888"}' \
    -o /dev/null)

echo "📊 API代理响应状态码: $API_RESPONSE"

if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "401" ]; then
    echo "✅ API代理工作正常"
else
    echo "❌ API代理有问题"
    echo "🔧 尝试重启前端以修复代理..."
    kill $FRONTEND_PID 2>/dev/null || true
    sleep 5
    BROWSER=none npm start &
    FRONTEND_PID=$!
    sleep 20
fi

echo ""
echo "🎉 终极修复完成！"
echo "📊 服务状态:"
echo "   后端PID: $BACKEND_PID"
echo "   前端PID: $FRONTEND_PID"
echo ""
echo "💡 现在请："
echo "   1. 在浏览器中访问 http://localhost:3000"
echo "   2. 强制刷新页面 (Ctrl+F5 或 Cmd+Shift+R)"
echo "   3. 点击快速登录按钮测试"
echo ""
echo "🔍 如果仍有问题，请检查："
echo "   - 浏览器控制台是否还有404错误"
echo "   - 网络标签中API请求的状态"
