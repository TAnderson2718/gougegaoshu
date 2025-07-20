#!/bin/bash

# 修复数据库配置文件
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复数据库配置文件..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    cd /home/ubuntu/gougegaoshu/backend
    
    echo '⚙️ 修改数据库配置文件，强制使用TCP连接...'
    
    # 备份原文件
    cp config/database.js config/database.js.backup
    
    # 修改数据库配置文件，移除socketPath
    cat > config/database.js << 'EOF'
const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  charset: 'utf8mb4',
  timezone: '+08:00',
  multipleStatements: true
};

console.log('🔍 数据库配置:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password ? '***' : '(empty)',
  database: process.env.DB_NAME || 'task_manager_db',
  charset: dbConfig.charset,
  timezone: dbConfig.timezone,
  multipleStatements: dbConfig.multipleStatements
});

// 创建数据库（如果不存在）
async function createDatabaseIfNotExists() {
  console.log('🔗 尝试连接MySQL服务器...');
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const dbName = process.env.DB_NAME || 'task_manager_db';
    await connection.execute(\`CREATE DATABASE IF NOT EXISTS \${dbName}\`);
    console.log(\`✅ 数据库 \${dbName} 已确保存在\`);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ 创建数据库失败:', error.message);
    console.error('❌ 错误详情:', error);
    throw error;
  }
}

// 测试数据库连接
async function testConnection() {
  try {
    await createDatabaseIfNotExists();
    
    console.log('🔗 创建数据库连接池，目标数据库:', process.env.DB_NAME || 'task_manager_db');
    
    const poolConfig = {
      ...dbConfig,
      database: process.env.DB_NAME || 'task_manager_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
    
    console.log('🔍 数据库配置:', {
      host: poolConfig.host,
      port: poolConfig.port,
      user: poolConfig.user,
      password: poolConfig.password ? '***' : '(empty)',
      database: poolConfig.database
    });
    
    const pool = mysql.createPool(poolConfig);
    
    // 测试连接
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    console.log('✅ 数据库连接成功');
    return pool;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    throw new Error('数据库连接失败');
  }
}

module.exports = {
  testConnection,
  createDatabaseIfNotExists
};
EOF
    
    echo '🚀 重启后端服务...'
    pm2 stop task-backend
    pm2 start server.js --name 'task-backend'
    
    sleep 5
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看最新日志...'
    pm2 logs task-backend --lines 10
    
    echo '✅ 数据库配置修复完成！'
"

echo "🎉 数据库配置修复完成！"
