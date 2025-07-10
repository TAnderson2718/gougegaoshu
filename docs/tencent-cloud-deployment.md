# 腾讯云部署方案

## 1. 云服务器准备

### 购买云服务器 (CVM)
1. 登录腾讯云控制台
2. 选择云服务器CVM产品
3. 推荐配置：
   - **实例规格**: 标准型S5.MEDIUM2 (1核2GB)
   - **操作系统**: Ubuntu 20.04 LTS
   - **存储**: 50GB云硬盘
   - **网络**: 按流量计费，带宽5Mbps

### 安全组配置
```bash
# 开放端口
22    # SSH
80    # HTTP
443   # HTTPS
3001  # 后端API (可选，建议通过Nginx代理)
3306  # MySQL (仅内网访问)
```

## 2. 服务器环境搭建

### 连接服务器
```bash
ssh ubuntu@your_server_ip
```

### 安装基础软件
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js (使用NodeSource仓库)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装MySQL
sudo apt install mysql-server -y

# 安装Nginx
sudo apt install nginx -y

# 安装PM2 (进程管理器)
sudo npm install -g pm2

# 安装Git
sudo apt install git -y
```

## 3. 数据库配置

### MySQL安全配置
```bash
# 运行安全配置脚本
sudo mysql_secure_installation

# 登录MySQL
sudo mysql -u root -p

# 创建数据库和用户
CREATE DATABASE exam_task_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'exam_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON exam_task_system.* TO 'exam_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 导入数据库结构
```bash
# 上传schema.sql文件到服务器
scp database/schema.sql ubuntu@your_server_ip:~/

# 导入数据库结构
mysql -u exam_user -p exam_task_system < ~/schema.sql
```

## 4. 后端部署

### 上传后端代码
```bash
# 在服务器上克隆代码
cd /var/www
sudo mkdir exam-task-system
sudo chown ubuntu:ubuntu exam-task-system
cd exam-task-system

# 克隆代码 (或使用scp上传)
git clone your_repository_url .
# 或者
# scp -r backend/ ubuntu@your_server_ip:/var/www/exam-task-system/
```

### 安装依赖和配置
```bash
cd backend
npm install --production

# 创建环境变量文件
cp .env.example .env
nano .env
```

### 环境变量配置
```bash
# .env文件内容
DB_HOST=localhost
DB_PORT=3306
DB_USER=exam_user
DB_PASSWORD=your_strong_password
DB_NAME=exam_task_system

JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d

PORT=3001
NODE_ENV=production

INITIAL_PASSWORD=Hello888
```

### 启动后端服务
```bash
# 使用PM2启动
pm2 start server.js --name "exam-task-api"

# 设置开机自启
pm2 startup
pm2 save

# 查看服务状态
pm2 status
pm2 logs exam-task-api
```

## 5. 前端部署

### 构建前端项目
```bash
# 在本地构建前端项目
cd frontend

# 设置生产环境变量
echo "REACT_APP_API_URL=https://your-domain.com/api" > .env.production

# 构建项目
npm run build
```

### 上传前端文件
```bash
# 上传构建文件到服务器
scp -r build/ ubuntu@your_server_ip:/var/www/exam-task-system/frontend/

# 或者在服务器上构建
cd /var/www/exam-task-system/frontend
npm install
npm run build
```

## 6. Nginx配置

### 创建Nginx配置文件
```bash
sudo nano /etc/nginx/sites-available/exam-task-system
```

### Nginx配置内容
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # 前端静态文件
    location / {
        root /var/www/exam-task-system/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://localhost:3001/health;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### 启用配置
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/exam-task-system /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 7. SSL证书配置 (HTTPS)

### 使用Let's Encrypt免费证书
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

## 8. 监控和维护

### 系统监控
```bash
# 查看系统资源
htop
df -h
free -h

# 查看服务状态
sudo systemctl status nginx
sudo systemctl status mysql
pm2 status

# 查看日志
pm2 logs exam-task-api
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 数据库备份
```bash
# 创建备份脚本
nano ~/backup_db.sh
```

```bash
#!/bin/bash
# 数据库备份脚本
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

mysqldump -u exam_user -p'your_password' exam_task_system > $BACKUP_DIR/exam_task_system_$DATE.sql

# 保留最近7天的备份
find $BACKUP_DIR -name "exam_task_system_*.sql" -mtime +7 -delete

echo "Database backup completed: exam_task_system_$DATE.sql"
```

```bash
# 设置执行权限
chmod +x ~/backup_db.sh

# 设置定时备份 (每天凌晨2点)
crontab -e
# 添加
0 2 * * * /home/ubuntu/backup_db.sh
```

## 9. 性能优化

### 服务器优化
```bash
# 调整MySQL配置
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# 添加以下配置
[mysqld]
innodb_buffer_pool_size = 512M
max_connections = 100
query_cache_size = 64M
```

### Nginx优化
```nginx
# 在http块中添加
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# 连接优化
keepalive_timeout 65;
client_max_body_size 10M;
```

## 10. 安全加固

### 防火墙配置
```bash
# 启用UFW防火墙
sudo ufw enable

# 允许必要端口
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# 查看状态
sudo ufw status
```

### 系统安全
```bash
# 禁用root登录
sudo nano /etc/ssh/sshd_config
# 设置 PermitRootLogin no

# 重启SSH服务
sudo systemctl restart ssh

# 定期更新系统
sudo apt update && sudo apt upgrade -y
```

## 11. 故障排查

### 常见问题
1. **502 Bad Gateway**: 检查后端服务是否运行
2. **数据库连接失败**: 检查MySQL服务和配置
3. **静态文件404**: 检查Nginx配置和文件路径
4. **API请求失败**: 检查CORS配置和代理设置

### 日志查看
```bash
# 后端日志
pm2 logs exam-task-api

# Nginx日志
sudo tail -f /var/log/nginx/error.log

# 系统日志
sudo journalctl -u nginx
sudo journalctl -u mysql
```

这个部署方案提供了完整的腾讯云部署流程，包括服务器配置、数据库设置、应用部署、安全配置等各个方面。
