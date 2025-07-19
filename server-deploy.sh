#!/bin/bash

# 服务器端一键部署脚本
# 在服务器上执行此脚本完成部署

set -e

echo "🚀 开始服务器端部署"
echo "=========================================="

# 检查是否在正确的目录
if [ ! -f "gougegaoshu-deploy.tar.gz" ]; then
    echo "❌ 找不到部署包 gougegaoshu-deploy.tar.gz"
    echo "请确保已上传部署包到 /home/dev_user/ 目录"
    exit 1
fi

echo "📦 解压项目文件..."
if [ -d "gougegaoshu" ]; then
    echo "📋 备份现有项目..."
    mv gougegaoshu gougegaoshu_backup_$(date +%Y%m%d_%H%M%S)
fi

tar -xzf gougegaoshu-deploy.tar.gz
mkdir -p gougegaoshu
# 移动所有文件到项目目录
find . -maxdepth 1 -type f -name "*.md" -o -name "*.js" -o -name "*.sh" -o -name "*.csv" -o -name "*.html" | xargs -I {} mv {} gougegaoshu/ 2>/dev/null || true
find . -maxdepth 1 -type d -name "backend" -o -name "frontend" -o -name "database" -o -name "docs" -o -name "scripts" | xargs -I {} mv {} gougegaoshu/ 2>/dev/null || true

cd gougegaoshu
echo "✅ 项目文件解压完成"

echo "📦 安装后端依赖..."
cd backend
npm install --production
echo "✅ 后端依赖安装完成"

echo "📦 安装前端依赖并构建..."
cd ../frontend
npm install
npm run build
echo "✅ 前端构建完成"

echo "⚙️ 创建环境配置..."
cd ../backend
cat > .env << 'EOF'
DB_HOST=localhost
DB_PORT=3306
DB_USER=taskapp
DB_PASSWORD=password
DB_NAME=task_manager_db
PORT=3001
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://124.221.113.102:3000
EOF
echo "✅ 环境配置创建完成"

echo "🗄️ 初始化数据库..."
node setup.js
echo "✅ 数据库初始化完成"

echo "⚙️ 创建 PM2 配置..."
cd ..
mkdir -p logs

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'task-manager-backend',
      script: './backend/server.js',
      cwd: '/home/dev_user/gougegaoshu',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'task-manager-frontend',
      script: 'serve',
      args: '-s build -l 3000',
      cwd: '/home/dev_user/gougegaoshu/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF
echo "✅ PM2 配置创建完成"

echo "🛑 停止现有服务..."
pm2 delete all 2>/dev/null || true

echo "🚀 启动服务..."
pm2 start ecosystem.config.js
pm2 save

echo "📊 服务状态:"
pm2 status

echo "🧪 测试服务..."
sleep 5
echo "测试后端 API:"
curl -s http://localhost:3001/api/health || echo "后端服务可能还在启动中..."

echo ""
echo "🎉 部署完成！"
echo "=========================================="
echo "🌐 访问地址:"
echo "  前端: http://124.221.113.102:3000"
echo "  后端: http://124.221.113.102:3001"
echo ""
echo "🔧 管理命令:"
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs"
echo "  重启服务: pm2 restart all"
echo "  停止服务: pm2 stop all"
echo ""
echo "📋 默认登录信息:"
echo "  管理员: admin / admin123"
echo "  学生1: ST001 / password"
echo "  学生2: ST002 / password"
echo ""
