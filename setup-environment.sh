#!/bin/bash

# 腾讯云服务器环境配置脚本
# 在服务器上运行此脚本来配置MySQL权限和防火墙

echo "🔧 配置腾讯云服务器环境..."
echo "=========================================="

# 检查是否为root用户或有sudo权限
if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
    echo "❌ 此脚本需要sudo权限，请确保当前用户有sudo权限"
    exit 1
fi

# 更新系统
echo "📦 更新系统..."
sudo apt update

# 配置防火墙
echo "🛡️ 配置防火墙规则..."

# 检查ufw是否安装
if ! command -v ufw &> /dev/null; then
    echo "安装ufw防火墙..."
    sudo apt install -y ufw
fi

# 重置防火墙规则
sudo ufw --force reset

# 设置默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许SSH（重要：防止锁定）
sudo ufw allow 22/tcp

# 允许HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许应用端口
echo "开放应用端口..."
sudo ufw allow 3000/tcp comment 'React Frontend'
sudo ufw allow 3001/tcp comment 'Express Backend'

# 启用防火墙
sudo ufw --force enable

echo "✅ 防火墙配置完成"
sudo ufw status numbered

# 配置MySQL
echo "🗄️ 配置MySQL..."

# 检查MySQL是否安装
if ! command -v mysql &> /dev/null; then
    echo "安装MySQL..."
    sudo apt install -y mysql-server mysql-client
    
    # 启动MySQL服务
    sudo systemctl start mysql
    sudo systemctl enable mysql
    
    echo "等待MySQL启动..."
    sleep 5
fi

# 检查MySQL服务状态
if ! sudo systemctl is-active --quiet mysql; then
    echo "启动MySQL服务..."
    sudo systemctl start mysql
    sleep 3
fi

echo "✅ MySQL服务状态: $(sudo systemctl is-active mysql)"

# 配置MySQL用户和权限
echo "🔐 配置MySQL用户权限..."

# 创建MySQL配置脚本
cat > /tmp/mysql_setup.sql << 'EOF'
-- 设置root密码
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123';

-- 创建应用用户
CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';

-- 授予权限
GRANT ALL PRIVILEGES ON *.* TO 'taskapp'@'localhost';

-- 创建数据库
CREATE DATABASE IF NOT EXISTS task_manager_db;

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示用户
SELECT User, Host FROM mysql.user WHERE User IN ('root', 'taskapp');
EOF

# 执行MySQL配置
echo "执行MySQL配置..."
sudo mysql < /tmp/mysql_setup.sql

# 清理临时文件
rm /tmp/mysql_setup.sql

echo "✅ MySQL配置完成"

# 测试MySQL连接
echo "🔍 测试MySQL连接..."
if mysql -u taskapp -ppassword -e "SHOW DATABASES;" &> /dev/null; then
    echo "✅ MySQL连接测试成功"
else
    echo "❌ MySQL连接测试失败"
fi

# 检查并安装Node.js
echo "📦 检查Node.js..."
if ! command -v node &> /dev/null; then
    echo "安装Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ npm版本: $(npm --version)"

# 安装PM2
echo "📦 检查PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "安装PM2..."
    sudo npm install -g pm2
fi

echo "✅ PM2版本: $(pm2 --version)"

# 安装serve
echo "📦 检查serve..."
if ! command -v serve &> /dev/null; then
    echo "安装serve..."
    sudo npm install -g serve
fi

echo "✅ serve已安装"

# 创建项目目录
echo "📁 准备项目目录..."
sudo mkdir -p /home/dev_user/gougegaoshu
sudo mkdir -p /home/dev_user/gougegaoshu/logs
sudo chown -R dev_user:dev_user /home/dev_user/gougegaoshu

echo ""
echo "🎉 环境配置完成！"
echo "=========================================="
echo "✅ 防火墙已配置"
echo "   - SSH (22): 允许"
echo "   - HTTP (80): 允许" 
echo "   - HTTPS (443): 允许"
echo "   - Frontend (3000): 允许"
echo "   - Backend (3001): 允许"
echo ""
echo "✅ MySQL已配置"
echo "   - 数据库: task_manager_db"
echo "   - 用户: taskapp"
echo "   - 密码: password"
echo "   - 主机: localhost"
echo ""
echo "✅ Node.js环境已准备"
echo "   - Node.js: $(node --version)"
echo "   - npm: $(npm --version)"
echo "   - PM2: $(pm2 --version)"
echo ""
echo "🔄 下一步:"
echo "1. 在腾讯云控制台添加安全组规则（端口3000,3001）"
echo "2. 运行部署脚本: ./deploy.sh"
echo ""
