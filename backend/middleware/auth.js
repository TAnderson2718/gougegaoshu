const { jwtManager } = require('../utils/JWTManager');
const { query } = require('../config/database');

// JWT认证中间件
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // 检查Authorization header是否存在
  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      message: '访问令牌缺失' 
    });
  }

  // 检查Bearer格式 - 'Bearer' 但没有空格 
  if (authHeader === 'Bearer') {
    return res.status(401).json({ 
      success: false, 
      message: '访问令牌缺失' 
    });
  }

  // 检查Bearer格式 - 不是以'Bearer '开始
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ 
      success: false, 
      message: '访问令牌无效' 
    });
  }

  const token = authHeader.substring(7); // 移除'Bearer '

  // 检查token是否为空或只有空格 - 这是无效token
  if (!token || token.trim() === '') {
    return res.status(403).json({ 
      success: false, 
      message: '访问令牌无效' 
    });
  }

  try {
    // 使用安全的JWT管理器验证token
    const decoded = jwtManager.verifyAccessToken(token);

    // 检查是否是管理员token
    if (decoded.userType === 'admin') {
      // 验证管理员是否仍然存在
      const admins = await query(
        'SELECT id, name, role FROM admins WHERE id = ?',
        [decoded.userId]
      );

      if (admins.length === 0) {
        return res.status(401).json({
          success: false,
          message: '管理员不存在',
          code: 'ADMIN_NOT_FOUND'
        });
      }

      req.user = {
        studentId: decoded.userId, // 为了兼容性，使用 studentId 字段
        userId: decoded.userId,
        name: admins[0].name,
        role: decoded.role,
        userType: 'admin'
      };
    } else {
      // 验证学生是否仍然存在
      const users = await query(
        'SELECT id, name FROM students WHERE id = ?',
        [decoded.studentId || decoded.userId]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户不存在',
          code: 'USER_NOT_FOUND'
        });
      }

      req.user = {
        studentId: decoded.studentId || decoded.userId,
        name: users[0].name,
        userType: 'student'
      };
    }

    // 保存原始token用于撤销等操作
    req.token = token;
    next();
  } catch (error) {
    console.error('Token验证失败:', error.message);

    let statusCode = 403;
    let code = 'TOKEN_INVALID';

    if (error.message.includes('expired')) {
      statusCode = 401;
      code = 'TOKEN_EXPIRED';
    } else if (error.message.includes('revoked')) {
      statusCode = 401;
      code = 'TOKEN_REVOKED';
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message,
      code
    });
  }
};

// 管理员权限中间件
const requireAdmin = (req, res, next) => {
  // 检查用户类型是否为管理员
  if (req.user.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }

  next();
};



module.exports = {
  authenticateToken,
  requireAdmin
};
