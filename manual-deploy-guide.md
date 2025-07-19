# 考研任务管理系统手动部署指南

## 服务器信息
- **IP**: 124.221.113.102
- **端口**: 22
- **用户**: dev_user
- **密码**: 123456

## 部署步骤

### 1. 连接服务器
```bash
ssh dev_user@124.221.113.102
```

### 2. 安装必要软件

#### 安装 Node.js
```bash
# 下载并安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 安装 MySQL
```bash
# 安装 MySQL
sudo apt-get update
sudo apt-get install -y mysql-server mysql-client

# 启动 MySQL 服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 配置 MySQL
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'root123';"
sudo mysql -u root -proot123 -e "CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password';"
sudo mysql -u root -proot123 -e "GRANT ALL PRIVILEGES ON *.* TO 'taskapp'@'localhost';"
sudo mysql -u root -proot123 -e "FLUSH PRIVILEGES;"
```

#### 安装 PM2
```bash
sudo npm install -g pm2
sudo npm install -g serve
```

### 3. 上传项目文件

#### 方法1: 使用 scp（推荐）
在本地执行：
```bash
# 打包项目（排除不需要的文件）
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='coverage' \
    --exclude='build' \
    --exclude='.env' \
    -czf gougegaoshu.tar.gz .

# 上传到服务器
scp gougegaoshu.tar.gz dev_user@124.221.113.102:/home/dev_user/

# 在服务器上解压
ssh dev_user@124.221.113.102
cd /home/dev_user
tar -xzf gougegaoshu.tar.gz
mv gougegaoshu gougegaoshu_project  # 重命名项目目录
```

#### 方法2: 使用 Git（如果服务器可以访问 GitHub）
```bash
cd /home/dev_user
git clone https://github.com/TAnderson2718/gougegaoshu.git
cd gougegaoshu
```

### 4. 配置项目

#### 安装依赖
```bash
cd /home/dev_user/gougegaoshu

# 安装后端依赖
cd backend
npm install --production

# 安装前端依赖
cd ../frontend
npm install

# 构建前端
npm run build
```

#### 创建环境配置
```bash
cd /home/dev_user/gougegaoshu/backend

# 创建 .env 文件
cat > .env << 'EOF'
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=taskapp
DB_PASSWORD=password
DB_NAME=task_manager_db

# 服务器配置
PORT=3001
NODE_ENV=production

# JWT 密钥
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 其他配置
CORS_ORIGIN=http://124.221.113.102:3000
EOF
```

#### 初始化数据库
```bash
cd /home/dev_user/gougegaoshu/backend
node setup.js
```

### 5. 创建 PM2 配置

```bash
cd /home/dev_user/gougegaoshu

# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'task-manager-backend',
      script: './backend/server.js',
      cwd: '/home/dev_user/gougegaoshu',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'task-manager-frontend',
      script: 'serve',
      args: '-s build -l 3000',
      cwd: '/home/dev_user/gougegaoshu/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

# 创建日志目录
mkdir -p logs
```

### 6. 启动服务

```bash
cd /home/dev_user/gougegaoshu

# 启动服务
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save
pm2 startup

# 查看服务状态
pm2 status
pm2 logs
```

### 7. 配置防火墙（如果需要）

```bash
# 开放端口
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw allow 22
sudo ufw enable
```

## 访问地址

部署完成后，可以通过以下地址访问：

- **前端**: http://124.221.113.102:3000
- **后端API**: http://124.221.113.102:3001

## 常用管理命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 重启所有服务
pm2 restart all

# 停止所有服务
pm2 stop all

# 删除所有服务
pm2 delete all

# 查看详细信息
pm2 show task-manager-backend
pm2 show task-manager-frontend
```

## 测试部署

### 测试后端API
```bash
curl http://124.221.113.102:3001/api/health
```

### 测试前端
在浏览器中访问：http://124.221.113.102:3000

## 故障排除

### 查看日志
```bash
# PM2 日志
pm2 logs

# 系统日志
sudo journalctl -u mysql
sudo systemctl status mysql
```

### 重启服务
```bash
# 重启 MySQL
sudo systemctl restart mysql

# 重启应用
pm2 restart all
```

### 检查端口占用
```bash
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :3001
```

## 更新部署

当需要更新代码时：

```bash
cd /home/dev_user/gougegaoshu

# 停止服务
pm2 stop all

# 更新代码（如果使用 Git）
git pull

# 重新安装依赖（如果有变化）
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# 重启服务
pm2 restart all
```
