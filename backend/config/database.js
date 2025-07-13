const mysql = require('mysql2/promise');
require('dotenv').config();

// 获取数据库配置（动态获取，支持测试环境）
function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'task_manager_db',
    charset: 'utf8mb4',
    timezone: '+08:00',
    multipleStatements: true // 允许执行多条SQL语句
  };
}

// 创建连接池（延迟创建，确保环境变量已设置）
let pool = null;

function getPool() {
  if (!pool) {
    const dbConfig = getDbConfig();
    console.log(`🔗 创建数据库连接池，目标数据库: ${dbConfig.database}`);
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

// 创建数据库（如果不存在）
async function createDatabaseIfNotExists() {
  try {
    const dbConfig = getDbConfig();
    const tempConfig = { ...dbConfig };
    delete tempConfig.database; // 临时移除数据库名

    const tempConnection = await mysql.createConnection(tempConfig);
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConnection.end();

    console.log(`✅ 数据库 ${dbConfig.database} 已确保存在`);
    return true;
  } catch (error) {
    console.error('❌ 创建数据库失败:', error.message);
    return false;
  }
}

// 测试数据库连接
async function testConnection() {
  try {
    // 先确保数据库存在
    await createDatabaseIfNotExists();

    const currentPool = getPool();
    const connection = await currentPool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询的通用方法
async function query(sql, params = []) {
  try {
    const currentPool = getPool();
    const [rows] = await currentPool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 执行事务
async function transaction(callback) {
  const currentPool = getPool();
  const connection = await currentPool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 重置连接池（用于测试环境）
function resetPool() {
  if (pool) {
    pool.end();
    pool = null;
  }
}

// 连接池关闭函数
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  get pool() { return getPool(); }, // 动态获取连接池
  query,
  transaction,
  testConnection,
  createDatabaseIfNotExists,
  getDbConfig,
  resetPool,
  closePool
};
