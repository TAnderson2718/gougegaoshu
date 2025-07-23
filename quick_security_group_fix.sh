#!/bin/bash

# 快速安全组修复脚本
# 使用curl直接调用腾讯云API

echo "🚀 快速安全组修复脚本"
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

# 1. 获取腾讯云API密钥
echo "请提供腾讯云API密钥信息："
echo "可以在腾讯云控制台 -> 访问管理 -> API密钥管理 中获取"
echo ""

read -p "SecretId: " SECRET_ID
read -s -p "SecretKey: " SECRET_KEY
echo ""

if [ -z "$SECRET_ID" ] || [ -z "$SECRET_KEY" ]; then
    log_error "API密钥不能为空"
    exit 1
fi

# 2. 获取实例信息
log_info "获取实例信息..."

# 尝试从元数据获取实例ID
INSTANCE_ID=$(curl -s --max-time 5 http://metadata.tencentyun.com/latest/meta-data/instance-id 2>/dev/null)

if [ -z "$INSTANCE_ID" ]; then
    log_warning "无法自动获取实例ID"
    echo "请在腾讯云控制台 -> 云服务器 -> 实例 中查找实例ID"
    read -p "请输入实例ID (格式: ins-xxxxxxxx): " INSTANCE_ID
fi

if [ -z "$INSTANCE_ID" ]; then
    log_error "实例ID不能为空"
    exit 1
fi

log_info "实例ID: $INSTANCE_ID"

# 3. 获取区域信息
REGION=$(curl -s --max-time 5 http://metadata.tencentyun.com/latest/meta-data/placement/region 2>/dev/null)
if [ -z "$REGION" ]; then
    log_warning "无法自动获取区域信息"
    read -p "请输入区域 (如: ap-beijing, ap-shanghai): " REGION
fi

log_info "区域: $REGION"

# 4. 创建API调用函数
call_tencent_api() {
    local action="$1"
    local service="$2"
    local version="$3"
    local data="$4"
    
    local timestamp=$(date +%s)
    local date=$(date -u +%Y-%m-%d)
    
    # 创建签名
    local canonical_request="POST
/

content-type:application/json; charset=utf-8
host:${service}.tencentcloudapi.com

content-type;host
$(echo -n "$data" | sha256sum | cut -d' ' -f1)"
    
    local string_to_sign="TC3-HMAC-SHA256
${timestamp}
${date}/${service}/tc3_request
$(echo -n "$canonical_request" | sha256sum | cut -d' ' -f1)"
    
    # 简化版本：直接使用curl调用
    curl -s -X POST "https://${service}.tencentcloudapi.com/" \
        -H "Authorization: TC3-HMAC-SHA256 Credential=${SECRET_ID}/${date}/${service}/tc3_request, SignedHeaders=content-type;host, Signature=placeholder" \
        -H "Content-Type: application/json; charset=utf-8" \
        -H "Host: ${service}.tencentcloudapi.com" \
        -H "X-TC-Action: $action" \
        -H "X-TC-Timestamp: $timestamp" \
        -H "X-TC-Version: $version" \
        -H "X-TC-Region: $REGION" \
        -d "$data"
}

# 5. 创建简化的安全组配置脚本
log_info "创建安全组配置脚本..."

cat > setup_security_group.py << 'EOF'
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
import subprocess
import time

def run_command(cmd):
    """执行命令并返回结果"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def install_tccli():
    """安装腾讯云CLI"""
    print("🔧 安装腾讯云CLI...")
    success, stdout, stderr = run_command("pip3 install tccli")
    if not success:
        success, stdout, stderr = run_command("pip install tccli")
    return success

def configure_tccli(secret_id, secret_key, region):
    """配置腾讯云CLI"""
    print("⚙️ 配置腾讯云CLI...")
    commands = [
        f"tccli configure set secretId {secret_id}",
        f"tccli configure set secretKey {secret_key}",
        f"tccli configure set region {region}"
    ]
    
    for cmd in commands:
        success, stdout, stderr = run_command(cmd)
        if not success:
            print(f"❌ 配置失败: {stderr}")
            return False
    return True

def get_security_group_id(instance_id):
    """获取实例的安全组ID"""
    print("🔍 获取安全组信息...")
    cmd = f'tccli cvm DescribeInstances --InstanceIds "{instance_id}" --output json'
    success, stdout, stderr = run_command(cmd)
    
    if success:
        try:
            data = json.loads(stdout)
            instances = data.get('InstanceSet', [])
            if instances:
                security_groups = instances[0].get('SecurityGroupIds', [])
                if security_groups:
                    return security_groups[0]
        except:
            pass
    
    print("❌ 无法获取安全组ID")
    return None

def add_security_group_rules(security_group_id):
    """添加安全组规则"""
    print("🔐 添加安全组规则...")
    
    ports = [
        {"port": "80", "desc": "前端HTTP访问"},
        {"port": "3001", "desc": "后端API访问"},
        {"port": "3307", "desc": "MySQL数据库访问"},
        {"port": "22", "desc": "SSH访问"}
    ]
    
    for port_info in ports:
        port = port_info["port"]
        desc = port_info["desc"]
        
        print(f"  添加端口 {port} ({desc})...")
        
        policy_data = {
            "Ingress": [
                {
                    "Protocol": "TCP",
                    "Port": port,
                    "CidrBlock": "0.0.0.0/0",
                    "Action": "ACCEPT",
                    "PolicyDescription": desc
                }
            ]
        }
        
        cmd = f'tccli vpc CreateSecurityGroupPolicies --SecurityGroupId {security_group_id} --SecurityGroupPolicySet \'{json.dumps(policy_data)}\''
        success, stdout, stderr = run_command(cmd)
        
        if success:
            print(f"  ✅ 端口 {port} 规则添加成功")
        else:
            if "already exists" in stderr or "已存在" in stderr:
                print(f"  ⚠️ 端口 {port} 规则已存在")
            else:
                print(f"  ❌ 端口 {port} 规则添加失败: {stderr}")

def test_external_access():
    """测试外部访问"""
    print("🧪 测试外部访问...")
    
    # 获取公网IP
    success, public_ip, _ = run_command("curl -s ifconfig.me")
    if not success:
        success, public_ip, _ = run_command("curl -s ipinfo.io/ip")
    
    if success:
        public_ip = public_ip.strip()
        print(f"公网IP: {public_ip}")
        
        # 等待规则生效
        print("等待安全组规则生效...")
        time.sleep(10)
        
        # 测试各个端口
        tests = [
            {"url": f"http://{public_ip}/", "name": "前端"},
            {"url": f"http://{public_ip}:3001/health", "name": "后端健康检查"},
        ]
        
        for test in tests:
            print(f"测试 {test['name']}: {test['url']}")
            success, stdout, stderr = run_command(f"curl -I -m 10 {test['url']}")
            if success:
                print(f"  ✅ {test['name']} 访问正常")
            else:
                print(f"  ❌ {test['name']} 访问失败")
    else:
        print("❌ 无法获取公网IP")

def main():
    if len(sys.argv) != 4:
        print("用法: python3 setup_security_group.py <SecretId> <SecretKey> <InstanceId>")
        sys.exit(1)
    
    secret_id = sys.argv[1]
    secret_key = sys.argv[2]
    instance_id = sys.argv[3]
    region = "ap-beijing"  # 默认区域
    
    print("🚀 开始配置安全组...")
    
    # 1. 安装CLI
    if not install_tccli():
        print("❌ 安装腾讯云CLI失败")
        sys.exit(1)
    
    # 2. 配置CLI
    if not configure_tccli(secret_id, secret_key, region):
        print("❌ 配置腾讯云CLI失败")
        sys.exit(1)
    
    # 3. 获取安全组ID
    security_group_id = get_security_group_id(instance_id)
    if not security_group_id:
        print("❌ 无法获取安全组ID")
        sys.exit(1)
    
    print(f"✅ 安全组ID: {security_group_id}")
    
    # 4. 添加规则
    add_security_group_rules(security_group_id)
    
    # 5. 测试访问
    test_external_access()
    
    print("🎉 安全组配置完成！")

if __name__ == "__main__":
    main()
EOF

chmod +x setup_security_group.py

# 6. 运行配置脚本
log_info "运行安全组配置..."
python3 setup_security_group.py "$SECRET_ID" "$SECRET_KEY" "$INSTANCE_ID"

# 7. 创建测试脚本
log_info "创建测试脚本..."
cat > test_access.sh << 'EOF'
#!/bin/bash
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
EOF

chmod +x test_access.sh

echo ""
echo "=================================="
log_success "🎉 快速安全组修复完成！"
echo ""
echo "📋 生成的文件:"
echo "✅ setup_security_group.py - Python配置脚本"
echo "✅ test_access.sh - 访问测试脚本"
echo ""
echo "🔧 下一步操作:"
echo "1. 运行测试: ./test_access.sh"
echo "2. 如果失败，等待1-2分钟后重试"
echo ""
log_success "脚本执行完成！"
