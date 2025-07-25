const UserService = require('../../services/UserService');
const UserRepository = require('../../repositories/UserRepository');
const { jwtManager } = require('../../utils/JWTManager');
const { cacheService } = require('../../services/CacheService');
const { AuthenticationError, NotFoundError, ConflictError } = require('../../utils/AppError');

// 模拟依赖
jest.mock('../../repositories/UserRepository');
jest.mock('../../utils/JWTManager');
jest.mock('../../services/CacheService');

describe('UserService', () => {
  let mockUserRepository;
  let mockJwtManager;
  let mockCacheService;

  beforeEach(() => {
    // 重置所有模拟
    jest.clearAllMocks();
    
    // 创建模拟实例
    mockUserRepository = {
      validateStudentPassword: jest.fn(),
      validateAdminPassword: jest.fn(),
      findStudentById: jest.fn(),
      findAdminById: jest.fn(),
      updateStudent: jest.fn(),
      updatePassword: jest.fn(),
      userExists: jest.fn(),
      findAllStudents: jest.fn(),
      createStudent: jest.fn(),
      createStudentsBatch: jest.fn(),
      getUserStats: jest.fn()
    };

    mockJwtManager = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      refreshAccessToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllUserTokens: jest.fn()
    };

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      delByPattern: jest.fn()
    };

    // 设置模拟返回值
    UserRepository.mockImplementation(() => mockUserRepository);
    jwtManager.generateAccessToken = mockJwtManager.generateAccessToken;
    jwtManager.generateRefreshToken = mockJwtManager.generateRefreshToken;
    jwtManager.refreshAccessToken = mockJwtManager.refreshAccessToken;
    jwtManager.revokeToken = mockJwtManager.revokeToken;
    jwtManager.revokeRefreshToken = mockJwtManager.revokeRefreshToken;
    jwtManager.revokeAllUserTokens = mockJwtManager.revokeAllUserTokens;
    cacheService.get = mockCacheService.get;
    cacheService.set = mockCacheService.set;
    cacheService.del = mockCacheService.del;
    cacheService.delByPattern = mockCacheService.delByPattern;
  });

  describe('loginStudent', () => {
    it('应该成功登录学生', async () => {
      // 准备测试数据
      const studentId = 'ST001';
      const password = 'password123';
      const studentData = {
        id: studentId,
        name: '张三',
        gender: '男',
        age: 22
      };

      // 设置模拟返回值
      mockUserRepository.validateStudentPassword.mockResolvedValue({
        valid: true,
        student: studentData
      });
      mockJwtManager.generateAccessToken.mockReturnValue('access-token');
      mockJwtManager.generateRefreshToken.mockReturnValue('refresh-token');
      mockCacheService.set.mockResolvedValue(true);

      // 执行测试
      const result = await UserService.loginStudent(studentId, password);

      // 验证结果
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: studentData
      });

      // 验证调用
      expect(mockUserRepository.validateStudentPassword).toHaveBeenCalledWith(studentId, password);
      expect(mockJwtManager.generateAccessToken).toHaveBeenCalledWith({
        userId: studentId,
        studentId: studentId,
        name: studentData.name,
        userType: 'student'
      });
      expect(mockJwtManager.generateRefreshToken).toHaveBeenCalledWith(studentId, 'student');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:student:${studentId}`,
        studentData,
        1800,
        'session'
      );
    });

    it('应该在密码错误时抛出认证错误', async () => {
      // 准备测试数据
      const studentId = 'ST001';
      const password = 'wrong-password';

      // 设置模拟返回值
      mockUserRepository.validateStudentPassword.mockResolvedValue({
        valid: false,
        student: null
      });

      // 执行测试并验证错误
      await expect(UserService.loginStudent(studentId, password))
        .rejects.toThrow(AuthenticationError);

      expect(mockUserRepository.validateStudentPassword).toHaveBeenCalledWith(studentId, password);
      expect(mockJwtManager.generateAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('loginAdmin', () => {
    it('应该成功登录管理员', async () => {
      // 准备测试数据
      const adminId = 'admin';
      const password = 'admin123';
      const adminData = {
        id: adminId,
        name: '系统管理员',
        role: 'admin'
      };

      // 设置模拟返回值
      mockUserRepository.validateAdminPassword.mockResolvedValue({
        valid: true,
        admin: adminData
      });
      mockJwtManager.generateAccessToken.mockReturnValue('admin-access-token');
      mockJwtManager.generateRefreshToken.mockReturnValue('admin-refresh-token');
      mockCacheService.set.mockResolvedValue(true);

      // 执行测试
      const result = await UserService.loginAdmin(adminId, password);

      // 验证结果
      expect(result).toEqual({
        accessToken: 'admin-access-token',
        refreshToken: 'admin-refresh-token',
        user: adminData
      });

      // 验证调用
      expect(mockUserRepository.validateAdminPassword).toHaveBeenCalledWith(adminId, password);
      expect(mockJwtManager.generateAccessToken).toHaveBeenCalledWith({
        userId: adminId,
        name: adminData.name,
        role: adminData.role,
        userType: 'admin'
      });
    });
  });

  describe('getUserInfo', () => {
    it('应该从缓存获取用户信息', async () => {
      // 准备测试数据
      const userId = 'ST001';
      const userType = 'student';
      const cachedUser = { id: userId, name: '张三' };

      // 设置模拟返回值
      mockCacheService.get.mockResolvedValue(cachedUser);

      // 执行测试
      const result = await UserService.getUserInfo(userId, userType);

      // 验证结果
      expect(result).toEqual(cachedUser);
      expect(mockCacheService.get).toHaveBeenCalledWith(`user:${userType}:${userId}`, 'session');
      expect(mockUserRepository.findStudentById).not.toHaveBeenCalled();
    });

    it('应该在缓存未命中时从数据库获取用户信息', async () => {
      // 准备测试数据
      const userId = 'ST001';
      const userType = 'student';
      const dbUser = { id: userId, name: '张三' };

      // 设置模拟返回值
      mockCacheService.get.mockResolvedValue(null);
      mockUserRepository.findStudentById.mockResolvedValue(dbUser);
      mockCacheService.set.mockResolvedValue(true);

      // 执行测试
      const result = await UserService.getUserInfo(userId, userType);

      // 验证结果
      expect(result).toEqual(dbUser);
      expect(mockCacheService.get).toHaveBeenCalledWith(`user:${userType}:${userId}`, 'session');
      expect(mockUserRepository.findStudentById).toHaveBeenCalledWith(userId);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `user:${userType}:${userId}`,
        dbUser,
        1800,
        'session'
      );
    });

    it('应该在用户不存在时抛出NotFoundError', async () => {
      // 准备测试数据
      const userId = 'NONEXISTENT';
      const userType = 'student';

      // 设置模拟返回值
      mockCacheService.get.mockResolvedValue(null);
      mockUserRepository.findStudentById.mockResolvedValue(null);

      // 执行测试并验证错误
      await expect(UserService.getUserInfo(userId, userType))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStudentProfile', () => {
    it('应该成功更新学生资料', async () => {
      // 准备测试数据
      const studentId = 'ST001';
      const updateData = { name: '新姓名', age: 23 };
      const existingStudent = { id: studentId, name: '旧姓名', age: 22 };
      const updatedStudent = { id: studentId, name: '新姓名', age: 23 };

      // 设置模拟返回值
      mockUserRepository.findStudentById.mockResolvedValue(existingStudent);
      mockUserRepository.updateStudent.mockResolvedValue(updatedStudent);
      mockCacheService.del.mockResolvedValue(true);

      // 执行测试
      const result = await UserService.updateStudentProfile(studentId, updateData);

      // 验证结果
      expect(result).toEqual(updatedStudent);
      expect(mockUserRepository.findStudentById).toHaveBeenCalledWith(studentId);
      expect(mockUserRepository.updateStudent).toHaveBeenCalledWith(studentId, updateData);
      expect(mockCacheService.del).toHaveBeenCalledWith(`user:student:${studentId}`, 'session');
    });

    it('应该在学生不存在时抛出NotFoundError', async () => {
      // 准备测试数据
      const studentId = 'NONEXISTENT';
      const updateData = { name: '新姓名' };

      // 设置模拟返回值
      mockUserRepository.findStudentById.mockResolvedValue(null);

      // 执行测试并验证错误
      await expect(UserService.updateStudentProfile(studentId, updateData))
        .rejects.toThrow(NotFoundError);

      expect(mockUserRepository.updateStudent).not.toHaveBeenCalled();
    });
  });

  describe('createStudent', () => {
    it('应该成功创建学生', async () => {
      // 准备测试数据
      const studentData = {
        id: 'ST002',
        name: '李四',
        password: 'password123'
      };
      const createdStudent = { ...studentData, password: undefined };

      // 设置模拟返回值
      mockUserRepository.findStudentById.mockResolvedValue(null);
      mockUserRepository.createStudent.mockResolvedValue(createdStudent);
      mockCacheService.delByPattern.mockResolvedValue(true);

      // 执行测试
      const result = await UserService.createStudent(studentData);

      // 验证结果
      expect(result).toEqual(createdStudent);
      expect(mockUserRepository.findStudentById).toHaveBeenCalledWith(studentData.id);
      expect(mockUserRepository.createStudent).toHaveBeenCalledWith(studentData);
      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('students:list:*', 'longTerm');
    });

    it('应该在学生ID已存在时抛出ConflictError', async () => {
      // 准备测试数据
      const studentData = { id: 'ST001', name: '张三' };
      const existingStudent = { id: 'ST001', name: '已存在的学生' };

      // 设置模拟返回值
      mockUserRepository.findStudentById.mockResolvedValue(existingStudent);

      // 执行测试并验证错误
      await expect(UserService.createStudent(studentData))
        .rejects.toThrow(ConflictError);

      expect(mockUserRepository.createStudent).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('应该成功登出用户', async () => {
      // 准备测试数据
      const userId = 'ST001';
      const token = 'access-token';
      const refreshToken = 'refresh-token';

      // 设置模拟返回值
      mockJwtManager.revokeToken.mockReturnValue(true);
      mockJwtManager.revokeRefreshToken.mockReturnValue(true);

      // 执行测试
      const result = await UserService.logout(userId, token, refreshToken);

      // 验证结果
      expect(result).toBe(true);
      expect(mockJwtManager.revokeToken).toHaveBeenCalledWith(token);
      expect(mockJwtManager.revokeRefreshToken).toHaveBeenCalledWith(refreshToken);
    });
  });
});
