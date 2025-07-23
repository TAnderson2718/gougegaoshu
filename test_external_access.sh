#!/bin/bash
# 外部访问测试脚本

SERVER_IP="114.92.153.131"
echo "🧪 测试外部访问 (IP: $SERVER_IP)"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_endpoint() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    
    echo -n "测试 $name: "
    
    if [ "$method" = "GET" ]; then
        if curl -s -m 10 "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 成功${NC}"
            return 0
        else
            echo -e "${RED}❌ 失败${NC}"
            return 1
        fi
    else
        if curl -s -m 10 -X "$method" -H "Content-Type: application/json" -d "$data" "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 成功${NC}"
            return 0
        else
            echo -e "${RED}❌ 失败${NC}"
            return 1
        fi
    fi
}

# 测试端口连通性
test_port() {
    local port="$1"
    local name="$2"
    
    echo -n "测试端口 $port ($name): "
    if timeout 5 bash -c "</dev/tcp/$SERVER_IP/$port" 2>/dev/null; then
        echo -e "${GREEN}✅ 开放${NC}"
        return 0
    else
        echo -e "${RED}❌ 关闭${NC}"
        return 1
    fi
}

echo "1. 端口连通性测试:"
test_port 80 "前端HTTP"
test_port 3001 "后端API"
test_port 3307 "MySQL"
echo ""

echo "2. HTTP服务测试:"
test_endpoint "前端首页" "http://$SERVER_IP/"
test_endpoint "后端健康检查" "http://$SERVER_IP:3001/health"
test_endpoint "后端API根路径" "http://$SERVER_IP:3001/api"
echo ""

echo "3. API功能测试:"
test_endpoint "学生登录API" "http://$SERVER_IP:3001/api/auth/login" "POST" '{"userId": "ST001", "password": "Hello888"}'
test_endpoint "管理员登录API" "http://$SERVER_IP:3001/api/auth/admin/login" "POST" '{"adminId": "admin001", "password": "admin123"}'
echo ""

echo "4. 详细响应测试:"
echo "前端响应头:"
curl -I -m 10 http://$SERVER_IP/ 2>/dev/null || echo "无响应"
echo ""

echo "后端健康检查响应:"
curl -m 10 http://$SERVER_IP:3001/health 2>/dev/null || echo "无响应"
echo ""

echo "学生登录API响应:"
curl -X POST -m 10 http://$SERVER_IP:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "ST001", "password": "Hello888"}' 2>/dev/null || echo "无响应"
echo ""

echo "=================================="
echo "如果测试失败，请检查:"
echo "1. 腾讯云安全组是否开放80、3001端口"
echo "2. 服务器防火墙设置: sudo ufw status"
echo "3. Docker容器状态: docker ps"
echo "4. 端口监听状态: netstat -tlnp | grep -E ':80|:3001'"
echo ""
echo "修复建议:"
echo "1. 运行网络修复脚本: ./docker_network_fix.sh"
echo "2. 配置腾讯云安全组: 参考 tencent_cloud_security_group_config.md"
echo "3. 检查服务日志: docker logs gougegaoshu-backend"
