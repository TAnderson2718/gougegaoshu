#!/bin/bash

# 本地网络检查脚本（无需sudo权限）
# 适用于当前开发环境

echo "🔍 本地网络检查脚本"
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

# 1. 检查当前环境
log_info "检查当前环境..."
echo "当前用户: $(whoami)"
echo "当前目录: $(pwd)"
echo "操作系统: $(uname -s)"
echo ""

# 2. 检查Docker是否可用
log_info "检查Docker状态..."
if command -v docker &> /dev/null; then
    echo "Docker版本: $(docker --version)"
    if docker ps &> /dev/null; then
        log_success "Docker可用"
        echo "当前运行的容器:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "无运行中的容器"
    else
        log_warning "Docker不可用或需要权限"
    fi
else
    log_error "Docker未安装"
fi
echo ""

# 3. 检查docker-compose
log_info "检查docker-compose..."
if command -v docker-compose &> /dev/null; then
    echo "docker-compose版本: $(docker-compose --version)"
    log_success "docker-compose可用"
else
    log_error "docker-compose未安装"
fi
echo ""

# 4. 检查项目文件
log_info "检查项目文件..."
files_to_check=(
    "docker-compose.yml"
    "backend/server.js"
    "backend/package.json"
    "frontend/package.json"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 不存在"
    fi
done
echo ""

# 5. 检查端口占用
log_info "检查端口占用情况..."
ports=(80 3001 3307)
for port in "${ports[@]}"; do
    if command -v lsof &> /dev/null; then
        if lsof -i :$port &> /dev/null; then
            echo "端口 $port: 被占用"
            lsof -i :$port
        else
            echo "端口 $port: 空闲"
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -an | grep ":$port " &> /dev/null; then
            echo "端口 $port: 被占用"
        else
            echo "端口 $port: 空闲"
        fi
    else
        echo "端口 $port: 无法检查（缺少lsof/netstat）"
    fi
done
echo ""

# 6. 检查网络连接
log_info "检查网络连接..."
test_urls=(
    "http://localhost:3001/health"
    "http://localhost/"
    "http://114.92.153.131:3001/health"
    "http://114.92.153.131/"
)

for url in "${test_urls[@]}"; do
    echo -n "测试 $url: "
    if curl -s -m 5 "$url" &> /dev/null; then
        echo -e "${GREEN}✅ 可访问${NC}"
    else
        echo -e "${RED}❌ 不可访问${NC}"
    fi
done
echo ""

# 7. 创建Docker配置优化文件
log_info "创建Docker配置优化..."
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

log_success "Docker配置优化文件已创建"

# 8. 检查后端监听配置
log_info "检查后端监听配置..."
if [ -f "backend/server.js" ]; then
    if grep -q "localhost\|127.0.0.1" backend/server.js; then
        log_warning "后端可能绑定到localhost，建议修改为0.0.0.0"
        echo "发现的localhost/127.0.0.1引用:"
        grep -n "localhost\|127.0.0.1" backend/server.js
    else
        log_success "后端监听配置看起来正常"
    fi
else
    log_error "未找到backend/server.js文件"
fi
echo ""

# 9. 生成修复建议
log_info "生成修复建议..."
cat > network_fix_suggestions.txt << EOF
网络修复建议
生成时间: $(date)
================================

当前环境分析:
- 用户: $(whoami)
- 系统: $(uname -s)
- Docker: $(command -v docker &> /dev/null && echo "已安装" || echo "未安装")
- docker-compose: $(command -v docker-compose &> /dev/null && echo "已安装" || echo "未安装")

修复步骤建议:
1. 如果有Docker权限，运行:
   docker-compose down
   docker-compose up -d

2. 如果没有Docker权限，请联系系统管理员:
   - 添加用户到docker组: sudo usermod -aG docker $(whoami)
   - 或使用sudo运行Docker命令

3. 检查防火墙设置（需要管理员权限）:
   - macOS: 系统偏好设置 → 安全性与隐私 → 防火墙
   - Linux: sudo ufw allow 80 && sudo ufw allow 3001

4. 如果是远程服务器，检查云服务商安全组:
   - 开放端口: 80, 3001, 3307
   - 来源: 0.0.0.0/0

5. 测试连接:
   - 本地: curl http://localhost:3001/health
   - 远程: curl http://114.92.153.131:3001/health

EOF

log_success "修复建议已生成: network_fix_suggestions.txt"

# 10. 创建简单的测试脚本
log_info "创建测试脚本..."
cat > simple_test.sh << 'EOF'
#!/bin/bash
echo "🧪 简单网络测试"
echo "=================="

echo "1. 本地测试:"
curl -s -m 5 http://localhost:3001/health && echo "✅ 本地后端正常" || echo "❌ 本地后端失败"
curl -s -m 5 -I http://localhost/ && echo "✅ 本地前端正常" || echo "❌ 本地前端失败"

echo ""
echo "2. 远程测试:"
curl -s -m 10 http://114.92.153.131:3001/health && echo "✅ 远程后端正常" || echo "❌ 远程后端失败"
curl -s -m 10 -I http://114.92.153.131/ && echo "✅ 远程前端正常" || echo "❌ 远程前端失败"

echo ""
echo "3. API测试:"
curl -s -m 10 -X POST http://114.92.153.131:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "ST001", "password": "Hello888"}' && echo "✅ API正常" || echo "❌ API失败"
EOF

chmod +x simple_test.sh
log_success "测试脚本已创建: simple_test.sh"

# 11. 总结
echo ""
echo "=================================="
log_success "🎉 本地网络检查完成！"
echo ""
echo "📋 生成的文件:"
echo "✅ docker-compose.override.yml - Docker配置优化"
echo "✅ network_fix_suggestions.txt - 修复建议"
echo "✅ simple_test.sh - 简单测试脚本"
echo ""
echo "🔧 下一步操作:"
echo "1. 如果有Docker权限，尝试重启服务:"
echo "   docker-compose down && docker-compose up -d"
echo ""
echo "2. 运行测试脚本:"
echo "   ./simple_test.sh"
echo ""
echo "3. 如果是远程服务器，需要配置安全组和防火墙"
echo "   参考: tencent_cloud_security_group_config.md"
echo ""
echo "4. 查看详细建议:"
echo "   cat network_fix_suggestions.txt"
echo ""
log_success "检查脚本执行完成！"
