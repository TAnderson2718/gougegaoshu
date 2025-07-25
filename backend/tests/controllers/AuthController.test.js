const request = require('supertest');
const express = require('express');
const AuthController = require('../../controllers/AuthController');
const userService = require('../../services/UserService');
const { createResponseHandler } = require('../../utils/ResponseHandler');

// 模拟用户服务
jest.mock('../../services/UserService');

describe('AuthController', () => {
  let app;

  beforeEach(() => {
    // 创建测试应用
    app = express();
    app.use(express.json());
    app.use(createResponseHandler());

    // 设置路由
    app.post('/login', AuthController.login);
    app.post('/admin/login', AuthController.adminLogin);
    app.post('/student/login', AuthController.studentLogin);
    app.post('/refresh-token', AuthController.refreshToken);
    
    // 模拟认证中间件
    app.use('/protected', (req, res, next) => {
      req.user = {
        userId: 'TEST001',
        studentId: 'TEST001',
        name: '测试用户',
        userType: 'student'
      };
      req.token = 'test-token';
      next();
    });
    
    app.post('/protected/logout', AuthController.logout);
    app.post('/protected/logout-all', AuthController.logoutAll);
    app.post('/protected/change-password', AuthController.changePassword);
    app.get('/protected/me', AuthController.getCurrentUser);

    // 清除所有模拟
    jest.clearAllMocks();
  });

  describe('POST /login', () => {
    it('应该成功登录用户', async () => {
      // 准备测试数据
      const loginData = {
        userId: 'ST001',
        password: 'password123'
      };

      const mockResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'ST001',
          name: '张三',
          userType: 'student'
        }
      };

      // 设置模拟返回值
      userService.login.mockResolvedValue(mockResult);

      // 执行测试
      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(200);

      // 验证响应
      expect(response.body).toMatchObject({
        success: true,
        message: '登录成功',
        data: {
          token: 'access-token',
          refreshToken: 'refresh-token',
          user: mockResult.user,
          userType: 'student'
        }
      });

      // 验证服务调用
      expect(userService.login).toHaveBeenCalledWith('ST001', 'password123');
    });

    it('应该在登录失败时返回错误', async () => {
      // 准备测试数据
      const loginData = {
        userId: 'ST001',
        password: 'wrong-password'
      };

      // 设置模拟抛出错误
      const error = new Error('用户名或密码错误');
      userService.login.mockRejectedValue(error);

      // 执行测试
      const response = await request(app)
        .post('/login')
        .send(loginData)
        .expect(500);

      // 验证响应
      expect(response.body).toMatchObject({
        success: false
      });
    });

    it('应该在缺少必需字段时返回验证错误', async () => {
      // 执行测试 - 缺少password字段
      const response = await request(app)
        .post('/login')
        .send({ userId: 'ST001' })
        .expect(400);

      // 验证响应
      expect(response.body).toMatchObject({
        success: false
      });

      // 验证服务未被调用
      expect(userService.login).not.toHaveBeenCalled();
    });
  });

  describe('POST /admin/login', () => {
    it('应该成功登录管理员', async () => {
      // 准备测试数据
      const loginData = {
        userId: 'admin',
        password: 'admin123'
      };

      const mockResult = {
        accessToken: 'admin-access-token',
        refreshToken: 'admin-refresh-token',
        user: {
          id: 'admin',
          name: '系统管理员',
          role: 'admin'
        }
      };

      // 设置模拟返回值
      userService.loginAdmin.mockResolvedValue(mockResult);

      // 执行测试
      const response = await request(app)
        .post('/admin/login')
        .send(loginData)
        .expect(200);

      // 验证响应
      expect(response.body).toMatchObject({
        success: true,
        message: '管理员登录成功',
        data: {
          token: 'admin-access-token',
          refreshToken: 'admin-refresh-token',
          admin: mockResult.user,
          userType: 'admin'
        }
      });

      // 验证服务调用
      expect(userService.loginAdmin).toHaveBeenCalledWith('admin', 'admin123');
    });
  });

  describe('POST /student/login', () => {
    it('应该成功登录学生', async () => {
      // 准备测试数据
      const loginData = {
        userId: 'ST001',
        password: 'student123'
      };

      const mockResult = {
        accessToken: 'student-access-token',
        refreshToken: 'student-refresh-token',
        user: {
          id: 'ST001',
          name: '张三'
        }
      };

      // 设置模拟返回值
      userService.loginStudent.mockResolvedValue(mockResult);

      // 执行测试
      const response = await request(app)
        .post('/student/login')
        .send(loginData)
        .expect(200);

      // 验证响应
      expect(response.body).toMatchObject({
        success: true,
        message: '学生登录成功',
        data: {
          token: 'student-access-token',
          refreshToken: 'student-refresh-token',
          student: mockResult.user,
          userType: 'student'
        }
      });

      // 验证服务调用
      expect(userService.loginStudent).toHaveBeenCalledWith('ST001', 'student123');
    });
  });

  describe('POST /refresh-token', () => {
    it('应该成功刷新访问令牌', async () => {
      // 准备测试数据
      const refreshData = {
        refreshToken: 'valid-refresh-token'
      };

      const mockResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      // 设置模拟返回值
      userService.refreshAccessToken.mockResolvedValue(mockResult);

      // 执行测试
      const response = await request(app)
        .post('/refresh-token')
        .send(refreshData)
        .expect(200);

      // 验证响应
      expect(response.body).toMatchObject({
        success: true,
        message: '令牌刷新成功',
        data: mockResult
      });

      // 验证服务调用
      expect(userService.refreshAccessToken).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('应该在缺少刷新令牌时返回验证错误', async () => {
      // 执行测试
      const response = await request(app)
        .post('/refresh-token')
        .send({})
        .expect(400);

      // 验证响应
      expect(response.body).toMatchObject({
        success: false
      });

      // 验证服务未被调用
      expect(userService.refreshAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('POST /protected/logout', () => {
    it('应该成功登出用户', async () => {
      // 准备测试数据
      const logoutData = {
        refreshToken: 'refresh-token'
      };

      // 设置模拟返回值
      userService.logout.mockResolvedValue(true);

      // 执行测试
      const response = await request(app)
        .post('/protected/logout')
        .send(logoutData)
        .expect(200);

      // 验证响应
      expect(response.body).toMatchObject({
        success: true,
        message: '登出成功'
      });

      // 验证服务调用
      expect(userService.logout).toHaveBeenCalledWith('TEST001', 'test-token', 'refresh-token');
    });
  });

  describe('POST /protected/logout-all', () => {
    it('应该成功登出所有设备', async () => {
      // 设置模拟返回值
      userService.logoutAll.mockResolvedValue(true);

      // 执行测试
      const response = await request(app)
        .post('/protected/logout-all')
        .expect(200);

      // 验证响应
      expect(response.body).toMatchObject({
        success: true,
        message: '已登出所有设备'
      });

      // 验证服务调用
      expect(userService.logoutAll).toHaveBeenCalledWith('TEST001');
    });
  });

  describe('POST /protected/change-password', () => {
    it('应该成功修改密码', async () => {
      // 准备测试数据
      const passwordData = {
        oldPassword: 'old-password',
        newPassword: 'new-password'
      };

      // 设置模拟返回值
      userService.changePassword.mockResolvedValue(true);

      // 执行测试
      const response = await request(app)
        .post('/protected/change-password')
        .send(passwordData)
        .expect(200);

      // 验证响应
      expect(response.body).toMatchObject({
        success: true,
        message: '密码修改成功'
      });

      // 验证服务调用
      expect(userService.changePassword).toHaveBeenCalledWith(
        'TEST001',
        'old-password',
        'new-password',
        'student'
      );
    });
  });

  describe('GET /protected/me', () => {
    it('应该成功获取当前用户信息', async () => {
      // 准备测试数据
      const mockUser = {
        id: 'TEST001',
        name: '测试用户',
        email: 'test@example.com'
      };

      // 设置模拟返回值
      userService.getUserInfo.mockResolvedValue(mockUser);

      // 执行测试
      const response = await request(app)
        .get('/protected/me')
        .expect(200);

      // 验证响应
      expect(response.body).toMatchObject({
        success: true,
        message: '获取用户信息成功',
        data: {
          user: mockUser,
          userType: 'student'
        }
      });

      // 验证服务调用
      expect(userService.getUserInfo).toHaveBeenCalledWith('TEST001', 'student');
    });
  });
});
