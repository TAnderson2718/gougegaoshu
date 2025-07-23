#!/bin/bash

# 🚀 快速启动脚本 - 狗哥高数任务管理系统
# 使用方法：bash quick_start.sh

echo "🚀 快速启动狗哥高数系统..."

# 1. 启动MySQL
echo "启动MySQL..."
sudo systemctl start mysql
sudo systemctl enable mysql

# 2. 进入项目目录并启动后端
echo "启动后端服务..."
cd /home/ubuntu/gougegaoshu/backend
pm2 delete backend 2>/dev/null || true
pm2 start server.js --name "backend"

# 3. 启动前端
echo "启动前端服务..."
cd /home/ubuntu/gougegaoshu/frontend
pm2 delete frontend 2>/dev/null || true
pm2 start npm --name "frontend" -- start

# 4. 启动Nginx
echo "启动Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# 5. 等待启动
echo "等待服务启动..."
sleep 10

# 6. 显示状态
echo ""
echo "📊 服务状态："
pm2 status
echo ""
echo "🌐 访问地址："
echo "前端: http://124.221.113.102/"
echo "后端: http://124.221.113.102:3001/health"
echo ""
echo "✅ 启动完成！"
