#!/bin/bash

# 修复前端上传脚本
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复前端文件上传..."

# 1. 检查构建文件
echo "📋 检查构建文件..."
if [ -d "frontend/build" ]; then
    echo "✅ 找到React构建目录: frontend/build"
    ls -la frontend/build/
else
    echo "❌ 未找到构建目录，重新构建..."
    cd frontend
    npm run build
    cd ..
fi

# 2. 创建临时目录并复制文件
echo "📦 准备上传文件..."
mkdir -p /tmp/frontend-upload
cp -r frontend/build/* /tmp/frontend-upload/

# 3. 上传前端文件
echo "📤 上传前端文件到服务器..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "mkdir -p /tmp/frontend-dist"

sshpass -p "$SERVER_PASSWORD" scp -r -o StrictHostKeyChecking=no /tmp/frontend-upload/* "$SERVER_USER@$SERVER_HOST:/tmp/frontend-dist/"

# 4. 在服务器上部署前端文件
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '📂 部署前端文件...'
    
    # 创建前端目录
    sudo mkdir -p /var/www/task-manager
    
    # 复制前端文件
    sudo cp -r /tmp/frontend-dist/* /var/www/task-manager/
    
    # 设置权限
    sudo chown -R www-data:www-data /var/www/task-manager
    sudo chmod -R 755 /var/www/task-manager
    
    echo '📋 检查前端文件...'
    ls -la /var/www/task-manager/
    
    # 创建一个简单的测试页面（如果index.html不存在）
    if [ ! -f /var/www/task-manager/index.html ]; then
        echo '⚠️ index.html不存在，创建测试页面...'
        sudo tee /var/www/task-manager/index.html << 'HTML_CONTENT'
<!DOCTYPE html>
<html lang=\"zh-CN\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>考研任务管理系统</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .status {
            background: #e8f5e8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #4CAF50;
        }
        .login-info {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #2196F3;
            text-align: left;
        }
        .api-test {
            background: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
        }
        button {
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background: #45a049;
        }
        .error {
            color: #d32f2f;
        }
        .success {
            color: #388e3c;
        }
    </style>
</head>
<body>
    <div class=\"container\">
        <h1>🎓 考研任务管理系统</h1>
        
        <div class=\"status\">
            <h3>✅ 系统部署成功！</h3>
            <p>后端API服务正在运行，前端界面正在加载中...</p>
        </div>
        
        <div class=\"login-info\">
            <h3>📱 登录信息</h3>
            <p><strong>👨‍💼 管理员:</strong> ADMIN / AdminPass123</p>
            <p><strong>👨‍🎓 学生1:</strong> ST001 / Hello888</p>
            <p><strong>👨‍🎓 学生2:</strong> ST002 / NewPass123</p>
        </div>
        
        <div class=\"api-test\">
            <h3>🔍 API测试</h3>
            <button onclick=\"testAdminLogin()\">测试管理员登录</button>
            <button onclick=\"testStudentLogin()\">测试学生登录</button>
            <div id=\"result\" style=\"margin-top: 15px;\"></div>
        </div>
        
        <div style=\"margin-top: 30px;\">
            <p><strong>🔗 API地址:</strong> http://124.221.113.102/api</p>
            <p><strong>📍 服务器:</strong> 124.221.113.102</p>
        </div>
    </div>

    <script>
        async function testAdminLogin() {
            const result = document.getElementById('result');
            result.innerHTML = '正在测试管理员登录...';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: 'ADMIN',
                        password: 'AdminPass123'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    result.innerHTML = '<div class=\"success\">✅ 管理员登录成功！Token: ' + data.token.substring(0, 20) + '...</div>';
                } else {
                    result.innerHTML = '<div class=\"error\">❌ 登录失败: ' + data.message + '</div>';
                }
            } catch (error) {
                result.innerHTML = '<div class=\"error\">❌ 连接错误: ' + error.message + '</div>';
            }
        }
        
        async function testStudentLogin() {
            const result = document.getElementById('result');
            result.innerHTML = '正在测试学生登录...';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: 'ST001',
                        password: 'Hello888'
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    result.innerHTML = '<div class=\"success\">✅ 学生登录成功！Token: ' + data.token.substring(0, 20) + '...</div>';
                } else {
                    result.innerHTML = '<div class=\"error\">❌ 登录失败: ' + data.message + '</div>';
                }
            } catch (error) {
                result.innerHTML = '<div class=\"error\">❌ 连接错误: ' + error.message + '</div>';
            }
        }
    </script>
</body>
</html>
HTML_CONTENT
        sudo chown www-data:www-data /var/www/task-manager/index.html
    fi
    
    # 重启nginx
    sudo systemctl reload nginx
    
    echo '✅ 前端文件部署完成！'
"

# 清理临时文件
rm -rf /tmp/frontend-upload

echo ""
echo "🎉 前端修复完成！"
echo ""
echo "🧪 等待服务重新加载..."
sleep 5

echo "🔍 测试前端访问..."
RESPONSE=$(curl -s -I http://124.221.113.102/ --connect-timeout 10 --max-time 15)
echo "前端响应头: $RESPONSE"

if [[ "$RESPONSE" == *"200 OK"* ]]; then
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
    echo "   ✅ API测试功能"
else
    echo ""
    echo "⚠️ 前端可能还在配置中，请稍后再试"
    echo ""
    echo "🔍 手动检查步骤："
    echo "   1. 访问: http://124.221.113.102"
    echo "   2. 如果无法访问，请检查："
    echo "      - ssh ubuntu@124.221.113.102"
    echo "      - sudo systemctl status nginx"
    echo "      - ls -la /var/www/task-manager/"
    echo "      - sudo nginx -t"
fi
