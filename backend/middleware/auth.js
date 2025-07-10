const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// JWT认证中间件
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: '访问令牌缺失' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 验证用户是否仍然存在
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
      forcePasswordChange: users[0].force_password_change
    };
    
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
  if (req.user.forcePasswordChange && req.path !== '/auth/change-password') {
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
