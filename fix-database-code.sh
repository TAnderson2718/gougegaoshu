#!/bin/bash

# 修复数据库代码问题
SERVER_HOST="124.221.113.102"
SERVER_USER="ubuntu"
SERVER_PASSWORD="ts*VK&2VK^5sjx7heLkB"

echo "🔧 修复数据库代码问题..."

sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "
    echo '🛑 停止后端服务...'
    pm2 stop all || true
    
    echo '🔧 修复initDatabase.js文件...'
    cd /home/ubuntu/gougegaoshu/backend/scripts
    
    # 备份原文件
    cp initDatabase.js initDatabase.js.backup
    
    # 修复query函数问题
    cat > initDatabase.js << 'EOF'
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// 数据库配置
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'taskapp',
    password: process.env.DB_PASSWORD || 'TaskApp2024!',
    database: process.env.DB_NAME || 'task_manager_db',
    charset: 'utf8mb4',
    timezone: '+08:00',
    multipleStatements: true
};

// 创建数据库连接
async function createConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ 数据库连接成功');
        return connection;
    } catch (error) {
        console.error('❌ 数据库连接失败:', error.message);
        throw error;
    }
}

// 初始化数据库
async function initializeDatabase() {
    let connection;
    
    try {
        console.log('🚀 开始初始化数据库...');
        
        connection = await createConnection();
        
        console.log('📋 创建数据库表结构...');
        
        // 创建学生表
        console.log('   创建表: students');
        await connection.execute(\`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        \`);
        
        // 创建管理员表
        console.log('   创建表: admins');
        await connection.execute(\`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id VARCHAR(50) UNIQUE NOT NULL,
                name VARCHAR(100) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        \`);
        
        // 创建任务表
        console.log('   创建表: tasks');
        await connection.execute(\`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(50) NOT NULL,
                task_date DATE NOT NULL,
                task_type VARCHAR(50) NOT NULL,
                subject VARCHAR(100) NOT NULL,
                content TEXT NOT NULL,
                target_score INT DEFAULT 0,
                actual_score INT DEFAULT NULL,
                is_completed BOOLEAN DEFAULT FALSE,
                completed_at TIMESTAMP NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_student_date (student_id, task_date),
                INDEX idx_date (task_date),
                INDEX idx_completed (is_completed)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        \`);
        
        // 创建学生档案表
        console.log('   创建表: student_profiles');
        await connection.execute(\`
            CREATE TABLE IF NOT EXISTS student_profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(50) UNIQUE NOT NULL,
                target_school VARCHAR(200),
                target_major VARCHAR(200),
                current_progress TEXT,
                study_plan TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        \`);
        
        // 创建学生任务统计表
        console.log('   创建表: student_task_stats');
        await connection.execute(\`
            CREATE TABLE IF NOT EXISTS student_task_stats (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(50) NOT NULL,
                stat_date DATE NOT NULL,
                total_tasks INT DEFAULT 0,
                completed_tasks INT DEFAULT 0,
                completion_rate DECIMAL(5,2) DEFAULT 0.00,
                average_score DECIMAL(5,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_student_date (student_id, stat_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        \`);
        
        // 创建请假记录表
        console.log('   创建表: leave_records');
        await connection.execute(\`
            CREATE TABLE IF NOT EXISTS leave_records (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id VARCHAR(50) NOT NULL,
                leave_date DATE NOT NULL,
                reason VARCHAR(500),
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_student_date (student_id, leave_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        \`);
        
        // 创建系统配置表
        console.log('   创建表: system_config');
        await connection.execute(\`
            CREATE TABLE IF NOT EXISTS system_config (
                id INT AUTO_INCREMENT PRIMARY KEY,
                config_key VARCHAR(100) UNIQUE NOT NULL,
                config_value TEXT,
                description VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        \`);
        
        console.log('👥 初始化默认用户数据...');
        
        // 检查并创建默认管理员
        const [adminRows] = await connection.execute('SELECT COUNT(*) as count FROM admins WHERE user_id = ?', ['ADMIN']);
        if (adminRows[0].count === 0) {
            const adminPasswordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'AdminPass123', 10);
            await connection.execute(
                'INSERT INTO admins (user_id, name, password_hash) VALUES (?, ?, ?)',
                ['ADMIN', '系统管理员', adminPasswordHash]
            );
            console.log('   ✅ 创建默认管理员: ADMIN');
        } else {
            console.log('   ℹ️ 管理员已存在: ADMIN');
        }
        
        // 检查并创建默认学生
        const students = [
            { user_id: 'ST001', name: '张三', password: process.env.INITIAL_PASSWORD || 'Hello888' },
            { user_id: 'ST002', name: '李四', password: 'NewPass123' }
        ];
        
        for (const student of students) {
            const [studentRows] = await connection.execute('SELECT COUNT(*) as count FROM students WHERE user_id = ?', [student.user_id]);
            if (studentRows[0].count === 0) {
                const passwordHash = await bcrypt.hash(student.password, 10);
                await connection.execute(
                    'INSERT INTO students (user_id, name, password_hash) VALUES (?, ?, ?)',
                    [student.user_id, student.name, passwordHash]
                );
                console.log(\`   ✅ 创建默认学生: \${student.user_id} (\${student.name})\`);
            } else {
                console.log(\`   ℹ️ 学生已存在: \${student.user_id} (\${student.name})\`);
            }
        }
        
        console.log('⚙️ 初始化系统配置...');
        
        // 初始化系统配置
        const configs = [
            { key: 'system_name', value: '考研任务管理系统', description: '系统名称' },
            { key: 'version', value: '1.0.0', description: '系统版本' },
            { key: 'max_daily_tasks', value: '10', description: '每日最大任务数' },
            { key: 'default_task_score', value: '100', description: '默认任务分数' }
        ];
        
        for (const config of configs) {
            const [configRows] = await connection.execute('SELECT COUNT(*) as count FROM system_config WHERE config_key = ?', [config.key]);
            if (configRows[0].count === 0) {
                await connection.execute(
                    'INSERT INTO system_config (config_key, config_value, description) VALUES (?, ?, ?)',
                    [config.key, config.value, config.description]
                );
                console.log(\`   ✅ 创建配置: \${config.key} = \${config.value}\`);
            } else {
                console.log(\`   ℹ️ 配置已存在: \${config.key}\`);
            }
        }
        
        console.log('✅ 数据库初始化完成!');
        
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

module.exports = {
    initializeDatabase,
    createConnection
};
EOF
    
    echo '🚀 重启后端服务...'
    pm2 start server.js --name 'task-backend' || pm2 restart task-backend
    
    sleep 15
    
    echo '📊 查看服务状态...'
    pm2 status
    
    echo '🔍 查看服务日志...'
    pm2 logs task-backend --lines 15
    
    echo '✅ 代码修复完成！'
"

echo ""
echo "🎉 代码修复完成！"
echo ""
echo "🧪 等待服务完全启动..."
sleep 15

echo "🔍 测试API连接..."
RESPONSE=$(curl -s -X POST http://124.221.113.102:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"ADMIN","password":"AdminPass123"}' \
  --connect-timeout 15 \
  --max-time 30)

echo "API响应: $RESPONSE"

if [[ "$RESPONSE" == *"token"* ]]; then
    echo ""
    echo "🎉🎉🎉 部署完全成功！🎉🎉🎉"
    echo ""
    echo "🌐 考研任务管理系统访问信息："
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📍 服务器地址: 124.221.113.102"
    echo "🔗 API地址: http://124.221.113.102:3001/api"
    echo ""
    echo "📱 登录信息:"
    echo "   👨‍💼 管理员: ADMIN / AdminPass123"
    echo "   👨‍🎓 学生1: ST001 / Hello888"
    echo "   👨‍🎓 学生2: ST002 / NewPass123"
    echo ""
    echo "🔧 数据库信息:"
    echo "   数据库: task_manager_db"
    echo "   用户: taskapp"
    echo "   密码: TaskApp2024!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎊 恭喜！考研任务管理系统已成功部署到腾讯云服务器！"
    echo ""
    echo "📋 系统功能:"
    echo "   ✅ 管理员登录和任务导入"
    echo "   ✅ 学生登录和任务管理"
    echo "   ✅ 密码修改功能"
    echo "   ✅ 任务进度跟踪"
    echo "   ✅ 数据持久化存储"
    echo ""
    echo "🧪 建议测试:"
    echo "   1. 管理员登录测试"
    echo "   2. 导入任务CSV文件"
    echo "   3. 学生登录测试"
    echo "   4. 任务完成功能测试"
    echo "   5. 密码修改功能测试"
else
    echo "⚠️ API可能还在初始化中，请稍后再试"
    echo ""
    echo "🔍 手动测试命令:"
    echo "curl -X POST http://124.221.113.102:3001/api/auth/login \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"userId\":\"ADMIN\",\"password\":\"AdminPass123\"}'"
fi
