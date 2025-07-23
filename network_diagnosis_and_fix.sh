#!/bin/bash

# 网络诊断和修复脚本
# 用于解决gougegaoshu项目的网络访问问题

echo "🔍 开始网络诊断和修复..."
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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

# 1. 检查当前服务状态
log_info "检查Docker服务状态..."
if command -v docker &> /dev/null; then
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
else
    log_error "Docker未安装或不可用"
    exit 1
fi

# 2. 检查端口监听状态
log_info "检查端口监听状态..."
echo "检查80端口:"
netstat -tlnp | grep :80 || echo "80端口未监听"
echo "检查3001端口:"
netstat -tlnp | grep :3001 || echo "3001端口未监听"
echo "检查3307端口:"
netstat -tlnp | grep :3307 || echo "3307端口未监听"
echo ""

# 3. 检查防火墙状态
log_info "检查防火墙状态..."
if command -v ufw &> /dev/null; then
    echo "UFW状态:"
    ufw status
    echo ""
    
    log_info "开放必要端口..."
    ufw allow 80/tcp
    ufw allow 3001/tcp
    ufw allow 3307/tcp
    ufw allow 22/tcp  # SSH端口
    
    log_success "防火墙端口已开放"
else
    log_warning "UFW未安装，检查iptables..."
    iptables -L INPUT -n | grep -E "(80|3001|3307)"
fi
echo ""

# 4. 检查网络接口
log_info "检查网络接口..."
ip addr show | grep -E "(inet|UP|DOWN)"
echo ""

# 5. 停止现有服务
log_info "停止现有服务..."
docker-compose down 2>/dev/null || log_warning "docker-compose down失败"
docker stop gougegaoshu-backend gougegaoshu-frontend gougegaoshu-mysql 2>/dev/null || log_warning "手动停止容器失败"
docker rm gougegaoshu-backend gougegaoshu-frontend gougegaoshu-mysql 2>/dev/null || log_warning "删除容器失败"
echo ""

# 6. 清理网络
log_info "清理Docker网络..."
docker network prune -f
docker network rm gougegaoshu-network 2>/dev/null || log_warning "删除网络失败"
echo ""

# 7. 重新构建服务
log_info "重新构建服务..."
docker-compose build --no-cache
echo ""

# 8. 启动服务（确保正确的网络绑定）
log_info "启动服务..."
docker-compose up -d
echo ""

# 9. 等待服务启动
log_info "等待服务启动..."
sleep 30

# 10. 验证服务状态
log_info "验证服务状态..."
echo "Docker容器状态:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "端口监听状态:"
netstat -tlnp | grep -E ":80|:3001|:3307"
echo ""

# 11. 测试本地连接
log_info "测试本地连接..."
echo "测试后端健康检查:"
curl -s -m 5 http://localhost:3001/health || log_error "后端健康检查失败"
echo ""

echo "测试前端:"
curl -s -m 5 -I http://localhost/ || log_error "前端访问失败"
echo ""

# 12. 测试外部连接
log_info "测试外部连接..."
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "未知")
log_info "公网IP: $PUBLIC_IP"

if [ "$PUBLIC_IP" != "未知" ]; then
    echo "测试外部访问后端:"
    curl -s -m 10 http://$PUBLIC_IP:3001/health || log_error "外部后端访问失败"
    echo ""
    
    echo "测试外部访问前端:"
    curl -s -m 10 -I http://$PUBLIC_IP/ || log_error "外部前端访问失败"
    echo ""
fi

# 13. 检查日志
log_info "检查服务日志..."
echo "后端日志 (最后10行):"
docker logs --tail 10 gougegaoshu-backend 2>/dev/null || log_error "无法获取后端日志"
echo ""

echo "前端日志 (最后10行):"
docker logs --tail 10 gougegaoshu-frontend 2>/dev/null || log_error "无法获取前端日志"
echo ""

# 14. 生成诊断报告
log_info "生成诊断报告..."
cat > network_diagnosis_report.txt << EOF
网络诊断报告
生成时间: $(date)
================================

服务状态:
$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

端口监听:
$(netstat -tlnp | grep -E ":80|:3001|:3307")

防火墙状态:
$(ufw status 2>/dev/null || echo "UFW不可用")

公网IP: $PUBLIC_IP

网络接口:
$(ip addr show | grep -E "(inet|UP|DOWN)")

建议:
1. 如果外部访问仍然失败，请检查云服务商的安全组设置
2. 确保腾讯云安全组开放了80、3001、3307端口
3. 检查是否有其他防火墙或代理服务器阻止访问
4. 验证域名解析是否正确指向服务器IP

EOF

log_success "诊断报告已生成: network_diagnosis_report.txt"

# 15. 提供修复建议
echo ""
echo "=================================="
log_info "修复建议:"
echo "1. 如果服务正常启动但外部无法访问，请检查腾讯云安全组:"
echo "   - 登录腾讯云控制台"
echo "   - 找到ECS实例的安全组"
echo "   - 添加入站规则: TCP 80, 3001, 3307 端口，来源 0.0.0.0/0"
echo ""
echo "2. 如果仍有问题，请运行以下命令检查:"
echo "   sudo iptables -L -n"
echo "   sudo systemctl status docker"
echo "   docker network ls"
echo ""
echo "3. 测试命令:"
echo "   curl http://localhost:3001/health"
echo "   curl http://$PUBLIC_IP:3001/health"
echo ""

log_success "网络诊断和修复完成！"
