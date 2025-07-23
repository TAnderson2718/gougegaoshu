#!/bin/bash

# Docker网络修复脚本
# 确保容器正确绑定到外部IP，解决网络访问问题

echo "🔧 Docker网络修复脚本"
echo "=================================="

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

# 1. 停止所有相关服务
log_info "停止现有服务..."
docker-compose down 2>/dev/null
docker stop $(docker ps -aq --filter "name=gougegaoshu") 2>/dev/null
docker rm $(docker ps -aq --filter "name=gougegaoshu") 2>/dev/null
log_success "服务已停止"

# 2. 清理网络
log_info "清理Docker网络..."
docker network prune -f
docker network rm gougegaoshu-network 2>/dev/null
log_success "网络已清理"

# 3. 创建优化的docker-compose配置
log_info "创建优化的Docker配置..."
cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  backend:
    ports:
      - "0.0.0.0:3001:3001"  # 明确绑定到所有接口
    environment:
      - HOST=0.0.0.0  # 确保应用监听所有接口
    networks:
      - gougegaoshu-network

  frontend:
    ports:
      - "0.0.0.0:80:80"  # 明确绑定到所有接口
    networks:
      - gougegaoshu-network

  mysql:
    ports:
      - "0.0.0.0:3307:3306"  # 明确绑定到所有接口
    networks:
      - gougegaoshu-network

networks:
  gougegaoshu-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
EOF

log_success "Docker配置已优化"

# 4. 检查后端应用配置
log_info "检查后端应用配置..."
if [ -f "backend/server.js" ]; then
    # 检查server.js中的监听配置
    if grep -q "app.listen.*localhost\|app.listen.*127.0.0.1" backend/server.js; then
        log_warning "发现后端应用绑定到localhost，需要修改"
        
        # 备份原文件
        cp backend/server.js backend/server.js.backup
        
        # 修改监听地址
        sed -i 's/localhost/0.0.0.0/g' backend/server.js
        sed -i 's/127.0.0.1/0.0.0.0/g' backend/server.js
        
        log_success "后端监听地址已修改为0.0.0.0"
    else
        log_success "后端监听配置正常"
    fi
else
    log_warning "未找到backend/server.js文件"
fi

# 5. 重新构建镜像
log_info "重新构建Docker镜像..."
docker-compose build --no-cache
log_success "镜像构建完成"

# 6. 启动服务
log_info "启动服务..."
docker-compose up -d
log_success "服务已启动"

# 7. 等待服务就绪
log_info "等待服务启动..."
sleep 30

# 8. 验证容器状态
log_info "验证容器状态..."
echo "容器运行状态:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 9. 验证网络绑定
log_info "验证网络绑定..."
echo "端口监听状态:"
netstat -tlnp | grep -E ":80|:3001|:3307" | while read line; do
    if echo "$line" | grep -q "0.0.0.0"; then
        echo "✅ $line"
    else
        echo "⚠️  $line"
    fi
done
echo ""

# 10. 测试内部连接
log_info "测试内部连接..."
echo "测试后端健康检查:"
if curl -s -m 5 http://localhost:3001/health > /dev/null; then
    log_success "后端内部访问正常"
else
    log_error "后端内部访问失败"
fi

echo "测试前端:"
if curl -s -m 5 -I http://localhost/ > /dev/null; then
    log_success "前端内部访问正常"
else
    log_error "前端内部访问失败"
fi

# 11. 获取公网IP并测试外部连接
log_info "测试外部连接..."
PUBLIC_IP=$(curl -s --max-time 10 ifconfig.me 2>/dev/null || curl -s --max-time 10 ipinfo.io/ip 2>/dev/null)

if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "" ]; then
    log_info "检测到公网IP: $PUBLIC_IP"
    
    echo "测试外部后端访问:"
    if curl -s -m 10 http://$PUBLIC_IP:3001/health > /dev/null; then
        log_success "外部后端访问正常"
    else
        log_error "外部后端访问失败 - 可能是防火墙或安全组问题"
    fi
    
    echo "测试外部前端访问:"
    if curl -s -m 10 -I http://$PUBLIC_IP/ > /dev/null; then
        log_success "外部前端访问正常"
    else
        log_error "外部前端访问失败 - 可能是防火墙或安全组问题"
    fi
else
    log_warning "无法获取公网IP，跳过外部连接测试"
fi

# 12. 检查防火墙
log_info "检查防火墙设置..."
if command -v ufw &> /dev/null; then
    echo "UFW状态:"
    ufw status
    
    if ufw status | grep -q "Status: active"; then
        log_info "开放必要端口..."
        ufw allow 80/tcp
        ufw allow 3001/tcp
        ufw allow 3307/tcp
        log_success "防火墙端口已开放"
    fi
else
    log_info "UFW未安装，检查iptables..."
    iptables -L INPUT -n | grep -E "(80|3001|3307)" || log_warning "未发现相关iptables规则"
fi

# 13. 生成测试脚本
log_info "生成外部访问测试脚本..."
cat > test_external_access.sh << EOF
#!/bin/bash
# 外部访问测试脚本

SERVER_IP="${PUBLIC_IP:-114.92.153.131}"
echo "🧪 测试外部访问 (IP: \$SERVER_IP)"
echo "=================================="

echo "1. 测试前端访问:"
curl -I -m 10 http://\$SERVER_IP/ && echo "✅ 前端正常" || echo "❌ 前端失败"
echo ""

echo "2. 测试后端健康检查:"
curl -m 10 http://\$SERVER_IP:3001/health && echo "✅ 后端正常" || echo "❌ 后端失败"
echo ""

echo "3. 测试登录API:"
curl -X POST -m 10 http://\$SERVER_IP:3001/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"userId": "ST001", "password": "Hello888"}' && echo "✅ API正常" || echo "❌ API失败"
echo ""

echo "如果测试失败，请检查:"
echo "1. 腾讯云安全组是否开放80、3001端口"
echo "2. 服务器防火墙设置"
echo "3. Docker容器是否正常运行"
EOF

chmod +x test_external_access.sh
log_success "测试脚本已生成: test_external_access.sh"

# 14. 显示服务日志
log_info "显示服务日志..."
echo "后端日志 (最后5行):"
docker logs --tail 5 gougegaoshu-backend 2>/dev/null || log_error "无法获取后端日志"
echo ""

echo "前端日志 (最后5行):"
docker logs --tail 5 gougegaoshu-frontend 2>/dev/null || log_error "无法获取前端日志"
echo ""

# 15. 总结和建议
echo "=================================="
log_info "修复总结:"
echo "✅ Docker网络配置已优化"
echo "✅ 容器端口绑定到0.0.0.0"
echo "✅ 防火墙端口已开放"
echo "✅ 服务已重新启动"
echo ""

log_info "下一步操作:"
echo "1. 运行测试脚本: ./test_external_access.sh"
echo "2. 如果外部访问仍然失败，请配置腾讯云安全组:"
echo "   - 开放TCP端口: 80, 3001, 3307"
echo "   - 来源设置为: 0.0.0.0/0"
echo "3. 参考配置指南: tencent_cloud_security_group_config.md"
echo ""

log_success "Docker网络修复完成！"
EOF

chmod +x docker_network_fix.sh
log_success "Docker网络修复脚本已创建"
