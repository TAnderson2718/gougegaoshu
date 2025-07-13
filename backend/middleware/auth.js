const jwt = require('jsonwebtoken');
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 检查是否是管理员token
    if (decoded.userType === 'admin') {
      // 验证管理员是否仍然存在
      const admins = await query(
        'SELECT id, name, role, force_password_change FROM admins WHERE id = ?',
        [decoded.userId]
      );

      if (admins.length === 0) {
        return res.status(401).json({
          success: false,
          message: '管理员不存在'
        });
      }

      req.user = {
        studentId: decoded.userId, // 为了兼容性，使用 studentId 字段
        userId: decoded.userId,
        name: admins[0].name,
        role: decoded.role,
        userType: 'admin',
        forcePasswordChange: admins[0].force_password_change || false
      };
    } else {
      // 验证学生是否仍然存在
      const users = await query(
        'SELECT id, name, force_password_change FROM students WHERE id = ?',
        [decoded.studentId]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      }

      req.user = {
        studentId: decoded.studentId,
        name: users[0].name,
        userType: 'student',
        forcePasswordChange: users[0].force_password_change
      };
    }

    next();
  } catch (error) {
    console.error('Token验证失败:', error);
    return res.status(403).json({ 
      success: false, 
      message: '访问令牌无效' 
    });
  }
};

// 管理员权限中间件（这里简化处理，实际项目中应该有专门的管理员表）
const requireAdmin = (req, res, next) => {
  // 简化处理：假设特定ID为管理员
  const adminIds = ['ADMIN001', 'ADMIN002'];
  
  if (!adminIds.includes(req.user.studentId)) {
    return res.status(403).json({ 
      success: false, 
      message: '需要管理员权限' 
    });
  }
  
  next();
};

// 检查是否需要强制修改密码
const checkPasswordChange = (req, res, next) => {
  if (req.user.forcePasswordChange && 
      req.path !== '/api/auth/change-password' && 
      req.path !== '/api/auth/force-change-password') {
    return res.status(403).json({ 
      success: false, 
      message: '请先修改初始密码',
      requirePasswordChange: true
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  checkPasswordChange
};
