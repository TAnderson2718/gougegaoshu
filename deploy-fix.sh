#!/bin/bash

echo "🚀 部署bcrypt修复版本"
echo "========================"

# 服务器信息
SERVER="ubuntu@124.221.113.102"
REMOTE_PATH="/home/ubuntu/gougegaoshu/backend"

echo "📦 准备修复后的文件..."

# 创建临时目录
mkdir -p temp-backend
cp -r backend/* temp-backend/

# 在临时目录中修复bcrypt问题
cd temp-backend

# 修改package.json
sed -i 's/"bcrypt":/"bcryptjs":/g' package.json

# 修改代码文件
sed -i "s/require('bcrypt')/require('bcryptjs')/g" routes/auth.js
sed -i "s/require('bcrypt')/require('bcryptjs')/g" routes/admin.js

echo "📤 上传修复后的文件..."

# 上传到服务器
scp -r . $SERVER:$REMOTE_PATH/

echo "🔧 在服务器上执行修复..."

# 在服务器上执行修复命令
ssh $SERVER << 'EOF'
cd /home/ubuntu/gougegaoshu/backend
echo "🛑 停止服务..."
pm2 stop task-backend 2>/dev/null || true

echo "📦 安装bcryptjs..."
npm uninstall bcrypt 2>/dev/null || true
npm install bcryptjs

echo "🚀 启动服务..."
pm2 start server.js --name task-backend

echo "⏳ 等待服务启动..."
sleep 5

echo "📋 检查服务状态..."
pm2 status
pm2 logs task-backend --lines 5

echo "✅ 修复完成！"
EOF

# 清理临时文件
cd ..
rm -rf temp-backend

echo "🎉 部署完成！"
