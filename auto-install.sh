#!/bin/bash

# 自动安装和部署脚本
set -e

echo "🚀 开始自动安装和部署"
echo "=========================================="

# 1. 更新系统
echo "📦 更新系统包..."
sudo apt update

# 2. 安装 Node.js
echo "📦 安装 Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 3. 安装 MySQL
echo "📦 安装 MySQL..."
if ! command -v mysql &> /dev/null; then
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server mysql-client
    sudo systemctl start mysql
    sudo systemctl enable mysql
fi

echo "✅ MySQL 状态: $(sudo systemctl is-active mysql)"

# 4. 配置 MySQL
echo "🔧 配置 MySQL..."
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123';" 2>/dev/null || true
sudo mysql -u root -proot123 -e "CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';" 2>/dev/null || true
sudo mysql -u root -proot123 -e "GRANT ALL PRIVILEGES ON *.* TO 'taskapp'@'localhost';" 2>/dev/null || true
sudo mysql -u root -proot123 -e "FLUSH PRIVILEGES;" 2>/dev/null || true

# 5. 安装 PM2 和 serve
echo "📦 安装 PM2 和 serve..."
sudo npm install -g pm2 serve

echo "✅ PM2 版本: $(pm2 --version)"

# 6. 检查项目文件
echo "📁 检查项目文件..."
cd /home/dev_user

if [ ! -f "gougegaoshu-deploy.tar.gz" ]; then
    echo "❌ 部署包不存在，请先上传 gougegaoshu-deploy.tar.gz"
    exit 1
fi

# 7. 解压和部署项目
echo "📦 解压项目..."
if [ -d "gougegaoshu" ]; then
    mv gougegaoshu gougegaoshu_backup_$(date +%Y%m%d_%H%M%S)
fi

tar -xzf gougegaoshu-deploy.tar.gz
mkdir -p gougegaoshu

# 移动文件到项目目录
for item in backend frontend database docs scripts *.md *.js *.sh *.csv *.html; do
    if [ -e "$item" ]; then
        mv "$item" gougegaoshu/ 2>/dev/null || true
    fi
done

cd gougegaoshu

# 8. 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
npm install --production

# 9. 安装前端依赖并构建
echo "📦 安装前端依赖并构建..."
cd ../frontend
npm install
npm run build

# 10. 创建环境配置
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

# 11. 初始化数据库
echo "🗄️ 初始化数据库..."
node setup.js

# 12. 创建 PM2 配置
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

# 13. 配置防火墙
echo "🛡️ 配置防火墙..."
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw allow 22

# 14. 启动服务
echo "🚀 启动服务..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 15. 验证部署
echo "🧪 验证部署..."
sleep 5
pm2 status

echo "测试后端 API:"
curl -s http://localhost:3001/api/health && echo " ✅ 后端正常" || echo " ❌ 后端异常"

echo "测试前端:"
curl -s -I http://localhost:3000 | head -n 1 && echo " ✅ 前端正常" || echo " ❌ 前端异常"

echo ""
echo "🎉 部署完成！"
echo "=========================================="
echo "🌐 访问地址:"
echo "  前端: http://124.221.113.102:3000"
echo "  后端: http://124.221.113.102:3001"
echo ""
echo "📋 默认登录信息:"
echo "  管理员: admin / admin123"
echo "  学生1: ST001 / password"
echo "  学生2: ST002 / password"
echo ""
