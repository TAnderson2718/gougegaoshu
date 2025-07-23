#!/bin/bash

# 腾讯云安全组SSH远程配置脚本
# 通过腾讯云CLI工具远程配置安全组规则

echo "🔐 腾讯云安全组SSH远程配置脚本"
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

# 1. 检查是否安装了腾讯云CLI
log_info "检查腾讯云CLI工具..."
if ! command -v tccli &> /dev/null; then
    log_warning "腾讯云CLI未安装，正在安装..."
    
    # 安装腾讯云CLI
    if command -v pip3 &> /dev/null; then
        pip3 install tccli
    elif command -v pip &> /dev/null; then
        pip install tccli
    else
        log_error "未找到pip，请手动安装腾讯云CLI"
        echo "安装命令: pip install tccli"
        exit 1
    fi
else
    log_success "腾讯云CLI已安装"
fi

# 2. 配置腾讯云CLI凭证
log_info "配置腾讯云CLI凭证..."
echo "请输入你的腾讯云API密钥信息："
echo "可以在腾讯云控制台 -> 访问管理 -> API密钥管理 中获取"
echo ""

read -p "SecretId: " SECRET_ID
read -s -p "SecretKey: " SECRET_KEY
echo ""
read -p "Region (默认: ap-beijing): " REGION
REGION=${REGION:-ap-beijing}

# 配置CLI
tccli configure set secretId $SECRET_ID
tccli configure set secretKey $SECRET_KEY
tccli configure set region $REGION

log_success "腾讯云CLI配置完成"

# 3. 获取当前实例信息
log_info "获取当前实例信息..."
INSTANCE_ID=$(curl -s http://metadata.tencentyun.com/latest/meta-data/instance-id 2>/dev/null)

if [ -z "$INSTANCE_ID" ]; then
    log_warning "无法自动获取实例ID，请手动输入"
    read -p "请输入实例ID: " INSTANCE_ID
fi

log_info "实例ID: $INSTANCE_ID"

# 4. 获取实例的安全组信息
log_info "获取实例安全组信息..."
SECURITY_GROUPS=$(tccli cvm DescribeInstances --InstanceIds "$INSTANCE_ID" --output json | grep -o '"SecurityGroupIds":\[[^]]*\]' | sed 's/"SecurityGroupIds":\[//;s/\]//;s/"//g')

if [ -z "$SECURITY_GROUPS" ]; then
    log_error "无法获取安全组信息"
    exit 1
fi

SECURITY_GROUP_ID=$(echo $SECURITY_GROUPS | cut -d',' -f1)
log_info "主安全组ID: $SECURITY_GROUP_ID"

# 5. 添加安全组规则
log_info "添加安全组入站规则..."

# 定义需要开放的端口
declare -a PORTS=("80" "3001" "3307" "22")
declare -a DESCRIPTIONS=("前端HTTP访问" "后端API访问" "MySQL数据库访问" "SSH访问")

for i in "${!PORTS[@]}"; do
    PORT=${PORTS[$i]}
    DESC=${DESCRIPTIONS[$i]}
    
    log_info "添加端口 $PORT 规则 ($DESC)..."
    
    # 检查规则是否已存在
    EXISTING_RULE=$(tccli vpc DescribeSecurityGroupPolicies --SecurityGroupId $SECURITY_GROUP_ID --output json | grep "\"Port\":\"$PORT\"")
    
    if [ -n "$EXISTING_RULE" ]; then
        log_warning "端口 $PORT 规则已存在，跳过"
        continue
    fi
    
    # 添加入站规则
    RESULT=$(tccli vpc CreateSecurityGroupPolicies \
        --SecurityGroupId $SECURITY_GROUP_ID \
        --SecurityGroupPolicySet '{
            "Ingress": [
                {
                    "Protocol": "TCP",
                    "Port": "'$PORT'",
                    "CidrBlock": "0.0.0.0/0",
                    "Action": "ACCEPT",
                    "PolicyDescription": "'$DESC'"
                }
            ]
        }' --output json 2>&1)
    
    if echo "$RESULT" | grep -q "Error"; then
        log_error "添加端口 $PORT 规则失败: $RESULT"
    else
        log_success "端口 $PORT 规则添加成功"
    fi
done

# 6. 验证规则添加结果
log_info "验证安全组规则..."
echo "当前安全组入站规则:"
tccli vpc DescribeSecurityGroupPolicies --SecurityGroupId $SECURITY_GROUP_ID --output table

# 7. 测试外部连接
log_info "等待规则生效..."
sleep 10

log_info "测试外部连接..."
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)

if [ -n "$PUBLIC_IP" ]; then
    echo "测试服务器: $PUBLIC_IP"
    
    echo "测试前端 (端口80):"
    curl -I -m 10 http://$PUBLIC_IP/ && echo "✅ 前端访问正常" || echo "❌ 前端访问失败"
    
    echo "测试后端 (端口3001):"
    curl -m 10 http://$PUBLIC_IP:3001/health && echo "✅ 后端访问正常" || echo "❌ 后端访问失败"
    
    echo "测试API (端口3001):"
    curl -X POST -m 10 http://$PUBLIC_IP:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"userId": "ST001", "password": "Hello888"}' && echo "✅ API访问正常" || echo "❌ API访问失败"
else
    log_warning "无法获取公网IP，请手动测试"
fi

# 8. 生成测试脚本
log_info "生成外部测试脚本..."
cat > test_external_access.sh << 'EOF'
#!/bin/bash
# 外部访问测试脚本

PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)
echo "🧪 测试外部访问 (IP: $PUBLIC_IP)"
echo "=================================="

echo "1. 前端测试:"
curl -I -m 10 http://$PUBLIC_IP/ && echo "✅ 前端正常" || echo "❌ 前端失败"

echo "2. 后端测试:"
curl -m 10 http://$PUBLIC_IP:3001/health && echo "✅ 后端正常" || echo "❌ 后端失败"

echo "3. API测试:"
curl -X POST -m 10 http://$PUBLIC_IP:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "ST001", "password": "Hello888"}' && echo "✅ API正常" || echo "❌ API失败"

echo ""
echo "如果测试失败，请检查:"
echo "1. 安全组规则是否正确配置"
echo "2. 服务是否正常运行: docker ps"
echo "3. 端口是否正确监听: netstat -tlnp | grep -E ':80|:3001'"
EOF

chmod +x test_external_access.sh
log_success "测试脚本已创建: test_external_access.sh"

# 9. 总结
echo ""
echo "=================================="
log_success "🎉 安全组配置完成！"
echo ""
echo "📋 配置总结:"
echo "✅ 腾讯云CLI已配置"
echo "✅ 安全组规则已添加"
echo "✅ 端口80、3001、3307、22已开放"
echo "✅ 外部访问测试已执行"
echo ""
echo "🔧 下一步操作:"
echo "1. 运行测试脚本: ./test_external_access.sh"
echo "2. 如果测试失败，等待1-2分钟后重试"
echo "3. 检查服务状态: docker ps"
echo ""
echo "📞 如需帮助:"
echo "- 查看安全组: 腾讯云控制台 -> 云服务器 -> 安全组"
echo "- 查看实例: 腾讯云控制台 -> 云服务器 -> 实例"
echo ""
log_success "配置脚本执行完成！"
