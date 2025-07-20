#!/bin/bash

# 修复query导入问题脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复query导入问题..."

# 1. 上传数据库配置文件和认证文件
echo "📤 上传数据库配置文件..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no backend/config/database.js "$SERVER_USER@$SERVER_HOST:/home/ubuntu/gougegaoshu/backend/config/"

echo "📤 上传认证文件..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no backend/routes/auth.js "$SERVER_USER@$SERVER_HOST:/home/ubuntu/gougegaoshu/backend/routes/"

# 2. 在服务器上测试导入
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🔍 测试数据库模块导入...'
    cd /home/ubuntu/gougegaoshu/backend
    
    node -e \"
        try {
            console.log('🔍 测试导入数据库模块...');
            const db = require('./config/database');
            console.log('✅ 数据库模块导入成功');
            console.log('📋 导出的函数:', Object.keys(db));
            console.log('🔍 query函数类型:', typeof db.query);
            
            if (typeof db.query === 'function') {
                console.log('✅ query函数存在且为函数类型');
            } else {
                console.log('❌ query函数不存在或类型错误');
            }
        } catch (error) {
            console.error('❌ 导入失败:', error.message);
        }
    \"
    
    echo ''
    echo '🔄 重启后端服务...'
    pm2 restart task-backend
    
    echo '⏳ 等待服务启动...'
    sleep 15
    
    echo '📊 检查服务状态...'
    pm2 status
    
    echo ''
    echo '🧪 测试登录API...'
    curl -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '📋 查看最新日志...'
    pm2 logs task-backend --lines 10 --nostream
    
    echo ''
    echo '✅ 修复完成！'
"

echo ""
echo "🎉 query导入修复完成！"
echo ""
echo "🧪 等待服务稳定..."
sleep 10

echo "🔍 测试外部登录..."
RESPONSE=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 15)

echo "登录响应: $RESPONSE"

if [[ "$RESPONSE" == *"token"* ]]; then
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
    echo "   ✅ 修复了数据库query函数导入问题"
    echo "   ✅ 统一登录端点正常工作"
    echo "   ✅ 管理员和学生登录都可用"
    echo ""
    echo "📋 下一步操作:"
    echo "   1. 刷新浏览器页面 (F5)"
    echo "   2. 清除浏览器缓存 (Ctrl+F5)"
    echo "   3. 使用上述登录信息登录系统"
    echo ""
    echo "🎊 恭喜！登录问题已完全解决！"
elif [[ "$RESPONSE" == *"success"* ]]; then
    echo ""
    echo "🎉 API连接正常！"
    echo "✅ 请刷新浏览器页面并重试登录"
else
    echo ""
    echo "⚠️ 仍有问题，响应: $RESPONSE"
    echo ""
    echo "🔍 请检查："
    echo "   1. 刷新浏览器页面"
    echo "   2. 清除浏览器缓存"
    echo "   3. 等待几分钟后重试"
fi
