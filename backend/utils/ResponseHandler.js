/**
 * 统一响应处理器
 * 提供一致的API响应格式
 */
class ResponseHandler {
  /**
   * 成功响应
   */
  static success(res, data = null, message = '操作成功', statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
      ...(data !== null && { data })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * 创建成功响应
   */
  static created(res, data = null, message = '创建成功') {
    return this.success(res, data, message, 201);
  }

  /**
   * 无内容响应
   */
  static noContent(res, message = '操作成功') {
    return res.status(204).json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 错误响应
   */
  static error(res, error, statusCode = 500) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    const response = {
      success: false,
      message: error.message || '服务器内部错误',
      timestamp: new Date().toISOString(),
      ...(error.code && { code: error.code }),
      ...(error.details && { details: error.details }),
      ...(!isProduction && error.stack && { stack: error.stack })
    };

    return res.status(statusCode).json(response);
  }

  /**
   * 验证错误响应
   */
  static validationError(res, errors, message = '输入验证失败') {
    return res.status(400).json({
      success: false,
      message,
      code: 'VALIDATION_ERROR',
      errors,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 认证错误响应
   */
  static authenticationError(res, message = '认证失败', code = 'AUTH_FAILED') {
    return res.status(401).json({
      success: false,
      message,
      code,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 授权错误响应
   */
  static authorizationError(res, message = '权限不足', code = 'INSUFFICIENT_PERMISSIONS') {
    return res.status(403).json({
      success: false,
      message,
      code,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 资源未找到响应
   */
  static notFound(res, resource = '资源', id = null) {
    const message = id ? `${resource} (ID: ${id}) 未找到` : `${resource}未找到`;
    
    return res.status(404).json({
      success: false,
      message,
      code: 'RESOURCE_NOT_FOUND',
      details: { resource, id },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 冲突错误响应
   */
  static conflict(res, message, details = null) {
    return res.status(409).json({
      success: false,
      message,
      code: 'CONFLICT_ERROR',
      ...(details && { details }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 业务逻辑错误响应
   */
  static businessError(res, message, code = 'BUSINESS_ERROR', details = null) {
    return res.status(422).json({
      success: false,
      message,
      code,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 速率限制错误响应
   */
  static rateLimitError(res, message = '请求过于频繁，请稍后再试') {
    return res.status(429).json({
      success: false,
      message,
      code: 'RATE_LIMIT_EXCEEDED',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 分页响应
   */
  static paginated(res, data, pagination, message = '获取成功') {
    return res.json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 文件上传响应
   */
  static fileUpload(res, fileInfo, message = '文件上传成功') {
    return this.success(res, {
      filename: fileInfo.filename,
      originalName: fileInfo.originalname,
      size: fileInfo.size,
      mimetype: fileInfo.mimetype,
      path: fileInfo.path
    }, message, 201);
  }

  /**
   * 批量操作响应
   */
  static batchOperation(res, results, message = '批量操作完成') {
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return res.json({
      success: failed === 0,
      message,
      data: {
        total: results.length,
        successful,
        failed,
        results
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 健康检查响应
   */
  static health(res, status = 'healthy', checks = {}) {
    const isHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
  }
}

/**
 * 异步路由处理器包装器
 * 自动捕获异步错误并传递给错误处理中间件
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 创建响应处理器中间件
 */
const createResponseHandler = () => {
  return (req, res, next) => {
    // 将响应处理器方法绑定到res对象上
    res.success = (data, message, statusCode) => 
      ResponseHandler.success(res, data, message, statusCode);
    
    res.created = (data, message) => 
      ResponseHandler.created(res, data, message);
    
    res.noContent = (message) => 
      ResponseHandler.noContent(res, message);
    
    res.error = (error, statusCode) => 
      ResponseHandler.error(res, error, statusCode);
    
    res.validationError = (errors, message) => 
      ResponseHandler.validationError(res, errors, message);
    
    res.authenticationError = (message, code) => 
      ResponseHandler.authenticationError(res, message, code);
    
    res.authorizationError = (message, code) => 
      ResponseHandler.authorizationError(res, message, code);
    
    res.notFound = (resource, id) => 
      ResponseHandler.notFound(res, resource, id);
    
    res.conflict = (message, details) => 
      ResponseHandler.conflict(res, message, details);
    
    res.businessError = (message, code, details) => 
      ResponseHandler.businessError(res, message, code, details);
    
    res.rateLimitError = (message) => 
      ResponseHandler.rateLimitError(res, message);
    
    res.paginated = (data, pagination, message) => 
      ResponseHandler.paginated(res, data, pagination, message);
    
    res.fileUpload = (fileInfo, message) => 
      ResponseHandler.fileUpload(res, fileInfo, message);
    
    res.batchOperation = (results, message) => 
      ResponseHandler.batchOperation(res, results, message);
    
    res.health = (status, checks) => 
      ResponseHandler.health(res, status, checks);

    next();
  };
};

module.exports = {
  ResponseHandler,
  asyncHandler,
  createResponseHandler
};
