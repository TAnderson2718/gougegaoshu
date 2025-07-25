#!/bin/bash

# SQLite版本部署脚本
# 适用于腾讯云服务器部署

SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🚀 开始部署SQLite版本的任务管理系统..."

# 检查sshpass是否安装
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass未安装，请先安装: brew install sshpass (macOS) 或 apt-get install sshpass (Linux)"
    exit 1
fi

echo "📦 同步代码到服务器..."
rsync -avz --exclude node_modules --exclude .git --exclude backend/data . "$SERVER_USER@$SERVER_HOST":~/gougegaoshu/

echo "🔧 配置服务器环境..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    cd ~/gougegaoshu
    
    echo '📋 检查Node.js环境...'
    if ! command -v node &> /dev/null; then
        echo '📦 安装Node.js...'
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    echo '✅ Node.js版本:' \$(node --version)
    echo '✅ npm版本:' \$(npm --version)
    
    echo '📦 安装后端依赖...'
    cd backend
    npm install
    
    echo '🗄️ 初始化SQLite数据库...'
    npm run db:init
    
    echo '⚙️ 配置生产环境变量...'
    cat > .env << 'ENV_CONFIG'
# 生产环境配置
NODE_ENV=production
PORT=3001

# SQLite数据库配置（无需修改）
# 数据库文件位于 backend/data/task_manager.db

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random_for_security_2024
JWT_EXPIRES_IN=7d

# 初始密码配置
INITIAL_PASSWORD=Hello888
ADMIN_PASSWORD=AdminPass123
ENV_CONFIG
    
    echo '🛑 停止旧服务...'
    pm2 stop all || true
    pm2 delete all || true
    
    echo '🚀 启动后端服务...'
    pm2 start server.js --name 'task-manager-backend'
    
    echo '📦 构建前端...'
    cd ../frontend
    npm install
    npm run build
    
    echo '🌐 部署前端到nginx...'
    sudo cp -r build/* /var/www/gougegaoshu/
    
    echo '🔄 重启nginx...'
    sudo systemctl restart nginx
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🧪 测试服务...'
    sleep 5
    curl -s http://localhost:3001/health || echo '⚠️ 后端服务可能未正常启动'
    curl -s http://localhost/ || echo '⚠️ 前端服务可能未正常启动'
"

echo ""
echo "🎉 SQLite版本部署完成！"
echo ""
echo "🔗 访问地址:"
echo "   前端: http://$SERVER_HOST"
echo "   后端API: http://$SERVER_HOST/api"
echo ""
echo "🔑 默认登录信息:"
echo "   管理员: admin / AdminPass123"
echo "   学生: ST001 / Hello888"
echo "   学生: ST002 / Hello888"
echo ""
echo "📊 数据库信息:"
echo "   类型: SQLite"
echo "   位置: ~/gougegaoshu/backend/data/task_manager.db"
echo "   备份: cp ~/gougegaoshu/backend/data/task_manager.db ~/backup/"
echo ""
echo "🧪 测试API连接..."
sleep 5

# 测试API连接
echo "测试管理员登录..."
curl -X POST http://$SERVER_HOST/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"admin","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 30

echo ""
echo "✅ 部署完成！"
