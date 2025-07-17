#!/bin/bash

echo "🧹 清理所有进程..."
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true

# 强制杀死端口占用进程
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

echo "⏳ 等待进程清理完成..."
sleep 5

echo "🔍 检查端口状态..."
echo "端口3000状态:"
lsof -i :3000 || echo "  ✅ 端口3000已释放"
echo "端口3001状态:"
lsof -i :3001 || echo "  ✅ 端口3001已释放"

echo ""
echo "🚀 启动后端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/backend
nohup npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "后端进程ID: $BACKEND_PID"

echo "⏳ 等待后端启动..."
sleep 10

echo "🧪 测试后端健康检查..."
curl -s http://localhost:3001/health || echo "后端未响应"

echo ""
echo "🌐 启动前端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/frontend
BROWSER=none nohup npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端进程ID: $FRONTEND_PID"

echo "⏳ 等待前端启动..."
sleep 15

echo ""
echo "🧪 最终测试..."
echo "后端健康检查:"
curl -s http://localhost:3001/health | head -3 || echo "后端无响应"

echo ""
echo "前端页面测试:"
curl -s -I http://localhost:3000 | head -3 || echo "前端无响应"

echo ""
echo "✅ 启动完成！"
echo "📱 请在浏览器中访问:"
echo "   前端: http://localhost:3000"
echo "   后端: http://localhost:3001"
echo ""
echo "📊 进程信息:"
echo "   后端PID: $BACKEND_PID"
echo "   前端PID: $FRONTEND_PID"
echo ""
echo "📄 日志文件:"
echo "   后端日志: backend.log"
echo "   前端日志: frontend.log"
