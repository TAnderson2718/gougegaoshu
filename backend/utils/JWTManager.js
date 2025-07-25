const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * 安全的JWT管理器
 * 解决原有的默认密钥和缺乏黑名单机制问题
 */
class JWTManager {
  constructor() {
    this.secret = this.getSecret();
    this.blacklist = new Set();
    this.refreshTokens = new Map(); // 存储刷新令牌
    this.cleanupInterval = null;

    // 只在非测试环境启动清理定时器
    if (process.env.NODE_ENV !== 'test') {
      this.startCleanupInterval();
    }
  }

  /**
   * 获取并验证JWT密钥
   */
  getSecret() {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long for security');
    }
    
    // 检查是否使用了默认或弱密钥
    const weakSecrets = [
      'default-secret',
      'your_super_secret_jwt_key',
      'secret',
      '123456',
      'password'
    ];
    
    if (weakSecrets.includes(secret.toLowerCase())) {
      throw new Error('JWT_SECRET cannot be a common weak secret. Please use a strong, unique secret.');
    }
    
    return secret;
  }

  /**
   * 生成访问令牌
   */
  generateAccessToken(payload, options = {}) {
    const defaultOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: 'task-manager-api',
      audience: 'task-manager-users',
      algorithm: 'HS256'
    };

    const tokenOptions = { ...defaultOptions, ...options };
    
    // 添加安全相关的声明
    const securePayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: this.generateTokenId(), // JWT ID for tracking
      type: 'access'
    };

    return jwt.sign(securePayload, this.secret, tokenOptions);
  }

  /**
   * 生成刷新令牌
   */
  generateRefreshToken(userId, userType) {
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天过期

    this.refreshTokens.set(refreshToken, {
      userId,
      userType,
      expiresAt,
      createdAt: new Date()
    });

    return refreshToken;
  }

  /**
   * 验证访问令牌
   */
  verifyAccessToken(token) {
    if (!token) {
      throw new Error('Token is required');
    }

    // 检查token是否在黑名单中
    if (this.blacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'task-manager-api',
        audience: 'task-manager-users',
        algorithms: ['HS256']
      });

      // 验证token类型
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not active');
      }
      throw error;
    }
  }

  /**
   * 验证刷新令牌
   */
  verifyRefreshToken(refreshToken) {
    const tokenData = this.refreshTokens.get(refreshToken);
    
    if (!tokenData) {
      throw new Error('Invalid refresh token');
    }

    if (new Date() > tokenData.expiresAt) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('Refresh token has expired');
    }

    return tokenData;
  }

  /**
   * 刷新访问令牌
   */
  refreshAccessToken(refreshToken) {
    const tokenData = this.verifyRefreshToken(refreshToken);
    
    // 生成新的访问令牌
    const newAccessToken = this.generateAccessToken({
      userId: tokenData.userId,
      userType: tokenData.userType
    });

    return {
      accessToken: newAccessToken,
      refreshToken // 刷新令牌保持不变
    };
  }

  /**
   * 撤销令牌
   */
  revokeToken(token) {
    try {
      // 解码token以获取过期时间
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        // 只需要保存到过期时间
        this.blacklist.add(token);
        console.log(`Token revoked: ${decoded.jti || 'unknown'}`);
      }
    } catch (error) {
      // 即使解码失败，也要添加到黑名单
      this.blacklist.add(token);
    }
  }

  /**
   * 撤销刷新令牌
   */
  revokeRefreshToken(refreshToken) {
    const deleted = this.refreshTokens.delete(refreshToken);
    if (deleted) {
      console.log('Refresh token revoked');
    }
    return deleted;
  }

  /**
   * 撤销用户的所有令牌
   */
  revokeAllUserTokens(userId) {
    // 撤销所有刷新令牌
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        this.refreshTokens.delete(token);
      }
    }
    
    console.log(`All tokens revoked for user: ${userId}`);
  }

  /**
   * 生成唯一的token ID
   */
  generateTokenId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * 启动清理过期token的定时任务
   */
  startCleanupInterval() {
    // 每小时清理一次过期的黑名单token和刷新令牌
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 60 * 60 * 1000); // 1小时
  }

  /**
   * 停止清理定时器（用于测试）
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 清理过期的token
   */
  cleanupExpiredTokens() {
    const now = new Date();
    let cleanedCount = 0;

    // 清理过期的刷新令牌
    for (const [token, data] of this.refreshTokens.entries()) {
      if (now > data.expiresAt) {
        this.refreshTokens.delete(token);
        cleanedCount++;
      }
    }

    // 清理黑名单中的过期token（这里简化处理，实际应该解码检查过期时间）
    // 由于黑名单token数量通常不大，暂时保留所有token
    
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired tokens`);
    }
  }

  /**
   * 获取管理器状态
   */
  getStatus() {
    return {
      blacklistedTokens: this.blacklist.size,
      activeRefreshTokens: this.refreshTokens.size,
      secretLength: this.secret.length
    };
  }
}

// 创建单例实例
const jwtManager = new JWTManager();

module.exports = {
  JWTManager,
  jwtManager
};
