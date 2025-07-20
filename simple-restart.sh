#!/bin/bash

# 简单重启脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🚀 简单重启服务..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '📂 进入项目目录...'
    cd /home/ubuntu/gougegaoshu/backend
    
    echo '🔧 确保环境配置正确...'
    cat > .env << 'ENV_CONFIG'
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=taskapp
DB_PASSWORD=TaskApp2024!
DB_NAME=task_manager_db
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random_for_security_2024
JWT_EXPIRES_IN=7d
PORT=3002
NODE_ENV=production
INITIAL_PASSWORD=Hello888
ADMIN_PASSWORD=AdminPass123
ENV_CONFIG
    
    echo '🛑 清理PM2进程...'
    pm2 delete all || true
    
    echo '🔥 开放端口3002...'
    sudo ufw allow 3002 || true
    
    echo '🚀 启动服务...'
    pm2 start server.js --name 'task-backend'
    
    sleep 15
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🌐 检查端口...'
    netstat -tlnp | grep :3002 || echo '端口3002未在监听'
"

echo ""
echo "🧪 等待服务启动..."
sleep 15

echo "🔍 测试API连接..."
RESPONSE=$(curl -s -X POST http://124.221.113.102:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 20)

echo "API响应: $RESPONSE"

if [[ "$RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉🎉🎉 部署完全成功！🎉🎉🎉"
    echo ""
    echo "🌐 考研任务管理系统访问信息："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 服务器地址: 124.221.113.102"
    echo "🔗 API地址: http://124.221.113.102:3002/api"
    echo ""
    echo "📱 登录信息:"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / NewPass123"
    echo ""
    echo "🔧 数据库信息:"
    echo "   数据库: task_manager_db"
    echo "   用户: taskapp"
    echo "   密码: TaskApp2024!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎊 恭喜！考研任务管理系统已成功部署到腾讯云服务器！"
    echo ""
    echo "📋 系统功能:"
    echo "   ✅ 管理员登录和任务导入"
    echo "   ✅ 学生登录和任务管理"
    echo "   ✅ 密码修改功能"
    echo "   ✅ 任务进度跟踪"
    echo "   ✅ 数据持久化存储"
    echo "   ✅ 定时任务调度"
    echo ""
    echo "🧪 建议测试:"
    echo "   1. 管理员登录测试"
    echo "   2. 导入任务CSV文件"
    echo "   3. 学生登录测试"
    echo "   4. 任务完成功能测试"
    echo "   5. 密码修改功能测试"
    echo ""
    echo "🔗 API测试命令:"
    echo "   # 管理员登录"
    echo "   curl -X POST http://124.221.113.102:3002/api/auth/login \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}'"
    echo ""
    echo "   # 学生登录"
    echo "   curl -X POST http://124.221.113.102:3002/api/auth/login \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -d '{\"userId\":\"ST001\",\"password\":\"Hello888\"}'"
    echo ""
    echo "⚠️ 注意: 服务现在运行在端口3002"
else
    echo ""
    echo "⚠️ API测试失败或无响应"
    echo "响应内容: '$RESPONSE'"
    echo ""
    echo "🔍 手动检查步骤："
    echo "   1. ssh ubuntu@124.221.113.102"
    echo "   2. cd /home/ubuntu/gougegaoshu/backend"
    echo "   3. pm2 status"
    echo "   4. pm2 logs task-backend"
    echo "   5. netstat -tlnp | grep :3002"
    echo "   6. curl -X POST http://localhost:3002/api/auth/login -H \"Content-Type: application/json\" -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}'"
fi
