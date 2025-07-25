const { databaseManager } = require('../config/database');
const { cacheService } = require('./CacheService');
const metricsService = require('./MetricsService');
const logger = require('../utils/Logger');

/**
 * 健康检查服务
 * 监控系统各组件的健康状态
 */
class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.lastCheckTime = null;
    this.checkInterval = 30000; // 30秒检查一次
    this.alertThresholds = {
      responseTime: 1000, // 1秒
      errorRate: 5, // 5%
      memoryUsage: 80, // 80%
      cpuUsage: 80, // 80%
      diskUsage: 90 // 90%
    };
    
    this.initializeChecks();
    this.startPeriodicChecks();
  }

  /**
   * 初始化健康检查项
   */
  initializeChecks() {
    // 数据库连接检查
    this.checks.set('database', {
      name: '数据库连接',
      check: this.checkDatabase.bind(this),
      critical: true,
      timeout: 5000
    });

    // 缓存服务检查
    this.checks.set('cache', {
      name: '缓存服务',
      check: this.checkCache.bind(this),
      critical: false,
      timeout: 3000
    });

    // 内存使用检查
    this.checks.set('memory', {
      name: '内存使用',
      check: this.checkMemory.bind(this),
      critical: true,
      timeout: 1000
    });

    // CPU使用检查
    this.checks.set('cpu', {
      name: 'CPU使用',
      check: this.checkCPU.bind(this),
      critical: false,
      timeout: 1000
    });

    // 响应时间检查
    this.checks.set('responseTime', {
      name: '响应时间',
      check: this.checkResponseTime.bind(this),
      critical: false,
      timeout: 1000
    });

    // 错误率检查
    this.checks.set('errorRate', {
      name: '错误率',
      check: this.checkErrorRate.bind(this),
      critical: false,
      timeout: 1000
    });

    logger.info('Health checks initialized', {
      totalChecks: this.checks.size,
      criticalChecks: Array.from(this.checks.values()).filter(c => c.critical).length
    });
  }

  /**
   * 启动定期健康检查
   */
  startPeriodicChecks() {
    setInterval(async () => {
      await this.runAllChecks();
    }, this.checkInterval);

    logger.info('Periodic health checks started', {
      interval: this.checkInterval
    });
  }

  /**
   * 运行所有健康检查
   */
  async runAllChecks() {
    const startTime = Date.now();
    const results = {};
    let overallStatus = 'healthy';
    let criticalIssues = 0;
    let warnings = 0;

    for (const [key, checkConfig] of this.checks) {
      try {
        const result = await this.runSingleCheck(key, checkConfig);
        results[key] = result;

        if (result.status === 'unhealthy' && checkConfig.critical) {
          overallStatus = 'unhealthy';
          criticalIssues++;
        } else if (result.status === 'warning') {
          warnings++;
          if (overallStatus === 'healthy') {
            overallStatus = 'warning';
          }
        }
      } catch (error) {
        results[key] = {
          status: 'error',
          message: `检查失败: ${error.message}`,
          timestamp: new Date().toISOString(),
          duration: 0
        };

        if (checkConfig.critical) {
          overallStatus = 'unhealthy';
          criticalIssues++;
        }

        logger.error('Health check failed', {
          check: key,
          error: error.message
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    this.lastCheckTime = new Date().toISOString();

    const healthStatus = {
      status: overallStatus,
      timestamp: this.lastCheckTime,
      duration: totalDuration,
      checks: results,
      summary: {
        total: this.checks.size,
        healthy: Object.values(results).filter(r => r.status === 'healthy').length,
        warnings,
        criticalIssues,
        errors: Object.values(results).filter(r => r.status === 'error').length
      }
    };

    // 记录健康状态变化
    if (overallStatus !== 'healthy') {
      logger.warn('System health degraded', {
        status: overallStatus,
        criticalIssues,
        warnings,
        duration: totalDuration
      });
    }

    return healthStatus;
  }

  /**
   * 运行单个健康检查
   */
  async runSingleCheck(key, checkConfig) {
    const startTime = Date.now();
    
    try {
      // 设置超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('检查超时')), checkConfig.timeout);
      });

      const checkPromise = checkConfig.check();
      const result = await Promise.race([checkPromise, timeoutPromise]);

      const duration = Date.now() - startTime;

      return {
        ...result,
        timestamp: new Date().toISOString(),
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
        duration
      };
    }
  }

  /**
   * 检查数据库连接
   */
  async checkDatabase() {
    try {
      const db = await databaseManager.getConnection();
      const startTime = Date.now();
      
      // 执行简单查询测试连接
      await db.get('SELECT 1 as test');
      
      const responseTime = Date.now() - startTime;

      if (responseTime > this.alertThresholds.responseTime) {
        return {
          status: 'warning',
          message: `数据库响应时间较慢: ${responseTime}ms`,
          details: { responseTime }
        };
      }

      return {
        status: 'healthy',
        message: '数据库连接正常',
        details: { responseTime }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `数据库连接失败: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * 检查缓存服务
   */
  async checkCache() {
    try {
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();
      
      // 测试写入
      await cacheService.set(testKey, testValue, 10, 'main');
      
      // 测试读取
      const retrievedValue = await cacheService.get(testKey, 'main');
      
      // 清理测试数据
      await cacheService.del(testKey, 'main');

      if (retrievedValue !== testValue) {
        return {
          status: 'warning',
          message: '缓存数据不一致',
          details: { expected: testValue, actual: retrievedValue }
        };
      }

      const stats = cacheService.getStats();

      return {
        status: 'healthy',
        message: '缓存服务正常',
        details: {
          hitRate: stats.hitRate,
          totalKeys: stats.totalKeys
        }
      };
    } catch (error) {
      return {
        status: 'warning',
        message: `缓存服务异常: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * 检查内存使用
   */
  async checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = memUsage.heapUsed;
    const usagePercent = (usedMemory / totalMemory) * 100;

    if (usagePercent > this.alertThresholds.memoryUsage) {
      return {
        status: 'warning',
        message: `内存使用率过高: ${usagePercent.toFixed(2)}%`,
        details: {
          usedMB: Math.round(usedMemory / 1024 / 1024),
          totalMB: Math.round(totalMemory / 1024 / 1024),
          usagePercent: usagePercent.toFixed(2)
        }
      };
    }

    return {
      status: 'healthy',
      message: '内存使用正常',
      details: {
        usedMB: Math.round(usedMemory / 1024 / 1024),
        totalMB: Math.round(totalMemory / 1024 / 1024),
        usagePercent: usagePercent.toFixed(2)
      }
    };
  }

  /**
   * 检查CPU使用
   */
  async checkCPU() {
    const metrics = metricsService.getAllMetrics();
    const cpuUsage = metrics.system.cpu.usage || 0;

    if (cpuUsage > this.alertThresholds.cpuUsage) {
      return {
        status: 'warning',
        message: `CPU使用率过高: ${cpuUsage}%`,
        details: { cpuUsage }
      };
    }

    return {
      status: 'healthy',
      message: 'CPU使用正常',
      details: { cpuUsage }
    };
  }

  /**
   * 检查响应时间
   */
  async checkResponseTime() {
    const metrics = metricsService.getAllMetrics();
    const avgResponseTime = metrics.http.responseTime.average || 0;

    if (avgResponseTime > this.alertThresholds.responseTime) {
      return {
        status: 'warning',
        message: `平均响应时间过长: ${avgResponseTime.toFixed(2)}ms`,
        details: {
          average: avgResponseTime.toFixed(2),
          min: metrics.http.responseTime.min,
          max: metrics.http.responseTime.max
        }
      };
    }

    return {
      status: 'healthy',
      message: '响应时间正常',
      details: {
        average: avgResponseTime.toFixed(2),
        min: metrics.http.responseTime.min === Infinity ? 0 : metrics.http.responseTime.min,
        max: metrics.http.responseTime.max
      }
    };
  }

  /**
   * 检查错误率
   */
  async checkErrorRate() {
    const metrics = metricsService.getAllMetrics();
    const errorRate = metrics.http.errorRate || 0;

    if (errorRate > this.alertThresholds.errorRate) {
      return {
        status: 'warning',
        message: `错误率过高: ${errorRate.toFixed(2)}%`,
        details: {
          errorRate: errorRate.toFixed(2),
          totalRequests: metrics.http.requests.total,
          errorRequests: metrics.http.requests.error
        }
      };
    }

    return {
      status: 'healthy',
      message: '错误率正常',
      details: {
        errorRate: errorRate.toFixed(2),
        totalRequests: metrics.http.requests.total,
        errorRequests: metrics.http.requests.error
      }
    };
  }

  /**
   * 获取健康状态
   */
  async getHealthStatus() {
    return await this.runAllChecks();
  }

  /**
   * 获取简化的健康状态
   */
  async getHealthSummary() {
    const fullStatus = await this.runAllChecks();
    
    return {
      status: fullStatus.status,
      timestamp: fullStatus.timestamp,
      duration: fullStatus.duration,
      summary: fullStatus.summary,
      criticalIssues: Object.entries(fullStatus.checks)
        .filter(([key, result]) => result.status === 'unhealthy' && this.checks.get(key).critical)
        .map(([key, result]) => ({
          check: key,
          message: result.message
        }))
    };
  }

  /**
   * 更新告警阈值
   */
  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    
    logger.info('Health check thresholds updated', {
      thresholds: this.alertThresholds
    });
  }

  /**
   * 添加自定义健康检查
   */
  addCustomCheck(key, checkConfig) {
    this.checks.set(key, {
      name: checkConfig.name || key,
      check: checkConfig.check,
      critical: checkConfig.critical || false,
      timeout: checkConfig.timeout || 5000
    });

    logger.info('Custom health check added', { key, name: checkConfig.name });
  }

  /**
   * 移除健康检查
   */
  removeCheck(key) {
    const removed = this.checks.delete(key);
    
    if (removed) {
      logger.info('Health check removed', { key });
    }
    
    return removed;
  }
}

// 创建单例实例
const healthCheckService = new HealthCheckService();

module.exports = healthCheckService;
