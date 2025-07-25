const { databaseManager } = require('../config/database');
const logger = require('../utils/Logger');

/**
 * 基础仓库类
 * 提供通用的数据访问方法和事务支持
 */
class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = null;
  }

  /**
   * 获取数据库连接
   */
  async getConnection() {
    if (!this.db) {
      this.db = await databaseManager.getConnection();
    }
    return this.db;
  }

  /**
   * 执行查询
   */
  async query(sql, params = []) {
    const startTime = Date.now();
    
    try {
      const db = await this.getConnection();
      const result = await db.all(sql, params);
      
      const duration = Date.now() - startTime;
      logger.logDatabase('SELECT', this.tableName, duration, {
        sql: sql.substring(0, 100) + '...',
        params: params.length,
        resultCount: result.length
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Repository query failed', {
        table: this.tableName,
        sql: sql.substring(0, 100) + '...',
        params,
        duration,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 执行单个查询
   */
  async queryOne(sql, params = []) {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 执行插入/更新/删除操作
   */
  async execute(sql, params = []) {
    const startTime = Date.now();
    
    try {
      const db = await this.getConnection();
      const result = await db.run(sql, params);
      
      const duration = Date.now() - startTime;
      const operation = sql.trim().split(' ')[0].toUpperCase();
      
      logger.logDatabase(operation, this.tableName, duration, {
        sql: sql.substring(0, 100) + '...',
        params: params.length,
        changes: result.changes,
        lastID: result.lastID
      });

      return {
        changes: result.changes,
        lastID: result.lastID,
        success: result.changes > 0
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Repository execute failed', {
        table: this.tableName,
        sql: sql.substring(0, 100) + '...',
        params,
        duration,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 查找所有记录
   */
  async findAll(conditions = {}, options = {}) {
    const { where, params } = this.buildWhereClause(conditions);
    const { orderBy, limit, offset } = options;
    
    let sql = `SELECT * FROM ${this.tableName}`;
    
    if (where) {
      sql += ` WHERE ${where}`;
    }
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      sql += ` LIMIT ${limit}`;
      if (offset) {
        sql += ` OFFSET ${offset}`;
      }
    }

    return await this.query(sql, params);
  }

  /**
   * 根据ID查找记录
   */
  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return await this.queryOne(sql, [id]);
  }

  /**
   * 查找单个记录
   */
  async findOne(conditions = {}) {
    const { where, params } = this.buildWhereClause(conditions);
    const sql = `SELECT * FROM ${this.tableName} WHERE ${where} LIMIT 1`;
    return await this.queryOne(sql, params);
  }

  /**
   * 创建记录
   */
  async create(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');
    
    const sql = `
      INSERT INTO ${this.tableName} (${fields.join(', ')}) 
      VALUES (${placeholders})
    `;
    
    const result = await this.execute(sql, values);
    
    if (result.success) {
      return await this.findById(result.lastID || data.id);
    }
    
    return null;
  }

  /**
   * 更新记录
   */
  async update(id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const sql = `
      UPDATE ${this.tableName} 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = await this.execute(sql, [...values, id]);
    
    if (result.success) {
      return await this.findById(id);
    }
    
    return null;
  }

  /**
   * 删除记录
   */
  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    const result = await this.execute(sql, [id]);
    return result.success;
  }

  /**
   * 批量删除
   */
  async deleteMany(conditions = {}) {
    const { where, params } = this.buildWhereClause(conditions);
    const sql = `DELETE FROM ${this.tableName} WHERE ${where}`;
    const result = await this.execute(sql, params);
    return result.changes;
  }

  /**
   * 计数
   */
  async count(conditions = {}) {
    const { where, params } = this.buildWhereClause(conditions);
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    
    if (where) {
      sql += ` WHERE ${where}`;
    }
    
    const result = await this.queryOne(sql, params);
    return result ? result.count : 0;
  }

  /**
   * 检查记录是否存在
   */
  async exists(conditions = {}) {
    const count = await this.count(conditions);
    return count > 0;
  }

  /**
   * 构建WHERE子句
   */
  buildWhereClause(conditions) {
    const keys = Object.keys(conditions);
    
    if (keys.length === 0) {
      return { where: '1=1', params: [] };
    }
    
    const whereParts = [];
    const params = [];
    
    keys.forEach(key => {
      const value = conditions[key];
      
      if (Array.isArray(value)) {
        // IN 查询
        const placeholders = value.map(() => '?').join(', ');
        whereParts.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else if (value === null) {
        // NULL 查询
        whereParts.push(`${key} IS NULL`);
      } else if (typeof value === 'object' && value.operator) {
        // 自定义操作符
        whereParts.push(`${key} ${value.operator} ?`);
        params.push(value.value);
      } else {
        // 等值查询
        whereParts.push(`${key} = ?`);
        params.push(value);
      }
    });
    
    return {
      where: whereParts.join(' AND '),
      params
    };
  }

  /**
   * 执行事务
   */
  async transaction(callback) {
    return await databaseManager.transaction(callback);
  }

  /**
   * 获取表信息
   */
  async getTableInfo() {
    const sql = `PRAGMA table_info(${this.tableName})`;
    return await this.query(sql);
  }

  /**
   * 获取表统计信息
   */
  async getTableStats() {
    const totalCount = await this.count();
    const tableInfo = await this.getTableInfo();
    
    return {
      tableName: this.tableName,
      totalRecords: totalCount,
      columns: tableInfo.length,
      columnDetails: tableInfo
    };
  }
}

module.exports = BaseRepository;
