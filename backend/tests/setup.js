/**
 * Jest测试环境设置文件
 * 配置测试数据库连接和全局测试工具
 */

const { query, testConnection, resetDatabase } = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'task_manager_test_db';

// 重置数据库连接以确保使用正确的数据库
resetDatabase();

// 测试数据库配置
const TEST_DB_NAME = 'task_manager_test_db';

// 预生成的测试密码哈希（避免每次重新计算）
let TEST_PASSWORD_HASH = null;
let ADMIN_PASSWORD_HASH = null;

/**
 * 创建测试数据库（SQLite不需要CREATE DATABASE）
 */
async function createTestDatabase() {
  try {
    // SQLite数据库文件会在连接时自动创建，无需CREATE DATABASE语句
    console.log('✅ SQLite测试数据库准备完成');
  } catch (error) {
    console.error('❌ 创建测试数据库失败:', error);
    throw error;
  }
}

/**
 * 初始化测试数据库表结构（SQLite版本）
 */
async function initTestTables() {
  try {
    // 创建学生表
    await query(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        force_password_change INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建学生档案表（先删除再创建以确保结构正确）
    await query(`PRAGMA foreign_keys = OFF`);
    await query(`DROP TABLE IF EXISTS student_profiles`);
    await query(`PRAGMA foreign_keys = ON`);
    await query(`
      CREATE TABLE ${TEST_DB_NAME}.student_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL,
        gender ENUM('男', '女', '') DEFAULT '',
        age INT,
        study_status ENUM('在读应届考研', '无业全职考研', '在职考研', '其他', '') DEFAULT '',
        study_status_other VARCHAR(100),
        math_type VARCHAR(50),
        math_type_other VARCHAR(100),
        target_score INT,
        daily_hours DECIMAL(3,1),
        gaokao_year VARCHAR(10) DEFAULT '未参加',
        gaokao_province VARCHAR(50),
        gaokao_score INT,
        grad_exam_year VARCHAR(10) DEFAULT '未参加',
        grad_exam_province VARCHAR(50),
        grad_exam_major VARCHAR(100),
        grad_exam_math_type ENUM('未考', '数一', '数二', '数三') DEFAULT '未考',
        grad_exam_score INT,
        upgrade_exam ENUM('是', '否', '') DEFAULT '否',
        upgrade_exam_year VARCHAR(10) DEFAULT '未参加',
        upgrade_exam_province VARCHAR(50),
        upgrade_exam_major VARCHAR(100),
        upgrade_exam_math_type ENUM('未分类', '高等数学', '数一', '数二', '数三') DEFAULT '未分类',
        upgrade_exam_score INT,
        purchased_books TEXT,
        notes TEXT,
        is_profile_submitted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES ${TEST_DB_NAME}.students(id) ON DELETE CASCADE,
        UNIQUE KEY uk_student_profile (student_id)
      )
    `);

    // 创建任务表
    await query(`
      CREATE TABLE IF NOT EXISTS ${TEST_DB_NAME}.tasks (
        id VARCHAR(100) PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL,
        task_date DATE NOT NULL,
        task_type VARCHAR(50) NOT NULL,
        title VARCHAR(500) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        duration_hour INT DEFAULT 0,
        duration_minute INT DEFAULT 0,
        proof_image LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES ${TEST_DB_NAME}.students(id) ON DELETE CASCADE
      )
    `);

    // 创建请假记录表
    await query(`
      CREATE TABLE IF NOT EXISTS ${TEST_DB_NAME}.leave_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL,
        leave_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES ${TEST_DB_NAME}.students(id) ON DELETE CASCADE,
        UNIQUE KEY uk_student_date (student_id, leave_date)
      )
    `);

    // 创建系统配置表
    await query(`
      CREATE TABLE IF NOT EXISTS ${TEST_DB_NAME}.system_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL,
        config_value TEXT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_config_key (config_key)
      )
    `);

    console.log('✅ 测试数据库表结构创建成功');
  } catch (error) {
    console.error('❌ 创建测试表结构失败:', error);
    throw error;
  }
}

/**
 * 初始化测试密码哈希
 */
async function initTestPasswords() {
  // 强制重新生成密码哈希以确保一致性
  TEST_PASSWORD_HASH = await bcrypt.hash('TestPass123', 10);
  ADMIN_PASSWORD_HASH = await bcrypt.hash('AdminPass123', 10);
  console.log('🔑 测试密码哈希已生成');
  console.log('  TestPass123 hash:', TEST_PASSWORD_HASH.substring(0, 20) + '...');
}

/**
 * 插入测试数据
 */
async function insertTestData() {
  try {
    // 确保密码哈希已生成
    await initTestPasswords();

    // 清空现有数据
    await query(`DELETE FROM ${TEST_DB_NAME}.leave_records`);
    await query(`DELETE FROM ${TEST_DB_NAME}.tasks`);
    await query(`DELETE FROM ${TEST_DB_NAME}.student_profiles`);
    await query(`DELETE FROM ${TEST_DB_NAME}.students`);
    await query(`DELETE FROM ${TEST_DB_NAME}.system_config`);

    // 插入测试学生数据 (使用REPLACE确保数据更新)
    await query(`
      REPLACE INTO ${TEST_DB_NAME}.students (id, name, password, force_password_change) VALUES
      ('ST001', '测试学生1', ?, FALSE),
      ('ST002', '测试学生2', ?, TRUE),
      ('ADMIN001', '测试管理员', ?, FALSE)
    `, [TEST_PASSWORD_HASH, TEST_PASSWORD_HASH, ADMIN_PASSWORD_HASH]);

    console.log('🔑 测试密码信息:');
    console.log('- ST001/ST002 密码: TestPass123');
    console.log('- ADMIN001 密码: AdminPass123');

    // 插入测试档案数据
    await query(`
      REPLACE INTO ${TEST_DB_NAME}.student_profiles (student_id, gender, age, study_status, target_score, daily_hours) VALUES
      ('ST001', '男', 22, '在读应届考研', 350, 8.5)
    `);

    // 插入测试任务数据
    await query(`
      REPLACE INTO ${TEST_DB_NAME}.tasks (id, student_id, task_date, task_type, title, completed) VALUES
      ('task-st001-2024-01-01-1', 'ST001', '2024-01-01', '数学', '高等数学第一章', FALSE),
      ('task-st001-2024-01-01-2', 'ST001', '2024-01-01', '英语', '单词背诵100个', TRUE),
      ('task-st002-2024-01-01-1', 'ST002', '2024-01-01', '政治', '马原第一章', FALSE)
    `);

    // 插入系统配置
    await query(`
      REPLACE INTO ${TEST_DB_NAME}.system_config (config_key, config_value, description) VALUES
      ('test_mode', 'true', '测试模式标识'),
      ('initial_password', 'TestPass123', '测试初始密码')
    `);

    console.log('✅ 测试数据插入成功');
  } catch (error) {
    console.error('❌ 插入测试数据失败:', error);
    throw error;
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  try {
    await query(`DELETE FROM ${TEST_DB_NAME}.leave_records`);
    await query(`DELETE FROM ${TEST_DB_NAME}.tasks`);
    await query(`DELETE FROM ${TEST_DB_NAME}.student_profiles`);
    await query(`DELETE FROM ${TEST_DB_NAME}.students`);
    await query(`DELETE FROM ${TEST_DB_NAME}.system_config`);
    console.log('✅ 测试数据清理成功');
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error);
  }
}

/**
 * 删除测试数据库
 */
async function dropTestDatabase() {
  try {
    await query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    console.log('✅ 测试数据库删除成功');
  } catch (error) {
    console.error('❌ 删除测试数据库失败:', error);
  }
}

// Jest全局设置
beforeAll(async () => {
  console.log('🚀 开始设置测试环境...');
  await createTestDatabase();
  await initTestTables();

  // 强制重新插入测试数据以确保密码一致性
  console.log('🔄 强制重新插入测试数据以确保密码一致性...');
  await insertTestData();

  console.log('✅ 测试环境设置完成');
});

afterAll(async () => {
  console.log('🧹 开始清理测试环境...');
  // 不清理测试数据，保留用于下次测试
  // await cleanupTestData();

  // 关闭数据库连接池
  const { pool } = require('../config/database');
  if (pool) {
    await pool.end();
  }
  // 注意：不删除测试数据库，以便调试
  console.log('✅ 测试环境清理完成');
});

// 每个测试前确保数据一致性（只在必要时重置）
beforeEach(async () => {
  // 检查学生数据是否存在，如果不存在则重新插入
  try {
    const students = await query(`SELECT COUNT(*) as count FROM ${TEST_DB_NAME}.students`);
    if (students[0].count === 0) {
      console.log('🔄 检测到数据缺失，重新插入测试数据...');
      await insertTestData();
    } else {
      // 检查数据是否正确（检查用户名）
      const testStudent = await query(`SELECT name FROM ${TEST_DB_NAME}.students WHERE id = ?`, ['ST001']);
      if (testStudent.length === 0 || testStudent[0].name !== '测试学生1') {
        console.log('🔄 检测到数据不正确，重新插入测试数据...');
        await insertTestData();
      }
    }
  } catch (error) {
    console.log('🔄 数据检查失败，重新插入测试数据...');
    await insertTestData();
  }
});

module.exports = {
  createTestDatabase,
  initTestTables,
  insertTestData,
  cleanupTestData,
  dropTestDatabase,
  initTestPasswords,
  TEST_DB_NAME
};
