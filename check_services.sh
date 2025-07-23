#!/bin/bash

# 🔍 服务状态检查脚本
# 使用方法：bash check_services.sh

echo "🔍 检查系统服务状态..."
echo "=================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查MySQL
echo -n "MySQL 服务: "
if systemctl is-active --quiet mysql; then
    echo -e "${GREEN}✅ 运行中${NC}"
else
    echo -e "${RED}❌ 未运行${NC}"
fi

# 检查Nginx
echo -n "Nginx 服务: "
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ 运行中${NC}"
else
    echo -e "${RED}❌ 未运行${NC}"
fi

echo ""
echo "📱 PM2 进程状态："
pm2 status

echo ""
echo "🌐 端口监听状态："
echo -n "端口 3001 (后端): "
if netstat -tln | grep :3001 > /dev/null; then
    echo -e "${GREEN}✅ 监听中${NC}"
else
    echo -e "${RED}❌ 未监听${NC}"
fi

echo -n "端口 3000 (前端): "
if netstat -tln | grep :3000 > /dev/null; then
    echo -e "${GREEN}✅ 监听中${NC}"
else
    echo -e "${RED}❌ 未监听${NC}"
fi

echo -n "端口 80 (HTTP): "
if netstat -tln | grep :80 > /dev/null; then
    echo -e "${GREEN}✅ 监听中${NC}"
else
    echo -e "${RED}❌ 未监听${NC}"
fi

echo -n "端口 3307 (MySQL): "
if netstat -tln | grep :3307 > /dev/null; then
    echo -e "${GREEN}✅ 监听中${NC}"
else
    echo -e "${RED}❌ 未监听${NC}"
fi

echo ""
echo "🧪 连接测试："
echo -n "后端API健康检查: "
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ 正常${NC}"
else
    echo -e "${RED}❌ 失败${NC}"
fi

echo ""
echo "📋 系统信息："
echo "服务器时间: $(date)"
echo "系统负载: $(uptime | awk -F'load average:' '{print $2}')"
echo "内存使用: $(free -h | grep Mem | awk '{print $3"/"$2}')"
echo "磁盘使用: $(df -h / | tail -1 | awk '{print $3"/"$2" ("$5")"}')"

echo ""
echo "🔗 访问地址："
echo "前端应用: http://124.221.113.102/"
echo "学生登录: http://124.221.113.102/student"  
echo "后端API: http://124.221.113.102:3001/health"
