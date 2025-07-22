#!/bin/bash

# 简化的Docker部署脚本
set -e

SERVER="gougegaoshu-server"
DEPLOY_DIR="/opt/gougegaoshu"

echo "🚀 开始部署到服务器..."

# 1. 创建部署包
echo "📦 创建部署包..."
tar -czf gougegaoshu-deploy.tar.gz \
    backend/ \
    frontend/ \
    database/ \
    docker-compose.yml \
    .env.production \
    .dockerignore

# 2. 上传到服务器
echo "📤 上传文件到服务器..."
ssh $SERVER "sudo mkdir -p $DEPLOY_DIR && sudo chown ubuntu:ubuntu $DEPLOY_DIR"
scp gougegaoshu-deploy.tar.gz $SERVER:$DEPLOY_DIR/

# 3. 在服务器上解压并部署
echo "🔧 在服务器上部署..."
ssh $SERVER << EOF
    cd $DEPLOY_DIR
    tar -xzf gougegaoshu-deploy.tar.gz
    rm gougegaoshu-deploy.tar.gz
    
    # 安装Docker（如果需要）
    if ! command -v docker &> /dev/null; then
        echo "安装Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo systemctl enable docker
        sudo systemctl start docker
        sudo usermod -aG docker ubuntu
    fi
    
    # 安装Docker Compose（如果需要）
    if ! command -v docker-compose &> /dev/null; then
        echo "安装Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    # 停止现有容器
    if [ -f docker-compose.yml ]; then
        docker-compose down || true
    fi
    
    # 启动服务
    docker-compose --env-file .env.production up -d --build
    
    # 等待服务启动
    sleep 30
    
    # 检查状态
    echo "=== 服务状态 ==="
    docker-compose ps
    
    echo "=== 健康检查 ==="
    curl -f http://localhost:3001/health || echo "后端健康检查失败"
    curl -f http://localhost/health || echo "前端健康检查失败"
EOF

# 4. 清理本地文件
rm gougegaoshu-deploy.tar.gz

echo "✅ 部署完成！"
echo "🌐 访问地址: http://\$(ssh $SERVER 'curl -s ifconfig.me')"
