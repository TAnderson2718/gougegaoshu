#!/bin/bash

# 服务器端设置脚本
# 在目标服务器上运行此脚本来完成最终配置

set -e

echo "🔧 服务器端配置脚本"
echo "=========================================="

PROJECT_DIR="/home/dev_user/gougegaoshu"

# 检查项目目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 项目目录不存在: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

echo "📍 当前目录: $(pwd)"

# 停止现有服务
echo "🛑 停止现有服务..."
pm2 delete all 2>/dev/null || true

# 启动服务
echo "🚀 启动服务..."
pm2 start ecosystem.config.js

# 保存 PM2 配置
echo "💾 保存 PM2 配置..."
pm2 save
pm2 startup

echo "📊 服务状态:"
pm2 status

echo "📋 服务日志:"
pm2 logs --lines 10

echo ""
echo "✅ 服务器配置完成！"
echo "=========================================="
echo "🌐 访问地址:"
echo "  前端: http://124.221.113.102:3000"
echo "  后端: http://124.221.113.102:3001"
echo ""
echo "🔧 常用命令:"
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs"
echo "  重启服务: pm2 restart all"
echo "  停止服务: pm2 stop all"
echo ""
