#!/bin/bash

# 修复密码哈希脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复密码哈希..."

# 1. 上传修复后的认证文件
echo "📤 上传修复后的认证文件..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no backend/routes/auth.js "$SERVER_USER@$SERVER_HOST:/home/ubuntu/gougegaoshu/backend/routes/"

# 2. 在服务器上设置正确的密码哈希
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🔐 生成密码哈希...'
    cd /home/ubuntu/gougegaoshu/backend
    
    # 生成管理员密码哈希
    ADMIN_HASH=\$(node -e \"
        const bcrypt = require('bcrypt');
        const hash = bcrypt.hashSync('AdminPass123', 10);
        console.log(hash);
    \")
    
    # 生成学生密码哈希
    STUDENT_HASH=\$(node -e \"
        const bcrypt = require('bcrypt');
        const hash = bcrypt.hashSync('Hello888', 10);
        console.log(hash);
    \")
    
    echo '📋 设置管理员密码哈希...'
    mysql -u taskapp -p'TaskApp2024!' -h localhost task_manager_db -e \"
        UPDATE admins SET password_hash = '\$ADMIN_HASH' WHERE user_id = 'ADMIN';
    \"
    
    echo '📋 设置学生密码哈希...'
    mysql -u taskapp -p'TaskApp2024!' -h localhost task_manager_db -e \"
        UPDATE students SET password_hash = '\$STUDENT_HASH' WHERE user_id IN ('ST001', 'ST002');
    \"
    
    echo '📋 验证密码设置...'
    echo '管理员密码:'
    mysql -u taskapp -p'TaskApp2024!' -h localhost task_manager_db -e \"
        SELECT user_id, name, LEFT(password_hash, 20) as password_start, LENGTH(password_hash) as password_length 
        FROM admins WHERE user_id = 'ADMIN';
    \"
    
    echo ''
    echo '学生密码:'
    mysql -u taskapp -p'TaskApp2024!' -h localhost task_manager_db -e \"
        SELECT user_id, name, LEFT(password_hash, 20) as password_start, LENGTH(password_hash) as password_length 
        FROM students WHERE user_id IN ('ST001', 'ST002');
    \"
    
    echo ''
    echo '🔄 重启后端服务...'
    pm2 restart task-backend
    
    echo '⏳ 等待服务启动...'
    sleep 15
    
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
    pm2 logs task-backend --lines 10 --nostream
    
    echo ''
    echo '✅ 密码哈希修复完成！'
"

echo ""
echo "🎉 密码哈希修复完成！"
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
    echo "📱 登录信息:"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / Hello888"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 修复内容:"
    echo "   ✅ 修复了数据库字段映射问题"
    echo "   ✅ 使用正确的password_hash字段"
    echo "   ✅ 使用正确的user_id字段"
    echo "   ✅ 设置了正确的bcrypt密码哈希"
    echo "   ✅ 统一登录端点正常工作"
    echo "   ✅ 管理员和学生登录都可用"
    echo ""
    echo "📋 下一步操作:"
    echo "   1. 刷新浏览器页面 (F5)"
    echo "   2. 清除浏览器缓存 (Ctrl+F5)"
    echo "   3. 使用上述登录信息登录系统"
    echo ""
    echo "🎊 恭喜！登录问题已完全解决！"
    echo "🎊 您现在可以正常使用考研任务管理系统了！"
elif [[ "$ADMIN_RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉 管理员登录修复成功！"
    echo "⚠️ 学生登录可能还有问题，响应: $STUDENT_RESPONSE"
elif [[ "$STUDENT_RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉 学生登录修复成功！"
    echo "⚠️ 管理员登录可能还有问题，响应: $ADMIN_RESPONSE"
else
    echo ""
    echo "⚠️ 仍有问题"
    echo "管理员响应: $ADMIN_RESPONSE"
    echo "学生响应: $STUDENT_RESPONSE"
fi
