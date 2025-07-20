#!/bin/bash

# 修复部署问题脚本
# 主要解决bcrypt编译问题

set -e

SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"
REMOTE_DIR="/home/ubuntu/gougegaoshu"

echo "🔧 修复服务器部署问题..."

# 在服务器上安装编译工具和修复bcrypt
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '📦 安装编译工具...'
    sudo apt-get update
    sudo apt-get install -y build-essential g++ make python3-dev
    
    echo '🔧 修复bcrypt依赖...'
    cd $REMOTE_DIR/backend
    
    # 删除有问题的node_modules
    rm -rf node_modules package-lock.json
    
    # 重新安装依赖
    npm install --production
    
    echo '✅ 依赖修复完成'
    
    echo '🗄️ 初始化数据库...'
    node setup.js
    
    echo '🚀 启动服务...'
    pm2 stop all || true
    pm2 start ecosystem.config.js
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '✅ 修复完成！'
"

echo "🎉 部署修复完成！"
echo "🌐 访问地址: http://$SERVER_HOST:3000"
echo "🔗 API地址: http://$SERVER_HOST:3001"
