#!/bin/bash

# 🚀 狗哥高数任务管理系统 - 服务器启动脚本
# 使用方法：在服务器上运行 bash server_startup.sh

echo "🚀 开始启动狗哥高数任务管理系统..."
echo "=================================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="/home/ubuntu/gougegaoshu"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查目录是否存在
check_directory() {
    if [ ! -d "$1" ]; then
        log_error "目录不存在: $1"
        return 1
    fi
    return 0
}

# 检查并安装依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        return 1
    fi
    log_success "Node.js 版本: $(node --version)"
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        return 1
    fi
    log_success "npm 版本: $(npm --version)"
    
    # 检查PM2
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 未安装，正在安装..."
        npm install -g pm2
        if [ $? -eq 0 ]; then
            log_success "PM2 安装成功"
        else
            log_error "PM2 安装失败"
            return 1
        fi
    fi
    log_success "PM2 版本: $(pm2 --version)"
    
    # 检查MySQL
    if ! command -v mysql &> /dev/null; then
        log_warning "MySQL 客户端未安装"
    fi
    
    return 0
}

# 启动MySQL服务
start_mysql() {
    log_info "启动MySQL服务..."
    
    sudo systemctl start mysql
    if [ $? -eq 0 ]; then
        log_success "MySQL 服务启动成功"
        sudo systemctl enable mysql
    else
        log_error "MySQL 服务启动失败"
        return 1
    fi
    
    # 检查MySQL连接
    if mysql -u root -pHello888 -e "SELECT 1;" &> /dev/null; then
        log_success "MySQL 连接测试成功"
    else
        log_warning "MySQL 连接测试失败，请检查密码"
    fi
    
    return 0
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    
    if ! check_directory "$BACKEND_DIR"; then
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    # 检查package.json
    if [ ! -f "package.json" ]; then
        log_error "后端目录缺少 package.json"
        return 1
    fi
    
    # 安装依赖（如果需要）
    if [ ! -d "node_modules" ]; then
        log_info "安装后端依赖..."
        npm install
        if [ $? -ne 0 ]; then
            log_error "后端依赖安装失败"
            return 1
        fi
    fi
    
    # 停止现有的后端进程
    pm2 delete backend 2>/dev/null || true
    
    # 启动后端服务
    pm2 start server.js --name "backend"
    if [ $? -eq 0 ]; then
        log_success "后端服务启动成功"
    else
        log_error "后端服务启动失败"
        return 1
    fi
    
    return 0
}

# 启动前端服务
start_frontend() {
    log_info "启动前端服务..."
    
    if ! check_directory "$FRONTEND_DIR"; then
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # 检查package.json
    if [ ! -f "package.json" ]; then
        log_error "前端目录缺少 package.json"
        return 1
    fi
    
    # 安装依赖（如果需要）
    if [ ! -d "node_modules" ]; then
        log_info "安装前端依赖..."
        npm install
        if [ $? -ne 0 ]; then
            log_error "前端依赖安装失败"
            return 1
        fi
    fi
    
    # 停止现有的前端进程
    pm2 delete frontend 2>/dev/null || true
    
    # 启动前端服务
    pm2 start npm --name "frontend" -- start
    if [ $? -eq 0 ]; then
        log_success "前端服务启动成功"
    else
        log_error "前端服务启动失败"
        return 1
    fi
    
    return 0
}

# 配置并启动Nginx
start_nginx() {
    log_info "配置并启动Nginx..."
    
    # 检查Nginx是否安装
    if ! command -v nginx &> /dev/null; then
        log_warning "Nginx 未安装，正在安装..."
        sudo apt update
        sudo apt install -y nginx
        if [ $? -ne 0 ]; then
            log_error "Nginx 安装失败"
            return 1
        fi
    fi
    
    # 创建Nginx配置
    sudo tee /etc/nginx/sites-available/gougegaoshu > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
    # 前端静态文件代理
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
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001/;
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
EOF
    
    # 启用站点
    sudo ln -sf /etc/nginx/sites-available/gougegaoshu /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试Nginx配置
    sudo nginx -t
    if [ $? -ne 0 ]; then
        log_error "Nginx 配置测试失败"
        return 1
    fi
    
    # 启动Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    if [ $? -eq 0 ]; then
        log_success "Nginx 启动成功"
    else
        log_error "Nginx 启动失败"
        return 1
    fi
    
    return 0
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    echo ""
    echo "📊 服务状态报告："
    echo "===================="
    
    # 检查MySQL
    if systemctl is-active --quiet mysql; then
        log_success "MySQL: 运行中"
    else
        log_error "MySQL: 未运行"
    fi
    
    # 检查PM2进程
    echo ""
    log_info "PM2 进程状态:"
    pm2 status
    
    # 检查Nginx
    echo ""
    if systemctl is-active --quiet nginx; then
        log_success "Nginx: 运行中"
    else
        log_error "Nginx: 未运行"
    fi
    
    # 检查端口监听
    echo ""
    log_info "端口监听状态:"
    echo "端口 3001 (后端): $(netstat -tln | grep :3001 > /dev/null && echo '✅ 监听中' || echo '❌ 未监听')"
    echo "端口 3000 (前端): $(netstat -tln | grep :3000 > /dev/null && echo '✅ 监听中' || echo '❌ 未监听')"
    echo "端口 80 (Nginx): $(netstat -tln | grep :80 > /dev/null && echo '✅ 监听中' || echo '❌ 未监听')"
    echo "端口 3307 (MySQL): $(netstat -tln | grep :3307 > /dev/null && echo '✅ 监听中' || echo '❌ 未监听')"
}

# 主函数
main() {
    echo "🎯 开始系统启动流程..."
    echo ""
    
    # 1. 检查依赖
    if ! check_dependencies; then
        log_error "依赖检查失败，退出"
        exit 1
    fi
    
    echo ""
    
    # 2. 启动MySQL
    if ! start_mysql; then
        log_error "MySQL 启动失败，退出"
        exit 1
    fi
    
    echo ""
    
    # 3. 启动后端
    if ! start_backend; then
        log_error "后端启动失败，退出"
        exit 1
    fi
    
    echo ""
    
    # 4. 启动前端
    if ! start_frontend; then
        log_error "前端启动失败，退出"
        exit 1
    fi
    
    echo ""
    
    # 5. 启动Nginx
    if ! start_nginx; then
        log_warning "Nginx 启动失败，但其他服务正常"
    fi
    
    echo ""
    
    # 6. 等待服务启动
    log_info "等待服务完全启动..."
    sleep 10
    
    # 7. 检查服务状态
    check_services
    
    echo ""
    echo "🎉 启动完成！"
    echo "=================================================="
    echo "📱 访问地址："
    echo "   前端应用: http://124.221.113.102/"
    echo "   学生登录: http://124.221.113.102/student"
    echo "   后端API:  http://124.221.113.102:3001/health"
    echo ""
    echo "🔧 管理命令："
    echo "   查看日志: pm2 logs"
    echo "   重启服务: pm2 restart all"
    echo "   停止服务: pm2 stop all"
    echo "=================================================="
}

# 执行主函数
main "$@"
