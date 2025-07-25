const { databaseManager } = require('../config/database');
const logger = require('../utils/Logger');

/**
 * 查询优化器
 * 提供优化的数据库查询方法，解决N+1问题和性能瓶颈
 */
class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.performanceStats = {
      totalQueries: 0,
      optimizedQueries: 0,
      averageTime: 0,
      slowQueries: []
    };
  }

  /**
   * 执行优化的查询
   */
  async executeQuery(sql, params = [], options = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId(sql, params);
    
    try {
      const db = await databaseManager.getConnection();
      const result = await db.all(sql, params);
      
      const duration = Date.now() - startTime;
      this.recordQueryPerformance(sql, duration, result.length);
      
      // 记录慢查询
      if (duration > (options.slowQueryThreshold || 100)) {
        this.recordSlowQuery(sql, params, duration);
      }

      logger.logDatabase('SELECT', this.extractTableName(sql), duration, {
        queryId,
        resultCount: result.length,
        params: params.length
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query execution failed', {
        sql: sql.substring(0, 100) + '...',
        params,
        duration,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 批量查询优化 - 解决N+1问题
   */
  async batchQuery(queries) {
    const startTime = Date.now();
    
    try {
      const db = await databaseManager.getConnection();
      const results = [];

      // 使用事务执行批量查询
      await databaseManager.transaction(async (transactionDb) => {
        for (const { sql, params } of queries) {
          const result = await transactionDb.all(sql, params);
          results.push(result);
        }
      });

      const duration = Date.now() - startTime;
      logger.logDatabase('BATCH', 'multiple', duration, {
        queryCount: queries.length,
        totalResults: results.reduce((sum, r) => sum + r.length, 0)
      });

      this.performanceStats.optimizedQueries++;
      return results;
    } catch (error) {
      logger.error('Batch query failed', {
        queryCount: queries.length,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取学生任务（优化版本）- 解决N+1问题
   */
  async getStudentTasksOptimized(studentId, startDate = null, endDate = null) {
    const startTime = Date.now();
    
    try {
      let sql = `
        SELECT 
          t.id,
          t.student_id,
          strftime('%Y-%m-%d', t.task_date) as task_date,
          t.task_type,
          t.title,
          t.completed,
          t.duration_hour,
          t.duration_minute,
          t.proof_image,
          t.created_at,
          s.name as student_name
        FROM tasks t
        INNER JOIN students s ON t.student_id = s.id
        WHERE t.student_id = ?
      `;
      
      const params = [studentId];

      if (startDate && endDate) {
        sql += ` AND t.task_date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += ` AND t.task_date >= ?`;
        params.push(startDate);
      } else if (endDate) {
        sql += ` AND t.task_date <= ?`;
        params.push(endDate);
      }

      sql += ` ORDER BY t.task_date DESC, t.created_at DESC`;

      const tasks = await this.executeQuery(sql, params);
      
      // 按日期分组
      const tasksByDate = this.groupTasksByDate(tasks);
      
      const duration = Date.now() - startTime;
      logger.logPerformance('getStudentTasksOptimized', duration, 'ms', {
        studentId,
        taskCount: tasks.length,
        dateRange: { startDate, endDate }
      });

      return tasksByDate;
    } catch (error) {
      logger.error('Get student tasks optimized failed', {
        studentId,
        startDate,
        endDate,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取多个学生的任务统计（批量优化）
   */
  async getMultipleStudentStats(studentIds) {
    const startTime = Date.now();
    
    try {
      const placeholders = studentIds.map(() => '?').join(',');
      const sql = `
        SELECT 
          s.id,
          s.name,
          COUNT(t.id) as total_tasks,
          SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
          SUM(t.duration_hour * 60 + t.duration_minute) as total_minutes,
          MAX(t.task_date) as last_task_date
        FROM students s
        LEFT JOIN tasks t ON s.id = t.student_id
        WHERE s.id IN (${placeholders})
        GROUP BY s.id, s.name
        ORDER BY s.name
      `;

      const stats = await this.executeQuery(sql, studentIds);
      
      const duration = Date.now() - startTime;
      logger.logPerformance('getMultipleStudentStats', duration, 'ms', {
        studentCount: studentIds.length,
        resultCount: stats.length
      });

      return stats;
    } catch (error) {
      logger.error('Get multiple student stats failed', {
        studentIds,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取任务完成率统计（优化版本）
   */
  async getTaskCompletionStats(dateRange = null) {
    const startTime = Date.now();
    
    try {
      let sql = `
        SELECT 
          strftime('%Y-%m-%d', task_date) as date,
          task_type,
          COUNT(*) as total_tasks,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
          ROUND(
            (SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
          ) as completion_rate
        FROM tasks
      `;
      
      const params = [];

      if (dateRange && dateRange.startDate && dateRange.endDate) {
        sql += ` WHERE task_date BETWEEN ? AND ?`;
        params.push(dateRange.startDate, dateRange.endDate);
      }

      sql += `
        GROUP BY strftime('%Y-%m-%d', task_date), task_type
        ORDER BY date DESC, task_type
      `;

      const stats = await this.executeQuery(sql, params);
      
      const duration = Date.now() - startTime;
      logger.logPerformance('getTaskCompletionStats', duration, 'ms', {
        dateRange,
        resultCount: stats.length
      });

      return stats;
    } catch (error) {
      logger.error('Get task completion stats failed', {
        dateRange,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取学生学习时长排行（优化版本）
   */
  async getStudentStudyTimeRanking(limit = 10, dateRange = null) {
    const startTime = Date.now();
    
    try {
      let sql = `
        SELECT 
          s.id,
          s.name,
          SUM(t.duration_hour * 60 + t.duration_minute) as total_minutes,
          COUNT(CASE WHEN t.completed = 1 THEN 1 END) as completed_tasks,
          COUNT(t.id) as total_tasks,
          ROUND(
            (COUNT(CASE WHEN t.completed = 1 THEN 1 END) * 100.0 / COUNT(t.id)), 2
          ) as completion_rate
        FROM students s
        LEFT JOIN tasks t ON s.id = t.student_id
      `;
      
      const params = [];

      if (dateRange && dateRange.startDate && dateRange.endDate) {
        sql += ` WHERE t.task_date BETWEEN ? AND ?`;
        params.push(dateRange.startDate, dateRange.endDate);
      }

      sql += `
        GROUP BY s.id, s.name
        HAVING total_minutes > 0
        ORDER BY total_minutes DESC
        LIMIT ?
      `;
      
      params.push(limit);

      const ranking = await this.executeQuery(sql, params);
      
      const duration = Date.now() - startTime;
      logger.logPerformance('getStudentStudyTimeRanking', duration, 'ms', {
        limit,
        dateRange,
        resultCount: ranking.length
      });

      return ranking;
    } catch (error) {
      logger.error('Get student study time ranking failed', {
        limit,
        dateRange,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 按日期分组任务
   */
  groupTasksByDate(tasks) {
    const grouped = {};
    
    tasks.forEach(task => {
      const date = task.task_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(task);
    });

    return grouped;
  }

  /**
   * 生成查询ID
   */
  generateQueryId(sql, params) {
    const hash = require('crypto')
      .createHash('md5')
      .update(sql + JSON.stringify(params))
      .digest('hex');
    return hash.substring(0, 8);
  }

  /**
   * 提取表名
   */
  extractTableName(sql) {
    const match = sql.match(/FROM\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * 记录查询性能
   */
  recordQueryPerformance(sql, duration, resultCount) {
    this.performanceStats.totalQueries++;
    
    // 更新平均时间
    const totalTime = this.performanceStats.averageTime * (this.performanceStats.totalQueries - 1) + duration;
    this.performanceStats.averageTime = totalTime / this.performanceStats.totalQueries;
  }

  /**
   * 记录慢查询
   */
  recordSlowQuery(sql, params, duration) {
    const slowQuery = {
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params,
      duration,
      timestamp: new Date().toISOString()
    };

    this.performanceStats.slowQueries.push(slowQuery);
    
    // 只保留最近的50个慢查询
    if (this.performanceStats.slowQueries.length > 50) {
      this.performanceStats.slowQueries.shift();
    }

    logger.warn('Slow query detected', slowQuery);
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      cacheSize: this.queryCache.size
    };
  }

  /**
   * 清除性能统计
   */
  clearPerformanceStats() {
    this.performanceStats = {
      totalQueries: 0,
      optimizedQueries: 0,
      averageTime: 0,
      slowQueries: []
    };
    this.queryCache.clear();
  }
}

// 创建单例实例
const queryOptimizer = new QueryOptimizer();

module.exports = queryOptimizer;
