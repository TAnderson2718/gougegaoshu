#!/bin/bash

# 快速部署脚本
# 使用 scp 上传文件并在服务器上执行部署

set -e

echo "🚀 快速部署考研任务管理系统"
echo "=========================================="

# 服务器配置
SERVER="124.221.113.102"
USER="dev_user"
PASSWORD="123456"
PROJECT_DIR="/home/dev_user/gougegaoshu"

echo "📦 准备部署文件..."

# 创建部署包（排除不需要的文件）
echo "  正在打包项目文件..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='coverage' \
    --exclude='build' \
    --exclude='.env' \
    --exclude='*.tmp' \
    --exclude='*.temp' \
    --exclude='deploy.sh' \
    --exclude='quick-deploy.sh' \
    --exclude='manual-deploy-guide.md' \
    --exclude='server-setup.sh' \
    --exclude='gougegaoshu-deploy.tar.gz' \
    -czf gougegaoshu-deploy.tar.gz *

echo "✅ 项目打包完成"

# 检查 sshpass
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass 未安装"
    echo "请安装 sshpass:"
    echo "  macOS: brew install hudochenkov/sshpass/sshpass"
    echo "  Ubuntu: sudo apt-get install sshpass"
    exit 1
fi

# 测试连接
echo "🔗 测试服务器连接..."
if ! sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" "echo '连接成功'" &> /dev/null; then
    echo "❌ 无法连接到服务器"
    exit 1
fi
echo "✅ 服务器连接成功"

# 上传文件
echo "📤 上传部署包..."
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no gougegaoshu-deploy.tar.gz "$USER@$SERVER:/home/dev_user/"
echo "✅ 文件上传完成"

# 在服务器上执行部署
echo "🔧 在服务器上执行部署..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$USER@$SERVER" << 'ENDSSH'
set -e

echo "🔧 开始服务器端部署..."

# 解压项目
cd /home/dev_user
if [ -d "gougegaoshu" ]; then
    echo "📋 备份现有项目..."
    mv gougegaoshu gougegaoshu_backup_$(date +%Y%m%d_%H%M%S)
fi

echo "📦 解压新项目..."
tar -xzf gougegaoshu-deploy.tar.gz
mv . gougegaoshu 2>/dev/null || mkdir -p gougegaoshu && tar -xzf gougegaoshu-deploy.tar.gz -C gougegaoshu --strip-components=1
cd gougegaoshu

echo "🔍 检查系统环境..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "📦 安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js 版本: $(node --version)"

# 检查 MySQL
if ! command -v mysql &> /dev/null; then
    echo "📦 安装 MySQL..."
    sudo apt-get update
    sudo apt-get install -y mysql-server mysql-client
    sudo systemctl start mysql
    sudo systemctl enable mysql
    
    # 配置 MySQL
    sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123';" 2>/dev/null || true
    sudo mysql -u root -proot123 -e "CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';" 2>/dev/null || true
    sudo mysql -u root -proot123 -e "GRANT ALL PRIVILEGES ON *.* TO 'taskapp'@'localhost';" 2>/dev/null || true
    sudo mysql -u root -proot123 -e "FLUSH PRIVILEGES;" 2>/dev/null || true
fi

echo "✅ MySQL 状态: $(sudo systemctl is-active mysql)"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    sudo npm install -g pm2
fi

if ! command -v serve &> /dev/null; then
    echo "📦 安装 serve..."
    sudo npm install -g serve
fi

echo "✅ PM2 版本: $(pm2 --version)"

# 安装依赖
echo "📦 安装项目依赖..."
cd backend
npm install --production
cd ../frontend
npm install
npm run build

# 创建环境配置
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

# 初始化数据库
echo "🗄️ 初始化数据库..."
node setup.js

# 创建 PM2 配置
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

# 停止现有服务
echo "🛑 停止现有服务..."
pm2 delete all 2>/dev/null || true

# 启动服务
echo "🚀 启动服务..."
pm2 start ecosystem.config.js
pm2 save

echo "📊 服务状态:"
pm2 status

echo "✅ 部署完成！"
echo "🌐 访问地址:"
echo "  前端: http://124.221.113.102:3000"
echo "  后端: http://124.221.113.102:3001"

ENDSSH

# 清理本地文件
rm -f gougegaoshu-deploy.tar.gz

echo ""
echo "🎉 部署完成！"
echo "=========================================="
echo "🌐 访问地址:"
echo "  前端: http://124.221.113.102:3000"
echo "  后端: http://124.221.113.102:3001"
echo ""
echo "🔧 管理命令:"
echo "  ssh dev_user@124.221.113.102"
echo "  cd /home/dev_user/gougegaoshu"
echo "  pm2 status"
echo "  pm2 logs"
echo ""
