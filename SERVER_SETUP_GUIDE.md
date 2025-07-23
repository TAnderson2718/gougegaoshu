# 🚀 狗哥高数任务管理系统 - 服务器启动指南

## 📋 概述

本指南将帮助你通过腾讯云控制台启动狗哥高数任务管理系统的所有服务。

## 🔑 登录服务器

### 方法1: 腾讯云控制台VNC登录（推荐）
1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 **云服务器 CVM** 
3. 找到实例 `ins-bbt2e821` (IP: 124.221.113.102)
4. 点击 **登录** 按钮
5. 选择 **VNC登录** 或 **标准登录**
6. 使用用户名 `ubuntu` 登录

### 方法2: SSH登录（如果密钥正常）
```bash
ssh ubuntu@124.221.113.102
```

## 🚀 启动服务

### 快速启动（推荐）
```bash
# 下载启动脚本
wget https://raw.githubusercontent.com/your-repo/gougegaoshu/main/quick_start.sh
# 或者如果文件已存在，直接运行：
bash quick_start.sh
```

### 完整启动（包含详细检查）
```bash
bash server_startup.sh
```

### 手动启动步骤
如果脚本无法运行，可以手动执行以下命令：

```bash
# 1. 启动MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 2. 启动后端服务
cd /home/ubuntu/gougegaoshu/backend
pm2 delete backend 2>/dev/null || true
pm2 start server.js --name "backend"

# 3. 启动前端服务
cd /home/ubuntu/gougegaoshu/frontend
pm2 delete frontend 2>/dev/null || true
pm2 start npm --name "frontend" -- start

# 4. 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🔍 检查服务状态

### 快速检查
```bash
bash check_services.sh
```

### 手动检查
```bash
# 检查PM2进程
pm2 status

# 检查系统服务
sudo systemctl status mysql
sudo systemctl status nginx

# 检查端口监听
netstat -tlnp | grep -E ':(80|3000|3001|3307)'

# 测试API连接
curl http://localhost:3001/health
```

## 🔧 故障排除

### 自动故障排除
```bash
bash troubleshoot.sh
```

### 常见问题解决

#### 1. 端口被占用
```bash
# 查看端口占用
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :80

# 杀死占用进程
sudo kill -9 <PID>
```

#### 2. PM2进程异常
```bash
# 重启PM2
pm2 restart all

# 查看日志
pm2 logs

# 完全重置PM2
pm2 delete all
pm2 kill
```

#### 3. MySQL连接失败
```bash
# 重启MySQL
sudo systemctl restart mysql

# 检查MySQL状态
sudo systemctl status mysql

# 查看MySQL日志
sudo journalctl -u mysql -f
```

#### 4. Nginx配置问题
```bash
# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx

# 查看Nginx日志
sudo journalctl -u nginx -f
```

## 🌐 访问地址

启动成功后，可以通过以下地址访问：

- **前端应用**: http://124.221.113.102/
- **学生登录**: http://124.221.113.102/student
- **后端API**: http://124.221.113.102:3001/health

## 📱 测试账号

- **学生账号**: ST001
- **密码**: Hello888

## 🔄 日常管理命令

```bash
# 查看所有服务状态
pm2 status

# 重启所有服务
pm2 restart all

# 停止所有服务
pm2 stop all

# 查看日志
pm2 logs

# 查看特定服务日志
pm2 logs backend
pm2 logs frontend

# 监控服务
pm2 monit
```

## 📊 系统监控

```bash
# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h

# 查看网络连接
netstat -tlnp
```

## 🆘 紧急情况

如果系统完全无响应：

1. **重启服务器**（通过腾讯云控制台）
2. **重新运行启动脚本**
3. **检查安全组设置**
4. **联系技术支持**

## 📞 支持信息

- **服务器IP**: 124.221.113.102
- **SSH端口**: 22
- **应用端口**: 3000 (前端), 3001 (后端), 80 (HTTP)
- **数据库端口**: 3307

---

## 🎯 启动检查清单

- [ ] MySQL服务运行正常
- [ ] 后端API (端口3001) 响应正常
- [ ] 前端服务 (端口3000) 运行正常
- [ ] Nginx (端口80) 运行正常
- [ ] 可以访问 http://124.221.113.102/
- [ ] 学生登录功能正常
- [ ] 任务管理功能正常

**✅ 全部完成后，系统即可正常使用！**
