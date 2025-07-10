const { query, testConnection } = require('../config/database');
const bcrypt = require('bcrypt');
require('dotenv').config();

// 建表SQL语句数组
const createTablesSQL = [
  // 1. 学生表
  `CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(20) PRIMARY KEY COMMENT '学生ID，如ST001',
    name VARCHAR(50) NOT NULL COMMENT '学生姓名',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
    force_password_change BOOLEAN DEFAULT TRUE COMMENT '是否强制修改密码',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
  ) COMMENT '学生基本信息表'`,

  // 2. 学生档案表
  `CREATE TABLE IF NOT EXISTS student_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
    gender ENUM('男', '女', '') DEFAULT '' COMMENT '性别',
    age INT COMMENT '年龄',
    study_status ENUM('在读应届考研', '无业全职考研', '在职考研', '其他', '') DEFAULT '' COMMENT '学习状态',
    study_status_other VARCHAR(100) COMMENT '其他学习状态说明',
    math_type VARCHAR(50) COMMENT '数学类型',
    math_type_other VARCHAR(100) COMMENT '其他数学类型说明',
    target_score INT COMMENT '目标分数',
    daily_hours DECIMAL(3,1) COMMENT '每日学习小时数',
    gaokao_year VARCHAR(10) DEFAULT '未参加' COMMENT '高考年份',
    gaokao_province VARCHAR(50) COMMENT '高考省份',
    gaokao_score INT COMMENT '高考分数',
    grad_exam_year VARCHAR(10) DEFAULT '未参加' COMMENT '考研年份',
    grad_exam_math_type ENUM('未考', '数一', '数二', '数三') DEFAULT '未考' COMMENT '考研数学类型',
    grad_exam_score INT COMMENT '考研分数',
    upgrade_exam_year VARCHAR(10) DEFAULT '未参加' COMMENT '专升本年份',
    upgrade_exam_province VARCHAR(50) COMMENT '专升本省份',
    upgrade_exam_math_type ENUM('未分类', '数一', '数二', '数三') DEFAULT '未分类' COMMENT '专升本数学类型',
    upgrade_exam_score INT COMMENT '专升本分数',
    purchased_books TEXT COMMENT '已购买图书',
    notes TEXT COMMENT '特殊需求备注',
    is_profile_submitted BOOLEAN DEFAULT FALSE COMMENT '档案是否已提交',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_profile (student_id)
  ) COMMENT '学生档案详情表'`,

  // 3. 任务表
  `CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(100) PRIMARY KEY COMMENT '任务ID',
    student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
    task_date DATE NOT NULL COMMENT '任务日期',
    task_type VARCHAR(50) NOT NULL COMMENT '任务类型：数学、英语、政治、专业课、复习、休息、leave等',
    title VARCHAR(500) NOT NULL COMMENT '任务标题',
    completed BOOLEAN DEFAULT FALSE COMMENT '是否完成',
    duration_hour INT DEFAULT 0 COMMENT '完成耗时（小时）',
    duration_minute INT DEFAULT 0 COMMENT '完成耗时（分钟）',
    proof_image LONGTEXT COMMENT '完成凭证图片（base64）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_date (student_id, task_date),
    INDEX idx_task_date (task_date),
    INDEX idx_task_type (task_type)
  ) COMMENT '学习任务表'`,

  // 4. 请假记录表
  `CREATE TABLE IF NOT EXISTS leave_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
    leave_date DATE NOT NULL COMMENT '请假日期',
    reason VARCHAR(200) COMMENT '请假原因',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_leave_date (student_id, leave_date)
  ) COMMENT '学生请假记录表'`,

  // 5. 系统配置表
  `CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    description VARCHAR(200) COMMENT '配置说明',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_config_key (config_key)
  ) COMMENT '系统配置表'`
];

// 初始化数据
async function insertInitialData() {
  try {
    // 检查是否已有学生数据
    const existingStudents = await query('SELECT COUNT(*) as count FROM students');
    if (existingStudents[0].count > 0) {
      console.log('✅ 初始数据已存在，跳过插入');
      return;
    }

    // 加密初始密码
    const initialPassword = process.env.INITIAL_PASSWORD || 'Hello888';
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    // 插入初始学生数据
    await query(`
      INSERT INTO students (id, name, password, force_password_change) VALUES 
      ('ST001', '张三', ?, TRUE),
      ('ST002', '李四', ?, TRUE)
    `, [hashedPassword, hashedPassword]);

    // 插入系统配置
    await query(`
      INSERT INTO system_config (config_key, config_value, description) VALUES 
      ('initial_password', ?, '学生初始密码'),
      ('system_date', CURDATE(), '系统当前日期（用于模拟）')
    `, [initialPassword]);

    console.log('✅ 初始数据插入成功');
    console.log(`📝 默认学生账户: ST001, ST002`);
    console.log(`🔑 初始密码: ${initialPassword}`);

  } catch (error) {
    console.error('❌ 插入初始数据失败:', error.message);
    throw error;
  }
}

// 创建数据库视图
async function createViews() {
  try {
    const createViewSQL = `
      CREATE OR REPLACE VIEW student_task_stats AS
      SELECT 
          s.id as student_id,
          s.name as student_name,
          DATE(t.task_date) as task_date,
          COUNT(*) as total_tasks,
          SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN t.task_type = 'leave' THEN 1 ELSE 0 END) as leave_tasks,
          SUM(CASE WHEN t.task_type = '休息' THEN 1 ELSE 0 END) as rest_tasks
      FROM students s
      LEFT JOIN tasks t ON s.id = t.student_id
      GROUP BY s.id, s.name, DATE(t.task_date)
    `;
    
    await query(createViewSQL);
    console.log('✅ 数据库视图创建成功');
  } catch (error) {
    console.error('❌ 创建视图失败:', error.message);
    // 视图创建失败不影响主要功能，只记录错误
  }
}

// 主初始化函数
async function initializeDatabase() {
  try {
    console.log('🚀 开始初始化数据库...');
    
    // 测试数据库连接
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }

    // 创建表结构
    console.log('📋 创建数据库表结构...');
    for (let i = 0; i < createTablesSQL.length; i++) {
      const tableName = ['students', 'student_profiles', 'tasks', 'leave_records', 'system_config'][i];
      console.log(`   创建表: ${tableName}`);
      await query(createTablesSQL[i]);
    }
    console.log('✅ 数据库表结构创建成功');

    // 插入初始数据
    console.log('📝 插入初始数据...');
    await insertInitialData();

    // 创建视图
    console.log('👁️ 创建数据库视图...');
    await createViews();

    console.log('🎉 数据库初始化完成！');
    return true;

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ 数据库初始化脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 数据库初始化脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  initializeDatabase,
  createTablesSQL,
  insertInitialData,
  createViews
};
