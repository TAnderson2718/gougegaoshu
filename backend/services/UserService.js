const UserRepository = require('../repositories/UserRepository');
const { jwtManager } = require('../utils/JWTManager');
const { cacheService } = require('./CacheService');
const { ValidationError, AuthenticationError, NotFoundError, ConflictError } = require('../utils/AppError');
const logger = require('../utils/Logger');

/**
 * 用户服务类
 * 处理用户相关的业务逻辑
 */
class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * 学生登录
   */
  async loginStudent(studentId, password) {
    try {
      // 验证密码
      const { valid, student } = await this.userRepository.validateStudentPassword(studentId, password);
      
      if (!valid) {
        throw new AuthenticationError('学生ID或密码错误', 'INVALID_CREDENTIALS');
      }

      // 生成JWT令牌
      const accessToken = jwtManager.generateAccessToken({
        userId: student.id,
        studentId: student.id,
        name: student.name,
        userType: 'student'
      });

      const refreshToken = jwtManager.generateRefreshToken(student.id, 'student');

      // 缓存用户信息
      await cacheService.set(`user:student:${student.id}`, student, 1800, 'session');

      logger.logAuth('student_login', studentId, true, {
        name: student.name
      });

      return {
        accessToken,
        refreshToken,
        user: student
      };
    } catch (error) {
      logger.logAuth('student_login', studentId, false, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 管理员登录
   */
  async loginAdmin(adminId, password) {
    try {
      // 验证密码
      const { valid, admin } = await this.userRepository.validateAdminPassword(adminId, password);
      
      if (!valid) {
        throw new AuthenticationError('管理员ID或密码错误', 'INVALID_CREDENTIALS');
      }

      // 生成JWT令牌
      const accessToken = jwtManager.generateAccessToken({
        userId: admin.id,
        name: admin.name,
        role: admin.role,
        userType: 'admin'
      });

      const refreshToken = jwtManager.generateRefreshToken(admin.id, 'admin');

      // 缓存管理员信息
      await cacheService.set(`user:admin:${admin.id}`, admin, 1800, 'session');

      logger.logAuth('admin_login', adminId, true, {
        name: admin.name,
        role: admin.role
      });

      return {
        accessToken,
        refreshToken,
        user: admin
      };
    } catch (error) {
      logger.logAuth('admin_login', adminId, false, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 统一登录方法
   */
  async login(userId, password) {
    // 首先尝试管理员登录
    if (userId.toLowerCase() === 'admin' || userId.startsWith('ADMIN')) {
      return await this.loginAdmin(userId, password);
    }
    
    // 然后尝试学生登录
    return await this.loginStudent(userId, password);
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(userId, userType) {
    const cacheKey = `user:${userType}:${userId}`;
    
    // 尝试从缓存获取
    let user = await cacheService.get(cacheKey, 'session');
    
    if (!user) {
      // 从数据库获取
      if (userType === 'admin') {
        user = await this.userRepository.findAdminById(userId);
      } else {
        user = await this.userRepository.findStudentById(userId);
      }
      
      if (!user) {
        throw new NotFoundError('用户', userId);
      }
      
      // 缓存用户信息
      await cacheService.set(cacheKey, user, 1800, 'session');
    }
    
    return user;
  }

  /**
   * 更新学生信息
   */
  async updateStudentProfile(studentId, updateData) {
    // 验证学生是否存在
    const existingStudent = await this.userRepository.findStudentById(studentId);
    if (!existingStudent) {
      throw new NotFoundError('学生', studentId);
    }

    // 更新学生信息
    const updatedStudent = await this.userRepository.updateStudent(studentId, updateData);
    
    if (!updatedStudent) {
      throw new Error('更新学生信息失败');
    }

    // 清除缓存
    await cacheService.del(`user:student:${studentId}`, 'session');

    logger.logBusiness('student_profile_updated', studentId, {
      fields: Object.keys(updateData)
    });

    return updatedStudent;
  }

  /**
   * 修改密码
   */
  async changePassword(userId, oldPassword, newPassword, userType = 'student') {
    // 验证旧密码
    let validationResult;
    if (userType === 'admin') {
      validationResult = await this.userRepository.validateAdminPassword(userId, oldPassword);
    } else {
      validationResult = await this.userRepository.validateStudentPassword(userId, oldPassword);
    }

    if (!validationResult.valid) {
      throw new AuthenticationError('旧密码错误', 'INVALID_OLD_PASSWORD');
    }

    // 更新密码
    const success = await this.userRepository.updatePassword(userId, newPassword, userType);
    
    if (!success) {
      throw new Error('密码更新失败');
    }

    // 撤销用户所有令牌
    jwtManager.revokeAllUserTokens(userId);

    // 清除用户缓存
    await cacheService.del(`user:${userType}:${userId}`, 'session');

    logger.logBusiness('password_changed', userId, { userType });

    return true;
  }

  /**
   * 强制修改密码（管理员功能）
   */
  async forceChangePassword(userId, newPassword, userType = 'student') {
    // 验证用户是否存在
    const userExists = await this.userRepository.userExists(userId, userType);
    if (!userExists) {
      throw new NotFoundError('用户', userId);
    }

    // 更新密码
    const success = await this.userRepository.updatePassword(userId, newPassword, userType);
    
    if (!success) {
      throw new Error('密码更新失败');
    }

    // 撤销用户所有令牌
    jwtManager.revokeAllUserTokens(userId);

    // 清除用户缓存
    await cacheService.del(`user:${userType}:${userId}`, 'session');

    logger.logBusiness('password_force_changed', userId, { userType });

    return true;
  }

  /**
   * 获取所有学生
   */
  async getAllStudents(options = {}) {
    const cacheKey = `students:list:${JSON.stringify(options)}`;
    
    // 尝试从缓存获取
    let result = await cacheService.get(cacheKey, 'longTerm');
    
    if (!result) {
      result = await this.userRepository.findAllStudents(options);
      
      // 缓存结果
      await cacheService.set(cacheKey, result, 600, 'longTerm');
    }
    
    return result;
  }

  /**
   * 创建学生
   */
  async createStudent(studentData) {
    // 检查学生ID是否已存在
    const existingStudent = await this.userRepository.findStudentById(studentData.id);
    if (existingStudent) {
      throw new ConflictError(`学生ID ${studentData.id} 已存在`);
    }

    // 创建学生
    const student = await this.userRepository.createStudent(studentData);
    
    if (!student) {
      throw new Error('创建学生失败');
    }

    // 清除相关缓存
    await cacheService.delByPattern('students:list:*', 'longTerm');

    return student;
  }

  /**
   * 批量创建学生
   */
  async createStudentsBatch(studentsData) {
    const result = await this.userRepository.createStudentsBatch(studentsData);
    
    // 清除相关缓存
    await cacheService.delByPattern('students:list:*', 'longTerm');
    
    return result;
  }

  /**
   * 获取用户统计信息
   */
  async getUserStats() {
    const cacheKey = 'users:stats';
    
    // 尝试从缓存获取
    let stats = await cacheService.get(cacheKey, 'main');
    
    if (!stats) {
      stats = await this.userRepository.getUserStats();
      
      // 缓存统计信息
      await cacheService.set(cacheKey, stats, 300, 'main');
    }
    
    return stats;
  }

  /**
   * 登出
   */
  async logout(userId, token, refreshToken = null) {
    // 撤销访问令牌
    jwtManager.revokeToken(token);
    
    // 撤销刷新令牌
    if (refreshToken) {
      jwtManager.revokeRefreshToken(refreshToken);
    }

    logger.logAuth('user_logout', userId, true);

    return true;
  }

  /**
   * 登出所有设备
   */
  async logoutAll(userId) {
    // 撤销用户所有令牌
    jwtManager.revokeAllUserTokens(userId);

    logger.logAuth('user_logout_all', userId, true);

    return true;
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(refreshToken) {
    try {
      const tokens = jwtManager.refreshAccessToken(refreshToken);
      
      logger.logAuth('token_refreshed', 'system', true);
      
      return tokens;
    } catch (error) {
      logger.logAuth('token_refresh_failed', 'system', false, {
        error: error.message
      });
      throw new AuthenticationError('刷新令牌无效或已过期', 'INVALID_REFRESH_TOKEN');
    }
  }

  /**
   * 验证用户权限
   */
  async validateUserPermission(userId, userType, requiredRole = null) {
    const user = await this.getUserInfo(userId, userType);
    
    if (!user) {
      throw new AuthenticationError('用户不存在', 'USER_NOT_FOUND');
    }

    if (requiredRole && userType === 'admin' && user.role !== requiredRole) {
      throw new AuthenticationError('权限不足', 'INSUFFICIENT_PERMISSIONS');
    }

    return user;
  }
}

// 创建单例实例
const userService = new UserService();

module.exports = userService;
