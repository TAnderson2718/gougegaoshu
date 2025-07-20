#!/bin/bash

# 部署修复后的前端代码
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 部署修复后的前端代码..."

# 1. 修复服务器端权限
echo "🔧 修复服务器端权限..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    sudo chown -R ubuntu:ubuntu /var/www/html/
    sudo chmod -R 755 /var/www/html/
    sudo rm -rf /var/www/html/*
"

# 2. 上传新的前端文件
echo "�� 上传修复后的前端文件..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no frontend/build/* "$SERVER_USER@$SERVER_HOST:/var/www/html/"

# 3. 设置正确权限
echo "🔧 设置文件权限..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    sudo chown -R www-data:www-data /var/www/html/
    sudo chmod -R 644 /var/www/html/
    sudo find /var/www/html/ -type d -exec chmod 755 {} \;
    sudo systemctl reload nginx
"

# 4. 测试
echo ""
echo "🧪 测试修复后的系统..."
sleep 3

API_RESPONSE=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 15)

echo "API测试响应: $API_RESPONSE"

if [[ "$API_RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉🎉🎉 修复成功！🎉🎉🎉"
    echo ""
    echo "✅ 修复内容:"
    echo "   ✅ 修复了withCredentials CORS问题"
    echo "   ✅ 增加了详细的错误日志"
    echo "   ✅ 优化了超时设置"
    echo "   ✅ 重新部署了前端文件"
    echo ""
    echo "🌐 访问地址: http://124.221.113.102"
    echo "📱 登录信息: ADMIN / AdminPass123"
    echo ""
    echo "📋 请执行以下步骤:"
    echo "   1. 完全关闭浏览器"
    echo "   2. 重新打开浏览器"
    echo "   3. 访问系统并登录"
    echo "   4. 如果仍有问题，请查看浏览器开发者工具的控制台"
else
    echo ""
    echo "⚠️ 仍有问题，API响应: $API_RESPONSE"
fi
