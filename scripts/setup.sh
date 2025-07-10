#!/bin/bash

# 考研任务管理系统快速安装脚本
# 使用方法: chmod +x setup.sh && ./setup.sh

set -e

echo "🚀 考研任务管理系统安装脚本"
echo "================================"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js >= 16.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js 版本过低，需要 >= 16.0.0，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL 未安装，请先安装 MySQL >= 8.0"
    exit 1
fi

echo "✅ MySQL 检查通过"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ npm 检查通过: $(npm -v)"

echo ""
echo "📦 开始安装项目依赖..."

# 安装后端依赖
echo "正在安装后端依赖..."
cd backend
npm install
echo "✅ 后端依赖安装完成"

# 安装前端依赖
echo "正在安装前端依赖..."
cd ../frontend
npm install
echo "✅ 前端依赖安装完成"

cd ..

# 数据库设置
echo ""
echo "🗄️  数据库设置"
echo "请确保MySQL服务正在运行"

read -p "请输入MySQL root密码: " -s MYSQL_PASSWORD
echo ""

# 测试MySQL连接
if ! mysql -u root -p"$MYSQL_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    echo "❌ MySQL连接失败，请检查密码"
    exit 1
fi

echo "✅ MySQL连接成功"

# 创建数据库
echo "正在创建数据库..."
mysql -u root -p"$MYSQL_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS exam_task_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 导入表结构
echo "正在导入数据库表结构..."
mysql -u root -p"$MYSQL_PASSWORD" exam_task_system < database/schema.sql

echo "✅ 数据库设置完成"

# 创建后端环境变量文件
echo ""
echo "⚙️  配置环境变量"

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    
    # 生成JWT密钥
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    
    # 更新.env文件
    sed -i.bak "s/your_password/$MYSQL_PASSWORD/g" backend/.env
    sed -i.bak "s/your_super_secret_jwt_key_here/$JWT_SECRET/g" backend/.env
    
    echo "✅ 后端环境变量配置完成"
else
    echo "⚠️  后端.env文件已存在，跳过配置"
fi

# 创建前端环境变量文件
if [ ! -f "frontend/.env" ]; then
    echo "REACT_APP_API_URL=http://localhost:3001/api" > frontend/.env
    echo "✅ 前端环境变量配置完成"
else
    echo "⚠️  前端.env文件已存在，跳过配置"
fi

echo ""
echo "🎉 安装完成！"
echo ""
echo "📋 启动说明："
echo "1. 启动后端服务:"
echo "   cd backend && npm run dev"
echo ""
echo "2. 启动前端服务 (新终端):"
echo "   cd frontend && npm start"
echo ""
echo "3. 访问应用:"
echo "   前端: http://localhost:3000"
echo "   后端API: http://localhost:3001"
echo ""
echo "🔑 默认登录信息:"
echo "   学生ID: ST001 或 ST002"
echo "   密码: Hello888"
echo ""
echo "📚 更多信息请查看 README.md"

# 询问是否立即启动
echo ""
read -p "是否立即启动开发服务器? (y/n): " START_NOW

if [ "$START_NOW" = "y" ] || [ "$START_NOW" = "Y" ]; then
    echo ""
    echo "🚀 启动开发服务器..."
    
    # 启动后端 (后台运行)
    cd backend
    npm run dev &
    BACKEND_PID=$!
    
    echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
    
    # 等待后端启动
    sleep 3
    
    # 启动前端
    cd ../frontend
    echo "✅ 正在启动前端服务..."
    echo "📱 浏览器将自动打开 http://localhost:3000"
    
    npm start
fi
