#!/bin/bash

echo "=== 服务器诊断脚本 ==="
echo "时间: $(date)"
echo ""

# 检查服务器连接
echo "1. 检查服务器连接..."
ping -c 3 124.221.113.102

echo ""
echo "2. 检查端口状态..."
# 检查80端口
nc -zv 124.221.113.102 80 2>&1
# 检查3000端口
nc -zv 124.221.113.102 3000 2>&1
# 检查3001端口
nc -zv 124.221.113.102 3001 2>&1

echo ""
echo "3. 检查HTTP响应..."
curl -I http://124.221.113.102 2>&1 | head -5

echo ""
echo "=== 诊断完成 ==="
echo ""
echo "如果所有端口都显示 'Connection refused'，说明："
echo "1. 服务没有启动"
echo "2. 防火墙阻止了连接"
echo "3. 安全组配置有问题"
echo ""
echo "请登录服务器执行以下命令："
echo "ssh ubuntu@124.221.113.102"
echo "cd ~/gougegaoshu"
echo "pm2 status"
echo "sudo systemctl status nginx"
