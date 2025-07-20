# 腾讯云部署配置指南

## 端口配置

### 1. 应用端口
- **前端**: 3000 (React应用)
- **后端**: 3001 (Express API)
- **数据库**: 3306 (MySQL)

### 2. 腾讯云安全组配置

在腾讯云控制台配置安全组规则：

#### 入站规则
```
协议    端口    源地址        说明
TCP     22      0.0.0.0/0     SSH访问
TCP     80      0.0.0.0/0     HTTP访问
TCP     443     0.0.0.0/0     HTTPS访问
TCP     3000    0.0.0.0/0     前端应用
TCP     3001    0.0.0.0/0     后端API
TCP     3306    127.0.0.1/32  MySQL(仅本地)
```

#### 出站规则
```
协议    端口    目标地址      说明
ALL     ALL     0.0.0.0/0     允许所有出站
```

### 3. 防火墙配置

在服务器上配置防火墙：

```bash
# 安装 ufw
sudo apt update
sudo apt install ufw

# 默认策略
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许SSH
sudo ufw allow 22

# 允许HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 允许应用端口
sudo ufw allow 3000
sudo ufw allow 3001

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

## 部署步骤

### 1. 准备服务器环境

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y curl wget git vim
```

### 2. 执行部署脚本

```bash
# 在本地执行
chmod +x deploy.sh
./deploy.sh
```

### 3. 启动服务

```bash
# SSH到服务器
ssh dev_user@124.221.113.102

# 进入项目目录
cd /home/dev_user/gougegaoshu

# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status
pm2 logs
```

## 域名配置（可选）

### 1. 配置Nginx反向代理

```bash
# 安装Nginx
sudo apt install nginx

# 创建配置文件
sudo vim /etc/nginx/sites-available/task-manager
```

### 2. Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 启用配置

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/task-manager /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

## 监控和维护

### 1. 查看服务状态
```bash
pm2 status
pm2 logs
pm2 monit
```

### 2. 重启服务
```bash
pm2 restart all
pm2 reload all
```

### 3. 查看系统资源
```bash
htop
df -h
free -h
```

## 故障排除

### 1. 端口被占用
```bash
# 查看端口占用
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3001

# 杀死进程
sudo kill -9 <PID>
```

### 2. 服务无法启动
```bash
# 查看详细日志
pm2 logs --lines 100

# 检查配置文件
node -c backend/server.js
```

### 3. 数据库连接问题
```bash
# 检查MySQL状态
sudo systemctl status mysql

# 测试数据库连接
mysql -u taskapp -p -h localhost
```

## 安全建议

1. **修改默认密码**: 更改数据库和系统用户密码
2. **使用HTTPS**: 配置SSL证书
3. **定期备份**: 设置数据库自动备份
4. **监控日志**: 定期检查应用和系统日志
5. **更新系统**: 定期更新系统和依赖包
