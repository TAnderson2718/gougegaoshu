#!/bin/bash

# 开发环境启动脚本
# 使用方法: chmod +x start.sh && ./start.sh

echo "🚀 启动考研任务管理系统开发环境"
echo "================================"

# 检查是否在项目根目录
if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 检查后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo "❌ 后端依赖未安装，请先运行: cd backend && npm install"
    exit 1
fi

# 检查前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo "❌ 前端依赖未安装，请先运行: cd frontend && npm install"
    exit 1
fi

# 检查环境变量文件
if [ ! -f "backend/.env" ]; then
    echo "❌ 后端环境变量文件不存在，请先运行安装脚本"
    exit 1
fi

# 函数：清理进程
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "✅ 后端服务已停止"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "✅ 前端服务已停止"
    fi
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

echo "📦 检查服务状态..."

# 检查端口占用
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口3001已被占用，请先停止相关服务"
    lsof -Pi :3001 -sTCP:LISTEN
    exit 1
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口3000已被占用，请先停止相关服务"
    lsof -Pi :3000 -sTCP:LISTEN
    exit 1
fi

echo "✅ 端口检查通过"

# 启动后端服务
echo ""
echo "🔧 启动后端服务..."
cd backend
npm run dev &
BACKEND_PID=$!
echo "✅ 后端服务已启动 (PID: $BACKEND_PID, Port: 3001)"

# 等待后端启动
echo "⏳ 等待后端服务启动..."
sleep 5

# 检查后端是否启动成功
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ 后端服务健康检查通过"

# 启动前端服务
echo ""
echo "🎨 启动前端服务..."
cd ../frontend

# 设置环境变量以防止自动打开浏览器
export BROWSER=none

npm start &
FRONTEND_PID=$!
echo "✅ 前端服务已启动 (PID: $FRONTEND_PID, Port: 3000)"

# 等待前端启动
echo "⏳ 等待前端服务启动..."
sleep 10

# 检查前端是否启动成功
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ 前端服务启动失败"
    cleanup
    exit 1
fi

echo ""
echo "🎉 所有服务启动成功！"
echo ""
echo "📱 访问地址:"
echo "   前端应用: http://localhost:3000"
echo "   后端API:  http://localhost:3001"
echo "   健康检查: http://localhost:3001/health"
echo ""
echo "🔑 默认登录信息:"
echo "   学生ID: ST001 或 ST002"
echo "   密码: Hello888"
echo ""
echo "📝 日志查看:"
echo "   后端日志: tail -f backend/logs/app.log (如果有)"
echo "   前端日志: 查看此终端输出"
echo ""
echo "⚠️  按 Ctrl+C 停止所有服务"
echo ""

# 打开浏览器 (可选)
if command -v open &> /dev/null; then
    # macOS
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open http://localhost:3000
elif command -v start &> /dev/null; then
    # Windows
    start http://localhost:3000
fi

# 保持脚本运行
wait
