#!/bin/bash

# 修复前端文件上传权限问题并完成部署
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复前端文件上传权限问题..."

# 1. 先修复服务器端权限
echo "🔧 修复服务器端/var/www/html权限..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🔧 修复/var/www/html目录权限...'
    sudo chown -R ubuntu:ubuntu /var/www/html/
    sudo chmod -R 755 /var/www/html/
    
    echo '🧹 清理旧的前端文件...'
    sudo rm -rf /var/www/html/*
    
    echo '✅ 权限修复完成'
"

# 2. 重新上传前端文件
echo "📤 重新上传前端文件..."
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no frontend/build/* "$SERVER_USER@$SERVER_HOST:/var/www/html/"

# 3. 设置正确的权限
echo "🔧 设置正确的文件权限..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    sudo chown -R www-data:www-data /var/www/html/
    sudo chmod -R 644 /var/www/html/
    sudo find /var/www/html/ -type d -exec chmod 755 {} \;
    
    echo '📋 检查上传的文件...'
    ls -la /var/www/html/
    
    echo '🔄 重新加载Nginx配置...'
    sudo systemctl reload nginx
    
    echo '✅ 前端部署完成！'
"

# 4. 等待并测试
echo ""
echo "🧪 等待服务稳定..."
sleep 5

echo "🔍 测试前端页面访问..."
FRONTEND_RESPONSE=$(curl -s -I http://124.221.113.102/ | head -n 1)
echo "前端页面响应: $FRONTEND_RESPONSE"

echo ""
echo "🔍 测试API连接..."
API_RESPONSE=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 15)

echo "API响应: $API_RESPONSE"

if [[ "$API_RESPONSE" == *"token"* ]] && [[ "$FRONTEND_RESPONSE" == *"200"* ]]; then
    echo ""
    echo "🎉🎉🎉 前端文件上传修复成功！🎉🎉��"
    echo ""
    echo "✅ 现在您可以正常使用系统了："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 访问地址: http://124.221.113.102"
    echo ""
    echo "📱 登录信息:"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / Hello888"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 完整修复内容:"
    echo "   ✅ 修复了Nginx代理配置和CORS支持"
    echo "   ✅ 在后端添加了CORS中间件"
    echo "   ✅ 移除了冲突的setupProxy.js文件"
    echo "   ✅ 重新构建并上传了前端文件"
    echo "   ✅ 修复了文件权限问题"
    echo "   ✅ 确保API请求正确代理到后端"
    echo ""
    echo "📋 下一步操作:"
    echo "   1. 强制刷新浏览器页面 (Ctrl+F5 或 Cmd+Shift+R)"
    echo "   2. 清除浏览器缓存和Cookie"
    echo "   3. 使用上述登录信息登录系统"
    echo "   4. 测试各项功能"
    echo ""
    echo "🎊 恭喜！网络连接问题已完全解决！"
    echo "🎊 您现在可以正常使用所有功能了！"
else
    echo ""
    echo "⚠️ 仍有问题需要进一步排查"
    echo "API响应: $API_RESPONSE"
    echo "前端响应: $FRONTEND_RESPONSE"
    echo ""
    echo "🔍 请检查："
    echo "   1. 强制刷新浏览器并清除所有缓存"
    echo "   2. 检查浏览器开发者工具的网络选项卡"
    echo "   3. 等待几分钟后重试"
    echo "   4. 检查是否有防火墙或网络限制"
fi

echo ""
echo "📋 故障排除提示："
echo "   - 如果仍显示网络错误，请完全关闭浏览器重新打开"
echo "   - 尝试使用无痕/隐私模式访问"
echo "   - 检查浏览器是否阻止了不安全的HTTP请求"
echo "   - 确认没有浏览器扩展干扰网络请求"
echo "   - 等待几分钟让DNS和缓存完全更新"
