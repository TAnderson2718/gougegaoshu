#!/bin/bash

echo "🔧 修复bcrypt编译问题 - 使用bcryptjs替代"
echo "================================================"

# 进入后端目录
cd /home/ubuntu/gougegaoshu/backend

# 停止服务
echo "🛑 停止后端服务..."
pm2 stop task-backend

# 卸载bcrypt
echo "📦 卸载bcrypt..."
npm uninstall bcrypt

# 安装bcryptjs
echo "📦 安装bcryptjs..."
npm install bcryptjs

# 修改代码中的引用
echo "🔄 修改代码引用..."
sed -i "s/require('bcrypt')/require('bcryptjs')/g" routes/auth.js
sed -i "s/require('bcrypt')/require('bcryptjs')/g" routes/admin.js

# 修改package.json
echo "📝 更新package.json..."
sed -i 's/"bcrypt":/"bcryptjs":/g' package.json

# 重启服务
echo "🚀 重启后端服务..."
pm2 start task-backend

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "📋 检查服务状态..."
pm2 status
pm2 logs task-backend --lines 10

echo "✅ bcrypt问题修复完成！"
