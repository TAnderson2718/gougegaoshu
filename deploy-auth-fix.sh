#!/bin/bash

# 部署认证修复脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 部署认证修复..."

# 1. 上传修复后的认证文件
echo "📤 上传修复后的认证文件..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no backend/routes/auth.js "$SERVER_USER@$SERVER_HOST:/home/ubuntu/gougegaoshu/backend/routes/"

# 2. 重启后端服务
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🔄 重启后端服务...'
    cd /home/ubuntu/gougegaoshu/backend
    pm2 restart task-backend
    
    echo '⏳ 等待服务启动...'
    sleep 10
    
    echo '📊 检查服务状态...'
    pm2 status
    
    echo ''
    echo '🧪 测试管理员登录API...'
    curl -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '🧪 测试学生登录API...'
    curl -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ST001\",\"password\":\"Hello888\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '🌐 测试通过Nginx代理的管理员登录...'
    curl -X POST http://localhost/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '✅ 认证修复部署完成！'
"

echo ""
echo "🎉 认证修复部署完成！"
echo ""
echo "🧪 等待服务稳定..."
sleep 10

echo "🔍 测试外部管理员登录..."
ADMIN_RESPONSE=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 15)

echo "管理员登录响应: $ADMIN_RESPONSE"

echo ""
echo "🔍 测试外部学生登录..."
STUDENT_RESPONSE=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ST001","password":"Hello888"}' \
  --connect-timeout 10 \
  --max-time 15)

echo "学生登录响应: $STUDENT_RESPONSE"

if [[ "$ADMIN_RESPONSE" == *"token"* ]] && [[ "$STUDENT_RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉🎉🎉 登录问题完全修复！🎉🎉🎉"
    echo ""
    echo "✅ 现在您可以正常登录系统了："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 访问地址: http://124.221.113.102"
    echo ""
    echo "📱 登录信息:"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / NewPass123"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 修复内容:"
    echo "   ✅ 统一了前后端登录字段名称"
    echo "   ✅ 支持userId和studentId两种字段"
    echo "   ✅ 管理员和学生登录都正常工作"
    echo "   ✅ API响应格式正确"
    echo ""
    echo "📋 下一步操作:"
    echo "   1. 刷新浏览器页面"
    echo "   2. 清除浏览器缓存（Ctrl+F5 或 Cmd+Shift+R）"
    echo "   3. 使用上述登录信息登录系统"
    echo "   4. 测试各项功能"
elif [[ "$ADMIN_RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉 管理员登录修复成功！"
    echo "⚠️ 学生登录可能还有问题，响应: $STUDENT_RESPONSE"
    echo ""
    echo "✅ 请先测试管理员登录: ADMIN / AdminPass123"
elif [[ "$STUDENT_RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉 学生登录修复成功！"
    echo "⚠️ 管理员登录可能还有问题，响应: $ADMIN_RESPONSE"
    echo ""
    echo "✅ 请先测试学生登录: ST001 / Hello888"
else
    echo ""
    echo "⚠️ 登录仍有问题"
    echo "管理员响应: $ADMIN_RESPONSE"
    echo "学生响应: $STUDENT_RESPONSE"
    echo ""
    echo "🔍 请检查："
    echo "   1. 刷新浏览器页面"
    echo "   2. 清除浏览器缓存"
    echo "   3. 检查网络连接"
    echo "   4. 等待几分钟后重试"
fi
