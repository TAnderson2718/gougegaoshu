#!/bin/bash

# 部署前端界面脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🚀 开始部署前端界面..."

# 1. 首先构建前端
echo "📦 构建前端项目..."
cd frontend
npm run build
cd ..

echo "📤 上传前端文件到服务器..."

# 2. 上传前端构建文件
sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no frontend/dist/* "$SERVER_USER@$SERVER_HOST:/tmp/frontend-dist/"

# 3. 在服务器上配置前端
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🔧 配置前端服务...'
    
    # 安装nginx
    sudo apt update
    sudo apt install -y nginx
    
    # 创建前端目录
    sudo mkdir -p /var/www/task-manager
    
    # 复制前端文件
    sudo cp -r /tmp/frontend-dist/* /var/www/task-manager/
    
    # 设置权限
    sudo chown -R www-data:www-data /var/www/task-manager
    sudo chmod -R 755 /var/www/task-manager
    
    # 配置nginx
    sudo tee /etc/nginx/sites-available/task-manager << 'NGINX_CONFIG'
server {
    listen 80;
    server_name 124.221.113.102;
    root /var/www/task-manager;
    index index.html;

    # 前端路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API代理到后端
    location /api/ {
        proxy_pass http://localhost:3002/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
}
NGINX_CONFIG
    
    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/task-manager /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试nginx配置
    sudo nginx -t
    
    # 重启nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    
    # 开放HTTP端口
    sudo ufw allow 80
    sudo ufw allow 'Nginx Full'
    
    echo '✅ 前端部署完成！'
    
    echo '🔍 检查nginx状态...'
    sudo systemctl status nginx --no-pager -l
    
    echo '🌐 检查端口监听...'
    sudo netstat -tlnp | grep :80
"

echo ""
echo "🎉 前端部署完成！"
echo ""
echo "🧪 等待服务启动..."
sleep 10

echo "🔍 测试前端访问..."
RESPONSE=$(curl -s -I http://124.221.113.102/ --connect-timeout 10 --max-time 15)
echo "前端响应头: $RESPONSE"

if [[ "$RESPONSE" == *"200 OK"* ]] || [[ "$RESPONSE" == *"nginx"* ]]; then
    echo ""
    echo "🎉🎉🎉 前端部署完全成功！🎉🎉🎉"
    echo ""
    echo "🌐 考研任务管理系统访问信息："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 服务器地址: 124.221.113.102"
    echo "🌐 前端网页: http://124.221.113.102"
    echo "🔗 API地址: http://124.221.113.102/api"
    echo ""
    echo "📱 登录信息:"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / NewPass123"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎊 恭喜！您现在可以通过浏览器访问考研任务管理系统了！"
    echo ""
    echo "📋 访问方式:"
    echo "   1. 打开浏览器"
    echo "   2. 访问: http://124.221.113.102"
    echo "   3. 使用上述登录信息登录系统"
    echo ""
    echo "🔧 系统功能:"
    echo "   ✅ 管理员界面 - 任务导入和管理"
    echo "   ✅ 学生界面 - 任务查看和完成"
    echo "   ✅ 密码修改功能"
    echo "   ✅ 进度统计和报告"
    echo ""
    echo "🌟 建议测试:"
    echo "   1. 管理员登录测试"
    echo "   2. 学生登录测试"
    echo "   3. 任务导入功能"
    echo "   4. 任务完成功能"
    echo "   5. 密码修改功能"
else
    echo ""
    echo "⚠️ 前端可能还在配置中，请稍后再试"
    echo ""
    echo "🔍 手动检查步骤："
    echo "   1. 访问: http://124.221.113.102"
    echo "   2. 如果无法访问，请检查："
    echo "      - ssh ubuntu@124.221.113.102"
    echo "      - sudo systemctl status nginx"
    echo "      - sudo nginx -t"
    echo "      - sudo ufw status"
fi
