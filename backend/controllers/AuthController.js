const userService = require('../services/UserService');
const { asyncHandler } = require('../utils/ResponseHandler');
const { validators } = require('../middleware/validation');
const logger = require('../utils/Logger');

/**
 * 认证控制器
 * 处理用户认证相关的HTTP请求
 */
class AuthController {
  /**
   * 统一登录
   */
  static login = asyncHandler(async (req, res) => {
    const { userId, password } = req.validatedBody;

    const result = await userService.login(userId, password);

    res.success({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
      userType: result.user.role ? 'admin' : 'student'
    }, '登录成功');
  });

  /**
   * 管理员登录
   */
  static adminLogin = asyncHandler(async (req, res) => {
    const { userId: adminId, password } = req.validatedBody;

    const result = await userService.loginAdmin(adminId, password);

    res.success({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      admin: result.user,
      userType: 'admin'
    }, '管理员登录成功');
  });

  /**
   * 学生登录
   */
  static studentLogin = asyncHandler(async (req, res) => {
    const { userId: studentId, password } = req.validatedBody;

    const result = await userService.loginStudent(studentId, password);

    res.success({
      token: result.accessToken,
      refreshToken: result.refreshToken,
      student: result.user,
      userType: 'student'
    }, '学生登录成功');
  });

  /**
   * 刷新访问令牌
   */
  static refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.validationError([{
        field: 'refreshToken',
        message: '刷新令牌是必需的'
      }]);
    }

    const tokens = await userService.refreshAccessToken(refreshToken);

    res.success(tokens, '令牌刷新成功');
  });

  /**
   * 登出
   */
  static logout = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user.studentId;
    const { refreshToken } = req.body;

    await userService.logout(userId, req.token, refreshToken);

    res.success(null, '登出成功');
  });

  /**
   * 登出所有设备
   */
  static logoutAll = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user.studentId;

    await userService.logoutAll(userId);

    res.success(null, '已登出所有设备');
  });

  /**
   * 修改密码
   */
  static changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.validatedBody;
    const userId = req.user.userId || req.user.studentId;
    const userType = req.user.userType;

    await userService.changePassword(userId, oldPassword, newPassword, userType);

    res.success(null, '密码修改成功');
  });

  /**
   * 强制修改密码（管理员功能）
   */
  static forceChangePassword = asyncHandler(async (req, res) => {
    const { newPassword } = req.validatedBody;
    const userId = req.user.userId || req.user.studentId;
    const userType = req.user.userType;

    await userService.forceChangePassword(userId, newPassword, userType);

    res.success(null, '密码修改成功');
  });

  /**
   * 获取当前用户信息
   */
  static getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user.studentId;
    const userType = req.user.userType;

    const user = await userService.getUserInfo(userId, userType);

    res.success({
      user,
      userType
    }, '获取用户信息成功');
  });

  /**
   * 更新用户资料
   */
  static updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.userId || req.user.studentId;
    const userType = req.user.userType;
    const updateData = req.validatedBody;

    if (userType !== 'student') {
      return res.businessError('只有学生可以更新个人资料', 'PROFILE_UPDATE_NOT_ALLOWED');
    }

    const updatedUser = await userService.updateStudentProfile(userId, updateData);

    res.success({
      user: updatedUser
    }, '个人资料更新成功');
  });

  /**
   * 验证令牌
   */
  static validateToken = asyncHandler(async (req, res) => {
    // 如果能到达这里，说明令牌是有效的（通过了authenticateToken中间件）
    const userId = req.user.userId || req.user.studentId;
    const userType = req.user.userType;

    const user = await userService.getUserInfo(userId, userType);

    res.success({
      valid: true,
      user,
      userType,
      tokenInfo: {
        userId: req.user.userId,
        studentId: req.user.studentId,
        name: req.user.name,
        role: req.user.role,
        userType: req.user.userType,
        iat: req.user.iat,
        exp: req.user.exp
      }
    }, '令牌验证成功');
  });

  /**
   * 获取认证统计信息（管理员功能）
   */
  static getAuthStats = asyncHandler(async (req, res) => {
    // 这里可以添加认证相关的统计信息
    const stats = {
      activeTokens: 'N/A', // 可以从JWT管理器获取
      loginAttempts: 'N/A', // 可以从日志中统计
      timestamp: new Date().toISOString()
    };

    res.success(stats, '获取认证统计成功');
  });
}

module.exports = AuthController;
