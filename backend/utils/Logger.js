const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

/**
 * 专业的结构化日志系统
 * 支持分级日志、日志轮转、结构化输出和性能监控
 */
class Logger {
  constructor() {
    this.logger = null;
    this.requestId = 0;
    this.initialize();
  }

  /**
   * 初始化日志系统
   */
  initialize() {
    // 确保日志目录存在
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 自定义日志格式
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const logEntry = {
          timestamp,
          level: level.toUpperCase(),
          message,
          ...meta
        };
        
        // 在开发环境中添加颜色
        if (process.env.NODE_ENV !== 'production') {
          return JSON.stringify(logEntry, null, 2);
        }
        
        return JSON.stringify(logEntry);
      })
    );

    // 控制台格式（开发环境）
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss.SSS'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 ? 
          `\n${JSON.stringify(meta, null, 2)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
      })
    );

    // 配置传输器
    const transports = [];

    // 控制台输出（开发环境）
    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          level: process.env.LOG_LEVEL || 'debug',
          format: consoleFormat
        })
      );
    }

    // 错误日志文件（每日轮转）
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
      })
    );

    // 警告日志文件
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'warn-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'warn',
        format: logFormat,
        maxSize: '20m',
        maxFiles: '7d',
        zippedArchive: true
      })
    );

    // 综合日志文件
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: logFormat,
        maxSize: '50m',
        maxFiles: '30d',
        zippedArchive: true
      })
    );

    // 访问日志文件（生产环境）
    if (process.env.NODE_ENV === 'production') {
      transports.push(
        new DailyRotateFile({
          filename: path.join(logDir, 'access-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'info',
          format: logFormat,
          maxSize: '100m',
          maxFiles: '30d',
          zippedArchive: true
        })
      );
    }

    // 创建winston logger实例
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      format: logFormat,
      transports,
      exitOnError: false // 不要在错误时退出进程
    });

    console.log('📝 结构化日志系统初始化完成');
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${++this.requestId}`;
  }

  /**
   * 记录错误日志
   */
  error(message, meta = {}) {
    this.logger.error(message, {
      ...meta,
      service: 'task-manager',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * 记录警告日志
   */
  warn(message, meta = {}) {
    this.logger.warn(message, {
      ...meta,
      service: 'task-manager',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * 记录信息日志
   */
  info(message, meta = {}) {
    this.logger.info(message, {
      ...meta,
      service: 'task-manager',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * 记录调试日志
   */
  debug(message, meta = {}) {
    this.logger.debug(message, {
      ...meta,
      service: 'task-manager',
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * 记录HTTP请求日志
   */
  logRequest(req, res, duration) {
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId || req.user?.studentId,
      userType: req.user?.userType,
      contentLength: res.get('Content-Length'),
      referer: req.get('Referer')
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.logger[level]('HTTP Request', logData);
  }

  /**
   * 记录数据库操作日志
   */
  logDatabase(operation, table, duration, meta = {}) {
    this.logger.debug('Database Operation', {
      operation,
      table,
      duration: `${duration}ms`,
      ...meta
    });
  }

  /**
   * 记录认证日志
   */
  logAuth(action, userId, success, meta = {}) {
    const level = success ? 'info' : 'warn';
    this.logger[level]('Authentication', {
      action,
      userId,
      success,
      ...meta
    });
  }

  /**
   * 记录业务操作日志
   */
  logBusiness(action, userId, details = {}) {
    this.logger.info('Business Operation', {
      action,
      userId,
      ...details
    });
  }

  /**
   * 记录性能指标
   */
  logPerformance(metric, value, unit = 'ms', meta = {}) {
    this.logger.info('Performance Metric', {
      metric,
      value,
      unit,
      ...meta
    });
  }

  /**
   * 记录安全事件
   */
  logSecurity(event, severity, details = {}) {
    this.logger.warn('Security Event', {
      event,
      severity,
      ...details
    });
  }

  /**
   * 获取日志统计信息
   */
  getStats() {
    return {
      logLevel: this.logger.level,
      transports: this.logger.transports.length,
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

// 创建单例实例
const logger = new Logger();

module.exports = logger;
