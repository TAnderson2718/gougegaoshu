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

// 学生登录
router.post('/login', async (req, res) => {
  try {
    // 验证输入
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { studentId, password } = value;

    // 查询学生信息
    const students = await query(
      'SELECT id, name, password, force_password_change FROM students WHERE id = ?',
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

    // 生成JWT token
    const token = jwt.sign(
      { studentId: student.id },
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
          name: student.name,
          forcePasswordChange: student.force_password_change
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

// 强制修改密码（首次登录）
router.post('/force-change-password', authenticateToken, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于6位'
      });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await query(
      'UPDATE students SET password = ?, force_password_change = FALSE WHERE id = ?',
      [hashedPassword, req.user.studentId]
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
