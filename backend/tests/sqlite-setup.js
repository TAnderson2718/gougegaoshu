/**
 * SQLite测试环境设置
 * 简化版本，专门为SQLite设计
 */

const { query, testConnection, resetDatabase, initializeTables } = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * 初始化SQLite测试环境
 */
async function setupSQLiteTest() {
  try {
    console.log('🚀 开始设置SQLite测试环境...');
    
    // 1. 重置数据库连接
    resetDatabase();
    
    // 2. 测试连接并初始化表结构
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }
    
    // 3. 清空现有数据
    await clearTestData();
    
    // 4. 插入测试数据
    await insertTestData();
    
    console.log('✅ SQLite测试环境设置完成');
  } catch (error) {
    console.error('❌ SQLite测试环境设置失败:', error);
    throw error;
  }
}

/**
 * 清空测试数据
 */
async function clearTestData() {
  try {
    // 禁用外键约束
    await query('PRAGMA foreign_keys = OFF');
    
    // 清空所有表
    await query('DELETE FROM leave_records');
    await query('DELETE FROM tasks');
    await query('DELETE FROM students');
    await query('DELETE FROM admins');
    
    // 重新启用外键约束
    await query('PRAGMA foreign_keys = ON');
    
    console.log('✅ 测试数据清空完成');
  } catch (error) {
    console.error('❌ 清空测试数据失败:', error);
    throw error;
  }
}

/**
 * 插入测试数据
 */
async function insertTestData() {
  try {
    // 插入测试学生
    const hashedPassword = await bcrypt.hash('Hello888', 10);
    
    await query(`
      INSERT OR REPLACE INTO students (id, name, password, gender, age, grade, major, bio) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['ST001', '张三', hashedPassword, '男', 22, '大四', '计算机科学', '测试学生1']);
    
    await query(`
      INSERT OR REPLACE INTO students (id, name, password, gender, age, grade, major, bio) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['ST002', '李四', hashedPassword, '女', 21, '大三', '软件工程', '测试学生2']);
    
    // 插入测试管理员
    const adminPassword = await bcrypt.hash('AdminPass123', 10);
    await query(`
      INSERT OR REPLACE INTO admins (id, name, password, role) 
      VALUES (?, ?, ?, ?)
    `, ['admin', '测试管理员', adminPassword, 'admin']);
    
    // 插入测试任务
    const today = new Date().toISOString().split('T')[0];
    await query(`
      INSERT OR REPLACE INTO tasks (id, student_id, task_date, task_type, title, completed) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['task1', 'ST001', today, '数学', '测试任务1', 0]);
    
    await query(`
      INSERT OR REPLACE INTO tasks (id, student_id, task_date, task_type, title, completed) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['task2', 'ST001', today, '英语', '测试任务2', 1]);
    
    console.log('✅ 测试数据插入完成');
  } catch (error) {
    console.error('❌ 插入测试数据失败:', error);
    throw error;
  }
}

/**
 * 清理测试环境
 */
async function cleanupSQLiteTest() {
  try {
    console.log('🧹 开始清理SQLite测试环境...');
    await clearTestData();
    console.log('✅ SQLite测试环境清理完成');
  } catch (error) {
    console.error('❌ 清理测试环境失败:', error);
  }
}

/**
 * 获取测试数据
 */
const getTestData = () => ({
  students: [
    { id: 'ST001', name: '张三', password: 'Hello888' },
    { id: 'ST002', name: '李四', password: 'Hello888' }
  ],
  admin: { id: 'admin', name: '测试管理员', password: 'AdminPass123' },
  tasks: [
    { id: 'task1', student_id: 'ST001', task_type: '数学', title: '测试任务1', completed: false },
    { id: 'task2', student_id: 'ST001', task_type: '英语', title: '测试任务2', completed: true }
  ]
});

// Jest钩子
beforeAll(async () => {
  await setupSQLiteTest();
});

afterAll(async () => {
  await cleanupSQLiteTest();
});

beforeEach(async () => {
  // 每个测试前重新插入数据以确保一致性
  await clearTestData();
  await insertTestData();
});

module.exports = {
  setupSQLiteTest,
  clearTestData,
  insertTestData,
  cleanupSQLiteTest,
  getTestData
};
