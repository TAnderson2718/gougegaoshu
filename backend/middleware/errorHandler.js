const { AppError, ErrorFactory } = require('../utils/AppError');
const { ResponseHandler } = require('../utils/ResponseHandler');
const logger = require('../utils/Logger');

// 移除旧的Logger类，使用新的winston日志系统

/**
 * 请求日志中间件
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // 生成请求ID
  req.requestId = logger.generateRequestId();

  // 记录请求开始
  logger.info('Request started', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || req.user?.studentId,
    userType: req.user?.userType
  });

  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });

  next();
};

/**
 * 404错误处理中间件
 */
const notFoundHandler = (req, res, next) => {
  const error = ErrorFactory.notFound('API端点', req.originalUrl);
  next(error);
};

/**
 * 全局错误处理中间件
 */
const globalErrorHandler = (error, req, res, next) => {
  // 如果响应已经发送，交给Express默认错误处理器
  if (res.headersSent) {
    return next(error);
  }

  // 转换为AppError
  const appError = ErrorFactory.fromError(error);

  // 记录错误日志
  logger.error('Application error occurred', {
    requestId: req.requestId,
    error: {
      name: appError.name,
      message: appError.message,
      code: appError.code,
      statusCode: appError.statusCode,
      stack: appError.stack
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId || req.user?.studentId,
      userType: req.user?.userType,
      body: req.method !== 'GET' ? req.body : undefined,
      params: req.params,
      query: req.query
    }
  });

  // 发送错误响应
  ResponseHandler.error(res, appError, appError.statusCode);
};

/**
 * 验证错误处理器
 */
const validationErrorHandler = (error, req, res, next) => {
  if (error.name === 'ValidationError' && error.details) {
    const validationErrors = error.details.map(detail => ({
      field: detail.path ? detail.path.join('.') : 'unknown',
      message: detail.message,
      value: detail.context?.value
    }));

    return ResponseHandler.validationError(res, validationErrors, '输入验证失败');
  }

  next(error);
};

/**
 * 数据库错误处理器
 */
const databaseErrorHandler = (error, req, res, next) => {
  // SQLite约束错误
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    const appError = ErrorFactory.conflict('数据已存在，请检查唯一性约束');
    return ResponseHandler.error(res, appError, appError.statusCode);
  }

  if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    const appError = ErrorFactory.business('外键约束违反，请检查关联数据');
    return ResponseHandler.error(res, appError, appError.statusCode);
  }

  if (error.code?.startsWith('SQLITE_')) {
    const appError = ErrorFactory.database('数据库操作失败', error);
    return ResponseHandler.error(res, appError, appError.statusCode);
  }

  next(error);
};

/**
 * JWT错误处理器
 */
const jwtErrorHandler = (error, req, res, next) => {
  if (error.name === 'JsonWebTokenError') {
    return ResponseHandler.authenticationError(res, '无效的访问令牌', 'TOKEN_INVALID');
  }

  if (error.name === 'TokenExpiredError') {
    return ResponseHandler.authenticationError(res, '访问令牌已过期', 'TOKEN_EXPIRED');
  }

  if (error.name === 'NotBeforeError') {
    return ResponseHandler.authenticationError(res, '访问令牌尚未生效', 'TOKEN_NOT_ACTIVE');
  }

  next(error);
};

/**
 * 多部分表单错误处理器
 */
const multerErrorHandler = (error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    const appError = ErrorFactory.fileUpload('文件大小超出限制');
    return ResponseHandler.error(res, appError, appError.statusCode);
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    const appError = ErrorFactory.fileUpload('文件数量超出限制');
    return ResponseHandler.error(res, appError, appError.statusCode);
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    const appError = ErrorFactory.fileUpload('意外的文件字段');
    return ResponseHandler.error(res, appError, appError.statusCode);
  }

  next(error);
};

/**
 * 进程异常处理器
 */
const setupProcessHandlers = () => {
  // 未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });

    // 优雅关闭
    process.exit(1);
  });

  // 未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', {
      reason: reason instanceof Error ? {
        name: reason.name,
        message: reason.message,
        stack: reason.stack
      } : reason,
      promise: promise.toString()
    });

    // 优雅关闭
    process.exit(1);
  });

  // 进程退出
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

module.exports = {
  requestLogger,
  notFoundHandler,
  globalErrorHandler,
  validationErrorHandler,
  databaseErrorHandler,
  jwtErrorHandler,
  multerErrorHandler,
  setupProcessHandlers
};
