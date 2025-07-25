const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validators } = require('../middleware/validation');
const AuthController = require('../controllers/AuthController');

const router = express.Router();

// 统一登录端点
router.post('/login', validators.login, AuthController.login);

// 管理员登录
router.post('/admin/login', validators.adminLogin, AuthController.adminLogin);

// 学生登录
router.post('/student/login', validators.login, AuthController.studentLogin);

// 刷新访问令牌
router.post('/refresh-token', AuthController.refreshToken);

// 登出
router.post('/logout', authenticateToken, AuthController.logout);

// 登出所有设备
router.post('/logout-all', authenticateToken, AuthController.logoutAll);

// 修改密码
router.post('/change-password', authenticateToken, validators.changePassword, AuthController.changePassword);

// 强制修改密码（管理员功能）
router.post('/force-change-password', authenticateToken, validators.forceChangePassword, AuthController.forceChangePassword);

// 获取当前用户信息
router.get('/me', authenticateToken, AuthController.getCurrentUser);

// 更新用户资料
router.put('/profile', authenticateToken, validators.profileUpdate, AuthController.updateProfile);

// 验证令牌
router.get('/validate', authenticateToken, AuthController.validateToken);

// 获取认证统计信息（管理员功能）
router.get('/stats', authenticateToken, AuthController.getAuthStats);

module.exports = router;
