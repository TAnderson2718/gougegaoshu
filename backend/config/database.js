const { databaseManager } = require('./DatabaseManager');
require('dotenv').config();

// 向后兼容的数据库配置函数
function getDbConfig() {
  return databaseManager.getDbConfig();
}

// 向后兼容的数据库连接函数
function getDatabase() {
  console.warn('⚠️  getDatabase() is deprecated. Use databaseManager.getConnection() instead.');
  return databaseManager.getConnection();
}

// 初始化数据库表结构
async function initializeTables() {
  try {
    const db = await databaseManager.getConnection();

    const createTables = `
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        gender TEXT,
        age INTEGER,
        grade TEXT,
        major TEXT,
        bio TEXT,
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        task_date DATE NOT NULL,
        task_type TEXT NOT NULL,
        title TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        duration_hour INTEGER DEFAULT 0,
        duration_minute INTEGER DEFAULT 0,
        proof_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
      );

      CREATE TABLE IF NOT EXISTS leave_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        leave_date DATE NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id),
        UNIQUE(student_id, leave_date)
      );

      CREATE TABLE IF NOT EXISTS student_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL UNIQUE,
        gender TEXT,
        age INTEGER,
        study_status TEXT,
        math_type TEXT,
        target_score INTEGER,
        daily_hours REAL,
        gaokao_year TEXT,
        gaokao_province TEXT,
        gaokao_score INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id)
      );
    `;

    await db.exec(createTables);
    console.log('✅ 数据库表结构初始化完成');
    return true;
  } catch (error) {
    console.error('❌ 创建数据库表失败:', error.message);
    throw error;
  }
}

// 测试数据库连接
async function testConnection() {
  try {
    // 初始化数据库表
    await initializeTables();

    // 使用新的数据库管理器测试连接
    return await databaseManager.testConnection();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询的通用方法 - 使用新的数据库管理器
async function query(sql, params = []) {
  return await databaseManager.query(sql, params);
}

// 执行事务 - 使用新的数据库管理器
async function transaction(callback) {
  return await databaseManager.transaction(async (db) => {
    // 创建兼容的事务上下文对象
    const transactionContext = {
      run: async (sql, params = []) => {
        const result = await db.run(sql, params);
        return { changes: result.changes, lastID: result.lastID };
      },
      get: async (sql, params = []) => {
        return await db.get(sql, params);
      },
      all: async (sql, params = []) => {
        return await db.all(sql, params);
      }
    };

    return await callback(transactionContext);
  });
}

// 重置数据库连接（用于测试环境）
async function resetDatabase() {
  await databaseManager.close();
  // 重新初始化
  await databaseManager.initialize();
}

// 关闭数据库连接
async function closeDatabase() {
  return await databaseManager.close();
}

module.exports = {
  // 向后兼容的接口
  get database() {
    console.warn('⚠️  database getter is deprecated. Use databaseManager.getConnection() instead.');
    return databaseManager.getConnection();
  },
  query,
  transaction,
  testConnection,
  initializeTables,
  getDbConfig,
  resetDatabase,
  closeDatabase,

  // 新的数据库管理器接口
  databaseManager
};
