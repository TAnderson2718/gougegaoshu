#!/bin/bash

# 🔧 故障排除脚本
# 使用方法：bash troubleshoot.sh

echo "🔧 系统故障排除..."
echo "=================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. 检查基础服务
echo "🔍 1. 检查基础服务状态"
echo "------------------------"

# MySQL
if ! systemctl is-active --quiet mysql; then
    log_warning "MySQL 未运行，尝试启动..."
    sudo systemctl start mysql
    if systemctl is-active --quiet mysql; then
        log_success "MySQL 启动成功"
    else
        log_error "MySQL 启动失败"
        echo "MySQL 错误日志："
        sudo journalctl -u mysql --no-pager -n 10
    fi
else
    log_success "MySQL 运行正常"
fi

# 2. 检查PM2进程
echo ""
echo "🔍 2. 检查PM2进程"
echo "------------------------"

pm2_status=$(pm2 jlist 2>/dev/null)
if [ $? -ne 0 ]; then
    log_error "PM2 无法访问"
    log_info "尝试重启PM2..."
    pm2 kill
    pm2 resurrect
else
    backend_status=$(echo "$pm2_status" | jq -r '.[] | select(.name=="backend") | .pm2_env.status' 2>/dev/null)
    frontend_status=$(echo "$pm2_status" | jq -r '.[] | select(.name=="frontend") | .pm2_env.status' 2>/dev/null)
    
    if [ "$backend_status" != "online" ]; then
        log_warning "后端服务异常，尝试重启..."
        cd /home/ubuntu/gougegaoshu/backend
        pm2 delete backend 2>/dev/null || true
        pm2 start server.js --name "backend"
    else
        log_success "后端服务运行正常"
    fi
    
    if [ "$frontend_status" != "online" ]; then
        log_warning "前端服务异常，尝试重启..."
        cd /home/ubuntu/gougegaoshu/frontend
        pm2 delete frontend 2>/dev/null || true
        pm2 start npm --name "frontend" -- start
    else
        log_success "前端服务运行正常"
    fi
fi

# 3. 检查端口占用
echo ""
echo "🔍 3. 检查端口占用"
echo "------------------------"

check_port() {
    local port=$1
    local service=$2
    
    if netstat -tln | grep ":$port " > /dev/null; then
        log_success "端口 $port ($service) 正在监听"
    else
        log_error "端口 $port ($service) 未监听"
        
        # 检查是否有进程占用
        local pid=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pid" ]; then
            log_warning "端口 $port 被进程 $pid 占用"
            ps -p $pid -o pid,ppid,cmd
        fi
    fi
}

check_port 3001 "后端API"
check_port 3000 "前端"
check_port 80 "Nginx"
check_port 3307 "MySQL"

# 4. 检查磁盘空间
echo ""
echo "🔍 4. 检查系统资源"
echo "------------------------"

# 磁盘空间
disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $disk_usage -gt 90 ]; then
    log_error "磁盘空间不足: ${disk_usage}%"
    echo "最大的文件/目录："
    du -sh /home/ubuntu/* 2>/dev/null | sort -hr | head -5
else
    log_success "磁盘空间充足: ${disk_usage}%"
fi

# 内存使用
memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ $memory_usage -gt 90 ]; then
    log_error "内存使用过高: ${memory_usage}%"
    echo "内存占用最高的进程："
    ps aux --sort=-%mem | head -6
else
    log_success "内存使用正常: ${memory_usage}%"
fi

# 5. 检查日志错误
echo ""
echo "🔍 5. 检查应用日志"
echo "------------------------"

log_info "PM2 日志摘要："
pm2 logs --lines 5 --nostream 2>/dev/null || echo "无法获取PM2日志"

echo ""
log_info "系统错误日志："
sudo journalctl --since "1 hour ago" --priority=err --no-pager -n 5 2>/dev/null || echo "无法获取系统日志"

# 6. 网络连接测试
echo ""
echo "🔍 6. 网络连接测试"
echo "------------------------"

# 测试本地连接
if curl -s http://localhost:3001/health > /dev/null; then
    log_success "本地后端API连接正常"
else
    log_error "本地后端API连接失败"
fi

if curl -s http://localhost:3000 > /dev/null; then
    log_success "本地前端连接正常"
else
    log_error "本地前端连接失败"
fi

# 7. 自动修复建议
echo ""
echo "🔧 7. 自动修复建议"
echo "------------------------"

echo "如果问题仍然存在，请尝试以下命令："
echo ""
echo "🔄 重启所有服务："
echo "   sudo systemctl restart mysql"
echo "   pm2 restart all"
echo "   sudo systemctl restart nginx"
echo ""
echo "📋 查看详细日志："
echo "   pm2 logs backend"
echo "   pm2 logs frontend"
echo "   sudo journalctl -u mysql -f"
echo "   sudo journalctl -u nginx -f"
echo ""
echo "🧹 清理和重建："
echo "   pm2 delete all"
echo "   cd /home/ubuntu/gougegaoshu/backend && npm install"
echo "   cd /home/ubuntu/gougegaoshu/frontend && npm install"
echo "   bash quick_start.sh"

echo ""
echo "✅ 故障排除完成！"
