#!/bin/bash

# 修复 bcrypt 编译错误的脚本

echo "🔧 修复 bcrypt 编译错误"
echo "=========================================="

# 1. 安装构建工具
echo "📦 安装构建工具..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip build-essential make g++

# 2. 安装 node-gyp
echo "📦 安装 node-gyp..."
sudo npm install -g node-gyp

# 3. 配置 npm
echo "⚙️ 配置 npm..."
npm config set python python3

# 4. 进入后端目录
cd /home/dev_user/gougegaoshu/backend

# 5. 清理依赖
echo "🧹 清理现有依赖..."
rm -rf node_modules package-lock.json

# 6. 尝试重新安装
echo "📦 重新安装依赖..."
npm install --production

# 7. 如果还是失败，使用 bcryptjs
if [ $? -ne 0 ]; then
    echo "❌ bcrypt 安装失败，切换到 bcryptjs..."
    
    # 修改 package.json
    sed -i 's/"bcrypt":/"bcryptjs":/g' package.json
    
    # 安装 bcryptjs
    npm install bcryptjs --save
    
    # 修改代码中的引用
    find . -name "*.js" -type f -exec sed -i "s/require('bcrypt')/require('bcryptjs')/g" {} \;
    find . -name "*.js" -type f -exec sed -i 's/require("bcrypt")/require("bcryptjs")/g' {} \;
    
    echo "✅ 已切换到 bcryptjs"
fi

# 8. 验证安装
echo "🧪 验证安装..."
node -e "console.log('Node.js 正常工作'); const bcrypt = require('bcryptjs') || require('bcrypt'); console.log('bcrypt 模块加载成功');"

echo "✅ bcrypt 问题修复完成"
