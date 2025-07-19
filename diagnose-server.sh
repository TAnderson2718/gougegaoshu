#!/bin/bash

# 服务器诊断脚本
# 检查部署状态和服务运行情况

echo "🔍 服务器诊断报告"
echo "=========================================="
echo "时间: $(date)"
echo "服务器: $(hostname -I | awk '{print $1}')"
echo ""

# 1. 检查基础环境
echo "📋 1. 基础环境检查"
echo "----------------------------------------"
echo "Node.js 版本: $(node --version 2>/dev/null || echo '未安装')"
echo "npm 版本: $(npm --version 2>/dev/null || echo '未安装')"
echo "PM2 版本: $(pm2 --version 2>/dev/null || echo '未安装')"
echo "MySQL 状态: $(sudo systemctl is-active mysql 2>/dev/null || echo '未运行')"
echo ""

# 2. 检查项目文件
echo "📁 2. 项目文件检查"
echo "----------------------------------------"
if [ -d "/home/dev_user/gougegaoshu" ]; then
    echo "✅ 项目目录存在: /home/dev_user/gougegaoshu"
    cd /home/dev_user/gougegaoshu
    
    if [ -f "ecosystem.config.js" ]; then
        echo "✅ PM2 配置文件存在"
    else
        echo "❌ PM2 配置文件不存在"
    fi
    
    if [ -d "backend" ]; then
        echo "✅ 后端目录存在"
        if [ -f "backend/.env" ]; then
            echo "✅ 环境配置文件存在"
        else
            echo "❌ 环境配置文件不存在"
        fi
    else
        echo "❌ 后端目录不存在"
    fi
    
    if [ -d "frontend/build" ]; then
        echo "✅ 前端构建文件存在"
    else
        echo "❌ 前端构建文件不存在"
    fi
else
    echo "❌ 项目目录不存在: /home/dev_user/gougegaoshu"
fi
echo ""

# 3. 检查 PM2 服务状态
echo "🔧 3. PM2 服务状态"
echo "----------------------------------------"
pm2 status 2>/dev/null || echo "PM2 没有运行的服务"
echo ""

# 4. 检查端口占用
echo "🌐 4. 端口占用检查"
echo "----------------------------------------"
echo "端口 3000 (前端):"
sudo netstat -tlnp | grep :3000 || echo "  端口 3000 未被占用"
echo "端口 3001 (后端):"
sudo netstat -tlnp | grep :3001 || echo "  端口 3001 未被占用"
echo ""

# 5. 检查防火墙状态
echo "🛡️ 5. 防火墙状态"
echo "----------------------------------------"
sudo ufw status 2>/dev/null || echo "UFW 防火墙未启用"
echo ""

# 6. 检查服务日志
echo "📝 6. 服务日志 (最近10行)"
echo "----------------------------------------"
if [ -d "/home/dev_user/gougegaoshu/logs" ]; then
    echo "后端日志:"
    tail -n 5 /home/dev_user/gougegaoshu/logs/backend-combined.log 2>/dev/null || echo "  无后端日志"
    echo ""
    echo "前端日志:"
    tail -n 5 /home/dev_user/gougegaoshu/logs/frontend-combined.log 2>/dev/null || echo "  无前端日志"
else
    echo "日志目录不存在"
fi
echo ""

# 7. 测试本地连接
echo "🧪 7. 本地连接测试"
echo "----------------------------------------"
echo "测试后端 API:"
curl -s --connect-timeout 5 http://localhost:3001/api/health 2>/dev/null && echo "✅ 后端 API 响应正常" || echo "❌ 后端 API 无响应"

echo "测试前端:"
curl -s --connect-timeout 5 -I http://localhost:3000 2>/dev/null | head -n 1 && echo "✅ 前端服务响应正常" || echo "❌ 前端服务无响应"
echo ""

# 8. 数据库连接测试
echo "🗄️ 8. 数据库连接测试"
echo "----------------------------------------"
mysql -u taskapp -ppassword -e "SELECT 1;" 2>/dev/null && echo "✅ 数据库连接正常" || echo "❌ 数据库连接失败"
echo ""

# 9. 系统资源
echo "💻 9. 系统资源"
echo "----------------------------------------"
echo "内存使用:"
free -h | grep Mem
echo "磁盘使用:"
df -h / | tail -n 1
echo "CPU 负载:"
uptime
echo ""

echo "=========================================="
echo "🔧 建议的修复步骤:"
echo ""

# 检查是否需要部署
if [ ! -d "/home/dev_user/gougegaoshu" ]; then
    echo "1. 项目未部署，请执行部署脚本:"
    echo "   cd /home/dev_user"
    echo "   chmod +x server-deploy.sh"
    echo "   ./server-deploy.sh"
elif ! pm2 status 2>/dev/null | grep -q "task-manager"; then
    echo "1. 服务未启动，请启动服务:"
    echo "   cd /home/dev_user/gougegaoshu"
    echo "   pm2 start ecosystem.config.js"
else
    echo "1. 检查防火墙设置:"
    echo "   sudo ufw allow 3000"
    echo "   sudo ufw allow 3001"
    echo ""
    echo "2. 重启服务:"
    echo "   pm2 restart all"
fi

echo ""
echo "如需更多帮助，请提供此诊断报告的输出结果。"
