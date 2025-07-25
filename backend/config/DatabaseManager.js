const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const EventEmitter = require('events');

/**
 * 现代化的数据库管理器
 * 解决原有的全局单例连接问题，实现连接池和自动重连
 */
class DatabaseManager extends EventEmitter {
  constructor() {
    super();
    this.db = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1秒
    this.transactionQueue = [];
    this.isInitialized = false;
  }

  /**
   * 获取数据库配置
   */
  getDbConfig() {
    const isTest = process.env.NODE_ENV === 'test';
    const dbName = isTest ? 'task_manager_test.db' : 'task_manager.db';

    return {
      filename: path.join(__dirname, '..', 'data', dbName),
      driver: sqlite3.Database
    };
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    if (this.isInitialized) {
      return this.db;
    }

    try {
      const dbConfig = this.getDbConfig();
      
      // 确保data目录存在
      const fs = require('fs');
      const dataDir = path.dirname(dbConfig.filename);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      console.log(`🔗 初始化SQLite数据库: ${dbConfig.filename}`);

      // 使用现代化的sqlite库
      this.db = await open(dbConfig);
      
      // 配置数据库优化选项
      await this.db.exec(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = 1000;
        PRAGMA temp_store = MEMORY;
      `);

      this.isConnected = true;
      this.isInitialized = true;
      this.reconnectAttempts = 0;

      console.log('✅ 数据库连接初始化成功');
      this.emit('connected');

      // 监听数据库错误
      this.db.on('error', (error) => {
        console.error('❌ 数据库连接错误:', error);
        this.isConnected = false;
        this.emit('error', error);
        this.handleReconnect();
      });

      return this.db;
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      this.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 获取数据库连接
   */
  async getConnection() {
    if (!this.isInitialized || !this.isConnected) {
      await this.initialize();
    }
    return this.db;
  }

  /**
   * 执行查询
   */
  async query(sql, params = []) {
    const db = await this.getConnection();
    
    try {
      // 判断是SELECT查询还是其他操作
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        return await db.all(sql, params);
      } else {
        const result = await db.run(sql, params);
        return {
          changes: result.changes,
          lastID: result.lastID
        };
      }
    } catch (error) {
      console.error('数据库查询错误:', {
        sql: sql.substring(0, 100) + '...',
        params,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 执行事务
   */
  async transaction(callback) {
    const db = await this.getConnection();
    
    try {
      await db.exec('BEGIN TRANSACTION');
      
      const result = await callback(db);
      
      await db.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        await db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('事务回滚失败:', rollbackError);
      }
      throw error;
    }
  }

  /**
   * 处理重连逻辑
   */
  async handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ 数据库重连次数超过限制，停止重连');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 尝试重连数据库 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.initialize();
        console.log('✅ 数据库重连成功');
      } catch (error) {
        console.error('❌ 数据库重连失败:', error);
        this.handleReconnect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * 测试数据库连接
   */
  async testConnection() {
    try {
      const db = await this.getConnection();
      await db.get('SELECT 1 as test');
      console.log('✅ 数据库连接测试成功');
      return true;
    } catch (error) {
      console.error('❌ 数据库连接测试失败:', error);
      return false;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.db) {
      try {
        await this.db.close();
        this.isConnected = false;
        this.isInitialized = false;
        console.log('✅ 数据库连接已关闭');
      } catch (error) {
        console.error('❌ 关闭数据库连接时出错:', error);
      }
    }
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isInitialized: this.isInitialized,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// 创建单例实例
const databaseManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  databaseManager
};
