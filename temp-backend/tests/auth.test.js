/**
 * 认证系统模块测试
 * 测试用户登录、密码修改、token验证等功能
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../server');
const { query } = require('../config/database');

describe('认证系统模块测试', () => {
  let validToken;
  let adminToken;

  beforeAll(async () => {
    // 生成有效的测试token
    validToken = jwt.sign(
      { studentId: 'ST001' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { studentId: 'ADMIN001' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/auth/login - 用户登录', () => {
    test('Happy Path - 正确凭据登录成功', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'ST001',
          password: 'TestPass123'
        });



      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('登录成功');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('student');
      expect(response.body.data.student.id).toBe('ST001');
      expect(response.body.data.student.name).toBe('测试学生1');
    });

    test('Edge Case - 空用户ID', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: '',
          password: 'TestPass123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('学生ID不能为空');
    });

    test('Edge Case - 空密码', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'ST001',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('密码不能为空');
    });

    test('Error Handling - 不存在的用户', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'INVALID',
          password: 'TestPass123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('学生ID或密码错误');
    });

    test('Error Handling - 错误密码', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'ST001',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('学生ID或密码错误');
    });

    test('Edge Case - 用户ID大小写转换', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'st001', // 小写
          password: 'TestPass123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.student.id).toBe('ST001');
    });
  });

  describe('POST /api/auth/force-change-password - 强制修改密码', () => {
    test('Happy Path - 有效新密码修改成功', async () => {
      const response = await request(app)
        .post('/api/auth/force-change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          newPassword: 'NewPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('密码修改成功');

      // 验证密码确实被修改
      const students = await query('SELECT password FROM students WHERE id = ?', ['ST001']);
      const isNewPassword = await bcrypt.compare('NewPassword123', students[0].password);
      expect(isNewPassword).toBe(true);
    });

    test('Edge Case - 密码长度不足', async () => {
      const response = await request(app)
        .post('/api/auth/force-change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          newPassword: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('新密码长度不能少于6位');
    });

    test('Error Handling - 无token', async () => {
      const response = await request(app)
        .post('/api/auth/force-change-password')
        .send({
          newPassword: 'NewPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });

    test('Error Handling - 无效token', async () => {
      const response = await request(app)
        .post('/api/auth/force-change-password')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          newPassword: 'NewPassword123'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('Edge Case - 空密码', async () => {
      const response = await request(app)
        .post('/api/auth/force-change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          newPassword: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('新密码长度不能少于6位');
    });
  });

  describe('POST /api/auth/change-password - 修改密码', () => {
    test('Happy Path - 正确旧密码修改成功', async () => {
      // 创建一个专门的测试用户，避免影响其他测试
      const bcrypt = require('bcrypt');
      const testPassword = await bcrypt.hash('TestPass123', 10);

      // 插入临时测试用户
      await query('INSERT IGNORE INTO students (id, name, password, force_password_change) VALUES (?, ?, ?, ?)',
        ['TEMP_USER', '临时测试用户', testPassword, false]);

      // 先登录获取有效token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          studentId: 'TEMP_USER',
          password: 'TestPass123'
        });

      expect(loginResponse.status).toBe(200);
      const freshToken = loginResponse.body.data.token;

      // 使用新token修改密码
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({
          oldPassword: 'TestPass123',
          newPassword: 'NewPassword456'
        });

      // 调试信息
      if (response.status !== 200) {
        console.log('🐛 密码修改失败调试信息:');
        console.log('状态码:', response.status);
        console.log('响应体:', response.body);
      }

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('密码修改成功');

      // 清理临时测试用户
      await query('DELETE FROM students WHERE id = ?', ['TEMP_USER']);
    });

    test('Error Handling - 错误旧密码', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          oldPassword: 'WrongOldPassword',
          newPassword: 'NewPassword456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('旧密码错误');
    });

    test('Edge Case - 新密码长度不足', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          oldPassword: 'TestPass123',
          newPassword: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('新密码长度不能少于6位');
    });
  });

  describe('GET /api/auth/verify - Token验证', () => {
    test('Happy Path - 有效token验证成功', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('student');
      expect(response.body.data.student.studentId).toBe('ST001');
    });

    test('Error Handling - 过期token', async () => {
      const expiredToken = jwt.sign(
        { studentId: 'ST001' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // 已过期
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('Error Handling - 无token', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });

    test('Error Handling - 格式错误的token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });
  });
});
