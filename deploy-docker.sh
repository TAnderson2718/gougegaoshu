#!/bin/bash

# 考研任务管理系统 Docker 部署脚本
# 作者: Augment Agent
# 日期: $(date)

set -e

echo "🚀 开始部署考研任务管理系统到服务器..."

# 配置变量
SERVER_HOST="gougegaoshu-server"
SERVER_USER="ubuntu"
DEPLOY_DIR="/opt/gougegaoshu"
PROJECT_NAME="gougegaoshu"

# 验证SSH配置
if ! grep -q "Host $SERVER_HOST" ~/.ssh/config 2>/dev/null; then
    log_error "SSH配置中未找到主机 $SERVER_HOST"
    log_info "请确保在 ~/.ssh/config 中配置了正确的主机信息"
    exit 1
fi

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 检查SSH连接
check_ssh_connection() {
    log_info "检查SSH连接到服务器..."
    if ssh -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_HOST exit 2>/dev/null; then
        log_success "SSH连接正常"
    else
        log_error "无法连接到服务器 $SERVER_HOST"
        exit 1
    fi
}

# 准备部署文件
prepare_deployment() {
    log_info "准备部署文件..."

    # 创建临时目录
    TEMP_DIR=$(mktemp -d)
    log_info "创建临时目录: $TEMP_DIR"

    # 复制必要文件到临时目录
    cp -r backend frontend database docker-compose.yml .env.production .dockerignore "$TEMP_DIR/"

    # 创建部署包
    cd "$TEMP_DIR"
    tar -czf "${PROJECT_NAME}-deploy.tar.gz" backend frontend database docker-compose.yml .env.production .dockerignore

    log_success "部署包创建完成"
    echo "$TEMP_DIR/${PROJECT_NAME}-deploy.tar.gz"
}

# 上传文件到服务器
upload_files() {
    local deploy_package=$1
    log_info "上传文件到服务器..."
    
    # 在服务器上创建部署目录
    ssh $SERVER_USER@$SERVER_HOST "sudo mkdir -p $DEPLOY_DIR && sudo chown $SERVER_USER:$SERVER_USER $DEPLOY_DIR"
    
    # 上传部署包
    scp "$deploy_package" $SERVER_USER@$SERVER_HOST:$DEPLOY_DIR/
    
    # 在服务器上解压
    ssh $SERVER_USER@$SERVER_HOST "cd $DEPLOY_DIR && tar -xzf ${PROJECT_NAME}-deploy.tar.gz && rm ${PROJECT_NAME}-deploy.tar.gz"
    
    log_success "文件上传完成"
}

# 在服务器上安装Docker和Docker Compose
install_docker() {
    log_info "检查并安装Docker..."
    
    ssh $SERVER_USER@$SERVER_HOST << 'EOF'
        # 检查Docker是否已安装
        if ! command -v docker &> /dev/null; then
            echo "安装Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo systemctl enable docker
            sudo systemctl start docker
            sudo usermod -aG docker $USER
        else
            echo "Docker已安装"
        fi

        # 检查Docker Compose是否已安装
        if ! command -v docker-compose &> /dev/null; then
            echo "安装Docker Compose..."
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        else
            echo "Docker Compose已安装"
        fi
        
        # 验证安装
        docker --version
        docker-compose --version
EOF
    
    log_success "Docker环境准备完成"
}

# 部署应用
deploy_application() {
    log_info "部署应用..."
    
    ssh $SERVER_USER@$SERVER_HOST << EOF
        cd $DEPLOY_DIR
        
        # 停止现有容器
        if [ -f docker-compose.yml ]; then
            echo "停止现有容器..."
            docker-compose down || true
        fi
        
        # 清理旧镜像
        echo "清理旧镜像..."
        docker system prune -f || true
        
        # 构建并启动服务
        echo "构建并启动服务..."
        docker-compose --env-file .env.production up -d --build
        
        # 等待服务启动
        echo "等待服务启动..."
        sleep 30
        
        # 检查服务状态
        echo "检查服务状态..."
        docker-compose ps
EOF
    
    log_success "应用部署完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 获取服务器IP
    SERVER_IP=$(ssh $SERVER_USER@$SERVER_HOST "curl -s ifconfig.me" 2>/dev/null || echo "unknown")
    
    ssh $SERVER_USER@$SERVER_HOST << 'EOF'
        # 检查容器状态
        echo "=== 容器状态 ==="
        docker-compose ps
        
        # 检查服务健康状态
        echo -e "\n=== 服务健康检查 ==="
        
        # 检查MySQL
        echo "检查MySQL..."
        docker-compose exec -T mysql mysqladmin ping -h localhost -u root -prootpassword || echo "MySQL检查失败"
        
        # 检查后端
        echo "检查后端..."
        curl -f http://localhost:3001/health || echo "后端健康检查失败"
        
        # 检查前端
        echo "检查前端..."
        curl -f http://localhost/health || echo "前端健康检查失败"
        
        echo -e "\n=== 端口监听状态 ==="
        netstat -tlnp | grep -E ':(80|3001|3306)'
EOF
    
    if [ "$SERVER_IP" != "unknown" ]; then
        log_success "部署验证完成！"
        echo ""
        echo "🎉 部署成功！访问地址："
        echo "   前端: http://$SERVER_IP"
        echo "   后端API: http://$SERVER_IP:3001"
        echo ""
        echo "📋 默认登录信息："
        echo "   学生账号: ST001 / ST002"
        echo "   学生密码: Hello888"
        echo "   管理员账号: ADMIN"
        echo "   管理员密码: AdminPass123"
    else
        log_warning "无法获取服务器IP地址，请手动检查服务状态"
    fi
}

# 清理临时文件
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        log_info "清理临时文件..."
        rm -rf "$TEMP_DIR"
        log_success "清理完成"
    fi
}

# 主函数
main() {
    log_info "开始Docker部署流程..."
    
    # 设置清理陷阱
    trap cleanup EXIT
    
    # 执行部署步骤
    check_ssh_connection
    deploy_package=$(prepare_deployment)
    upload_files "$deploy_package"
    install_docker
    deploy_application
    verify_deployment
    
    log_success "🎉 Docker部署完成！"
}

# 运行主函数
main "$@"
