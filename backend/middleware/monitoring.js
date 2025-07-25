const metricsService = require('../services/MetricsService');
const logger = require('../utils/Logger');

/**
 * 监控中间件
 * 自动收集HTTP请求指标
 */
function createMonitoringMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // 记录请求开始
    req.startTime = startTime;
    req.requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 监听响应完成事件
    res.on('finish', () => {
      try {
        const responseTime = Date.now() - startTime;
        const method = req.method;
        const path = req.route ? req.route.path : req.path;
        const statusCode = res.statusCode;

        // 记录HTTP请求指标
        metricsService.recordHttpRequest(method, path, statusCode, responseTime);

        // 记录错误指标
        if (statusCode >= 400) {
          const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
          metricsService.recordError(errorType, path);
        }

        // 详细日志记录
        logger.logRequest(req, res, responseTime);

      } catch (error) {
        logger.error('Failed to record request metrics', {
          error: error.message,
          requestId: req.requestId
        });
      }
    });

    // 监听响应错误事件
    res.on('error', (error) => {
      try {
        const responseTime = Date.now() - startTime;
        const path = req.route ? req.route.path : req.path;
        
        metricsService.recordError('response_error', path);
        
        logger.error('Response error occurred', {
          error: error.message,
          requestId: req.requestId,
          path,
          responseTime
        });
      } catch (err) {
        logger.error('Failed to record response error metrics', {
          error: err.message,
          requestId: req.requestId
        });
      }
    });

    next();
  };
}

/**
 * 数据库监控中间件
 * 包装数据库查询以收集指标
 */
function wrapDatabaseQuery(originalQuery) {
  return async function(...args) {
    const startTime = Date.now();
    let operation = 'UNKNOWN';
    let success = true;

    try {
      // 尝试从SQL语句中提取操作类型
      if (typeof args[0] === 'string') {
        const sql = args[0].trim().toUpperCase();
        if (sql.startsWith('SELECT')) operation = 'SELECT';
        else if (sql.startsWith('INSERT')) operation = 'INSERT';
        else if (sql.startsWith('UPDATE')) operation = 'UPDATE';
        else if (sql.startsWith('DELETE')) operation = 'DELETE';
        else if (sql.startsWith('CREATE')) operation = 'CREATE';
        else if (sql.startsWith('DROP')) operation = 'DROP';
        else if (sql.startsWith('ALTER')) operation = 'ALTER';
      }

      const result = await originalQuery.apply(this, args);
      return result;

    } catch (error) {
      success = false;
      throw error;

    } finally {
      const responseTime = Date.now() - startTime;
      metricsService.recordDatabaseQuery(operation, responseTime, success);
    }
  };
}

/**
 * 缓存监控中间件
 * 包装缓存操作以收集指标
 */
function wrapCacheOperation(originalMethod, operation) {
  return async function(...args) {
    let hit = null;

    try {
      const result = await originalMethod.apply(this, args);
      
      // 对于get操作，判断是否命中
      if (operation === 'get') {
        hit = result !== null && result !== undefined;
      }

      metricsService.recordCacheOperation(operation, hit);
      return result;

    } catch (error) {
      metricsService.recordCacheOperation(operation, false);
      throw error;
    }
  };
}

/**
 * 业务指标收集中间件
 * 用于特定业务操作的指标收集
 */
function createBusinessMetricsMiddleware(metricType, dataExtractor) {
  return (req, res, next) => {
    // 监听响应完成事件
    res.on('finish', () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = dataExtractor ? dataExtractor(req, res) : {};
          metricsService.updateBusinessMetrics(metricType, data);
        }
      } catch (error) {
        logger.error('Failed to record business metrics', {
          error: error.message,
          metricType,
          requestId: req.requestId
        });
      }
    });

    next();
  };
}

/**
 * 错误监控中间件
 * 捕获和记录应用程序错误
 */
function createErrorMonitoringMiddleware() {
  return (error, req, res, next) => {
    try {
      const errorType = error.name || 'UnknownError';
      const endpoint = req.route ? req.route.path : req.path;
      
      metricsService.recordError(errorType, endpoint);

      // 记录详细错误信息
      logger.error('Application error occurred', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        request: {
          method: req.method,
          path: endpoint,
          query: req.query,
          body: req.body,
          headers: req.headers,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        },
        requestId: req.requestId
      });

    } catch (err) {
      logger.error('Failed to record error metrics', {
        error: err.message,
        originalError: error.message,
        requestId: req.requestId
      });
    }

    next(error);
  };
}

/**
 * 性能监控中间件
 * 监控慢请求和性能问题
 */
function createPerformanceMonitoringMiddleware(slowRequestThreshold = 1000) {
  return (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      try {
        const responseTime = Date.now() - startTime;
        
        if (responseTime > slowRequestThreshold) {
          logger.warn('Slow request detected', {
            method: req.method,
            path: req.route ? req.route.path : req.path,
            responseTime,
            threshold: slowRequestThreshold,
            statusCode: res.statusCode,
            requestId: req.requestId,
            userAgent: req.get('User-Agent'),
            ip: req.ip
          });

          // 记录慢请求指标
          metricsService.recordError('slow_request', req.path);
        }
      } catch (error) {
        logger.error('Failed to monitor performance', {
          error: error.message,
          requestId: req.requestId
        });
      }
    });

    next();
  };
}

/**
 * 用户活动监控中间件
 * 跟踪用户活动和会话
 */
function createUserActivityMonitoringMiddleware() {
  return (req, res, next) => {
    // 如果请求包含用户信息，记录用户活动
    if (req.user) {
      res.on('finish', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const activityData = {
              userId: req.user.userId || req.user.studentId,
              userType: req.user.userType,
              action: `${req.method} ${req.route ? req.route.path : req.path}`,
              timestamp: new Date().toISOString(),
              ip: req.ip,
              userAgent: req.get('User-Agent')
            };

            // 这里可以记录到专门的用户活动日志或数据库
            logger.logBusiness('user_activity', activityData.userId, {
              action: activityData.action,
              userType: activityData.userType
            });
          }
        } catch (error) {
          logger.error('Failed to record user activity', {
            error: error.message,
            requestId: req.requestId
          });
        }
      });
    }

    next();
  };
}

/**
 * 安全监控中间件
 * 监控安全相关事件
 */
function createSecurityMonitoringMiddleware() {
  const suspiciousPatterns = [
    /\.\.\//g,  // 路径遍历
    /<script/gi, // XSS尝试
    /union.*select/gi, // SQL注入尝试
    /drop.*table/gi,   // SQL注入尝试
  ];

  return (req, res, next) => {
    try {
      const requestData = JSON.stringify({
        query: req.query,
        body: req.body,
        params: req.params
      });

      // 检查可疑模式
      const suspiciousActivity = suspiciousPatterns.some(pattern => 
        pattern.test(requestData) || pattern.test(req.path)
      );

      if (suspiciousActivity) {
        logger.warn('Suspicious activity detected', {
          method: req.method,
          path: req.path,
          query: req.query,
          body: req.body,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.requestId
        });

        metricsService.recordError('suspicious_activity', req.path);
      }

      // 监控失败的认证尝试
      if (req.path.includes('/auth/') || req.path.includes('/login')) {
        res.on('finish', () => {
          if (res.statusCode === 401 || res.statusCode === 403) {
            logger.warn('Authentication failure', {
              path: req.path,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              requestId: req.requestId
            });

            metricsService.recordError('auth_failure', req.path);
          }
        });
      }

    } catch (error) {
      logger.error('Failed to perform security monitoring', {
        error: error.message,
        requestId: req.requestId
      });
    }

    next();
  };
}

module.exports = {
  createMonitoringMiddleware,
  wrapDatabaseQuery,
  wrapCacheOperation,
  createBusinessMetricsMiddleware,
  createErrorMonitoringMiddleware,
  createPerformanceMonitoringMiddleware,
  createUserActivityMonitoringMiddleware,
  createSecurityMonitoringMiddleware
};
