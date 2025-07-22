#!/bin/bash

# 验证Docker部署脚本
SERVER="gougegaoshu-server"
SERVER_IP="124.221.113.102"

echo "🔍 验证Docker部署状态..."

# 检查Docker服务状态
echo "=== Docker服务状态 ==="
ssh $SERVER "sudo systemctl status docker --no-pager -l"

echo -e "\n=== Docker镜像 ==="
ssh $SERVER "sudo docker images"

echo -e "\n=== Docker容器状态 ==="
ssh $SERVER "cd /opt/gougegaoshu && sudo docker-compose ps"

echo -e "\n=== 端口监听状态 ==="
ssh $SERVER "sudo netstat -tlnp | grep -E ':(80|3001|3306)'"

echo -e "\n=== 健康检查 ==="
echo "检查前端..."
curl -f -m 10 http://$SERVER_IP/health 2>/dev/null && echo "前端健康检查: ✅ 成功" || echo "前端健康检查: ❌ 失败"

echo "检查后端..."
curl -f -m 10 http://$SERVER_IP:3001/health 2>/dev/null && echo "后端健康检查: ✅ 成功" || echo "后端健康检查: ❌ 失败"

echo -e "\n=== 访问测试 ==="
echo "前端访问: http://$SERVER_IP"
echo "后端API: http://$SERVER_IP:3001"

echo -e "\n🎉 验证完成！"
