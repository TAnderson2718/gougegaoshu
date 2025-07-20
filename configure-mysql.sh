#!/bin/bash

echo "🗄️ 配置MySQL数据库..."

# 首先尝试无密码连接root
if mysql -u root -e "SELECT 1;" &>/dev/null; then
    echo "✅ MySQL root无密码访问"
    
    # 设置root密码
    mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123';"
    echo "✅ 设置root密码"
    
    # 创建应用用户
    mysql -u root -proot123 -e "CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';"
    mysql -u root -proot123 -e "GRANT ALL PRIVILEGES ON *.* TO 'taskapp'@'localhost';"
    mysql -u root -proot123 -e "CREATE DATABASE IF NOT EXISTS task_manager_db;"
    mysql -u root -proot123 -e "FLUSH PRIVILEGES;"
    
    echo "✅ 创建应用用户和数据库"
    
elif mysql -u root -proot123 -e "SELECT 1;" &>/dev/null; then
    echo "✅ MySQL root密码已设置"
    
    # 创建应用用户
    mysql -u root -proot123 -e "CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';"
    mysql -u root -proot123 -e "GRANT ALL PRIVILEGES ON *.* TO 'taskapp'@'localhost';"
    mysql -u root -proot123 -e "CREATE DATABASE IF NOT EXISTS task_manager_db;"
    mysql -u root -proot123 -e "FLUSH PRIVILEGES;"
    
    echo "✅ 创建应用用户和数据库"
else
    echo "❌ 无法连接MySQL，可能需要重置密码"
    exit 1
fi

# 测试连接
if mysql -u taskapp -ppassword -e "SHOW DATABASES;" &>/dev/null; then
    echo "✅ 应用用户连接测试成功"
    mysql -u taskapp -ppassword -e "SHOW DATABASES;"
else
    echo "❌ 应用用户连接失败"
fi

echo "🎉 MySQL配置完成！"
