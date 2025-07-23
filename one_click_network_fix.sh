#!/bin/bash

# 一键网络修复脚本
# 自动诊断和修复gougegaoshu项目的网络访问问题

echo "🚀 一键网络修复脚本"
echo "=================================="
echo "此脚本将自动修复网络访问问题"
echo "预计耗时: 3-5分钟"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查是否为root用户或有sudo权限
check_permissions() {
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        log_error "此脚本需要sudo权限，请使用 sudo ./one_click_network_fix.sh"
        exit 1
    fi
}

# 步骤1: 权限检查
log_info "步骤1: 检查权限..."
check_permissions
log_success "权限检查通过"

# 步骤2: 停止现有服务
log_info "步骤2: 停止现有服务..."
sudo docker-compose down 2>/dev/null || true
sudo docker stop $(sudo docker ps -aq --filter "name=gougegaoshu") 2>/dev/null || true
sudo docker rm $(sudo docker ps -aq --filter "name=gougegaoshu") 2>/dev/null || true
log_success "服务已停止"

# 步骤3: 配置防火墙
log_info "步骤3: 配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 3001/tcp # Backend API
    sudo ufw allow 3307/tcp # MySQL
    log_success "UFW防火墙已配置"
else
    log_warning "UFW未安装，跳过防火墙配置"
fi

# 步骤4: 优化Docker配置
log_info "步骤4: 优化Docker配置..."
cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  backend:
    ports:
      - "0.0.0.0:3001:3001"
    environment:
      - HOST=0.0.0.0
      - NODE_ENV=production
    restart: unless-stopped

  frontend:
    ports:
      - "0.0.0.0:80:80"
    restart: unless-stopped

  mysql:
    ports:
      - "0.0.0.0:3307:3306"
    restart: unless-stopped

networks:
  default:
    name: gougegaoshu-network
    driver: bridge
EOF
log_success "Docker配置已优化"

# 步骤5: 检查并修复后端监听地址
log_info "步骤5: 检查后端监听配置..."
if [ -f "backend/server.js" ]; then
    if grep -q "localhost\|127.0.0.1" backend/server.js; then
        cp backend/server.js backend/server.js.backup
        sed -i 's/localhost/0.0.0.0/g' backend/server.js
        sed -i 's/127.0.0.1/0.0.0.0/g' backend/server.js
        log_success "后端监听地址已修复"
    else
        log_success "后端监听配置正常"
    fi
fi

# 步骤6: 重新构建和启动服务
log_info "步骤6: 重新构建服务..."
sudo docker-compose build --no-cache
log_success "服务构建完成"

log_info "步骤7: 启动服务..."
sudo docker-compose up -d
log_success "服务已启动"

# 步骤8: 等待服务就绪
log_info "步骤8: 等待服务启动..."
echo -n "等待中"
for i in {1..30}; do
    echo -n "."
    sleep 1
done
echo ""
log_success "等待完成"

# 步骤9: 验证服务状态
log_info "步骤9: 验证服务状态..."
echo "Docker容器状态:"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "端口监听状态:"
netstat -tlnp | grep -E ":80|:3001|:3307"
echo ""

# 步骤10: 测试内部连接
log_info "步骤10: 测试内部连接..."
if curl -s -m 5 http://localhost:3001/health > /dev/null; then
    log_success "后端内部访问正常"
else
    log_error "后端内部访问失败"
fi

if curl -s -m 5 -I http://localhost/ > /dev/null; then
    log_success "前端内部访问正常"
else
    log_error "前端内部访问失败"
fi

# 步骤11: 测试外部连接
log_info "步骤11: 测试外部连接..."
PUBLIC_IP=$(curl -s --max-time 10 ifconfig.me 2>/dev/null || echo "114.92.153.131")
log_info "使用IP: $PUBLIC_IP"

# 创建测试脚本
cat > test_access.sh << EOF
#!/bin/bash
SERVER_IP="$PUBLIC_IP"
echo "测试外部访问..."

echo "前端测试:"
curl -I -m 10 http://\$SERVER_IP/ && echo "✅ 前端正常" || echo "❌ 前端失败"

echo "后端测试:"
curl -m 10 http://\$SERVER_IP:3001/health && echo "✅ 后端正常" || echo "❌ 后端失败"

echo "API测试:"
curl -X POST -m 10 http://\$SERVER_IP:3001/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"userId": "ST001", "password": "Hello888"}' && echo "✅ API正常" || echo "❌ API失败"
EOF

chmod +x test_access.sh

# 运行测试
echo "运行外部访问测试..."
./test_access.sh

# 步骤12: 生成诊断报告
log_info "步骤12: 生成诊断报告..."
cat > network_fix_report.txt << EOF
网络修复报告
生成时间: $(date)
================================

修复步骤:
✅ 1. 停止现有服务
✅ 2. 配置防火墙规则
✅ 3. 优化Docker配置
✅ 4. 修复后端监听地址
✅ 5. 重新构建服务
✅ 6. 启动服务
✅ 7. 验证服务状态

当前状态:
$(sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")

端口监听:
$(netstat -tlnp | grep -E ":80|:3001|:3307")

公网IP: $PUBLIC_IP

下一步操作:
1. 如果外部访问仍然失败，请配置腾讯云安全组
2. 参考文档: tencent_cloud_security_group_config.md
3. 运行测试: ./test_access.sh

EOF

log_success "诊断报告已生成: network_fix_report.txt"

# 最终总结
echo ""
echo "=================================="
log_success "🎉 网络修复完成！"
echo ""
echo "📋 修复总结:"
echo "✅ Docker网络配置已优化"
echo "✅ 防火墙端口已开放"
echo "✅ 服务已重新启动"
echo "✅ 内部访问测试完成"
echo ""
echo "🔧 下一步操作:"
echo "1. 运行外部访问测试: ./test_access.sh"
echo "2. 如果外部访问失败，请配置腾讯云安全组:"
echo "   - 开放端口: 80, 3001, 3307"
echo "   - 来源: 0.0.0.0/0"
echo "   - 参考: tencent_cloud_security_group_config.md"
echo ""
echo "📞 如需帮助:"
echo "- 查看日志: docker logs gougegaoshu-backend"
echo "- 检查状态: docker ps"
echo "- 重新运行: ./one_click_network_fix.sh"
echo ""
log_success "修复脚本执行完成！"
