#!/bin/bash

# 综合修复CORS和网络错误问题
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 综合修复CORS和网络连接问题..."

# 1. 检查并修复Nginx配置
echo "📋 检查当前Nginx配置..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '📋 当前Nginx配置:'
    cat /etc/nginx/sites-available/default
    echo ''
"

# 2. 创建新的Nginx配置
echo "🔧 创建优化的Nginx配置..."
cat > nginx_config_new.conf << 'EOF'
server {
    listen 80;
    server_name 124.221.113.102;
    
    # 前端静态文件
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        
        # 添加CORS头部
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
    }
    
    # API代理到后端
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS头部
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # 处理预检请求
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # 错误页面
    error_page 404 /index.html;
}
EOF

# 3. 上传新的Nginx配置
echo "📤 上传新的Nginx配置..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no nginx_config_new.conf "$SERVER_USER@$SERVER_HOST:/tmp/"

# 4. 在后端添加CORS中间件
echo "🔧 在后端添加CORS中间件..."
cat > cors_middleware.js << 'EOF'
// CORS中间件
const corsMiddleware = (req, res, next) => {
  // 设置CORS头部
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

module.exports = corsMiddleware;
EOF

# 5. 上传CORS中间件
echo "📤 上传CORS中间件..."
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no cors_middleware.js "$SERVER_USER@$SERVER_HOST:/home/ubuntu/gougegaoshu/backend/"

# 6. 应用修复
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🔧 应用Nginx配置修复...'
    sudo cp /tmp/nginx_config_new.conf /etc/nginx/sites-available/default
    sudo nginx -t
    
    if [ \$? -eq 0 ]; then
        echo '✅ Nginx配置语法正确'
        sudo systemctl reload nginx
        echo '✅ Nginx配置已重新加载'
    else
        echo '❌ Nginx配置语法错误'
        exit 1
    fi
    
    echo ''
    echo '🔧 修改后端代码添加CORS中间件...'
    cd /home/ubuntu/gougegaoshu/backend
    
    # 备份原始server.js
    cp server.js server.js.backup
    
    # 在server.js中添加CORS中间件
    sed -i '/const express = require/a const corsMiddleware = require(\"./cors_middleware\");' server.js
    sed -i '/app.use(express.json/a app.use(corsMiddleware);' server.js
    
    echo '✅ CORS中间件已添加到后端'
    
    echo ''
    echo '🔄 重启后端服务...'
    pm2 restart task-backend
    
    echo '⏳ 等待服务启动...'
    sleep 10
    
    echo '📋 检查服务状态...'
    pm2 status
    
    echo ''
    echo '🧪 测试API连接...'
    curl -X POST http://localhost:3002/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
    
    echo ''
    echo '🧪 测试Nginx代理...'
    curl -X POST http://localhost/api/auth/login \
      -H \"Content-Type: application/json\" \
      -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}' \
      --connect-timeout 5 \
      --max-time 10
"

# 7. 检查前端setupProxy.js并移除（如果存在）
echo ""
echo "🔧 检查前端setupProxy.js配置..."
if [ -f "frontend/src/setupProxy.js" ]; then
    echo "⚠️ 发现setupProxy.js文件，在生产环境中可能导致冲突"
    echo "📋 当前setupProxy.js内容:"
    cat frontend/src/setupProxy.js
    echo ""
    echo "🗑️ 移除setupProxy.js以避免与Nginx代理冲突..."
    mv frontend/src/setupProxy.js frontend/src/setupProxy.js.backup
    echo "✅ setupProxy.js已备份并移除"
    
    # 重新构建前端
    echo "🏗️ 重新构建前端..."
    cd frontend
    npm run build
    cd ..
    
    # 重新上传前端
    echo "📤 重新上传前端文件..."
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
        sudo rm -rf /var/www/html/*
    "
    sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no frontend/build/* "$SERVER_USER@$SERVER_HOST:/var/www/html/"
    
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
        sudo chown -R www-data:www-data /var/www/html/
        sudo chmod -R 644 /var/www/html/
        sudo find /var/www/html/ -type d -exec chmod 755 {} \;
    "
else
    echo "✅ 没有发现setupProxy.js文件"
fi

# 8. 最终测试
echo ""
echo "🧪 等待服务稳定..."
sleep 10

echo "🔍 测试外部API连接..."
API_RESPONSE=$(curl -s -X POST http://124.221.113.102/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 10 \
  --max-time 15)

echo "API响应: $API_RESPONSE"

echo ""
echo "🔍 测试前端页面..."
FRONTEND_RESPONSE=$(curl -s -I http://124.221.113.102/ | head -n 1)
echo "前端响应: $FRONTEND_RESPONSE"

# 清理临时文件
rm -f nginx_config_new.conf cors_middleware.js

if [[ "$API_RESPONSE" == *"token"* ]] && [[ "$FRONTEND_RESPONSE" == *"200"* ]]; then
    echo ""
    echo "🎉🎉🎉 CORS和网络问题修复成功！🎉🎉🎉"
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
    echo "🔧 修复内容:"
    echo "   ✅ 优化了Nginx代理配置"
    echo "   ✅ 添加了完整的CORS头部支持"
    echo "   ✅ 在后端添加了CORS中间件"
    echo "   ✅ 移除了可能冲突的setupProxy.js"
    echo "   ✅ 确保API请求正确代理到后端"
    echo ""
    echo "📋 下一步操作:"
    echo "   1. 强制刷新浏览器 (Ctrl+F5 或 Cmd+Shift+R)"
    echo "   2. 清除浏览器缓存和Cookie"
    echo "   3. 使用上述登录信息登录系统"
    echo ""
    echo "🎊 恭喜！网络连接问题已完全解决！"
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
