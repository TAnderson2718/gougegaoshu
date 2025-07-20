#!/bin/bash

# 考研任务管理系统部署脚本
# 目标服务器: 124.221.113.102
# 用户: ubuntu
# 密码: ts*VK&2VK^5sjx7heLkB

set -e  # 遇到错误立即退出

echo "🚀 开始部署考研任务管理系统到服务器"
echo "=========================================="

# 服务器配置
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"
SERVER_PORT="22"
PROJECT_NAME="gougegaoshu"
REMOTE_DIR="/home/ubuntu/$PROJECT_NAME"

echo "📋 部署配置:"
echo "  服务器: $SERVER_HOST:$SERVER_PORT"
echo "  用户: $SERVER_USER"
echo "  项目目录: $REMOTE_DIR"
echo ""

# 检查本地环境
echo "🔍 检查本地环境..."
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass 未安装，正在安装..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            echo "❌ 请先安装 Homebrew 或手动安装 sshpass"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update && sudo apt-get install -y sshpass
    else
        echo "❌ 不支持的操作系统，请手动安装 sshpass"
        exit 1
    fi
fi

# 测试服务器连接
echo "🔗 测试服务器连接..."
if ! sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "echo '连接成功'" &> /dev/null; then
    echo "❌ 无法连接到服务器，请检查网络和凭据"
    exit 1
fi
echo "✅ 服务器连接成功"

# 准备本地文件
echo "📦 准备本地文件..."
# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo "  临时目录: $TEMP_DIR"

# 复制项目文件（排除不需要的文件）
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='*.log' \
          --exclude='coverage' \
          --exclude='build' \
          --exclude='.env' \
          --exclude='*.tmp' \
          --exclude='*.temp' \
          ./ "$TEMP_DIR/"

echo "✅ 文件准备完成"

# 上传文件到服务器
echo "📤 上传文件到服务器..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "
    # 创建项目目录
    mkdir -p $REMOTE_DIR
    
    # 备份现有项目（如果存在）
    if [ -d '$REMOTE_DIR' ]; then
        echo '📋 备份现有项目...'
        cp -r $REMOTE_DIR ${REMOTE_DIR}_backup_\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    fi
"

# 使用 rsync 上传文件
echo "  正在上传项目文件..."
sshpass -p "$SERVER_PASSWORD" rsync -avz -e "ssh -o StrictHostKeyChecking=no -p $SERVER_PORT" \
    "$TEMP_DIR/" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"

echo "✅ 文件上传完成"

# 清理临时目录
rm -rf "$TEMP_DIR"

# 在服务器上执行部署脚本
echo "🔧 在服务器上配置环境..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "
    cd $REMOTE_DIR
    
    echo '🔍 检查系统环境...'
    
    # 检查并安装 Node.js
    if ! command -v node &> /dev/null; then
        echo '📦 安装 Node.js...'
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    echo '✅ Node.js 版本:' \$(node --version)
    echo '✅ npm 版本:' \$(npm --version)
    
    # 检查并安装 MySQL
    if ! command -v mysql &> /dev/null; then
        echo '📦 安装 MySQL...'
        sudo apt-get update
        sudo apt-get install -y mysql-server mysql-client
        
        # 启动 MySQL 服务
        sudo systemctl start mysql
        sudo systemctl enable mysql
        
        echo '🔧 配置 MySQL...'
        # 设置 root 密码和创建应用数据库用户
        sudo mysql -e \"ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123';\"
        sudo mysql -u root -proot123 -e \"CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';\"
        sudo mysql -u root -proot123 -e \"GRANT ALL PRIVILEGES ON *.* TO 'taskapp'@'localhost';\"
        sudo mysql -u root -proot123 -e \"FLUSH PRIVILEGES;\"
    fi
    
    echo '✅ MySQL 服务状态:' \$(sudo systemctl is-active mysql)
    
    # 检查并安装 PM2
    if ! command -v pm2 &> /dev/null; then
        echo '📦 安装 PM2...'
        sudo npm install -g pm2
    fi
    
    echo '✅ PM2 版本:' \$(pm2 --version)
"

echo "✅ 环境配置完成"

# 安装依赖和构建项目
echo "📦 安装依赖和构建项目..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "
    cd $REMOTE_DIR
    
    echo '📦 安装后端依赖...'
    cd backend
    npm install --production
    
    echo '📦 安装前端依赖...'
    cd ../frontend
    npm install

    echo '⚙️ 配置前端环境变量...'
    cat > .env << 'EOF'
REACT_APP_API_BASE_URL=http://124.221.113.102:3001/api
# 生产服务器API配置
EOF

    echo '🏗️ 构建前端项目...'
    npm run build
    
    echo '✅ 依赖安装和构建完成'
"

# 创建环境配置文件
echo "⚙️ 创建环境配置..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "
    cd $REMOTE_DIR/backend
    
    # 创建 .env 文件
    cat > .env << 'EOF'
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=taskapp
DB_PASSWORD=password
DB_NAME=task_manager_db

# 服务器配置
PORT=3001
NODE_ENV=production

# JWT 密钥
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 其他配置
CORS_ORIGIN=http://124.221.113.102:3000
EOF
    
    echo '✅ 环境配置文件创建完成'
"

# 初始化数据库
echo "🗄️ 初始化数据库..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "
    cd $REMOTE_DIR/backend
    
    echo '🗄️ 创建数据库和表结构...'
    node setup.js
    
    echo '✅ 数据库初始化完成'
"

# 创建 PM2 配置文件
echo "⚙️ 创建 PM2 配置..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "
    cd $REMOTE_DIR
    
    # 创建 PM2 配置文件
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'task-manager-backend',
      script: './backend/server.js',
      cwd: '$REMOTE_DIR',
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
      cwd: '$REMOTE_DIR/frontend',
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
    
    # 创建日志目录
    mkdir -p logs
    
    # 安装 serve（用于服务前端静态文件）
    sudo npm install -g serve
    
    echo '✅ PM2 配置完成'
"

echo "✅ 部署配置完成"

echo ""
echo "🎉 部署完成！"
echo "=========================================="
echo "📋 部署信息:"
echo "  前端地址: http://$SERVER_HOST:3000"
echo "  后端地址: http://$SERVER_HOST:3001"
echo "  项目目录: $REMOTE_DIR"
echo ""
echo "🔧 启动服务:"
echo "  ssh ubuntu@$SERVER_HOST"
echo "  cd $REMOTE_DIR"
echo "  pm2 start ecosystem.config.js"
echo ""
echo "📊 查看服务状态:"
echo "  pm2 status"
echo "  pm2 logs"
echo ""
echo "🔄 重启服务:"
echo "  pm2 restart all"
echo ""
