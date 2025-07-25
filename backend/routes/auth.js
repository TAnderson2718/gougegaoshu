const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validators } = require('../middleware/validation');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// 验证中间件现在从validation.js导入

// 管理员登录
router.post('/admin/login', validators.login, asyncHandler(async (req, res) => {
  const { userId: adminId, password } = req.validatedBody;

  logger.info('Admin login attempt', {
    requestId: req.requestId,
    adminId,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  // 查询管理员信息
  const admins = await query(
    'SELECT id, name, password, role FROM admins WHERE id = ?',
    [adminId.toLowerCase()]
  );

  if (admins.length === 0) {
    logger.logAuth('admin_login', adminId, false, {
      reason: 'admin_not_found',
      ip: req.ip,
      requestId: req.requestId
    });
    return res.status(401).json({
      success: false,
      message: '管理员账号或密码错误'
    });
  }

  const admin = admins[0];

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, admin.password);

  if (!isPasswordValid) {
    logger.logAuth('admin_login', adminId, false, {
      reason: 'invalid_password',
      ip: req.ip,
      requestId: req.requestId
    });
    return res.status(401).json({
      success: false,
      message: '管理员账号或密码错误'
    });
  }

  // 检查响应是否已经发送
  if (res.headersSent) {
    logger.warn('Response headers already sent', {
      requestId: req.requestId,
      adminId
    });
    return;
  }

  // 生成JWT token
  const accessToken = jwtManager.generateAccessToken({
    userId: admin.id,
    name: admin.name,
    role: admin.role,
    userType: 'admin'
  });

  const refreshToken = jwtManager.generateRefreshToken(admin.id, 'admin');

  // 记录成功登录
  logger.logAuth('admin_login', adminId, true, {
    adminName: admin.name,
    role: admin.role,
    ip: req.ip,
    requestId: req.requestId
  });

  // 返回登录成功信息
  res.json({
    success: true,
    message: '管理员登录成功',
    data: {
      token: accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        name: admin.name,
        role: admin.role,
        userType: 'admin'
      }
    }
  });
}));

// 统一登录端点 - 支持管理员和学生
router.post('/login', validators.login, asyncHandler(async (req, res) => {
  console.log('🔐 登录请求:', req.body);

  const { userId, password } = req.validatedBody;
    console.log('📝 解析的用户ID:', userId);

    // 检查是否是管理员账号
    if (userId.toUpperCase().startsWith('ADMIN')) {
      console.log('👨‍💼 管理员登录流程...');

      // 查询管理员信息
      const admins = await query(
        'SELECT id, name, password, \'admin\' as role FROM admins WHERE id = ?',
        [userId.toLowerCase()]
      );

      console.log('🔍 查询管理员结果:', {
        searchId: userId.toLowerCase(),
        found: admins.length > 0,
        count: admins.length
      });

      if (admins.length === 0) {
        console.log('❌ 管理员不存在');
        return res.status(401).json({
          success: false,
          message: '管理员账号或密码错误'
        });
      }

      const admin = admins[0];
      console.log('👤 找到管理员:', { id: admin.id, name: admin.name, role: admin.role });

      // 验证密码
      console.log('🔐 开始验证管理员密码...');
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      console.log('✅ 管理员密码验证结果:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('❌ 管理员密码验证失败');
        return res.status(401).json({
          success: false,
          message: '管理员账号或密码错误'
        });
      }

      console.log('🎯 管理员密码验证成功，准备生成token...');

      // 生成安全的JWT token
      const accessToken = jwtManager.generateAccessToken({
        userId: admin.id,
        name: admin.name,
        role: admin.role,
        userType: 'admin'
      });

      const refreshToken = jwtManager.generateRefreshToken(admin.id, 'admin');

      console.log('✅ 管理员JWT token生成成功');

      // 返回管理员登录成功信息
      return res.json({
        success: true,
        message: '管理员登录成功',
        data: {
          token: accessToken,
          refreshToken,
          admin: {
            id: admin.id,
            name: admin.name,
            role: admin.role
          },
          userType: 'admin'
        }
      });
    } else {
      console.log('👨‍🎓 学生登录流程...');

      // 查询学生信息
      const students = await query(
        'SELECT id, name, password FROM students WHERE id = ?',
        [userId.toUpperCase()]
      );

      console.log('🔍 查询学生结果:', {
        searchId: userId.toUpperCase(),
        found: students.length > 0,
        count: students.length
      });

      if (students.length === 0) {
        console.log('❌ 学生不存在');
        return res.status(401).json({
          success: false,
          message: '学生ID或密码错误'
        });
      }

      const student = students[0];
      console.log('👤 找到学生:', { id: student.id, name: student.name });

      // 验证密码
      console.log('🔐 开始验证学生密码...');
      const isValidPassword = await bcrypt.compare(password, student.password);
      console.log('✅ 学生密码验证结果:', isValidPassword);

      if (!isValidPassword) {
        console.log('❌ 学生密码验证失败');
        return res.status(401).json({
          success: false,
          message: '学生ID或密码错误'
        });
      }

      console.log('🎯 学生密码验证成功，准备生成token...');

      // 更新最后登录时间
      await query(
        'UPDATE students SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [student.id]
      );

      // 生成安全的JWT token
      const accessToken = jwtManager.generateAccessToken({
        userId: student.id,
        studentId: student.id, // 保持向后兼容
        name: student.name,
        userType: 'student'
      });

      const refreshToken = jwtManager.generateRefreshToken(student.id, 'student');

      console.log('✅ 学生JWT token生成成功');

      // 返回学生登录成功信息
      return res.json({
        success: true,
        message: '学生登录成功',
        data: {
          token: accessToken,
          refreshToken,
          student: {
            id: student.id,
            name: student.name
          },
          userType: 'student'
        }
      });
    }
}));

// 强制修改密码（管理员功能）
router.post('/force-change-password', authenticateToken, validators.forceChangePassword, asyncHandler(async (req, res) => {
  const { newPassword } = req.validatedBody;
  const userId = req.user.userId || req.user.studentId;

  // 加密新密码
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 更新密码
  await query(
    'UPDATE students SET password = ? WHERE id = ?',
    [hashedPassword, userId]
  );

  res.json({
    success: true,
    message: '密码修改成功'
  });
}));

// 学生修改密码
router.post('/change-password', authenticateToken, validators.changePassword, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.validatedBody;

  // 获取当前密码
  const students = await query(
    'SELECT password FROM students WHERE id = ?',
    [req.user.studentId]
  );

  if (students.length === 0) {
    return res.status(404).json({
      success: false,
      message: '用户不存在'
    });
  }

  // 验证旧密码
  const isValidOldPassword = await bcrypt.compare(oldPassword, students[0].password);
  if (!isValidOldPassword) {
    return res.status(400).json({
      success: false,
      message: '旧密码错误'
    });
  }

  // 加密新密码
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // 更新密码
  await query(
    'UPDATE students SET password = ? WHERE id = ?',
    [hashedNewPassword, req.user.studentId]
  );

  res.json({
    success: true,
    message: '密码修改成功'
  });
}));

// 验证token有效性
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      student: req.user
    }
  });
});

// 刷新访问令牌
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: '刷新令牌缺失',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const tokens = jwtManager.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      message: '令牌刷新成功',
      data: tokens
    });

  } catch (error) {
    console.error('刷新令牌失败:', error.message);

    let statusCode = 401;
    let code = 'REFRESH_TOKEN_INVALID';

    if (error.message.includes('expired')) {
      code = 'REFRESH_TOKEN_EXPIRED';
    }

    res.status(statusCode).json({
      success: false,
      message: error.message,
      code
    });
  }
});

// 撤销令牌（登出）
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // 撤销访问令牌
    jwtManager.revokeToken(req.token);

    // 如果提供了刷新令牌，也一并撤销
    const { refreshToken } = req.body;
    if (refreshToken) {
      jwtManager.revokeRefreshToken(refreshToken);
    }

    res.json({
      success: true,
      message: '登出成功'
    });

  } catch (error) {
    console.error('登出失败:', error.message);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
});

// 撤销用户所有令牌
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.studentId;

    // 撤销当前令牌
    jwtManager.revokeToken(req.token);

    // 撤销用户所有令牌
    jwtManager.revokeAllUserTokens(userId);

    res.json({
      success: true,
      message: '已登出所有设备'
    });

  } catch (error) {
    console.error('全部登出失败:', error.message);
    res.status(500).json({
      success: false,
      message: '全部登出失败'
    });
  }
});

module.exports = router;
