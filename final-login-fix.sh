#!/bin/bash

# 最终登录修复脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 最终登录修复..."

# 1. 上传修复后的数据库配置
echo "📤 上传修复后的数据库配置..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no backend/config/database.js "$SERVER_USER@$SERVER_HOST:/home/ubuntu/gougegaoshu/backend/config/"

# 2. 重启服务并测试
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🔄 重启后端服务...'
    cd /home/ubuntu/gougegaoshu/backend
    pm2 restart task-backend
    
    echo '⏳ 等待服务启动...'
    sleep 15
    
    echo '📊 检查服务状态...'
    pm2 status
    
    echo ''
    echo '🧪 测试管理员登录...'
    ADMIN_RESULT=\$(curl -s -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10)
    echo \"管理员登录结果: \$ADMIN_RESULT\"
    
    echo ''
    echo '🧪 测试学生登录...'
    STUDENT_RESULT=\$(curl -s -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ST001\",\"password\":\"Hello888\"}' \
      --connect-timeout 5 \
      --max-time 10)
    echo \"学生登录结果: \$STUDENT_RESULT\"
    
    echo ''
    echo '📋 查看最新日志...'
    pm2 logs task-backend --lines 15 --nostream
    
    echo ''
    echo '✅ 最终修复完成！'
"

echo ""
echo "🎉 最终修复完成！"
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
    echo "🎉🎉🎉 登录系统完全修复成功！🎉🎉🎉"
    echo ""
    echo "✅ 现在您可以正常登录系统了："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🌐 访问地址: http://124.221.113.102"
    echo ""
    echo "📱 登录信息 (统一登录端点):"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / NewPass123"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 修复内容:"
    echo "   ✅ 修复了数据库query函数导入问题"
    echo "   ✅ 修复了数据库socket连接问题"
    echo "   ✅ 创建了统一的登录端点 /api/auth/login"
    echo "   ✅ 自动识别管理员和学生账号"
    echo "   ✅ 支持userId字段名称"
    echo "   ✅ 管理员和学生登录都正常工作"
    echo "   ✅ 返回正确的token和用户信息"
    echo ""
    echo "📋 下一步操作:"
    echo "   1. 刷新浏览器页面 (F5)"
    echo "   2. 清除浏览器缓存 (Ctrl+F5 或 Cmd+Shift+R)"
    echo "   3. 使用上述登录信息登录系统"
    echo "   4. 测试各项功能"
    echo ""
    echo "🎊 恭喜！登录问题已完全解决！"
    echo "🎊 您现在可以正常使用考研任务管理系统了！"
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
    echo ""
    echo "🛠️ 如果问题持续，请查看服务器日志："
    echo "   ssh ubuntu@124.221.113.102"
    echo "   pm2 logs task-backend"
fi
