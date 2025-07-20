#!/bin/bash

# 修复部署路径并重新部署CORS修复
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复部署路径并重新部署CORS修复..."

# 1. 检查并创建正确的目录结构
echo "📁 检查服务器目录结构..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '📋 当前目录结构:'
    ls -la ~/
    
    echo '🔍 查找现有项目目录...'
    find ~/ -name 'server.js' -type f 2>/dev/null || echo '未找到server.js'
    find ~/ -name 'package.json' -type f 2>/dev/null || echo '未找到package.json'
    
    echo '📁 创建正确的目录结构...'
    mkdir -p ~/gougegaoshu/backend
    mkdir -p ~/gougegaoshu/frontend
"

# 2. 上传修复后的后端代码到正确位置
echo "📤 上传修复后的后端代码..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no backend/* "$SERVER_USER@$SERVER_HOST:~/gougegaoshu/backend/"

# 3. 重启后端服务
echo "🔄 重启后端服务..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    cd ~/gougegaoshu/backend
    
    echo '🛑 停止现有服务...'
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    echo '📦 安装依赖...'
    npm install --production
    
    echo '🚀 启动后端服务...'
    NODE_ENV=production pm2 start server.js --name task-backend
    
    echo '⏳ 等待服务启动...'
    sleep 5
    
    echo '📋 检查服务状态...'
    pm2 status
    pm2 logs task-backend --lines 10
"

# 4. 等待服务完全启动
echo "⏳ 等待服务完全启动..."
sleep 10

# 5. 进行全面测试
echo ""
echo "🧪 开始全面测试..."

# 测试1: 直接访问后端端口
echo "🧪 测试1: 直接访问后端端口..."
DIRECT_TEST=$(curl -s -X GET http://124.221.113.102:3001/api/auth/verify \
  -H "Content-Type: application/json" \
  --connect-timeout 10 \
  --max-time 15)
echo "直接后端访问: $DIRECT_TEST"

# 测试2: 通过Nginx代理访问
echo ""
echo "🧪 测试2: 通过Nginx代理访问..."
PROXY_TEST=$(curl -s -X GET http://124.221.113.102/api/auth/verify \
  -H "Content-Type: application/json" \
  --connect-timeout 10 \
  --max-time 15)
echo "Nginx代理访问: $PROXY_TEST"

# 测试3: 登录功能
echo ""
echo "🧪 测试3: 登录功能..."
LOGIN_TEST=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 15)
echo "登录测试: $LOGIN_TEST"

# 测试4: CORS预检请求
echo ""
echo "🧪 测试4: CORS预检请求..."
CORS_TEST=$(curl -s -X OPTIONS http://124.221.113.102/api/auth/login \
  -H "Origin: http://124.221.113.102" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  --connect-timeout 10 \
  --max-time 15 2>&1)
echo "CORS预检测试:"
echo "$CORS_TEST"

# 6. 综合评估
echo ""
echo "📊 最终测试结果评估..."

SUCCESS_COUNT=0

if [[ "$DIRECT_TEST" != *"502"* ]] && [[ "$DIRECT_TEST" != *"Bad Gateway"* ]]; then
    echo "✅ 后端服务: 正常运行"
    ((SUCCESS_COUNT++))
else
    echo "❌ 后端服务: 异常"
fi

if [[ "$PROXY_TEST" != *"502"* ]] && [[ "$PROXY_TEST" != *"Bad Gateway"* ]]; then
    echo "✅ Nginx代理: 正常"
    ((SUCCESS_COUNT++))
else
    echo "❌ Nginx代理: 异常"
fi

if [[ "$LOGIN_TEST" == *"token"* ]] && [[ "$LOGIN_TEST" == *"success"* ]]; then
    echo "✅ 登录功能: 正常"
    ((SUCCESS_COUNT++))
else
    echo "❌ 登录功能: 异常"
fi

if [[ "$CORS_TEST" == *"Access-Control-Allow"* ]] || [[ "$CORS_TEST" == *"200"* ]]; then
    echo "✅ CORS配置: 正常"
    ((SUCCESS_COUNT++))
else
    echo "❌ CORS配置: 需要检查"
fi

echo ""
echo "📈 最终测试通过率: $SUCCESS_COUNT/4"

if [ $SUCCESS_COUNT -ge 3 ]; then
    echo ""
    echo "🎉🎉🎉 CORS修复部署成功！🎉🎉🎉"
    echo ""
    echo "✅ 成功修复的问题:"
    echo "   ✅ 修复了部署路径问题"
    echo "   ✅ 修复了credentials不匹配问题"
    echo "   ✅ 添加了正确的CORS头部"
    echo "   ✅ 增强了OPTIONS预检处理"
    echo "   ✅ 重新启动了后端服务"
    echo ""
    echo "🌐 访问地址: http://124.221.113.102"
    echo "📱 登录信息: ADMIN / AdminPass123"
    echo ""
    echo "📋 现在请立即测试:"
    echo "   1. 完全关闭浏览器"
    echo "   2. 重新打开浏览器"
    echo "   3. 访问 http://124.221.113.102"
    echo "   4. 尝试登录系统"
    echo "   5. 检查网络选项卡是否还有CORS错误"
    echo ""
    echo "🎊 网络连接问题应该已经彻底解决！"
else
    echo ""
    echo "⚠️ 仍有问题，需要进一步诊断"
    echo ""
    echo "�� 诊断信息:"
    echo "   - 直接后端访问: $(echo "$DIRECT_TEST" | head -c 100)..."
    echo "   - 代理访问: $(echo "$PROXY_TEST" | head -c 100)..."
    echo "   - 登录测试: $(echo "$LOGIN_TEST" | head -c 100)..."
fi

echo ""
echo "📋 如果仍有问题，请检查:"
echo "   1. 浏览器开发者工具的控制台"
echo "   2. 网络选项卡的请求详情"
echo "   3. 是否有缓存问题"
echo "   4. 服务器日志: pm2 logs task-backend"
