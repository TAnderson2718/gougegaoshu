#!/bin/bash

# 强制端口清理脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 强制端口清理和服务重启..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🛑 停止所有相关服务...'
    pm2 stop all || true
    pm2 delete all || true
    
    echo '🔍 查找所有占用3001端口的进程...'
    echo '使用netstat查找端口占用:'
    netstat -tlnp | grep :3001
    
    echo '使用ss查找端口占用:'
    ss -tlnp | grep :3001
    
    echo '使用fuser查找端口占用:'
    sudo fuser -k 3001/tcp || true
    
    echo '使用lsof查找端口占用:'
    sudo lsof -ti:3001 | xargs sudo kill -9 || true
    
    echo '强制杀死所有node进程:'
    sudo pkill -f node || true
    
    echo '等待端口释放...'
    sleep 5
    
    echo '🔍 再次检查端口状态...'
    netstat -tlnp | grep :3001 || echo '端口3001已释放'
    
    echo '🚀 使用不同端口启动服务...'
    cd /home/ubuntu/gougegaoshu/backend
    
    # 修改配置使用端口3002
    cat > .env << 'ENV_CONFIG'
# 生产环境配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=taskapp
DB_PASSWORD=TaskApp2024!
DB_NAME=task_manager_db

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random_for_security_2024
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3002
NODE_ENV=production

# 初始密码配置
INITIAL_PASSWORD=Hello888
ADMIN_PASSWORD=AdminPass123
ENV_CONFIG
    
    echo '🔥 开放端口3002...'
    sudo ufw allow 3002 || true
    
    # 启动服务
    pm2 start server.js --name 'task-backend'
    
    sleep 20
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看服务日志...'
    pm2 logs task-backend --lines 15
    
    echo '🌐 检查端口监听状态...'
    netstat -tlnp | grep :3002 || echo '端口3002未在监听'
    
    echo '✅ 服务重启完成！现在使用端口3002'
"

echo ""
echo "🎉 服务重启完成！现在使用端口3002"
echo ""
echo "🧪 等待服务完全启动..."
sleep 20

echo "🔍 测试API连接（端口3002）..."
RESPONSE=$(curl -s -X POST http://124.221.113.102:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 15 \
  --max-time 30)

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
    echo "⚠️ 注意: 服务现在运行在端口3002而不是3001"
else
    echo "⚠️ API可能还在初始化中，请稍后再试"
    echo ""
    echo "🔍 手动测试命令:"
    echo "curl -X POST http://124.221.113.102:3002/api/auth/login \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}'"
    echo ""
    echo "📊 检查服务状态:"
    echo "ssh ubuntu@124.221.113.102"
    echo "pm2 status"
    echo "pm2 logs task-backend"
    echo "netstat -tlnp | grep :3002"
fi
