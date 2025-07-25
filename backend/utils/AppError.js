/**
 * 自定义应用错误类
 * 提供结构化的错误处理和分类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // 标识这是一个可预期的业务错误
    this.timestamp = new Date().toISOString();
    
    // 捕获堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为JSON格式
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV !== 'production' && { stack: this.stack })
    };
  }
}

/**
 * 验证错误
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * 认证错误
 */
class AuthenticationError extends AppError {
  constructor(message = '认证失败', code = 'AUTH_FAILED') {
    super(message, 401, code);
  }
}

/**
 * 授权错误
 */
class AuthorizationError extends AppError {
  constructor(message = '权限不足', code = 'INSUFFICIENT_PERMISSIONS') {
    super(message, 403, code);
  }
}

/**
 * 资源未找到错误
 */
class NotFoundError extends AppError {
  constructor(resource = '资源', id = null) {
    const message = id ? `${resource} (ID: ${id}) 未找到` : `${resource}未找到`;
    super(message, 404, 'RESOURCE_NOT_FOUND', { resource, id });
  }
}

/**
 * 冲突错误
 */
class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

/**
 * 业务逻辑错误
 */
class BusinessError extends AppError {
  constructor(message, code = 'BUSINESS_ERROR', details = null) {
    super(message, 422, code, details);
  }
}

/**
 * 数据库错误
 */
class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR', {
      originalMessage: originalError?.message,
      code: originalError?.code
    });
  }
}

/**
 * 外部服务错误
 */
class ExternalServiceError extends AppError {
  constructor(service, message, statusCode = 502) {
    super(`${service}服务错误: ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR', {
      service
    });
  }
}

/**
 * 速率限制错误
 */
class RateLimitError extends AppError {
  constructor(message = '请求过于频繁，请稍后再试') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * 文件上传错误
 */
class FileUploadError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'FILE_UPLOAD_ERROR', details);
  }
}

/**
 * 错误工厂函数
 */
class ErrorFactory {
  static validation(message, details = null) {
    return new ValidationError(message, details);
  }

  static authentication(message, code) {
    return new AuthenticationError(message, code);
  }

  static authorization(message, code) {
    return new AuthorizationError(message, code);
  }

  static notFound(resource, id) {
    return new NotFoundError(resource, id);
  }

  static conflict(message, details) {
    return new ConflictError(message, details);
  }

  static business(message, code, details) {
    return new BusinessError(message, code, details);
  }

  static database(message, originalError) {
    return new DatabaseError(message, originalError);
  }

  static externalService(service, message, statusCode) {
    return new ExternalServiceError(service, message, statusCode);
  }

  static rateLimit(message) {
    return new RateLimitError(message);
  }

  static fileUpload(message, details) {
    return new FileUploadError(message, details);
  }

  /**
   * 从原始错误创建AppError
   */
  static fromError(error, defaultMessage = '服务器内部错误') {
    if (error instanceof AppError) {
      return error;
    }

    // 数据库错误
    if (error.code === 'SQLITE_CONSTRAINT') {
      return new DatabaseError('数据约束违反', error);
    }

    if (error.code === 'SQLITE_ERROR') {
      return new DatabaseError('数据库操作失败', error);
    }

    // JWT错误
    if (error.name === 'JsonWebTokenError') {
      return new AuthenticationError('无效的访问令牌', 'TOKEN_INVALID');
    }

    if (error.name === 'TokenExpiredError') {
      return new AuthenticationError('访问令牌已过期', 'TOKEN_EXPIRED');
    }

    // 验证错误
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, error.details);
    }

    // 默认为内部服务器错误
    return new AppError(defaultMessage, 500, 'INTERNAL_ERROR', {
      originalMessage: error.message,
      originalStack: error.stack
    });
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BusinessError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  FileUploadError,
  ErrorFactory
};
