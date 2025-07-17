#!/bin/bash

echo "🔧 自动修复登录问题..."

# 1. 完全清理所有相关进程
echo "🧹 清理所有相关进程..."
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "node.*server" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

echo "⏳ 等待进程清理完成..."
sleep 5

# 2. 启动后端服务
echo "🚀 启动后端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/backend
node server.js &
BACKEND_PID=$!
echo "后端PID: $BACKEND_PID"

# 3. 等待后端启动并测试
echo "⏳ 等待后端启动..."
sleep 10

echo "🧪 测试后端连接..."
for i in {1..5}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ 后端服务启动成功"
        break
    else
        echo "⏳ 等待后端启动... ($i/5)"
        sleep 3
    fi
done

# 4. 启动前端服务
echo "🌐 启动前端服务..."
cd /Users/daniel/Documents/GitHub/gougegaoshu/frontend
BROWSER=none npm start &
FRONTEND_PID=$!
echo "前端PID: $FRONTEND_PID"

# 5. 等待前端启动
echo "⏳ 等待前端启动..."
sleep 20

# 6. 测试前端连接
echo "🧪 测试前端连接..."
for i in {1..3}; do
    if curl -s -I http://localhost:3000 | head -1 | grep -q "200"; then
        echo "✅ 前端服务启动成功"
        break
    else
        echo "⏳ 等待前端启动... ($i/3)"
        sleep 5
    fi
done

# 7. 测试API代理
echo "🔗 测试API代理..."
sleep 5
API_TEST=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"studentId":"ST001","password":"Hello888"}' 2>/dev/null || echo "failed")

if [[ $API_TEST == *"success"* ]] || [[ $API_TEST == *"token"* ]]; then
    echo "✅ API代理工作正常"
elif [[ $API_TEST == *"密码错误"* ]]; then
    echo "✅ API代理工作正常（密码验证正常）"
else
    echo "⚠️  API代理可能有问题: $API_TEST"
fi

echo ""
echo "🎉 修复完成！"
echo "📱 访问地址: http://localhost:3000"
echo "📊 进程信息:"
echo "   后端PID: $BACKEND_PID"
echo "   前端PID: $FRONTEND_PID"
echo ""
echo "💡 现在可以尝试登录："
echo "   学生账号: ST001 / Hello888"
echo "   管理员账号: ADMIN001 / Hello888"
echo ""
echo "🔍 如果仍有问题，请检查浏览器控制台是否还有404错误"
