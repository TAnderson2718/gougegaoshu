#!/bin/bash

# 快速环境配置脚本
echo "🔧 快速配置服务器环境..."

# 更新系统
apt update

# 安装必要软件
apt install -y ufw mysql-server mysql-client

# 配置防火墙
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp  
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow 3001/tcp
ufw --force enable

echo "✅ 防火墙配置完成"
ufw status

# 启动MySQL
systemctl start mysql
systemctl enable mysql

# 配置MySQL
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123';"
mysql -u root -proot123 -e "CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';"
mysql -u root -proot123 -e "GRANT ALL PRIVILEGES ON *.* TO 'taskapp'@'localhost';"
mysql -u root -proot123 -e "CREATE DATABASE IF NOT EXISTS task_manager_db;"
mysql -u root -proot123 -e "FLUSH PRIVILEGES;"

echo "✅ MySQL配置完成"

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装全局包
npm install -g pm2 serve

# 创建项目目录
mkdir -p /home/dev_user/gougegaoshu
mkdir -p /home/dev_user/gougegaoshu/logs
chown -R dev_user:dev_user /home/dev_user/gougegaoshu

echo "🎉 环境配置完成！"
echo "Node.js: $(node --version)"
echo "MySQL: 已配置"
echo "防火墙: 已开放端口 22,80,443,3000,3001"
