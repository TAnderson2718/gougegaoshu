#!/bin/bash

# 修复前端文件权限并重新部署
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复前端文件权限并重新部署..."

# 1. 修复服务器上的文件权限
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
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🔧 设置正确的文件权限...'
    sudo chown -R www-data:www-data /var/www/html/
    sudo chmod -R 644 /var/www/html/
    sudo find /var/www/html/ -type d -exec chmod 755 {} \;
    
    echo '📋 检查上传的文件...'
    ls -la /var/www/html/
    
    echo ''
    echo '🔄 重新加载Nginx配置...'
    sudo systemctl reload nginx
    
    echo '✅ 前端部署完成！'
"

echo ""
echo "🎉 前端权限修复和重新部署完成！"
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

if [[ "$FRONTEND_RESPONSE" == *"200"* ]] && [[ "$API_RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉🎉🎉 系统完全修复成功！🎉🎉🎉"
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
    echo "   ✅ 修复了数据库字段映射问题"
    echo "   ✅ 设置了正确的bcrypt密码哈希"
    echo "   ✅ 修复了前端API配置"
    echo "   ✅ 统一了登录端点"
    echo "   ✅ 修复了文件权限问题"
    echo "   ✅ 重新部署了前端和后端"
    echo "   ✅ 确保Nginx代理正常工作"
    echo ""
    echo "📋 下一步操作:"
    echo "   1. 刷新浏览器页面 (F5)"
    echo "   2. 清除浏览器缓存 (Ctrl+F5 或 Cmd+Shift+R)"
    echo "   3. 使用上述登录信息登录系统"
    echo "   4. 测试各项功能"
    echo ""
    echo "🎊 恭喜！考研任务管理系统已完全修复！"
    echo "🎊 您现在可以正常使用所有功能了！"
elif [[ "$API_RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉 API连接正常！"
    echo "⚠️ 前端页面可能还有问题，响应: $FRONTEND_RESPONSE"
    echo ""
    echo "✅ 请刷新浏览器页面并重试"
else
    echo ""
    echo "⚠️ 仍有问题"
    echo "前端响应: $FRONTEND_RESPONSE"
    echo "API响应: $API_RESPONSE"
    echo ""
    echo "🔍 请检查："
    echo "   1. 刷新浏览器页面并清除缓存"
    echo "   2. 等待几分钟后重试"
fi

echo ""
echo "📋 使用提示："
echo "   - 管理员可以导入任务、管理学生、查看报告"
echo "   - 学生可以查看任务、标记完成、修改密码"
echo "   - 系统支持任务调度、进度跟踪、数据统计"
echo "   - 如有问题，请检查浏览器开发者工具的控制台"
