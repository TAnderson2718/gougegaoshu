#!/bin/bash

echo "🧪 测试服务状态..."

echo "=== 端口占用情况 ==="
lsof -i :3000 2>/dev/null || echo "端口3000未被占用"
lsof -i :3001 2>/dev/null || echo "端口3001未被占用"

echo -e "\n=== 后端健康检查 ==="
curl -s http://localhost:3001/health 2>/dev/null || echo "后端服务无响应"

echo -e "\n=== 前端页面检查 ==="
curl -s -I http://localhost:3000 2>/dev/null | head -2 || echo "前端服务无响应"

echo -e "\n=== 进程检查 ==="
ps aux | grep -E "(node|npm)" | grep -v grep | grep -E "(3000|3001|react|server)" || echo "没有找到相关进程"
