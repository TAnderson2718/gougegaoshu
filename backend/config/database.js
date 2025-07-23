const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// 获取数据库配置（动态获取，支持测试环境）
function getDbConfig() {
  const isTest = process.env.NODE_ENV === 'test';
  const dbName = isTest ? 'task_manager_test.db' : 'task_manager.db';

  return {
    filename: path.join(__dirname, '..', 'data', dbName),
    mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    verbose: process.env.NODE_ENV !== 'production'
  };
}

// SQLite数据库连接管理
let db = null;
let dbCreated = false; // 标志，防止重复日志输出

function getDatabase() {
  if (!db) {
    const dbConfig = getDbConfig();

    // 确保data目录存在
    const fs = require('fs');
    const dataDir = path.dirname(dbConfig.filename);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 只在首次创建时输出日志
    if (!dbCreated) {
      console.log(`🔗 连接SQLite数据库: ${dbConfig.filename}`);
      dbCreated = true;
    }

    db = new sqlite3.Database(dbConfig.filename, dbConfig.mode, (err) => {
      if (err) {
        console.error('❌ SQLite数据库连接失败:', err.message);
      } else {
        console.log('✅ SQLite数据库连接成功');
        // 启用外键约束
        db.run('PRAGMA foreign_keys = ON');
      }
    });
  }
  return db;
}

// 初始化数据库表结构
async function initializeTables() {
  return new Promise((resolve, reject) => {
    const database = getDatabase();

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
    `;

    database.exec(createTables, (err) => {
      if (err) {
        console.error('❌ 创建数据库表失败:', err.message);
        reject(err);
      } else {
        console.log('✅ 数据库表结构初始化完成');
        resolve(true);
      }
    });
  });
}

// 测试数据库连接
async function testConnection() {
  try {
    // 初始化数据库表
    await initializeTables();

    const database = getDatabase();
    return new Promise((resolve) => {
      database.get('SELECT 1 as test', (err, row) => {
        if (err) {
          console.error('❌ 数据库连接测试失败:', err.message);
          resolve(false);
        } else {
          console.log('✅ 数据库连接测试成功');
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询的通用方法
async function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();

    // 判断是SELECT查询还是其他操作
    const isSelect = sql.trim().toUpperCase().startsWith('SELECT');

    if (isSelect) {
      database.all(sql, params, (err, rows) => {
        if (err) {
          console.error('数据库查询错误:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    } else {
      database.run(sql, params, function(err) {
        if (err) {
          console.error('数据库操作错误:', err);
          reject(err);
        } else {
          resolve({
            changes: this.changes,
            lastID: this.lastID
          });
        }
      });
    }
  });
}

// 执行事务
async function transaction(callback) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();

    database.serialize(() => {
      database.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }

        // 创建事务上下文对象
        const transactionContext = {
          run: (sql, params = []) => {
            return new Promise((res, rej) => {
              database.run(sql, params, function(err) {
                if (err) rej(err);
                else res({ changes: this.changes, lastID: this.lastID });
              });
            });
          },
          get: (sql, params = []) => {
            return new Promise((res, rej) => {
              database.get(sql, params, (err, row) => {
                if (err) rej(err);
                else res(row);
              });
            });
          },
          all: (sql, params = []) => {
            return new Promise((res, rej) => {
              database.all(sql, params, (err, rows) => {
                if (err) rej(err);
                else res(rows);
              });
            });
          }
        };

        Promise.resolve(callback(transactionContext))
          .then(result => {
            database.run('COMMIT', (err) => {
              if (err) {
                database.run('ROLLBACK');
                reject(err);
              } else {
                resolve(result);
              }
            });
          })
          .catch(error => {
            database.run('ROLLBACK', () => {
              reject(error);
            });
          });
      });
    });
  });
}

// 重置数据库连接（用于测试环境）
function resetDatabase() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('关闭数据库连接时出错:', err.message);
      }
    });
    db = null;
    dbCreated = false; // 重置标志
  }
}

// 关闭数据库连接
async function closeDatabase() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('关闭数据库连接时出错:', err.message);
        } else {
          console.log('✅ 数据库连接已关闭');
        }
        db = null;
        dbCreated = false;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  get database() { return getDatabase(); }, // 动态获取数据库连接
  query,
  transaction,
  testConnection,
  initializeTables,
  getDbConfig,
  resetDatabase,
  closeDatabase
};
