const os = require('os');
const process = require('process');
const logger = require('../utils/Logger');

/**
 * 指标收集服务
 * 收集应用性能指标和业务指标
 */
class MetricsService {
  constructor() {
    this.metrics = {
      // 系统指标
      system: {
        uptime: 0,
        memory: {},
        cpu: {},
        load: []
      },
      // HTTP指标
      http: {
        requests: {
          total: 0,
          success: 0,
          error: 0,
          byStatus: {},
          byMethod: {},
          byPath: {}
        },
        responseTime: {
          total: 0,
          count: 0,
          average: 0,
          min: Infinity,
          max: 0,
          percentiles: {}
        }
      },
      // 数据库指标
      database: {
        queries: {
          total: 0,
          success: 0,
          error: 0,
          byOperation: {}
        },
        responseTime: {
          total: 0,
          count: 0,
          average: 0,
          min: Infinity,
          max: 0
        },
        connections: {
          active: 0,
          total: 0
        }
      },
      // 缓存指标
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        operations: {
          get: 0,
          set: 0,
          del: 0
        }
      },
      // 业务指标
      business: {
        users: {
          totalStudents: 0,
          totalAdmins: 0,
          activeUsers: 0,
          loginAttempts: 0,
          successfulLogins: 0
        },
        tasks: {
          totalTasks: 0,
          completedTasks: 0,
          completionRate: 0,
          averageCompletionTime: 0
        }
      },
      // 错误指标
      errors: {
        total: 0,
        byType: {},
        byEndpoint: {},
        rate: 0
      }
    };

    this.startTime = Date.now();
    this.lastCollectionTime = Date.now();
    
    // 启动定期收集
    this.startPeriodicCollection();
  }

  /**
   * 启动定期指标收集
   */
  startPeriodicCollection() {
    // 每30秒收集一次系统指标
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // 每分钟计算一次统计指标
    setInterval(() => {
      this.calculateDerivedMetrics();
    }, 60000);

    logger.info('Metrics collection started');
  }

  /**
   * 收集系统指标
   */
  collectSystemMetrics() {
    try {
      // 系统运行时间
      this.metrics.system.uptime = process.uptime();

      // 内存使用情况
      const memUsage = process.memoryUsage();
      this.metrics.system.memory = {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        systemTotal: os.totalmem(),
        systemFree: os.freemem(),
        systemUsed: os.totalmem() - os.freemem()
      };

      // CPU使用情况
      const cpus = os.cpus();
      this.metrics.system.cpu = {
        count: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        speed: cpus[0]?.speed || 0,
        usage: this.calculateCpuUsage(cpus)
      };

      // 系统负载
      this.metrics.system.load = os.loadavg();

      logger.debug('System metrics collected', {
        uptime: this.metrics.system.uptime,
        memoryUsed: Math.round(this.metrics.system.memory.heapUsed / 1024 / 1024),
        cpuUsage: this.metrics.system.cpu.usage
      });
    } catch (error) {
      logger.error('Failed to collect system metrics', { error: error.message });
    }
  }

  /**
   * 计算CPU使用率
   */
  calculateCpuUsage(cpus) {
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);

    return Math.max(0, Math.min(100, usage));
  }

  /**
   * 记录HTTP请求指标
   */
  recordHttpRequest(method, path, statusCode, responseTime) {
    try {
      // 总请求数
      this.metrics.http.requests.total++;

      // 按状态码分类
      if (statusCode >= 200 && statusCode < 400) {
        this.metrics.http.requests.success++;
      } else {
        this.metrics.http.requests.error++;
      }

      // 按状态码统计
      this.metrics.http.requests.byStatus[statusCode] = 
        (this.metrics.http.requests.byStatus[statusCode] || 0) + 1;

      // 按方法统计
      this.metrics.http.requests.byMethod[method] = 
        (this.metrics.http.requests.byMethod[method] || 0) + 1;

      // 按路径统计（简化路径，移除参数）
      const simplePath = this.simplifyPath(path);
      this.metrics.http.requests.byPath[simplePath] = 
        (this.metrics.http.requests.byPath[simplePath] || 0) + 1;

      // 响应时间统计
      this.updateResponseTimeMetrics(responseTime);

      logger.debug('HTTP request recorded', {
        method,
        path: simplePath,
        statusCode,
        responseTime
      });
    } catch (error) {
      logger.error('Failed to record HTTP request metrics', { error: error.message });
    }
  }

  /**
   * 更新响应时间指标
   */
  updateResponseTimeMetrics(responseTime) {
    const rt = this.metrics.http.responseTime;
    
    rt.total += responseTime;
    rt.count++;
    rt.average = rt.total / rt.count;
    rt.min = Math.min(rt.min, responseTime);
    rt.max = Math.max(rt.max, responseTime);
  }

  /**
   * 记录数据库查询指标
   */
  recordDatabaseQuery(operation, responseTime, success = true) {
    try {
      this.metrics.database.queries.total++;
      
      if (success) {
        this.metrics.database.queries.success++;
      } else {
        this.metrics.database.queries.error++;
      }

      // 按操作类型统计
      this.metrics.database.queries.byOperation[operation] = 
        (this.metrics.database.queries.byOperation[operation] || 0) + 1;

      // 响应时间统计
      const rt = this.metrics.database.responseTime;
      rt.total += responseTime;
      rt.count++;
      rt.average = rt.total / rt.count;
      rt.min = Math.min(rt.min, responseTime);
      rt.max = Math.max(rt.max, responseTime);

      logger.debug('Database query recorded', {
        operation,
        responseTime,
        success
      });
    } catch (error) {
      logger.error('Failed to record database query metrics', { error: error.message });
    }
  }

  /**
   * 记录缓存操作指标
   */
  recordCacheOperation(operation, hit = null) {
    try {
      this.metrics.cache.operations[operation] = 
        (this.metrics.cache.operations[operation] || 0) + 1;

      if (hit === true) {
        this.metrics.cache.hits++;
      } else if (hit === false) {
        this.metrics.cache.misses++;
      }

      // 计算命中率
      const total = this.metrics.cache.hits + this.metrics.cache.misses;
      if (total > 0) {
        this.metrics.cache.hitRate = (this.metrics.cache.hits / total) * 100;
      }

      logger.debug('Cache operation recorded', {
        operation,
        hit,
        hitRate: this.metrics.cache.hitRate
      });
    } catch (error) {
      logger.error('Failed to record cache operation metrics', { error: error.message });
    }
  }

  /**
   * 记录错误指标
   */
  recordError(errorType, endpoint = null) {
    try {
      this.metrics.errors.total++;
      
      this.metrics.errors.byType[errorType] = 
        (this.metrics.errors.byType[errorType] || 0) + 1;

      if (endpoint) {
        const simplePath = this.simplifyPath(endpoint);
        this.metrics.errors.byEndpoint[simplePath] = 
          (this.metrics.errors.byEndpoint[simplePath] || 0) + 1;
      }

      logger.debug('Error recorded', {
        errorType,
        endpoint,
        totalErrors: this.metrics.errors.total
      });
    } catch (error) {
      logger.error('Failed to record error metrics', { error: error.message });
    }
  }

  /**
   * 更新业务指标
   */
  updateBusinessMetrics(type, data) {
    try {
      switch (type) {
        case 'user_stats':
          this.metrics.business.users = { ...this.metrics.business.users, ...data };
          break;
        case 'task_stats':
          this.metrics.business.tasks = { ...this.metrics.business.tasks, ...data };
          break;
        case 'login_attempt':
          this.metrics.business.users.loginAttempts++;
          if (data.success) {
            this.metrics.business.users.successfulLogins++;
          }
          break;
      }

      logger.debug('Business metrics updated', { type, data });
    } catch (error) {
      logger.error('Failed to update business metrics', { error: error.message });
    }
  }

  /**
   * 计算派生指标
   */
  calculateDerivedMetrics() {
    try {
      // HTTP错误率
      const totalRequests = this.metrics.http.requests.total;
      if (totalRequests > 0) {
        this.metrics.http.errorRate = 
          (this.metrics.http.requests.error / totalRequests) * 100;
      }

      // 数据库错误率
      const totalQueries = this.metrics.database.queries.total;
      if (totalQueries > 0) {
        this.metrics.database.errorRate = 
          (this.metrics.database.queries.error / totalQueries) * 100;
      }

      // 任务完成率
      const totalTasks = this.metrics.business.tasks.totalTasks;
      if (totalTasks > 0) {
        this.metrics.business.tasks.completionRate = 
          (this.metrics.business.tasks.completedTasks / totalTasks) * 100;
      }

      // 错误率（每分钟）
      const currentTime = Date.now();
      const timeDiff = (currentTime - this.lastCollectionTime) / 1000 / 60; // 分钟
      if (timeDiff > 0) {
        this.metrics.errors.rate = this.metrics.errors.total / timeDiff;
      }
      this.lastCollectionTime = currentTime;

      logger.debug('Derived metrics calculated');
    } catch (error) {
      logger.error('Failed to calculate derived metrics', { error: error.message });
    }
  }

  /**
   * 简化路径（移除参数和ID）
   */
  simplifyPath(path) {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\?.*$/, '')
      .replace(/\/[a-f0-9-]{36}/gi, '/:uuid');
  }

  /**
   * 获取所有指标
   */
  getAllMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      collectionDuration: Date.now() - this.startTime
    };
  }

  /**
   * 获取指标摘要
   */
  getMetricsSummary() {
    return {
      system: {
        uptime: this.metrics.system.uptime,
        memoryUsage: Math.round(this.metrics.system.memory.heapUsed / 1024 / 1024),
        cpuUsage: this.metrics.system.cpu.usage
      },
      http: {
        totalRequests: this.metrics.http.requests.total,
        errorRate: this.metrics.http.errorRate || 0,
        averageResponseTime: Math.round(this.metrics.http.responseTime.average || 0)
      },
      database: {
        totalQueries: this.metrics.database.queries.total,
        errorRate: this.metrics.database.errorRate || 0,
        averageResponseTime: Math.round(this.metrics.database.responseTime.average || 0)
      },
      cache: {
        hitRate: Math.round(this.metrics.cache.hitRate || 0),
        totalOperations: Object.values(this.metrics.cache.operations).reduce((a, b) => a + b, 0)
      },
      business: {
        totalUsers: this.metrics.business.users.totalStudents + this.metrics.business.users.totalAdmins,
        taskCompletionRate: Math.round(this.metrics.business.tasks.completionRate || 0)
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重置指标
   */
  resetMetrics() {
    this.metrics.http.requests = { total: 0, success: 0, error: 0, byStatus: {}, byMethod: {}, byPath: {} };
    this.metrics.http.responseTime = { total: 0, count: 0, average: 0, min: Infinity, max: 0 };
    this.metrics.database.queries = { total: 0, success: 0, error: 0, byOperation: {} };
    this.metrics.database.responseTime = { total: 0, count: 0, average: 0, min: Infinity, max: 0 };
    this.metrics.cache = { hits: 0, misses: 0, hitRate: 0, operations: { get: 0, set: 0, del: 0 } };
    this.metrics.errors = { total: 0, byType: {}, byEndpoint: {}, rate: 0 };
    
    this.startTime = Date.now();
    this.lastCollectionTime = Date.now();
    
    logger.info('Metrics reset');
  }
}

// 创建单例实例
const metricsService = new MetricsService();

module.exports = metricsService;
