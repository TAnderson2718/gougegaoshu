const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 登录验证schema
const loginSchema = Joi.object({
  studentId: Joi.string().required().messages({
    'string.empty': '学生ID不能为空',
    'any.required': '学生ID是必填项'
  }),
  password: Joi.string().required().messages({
    'string.empty': '密码不能为空',
    'any.required': '密码是必填项'
  })
});

// 修改密码schema
const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': '新密码长度不能少于6位'
  })
});

// 管理员登录
router.post('/admin/login', async (req, res) => {
  try {
    console.log('🔐 管理员登录请求:', req.body);

    // 验证输入
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      console.log('❌ 输入验证失败:', error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { studentId: adminId, password } = value;
    console.log('📝 解析的管理员ID:', adminId);

    // 查询管理员信息
    const admins = await query(
      'SELECT id, name, password, role FROM admins WHERE id = ?',
      [adminId.toUpperCase()]
    );

    console.log('🔍 查询管理员结果:', {
      searchId: adminId.toUpperCase(),
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
    console.log('🔐 开始验证密码...');
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    console.log('✅ 密码验证结果:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ 密码验证失败');
      return res.status(401).json({
        success: false,
        message: '管理员账号或密码错误'
      });
    }

    console.log('🎯 密码验证成功，准备生成token...');

    // 检查响应是否已经发送
    if (res.headersSent) {
      console.log('⚠️ 响应头已发送，无法继续');
      return;
    }

    // 生成JWT token，包含管理员角色信息
    console.log('🔑 开始生成JWT token...');
    console.log('🔐 JWT_SECRET存在:', !!process.env.JWT_SECRET);

    const token = jwt.sign(
      {
        userId: admin.id,
        name: admin.name,
        role: admin.role,
        userType: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ JWT token生成成功:', token.substring(0, 20) + '...');

    // 返回登录成功信息
    console.log('📤 准备返回成功响应...');
    res.json({
      success: true,
      message: '管理员登录成功',
      data: {
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          role: admin.role
        }
      }
    });

    console.log('🎉 管理员登录成功完成!');

  } catch (error) {
    console.error('❌ 管理员登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 学生登录
router.post('/login', async (req, res) => {
  try {
    console.log('👨‍🎓 学生登录请求:', req.body);

    // 验证输入
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { studentId, password } = value;

    // 检查是否是管理员账号尝试通过学生端登录
    if (studentId.toUpperCase().startsWith('ADMIN')) {
      return res.status(401).json({
        success: false,
        message: '管理员账号请使用管理员端登录'
      });
    }

    // 查询学生信息
    const students = await query(
      'SELECT id, name, password FROM students WHERE id = ?',
      [studentId.toUpperCase()]
    );

    if (students.length === 0) {
      return res.status(401).json({
        success: false,
        message: '学生ID或密码错误'
      });
    }

    const student = students[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, student.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '学生ID或密码错误'
      });
    }

    // 生成JWT token，包含用户类型标识
    const token = jwt.sign(
      {
        userId: student.id,
        studentId: student.id, // 保持向后兼容
        name: student.name,
        userType: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        student: {
          id: student.id,
          name: student.name
        }
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});



// 学生修改密码
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { oldPassword, newPassword } = value;

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

  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 验证token有效性
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      student: req.user
    }
  });
});

module.exports = router;
