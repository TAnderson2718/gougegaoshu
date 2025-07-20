#!/bin/bash

# 检查日志脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔍 检查服务日志和状态..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '📊 查看PM2服务状态...'
    pm2 status
    
    echo ''
    echo '🔍 查看服务日志（最近30行）...'
    pm2 logs task-backend --lines 30 --nostream
    
    echo ''
    echo '🌐 检查端口监听状态...'
    netstat -tlnp | grep :3002
    
    echo ''
    echo '🔥 检查防火墙状态...'
    sudo ufw status | grep 3002
    
    echo ''
    echo '🧪 本地测试API...'
    curl -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '🔧 检查服务器内部连接...'
    curl -X GET http://localhost:3002/api/health \
      --connect-timeout 5 \
      --max-time 10 || echo '健康检查端点不存在'
    
    echo ''
    echo '📋 检查进程详情...'
    ps aux | grep node | grep -v grep
"
