const { databaseManager } = require('../config/database');
const metricsService = require('./MetricsService');
const logger = require('../utils/Logger');

/**
 * 性能优化服务
 * 提供数据库连接池优化、查询优化和性能监控
 */
class PerformanceOptimizer {
  constructor() {
    this.connectionPool = {
      maxConnections: 20,
      activeConnections: 0,
      idleConnections: [],
      waitingQueue: [],
      connectionTimeout: 30000,
      idleTimeout: 300000 // 5分钟
    };

    this.queryCache = new Map();
    this.slowQueryThreshold = 1000; // 1秒
    this.performanceMetrics = {
      queryCount: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      connectionPoolStats: {
        created: 0,
        destroyed: 0,
        borrowed: 0,
        returned: 0
      }
    };

    this.startPerformanceMonitoring();
  }

  /**
   * 启动性能监控
   */
  startPerformanceMonitoring() {
    // 每分钟收集性能指标
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000);

    // 每5分钟清理过期的查询缓存
    setInterval(() => {
      this.cleanupQueryCache();
    }, 300000);

    // 每10分钟优化连接池
    setInterval(() => {
      this.optimizeConnectionPool();
    }, 600000);

    logger.info('Performance monitoring started');
  }

  /**
   * 优化数据库查询
   */
  async optimizeQuery(sql, params = [], options = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(sql, params);
    
    try {
      // 检查查询缓存
      if (options.useCache !== false && this.queryCache.has(cacheKey)) {
        const cachedResult = this.queryCache.get(cacheKey);
        if (Date.now() - cachedResult.timestamp < (options.cacheTTL || 300000)) {
          this.performanceMetrics.cacheHits++;
          logger.debug('Query cache hit', { cacheKey });
          return cachedResult.data;
        } else {
          this.queryCache.delete(cacheKey);
        }
      }

      // 执行查询
      const db = await this.getOptimizedConnection();
      const result = await db.all(sql, params);
      
      const duration = Date.now() - startTime;
      this.performanceMetrics.queryCount++;

      // 记录慢查询
      if (duration > this.slowQueryThreshold) {
        this.performanceMetrics.slowQueries++;
        this.recordSlowQuery(sql, params, duration);
      }

      // 缓存结果
      if (options.useCache !== false && result.length > 0) {
        this.queryCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        this.performanceMetrics.cacheMisses++;
      }

      // 记录指标
      metricsService.recordDatabaseQuery(
        this.extractOperation(sql),
        duration,
        true
      );

      logger.debug('Optimized query executed', {
        duration,
        resultCount: result.length,
        cached: false
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      metricsService.recordDatabaseQuery(
        this.extractOperation(sql),
        duration,
        false
      );

      logger.error('Optimized query failed', {
        sql: sql.substring(0, 100) + '...',
        params,
        duration,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 获取优化的数据库连接
   */
  async getOptimizedConnection() {
    // 如果有空闲连接，直接使用
    if (this.connectionPool.idleConnections.length > 0) {
      const connection = this.connectionPool.idleConnections.pop();
      this.performanceMetrics.connectionPoolStats.borrowed++;
      return connection;
    }

    // 如果未达到最大连接数，创建新连接
    if (this.connectionPool.activeConnections < this.connectionPool.maxConnections) {
      const connection = await databaseManager.getConnection();
      this.connectionPool.activeConnections++;
      this.performanceMetrics.connectionPoolStats.created++;
      this.performanceMetrics.connectionPoolStats.borrowed++;
      return connection;
    }

    // 等待可用连接
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection pool timeout'));
      }, this.connectionPool.connectionTimeout);

      this.connectionPool.waitingQueue.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * 归还连接到连接池
   */
  returnConnection(connection) {
    // 检查等待队列
    if (this.connectionPool.waitingQueue.length > 0) {
      const waiter = this.connectionPool.waitingQueue.shift();
      waiter.resolve(connection);
      this.performanceMetrics.connectionPoolStats.returned++;
      return;
    }

    // 添加到空闲连接池
    this.connectionPool.idleConnections.push(connection);
    this.performanceMetrics.connectionPoolStats.returned++;

    // 设置空闲超时
    setTimeout(() => {
      const index = this.connectionPool.idleConnections.indexOf(connection);
      if (index !== -1) {
        this.connectionPool.idleConnections.splice(index, 1);
        this.connectionPool.activeConnections--;
        this.performanceMetrics.connectionPoolStats.destroyed++;
        // 这里应该关闭连接，但SQLite不需要显式关闭
      }
    }, this.connectionPool.idleTimeout);
  }

  /**
   * 批量查询优化
   */
  async batchOptimizedQuery(queries) {
    const startTime = Date.now();
    
    try {
      const connection = await this.getOptimizedConnection();
      const results = [];

      // 使用事务执行批量查询
      await databaseManager.transaction(async (transactionDb) => {
        for (const { sql, params } of queries) {
          const result = await transactionDb.all(sql, params);
          results.push(result);
        }
      });

      this.returnConnection(connection);

      const duration = Date.now() - startTime;
      logger.debug('Batch optimized query executed', {
        queryCount: queries.length,
        duration,
        totalResults: results.reduce((sum, r) => sum + r.length, 0)
      });

      return results;

    } catch (error) {
      logger.error('Batch optimized query failed', {
        queryCount: queries.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 预编译查询优化
   */
  async preparedQuery(sql, paramsList) {
    const startTime = Date.now();
    
    try {
      const connection = await this.getOptimizedConnection();
      const results = [];

      // SQLite不直接支持预编译语句，但我们可以优化批量执行
      for (const params of paramsList) {
        const result = await connection.all(sql, params);
        results.push(result);
      }

      this.returnConnection(connection);

      const duration = Date.now() - startTime;
      logger.debug('Prepared query executed', {
        sql: sql.substring(0, 50) + '...',
        paramCount: paramsList.length,
        duration
      });

      return results;

    } catch (error) {
      logger.error('Prepared query failed', {
        sql: sql.substring(0, 50) + '...',
        paramCount: paramsList.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 查询计划分析
   */
  async analyzeQueryPlan(sql, params = []) {
    try {
      const connection = await this.getOptimizedConnection();
      
      // 使用EXPLAIN QUERY PLAN分析查询
      const explainSql = `EXPLAIN QUERY PLAN ${sql}`;
      const plan = await connection.all(explainSql, params);
      
      this.returnConnection(connection);

      logger.debug('Query plan analyzed', {
        sql: sql.substring(0, 100) + '...',
        plan: plan.map(row => row.detail).join(' -> ')
      });

      return plan;

    } catch (error) {
      logger.error('Query plan analysis failed', {
        sql: sql.substring(0, 100) + '...',
        error: error.message
      });
      return [];
    }
  }

  /**
   * 索引使用分析
   */
  async analyzeIndexUsage() {
    try {
      const connection = await this.getOptimizedConnection();
      
      // 获取所有索引信息
      const indexes = await connection.all(`
        SELECT name, tbl_name, sql 
        FROM sqlite_master 
        WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
        ORDER BY tbl_name, name
      `);

      // 分析索引使用情况（这里简化处理）
      const indexAnalysis = indexes.map(index => ({
        name: index.name,
        table: index.tbl_name,
        sql: index.sql,
        estimated_usage: 'unknown' // 实际项目中可以通过查询统计来估算
      }));

      this.returnConnection(connection);

      logger.info('Index usage analyzed', {
        totalIndexes: indexes.length,
        indexAnalysis
      });

      return indexAnalysis;

    } catch (error) {
      logger.error('Index usage analysis failed', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * 收集性能指标
   */
  collectPerformanceMetrics() {
    const metrics = {
      ...this.performanceMetrics,
      connectionPool: {
        active: this.connectionPool.activeConnections,
        idle: this.connectionPool.idleConnections.length,
        waiting: this.connectionPool.waitingQueue.length,
        maxConnections: this.connectionPool.maxConnections
      },
      queryCache: {
        size: this.queryCache.size,
        hitRate: this.performanceMetrics.cacheHits / 
                (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100 || 0
      },
      timestamp: new Date().toISOString()
    };

    logger.debug('Performance metrics collected', metrics);
    return metrics;
  }

  /**
   * 优化连接池
   */
  optimizeConnectionPool() {
    const stats = this.performanceMetrics.connectionPoolStats;
    const utilizationRate = stats.borrowed / (stats.created || 1);

    // 根据使用率调整连接池大小
    if (utilizationRate > 0.8 && this.connectionPool.maxConnections < 50) {
      this.connectionPool.maxConnections += 5;
      logger.info('Connection pool size increased', {
        newSize: this.connectionPool.maxConnections,
        utilizationRate
      });
    } else if (utilizationRate < 0.3 && this.connectionPool.maxConnections > 10) {
      this.connectionPool.maxConnections -= 2;
      logger.info('Connection pool size decreased', {
        newSize: this.connectionPool.maxConnections,
        utilizationRate
      });
    }
  }

  /**
   * 清理查询缓存
   */
  cleanupQueryCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > 300000) { // 5分钟过期
        this.queryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Query cache cleaned', {
        cleanedCount,
        remainingSize: this.queryCache.size
      });
    }
  }

  /**
   * 记录慢查询
   */
  recordSlowQuery(sql, params, duration) {
    const slowQuery = {
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params: params.slice(0, 5), // 只记录前5个参数
      duration,
      timestamp: new Date().toISOString()
    };

    logger.warn('Slow query detected', slowQuery);
    
    // 可以将慢查询存储到专门的集合中进行分析
    metricsService.recordError('slow_query', 'database');
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(sql, params) {
    const hash = require('crypto')
      .createHash('md5')
      .update(sql + JSON.stringify(params))
      .digest('hex');
    return `query_${hash}`;
  }

  /**
   * 提取SQL操作类型
   */
  extractOperation(sql) {
    const trimmed = sql.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return this.collectPerformanceMetrics();
  }

  /**
   * 重置性能统计
   */
  resetPerformanceStats() {
    this.performanceMetrics = {
      queryCount: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      connectionPoolStats: {
        created: 0,
        destroyed: 0,
        borrowed: 0,
        returned: 0
      }
    };
    
    this.queryCache.clear();
    logger.info('Performance stats reset');
  }
}

// 创建单例实例
const performanceOptimizer = new PerformanceOptimizer();

module.exports = performanceOptimizer;
