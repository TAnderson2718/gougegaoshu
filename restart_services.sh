#!/bin/bash

echo "🔄 重启考研任务管理系统服务..."

# 清理现有进程
echo "🧹 清理现有进程..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true

echo "⏳ 等待进程清理完成..."
sleep 3

# 启动后端服务
echo "🚀 启动后端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/backend
node server.js &
BACKEND_PID=$!

echo "⏳ 等待后端启动..."
sleep 5

# 测试后端
echo "🧪 测试后端服务..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ 后端服务启动成功"
else
    echo "❌ 后端服务启动失败"
    exit 1
fi

# 启动前端服务
echo "🚀 启动前端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/frontend
npm start &
FRONTEND_PID=$!

echo "⏳ 等待前端启动..."
sleep 15

# 测试前端
echo "🧪 测试前端服务..."
if curl -s -I http://localhost:3000 | head -1 | grep -q "200"; then
    echo "✅ 前端服务启动成功"
    echo "🌐 访问地址: http://localhost:3000"
else
    echo "❌ 前端服务启动失败"
fi

echo "🎉 服务重启完成！"
echo "后端PID: $BACKEND_PID"
echo "前端PID: $FRONTEND_PID"
