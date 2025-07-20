/**
 * 中间件模块测试
 * 测试认证中间件、管理员权限、密码修改检查等中间件功能
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { query } = require('../config/database');

describe('中间件模块测试', () => {
  let validToken;
  let adminToken;
  let expiredToken;
  let forceChangeToken;

  beforeAll(async () => {
    // 生成各种测试token
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

    expiredToken = jwt.sign(
      { studentId: 'ST001' },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' } // 已过期
    );

    forceChangeToken = jwt.sign(
      { studentId: 'ST002' }, // ST002需要强制修改密码
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('认证中间件测试', () => {
    test('Happy Path - 有效token通过认证', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Error Handling - 无Authorization头', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });

    test('Error Handling - 格式错误的Authorization头', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('Error Handling - 无效token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid_token_string');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('Error Handling - 过期token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('Error Handling - 用户不存在的token', async () => {
      const nonExistentUserToken = jwt.sign(
        { studentId: 'NONEXISTENT' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${nonExistentUserToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户不存在');
    });

    test('Edge Case - 空Bearer token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('Edge Case - 只有Bearer没有token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });
  });

  describe('管理员权限中间件测试', () => {
    test('Happy Path - 管理员ID通过权限检查', async () => {
      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Error Handling - 普通用户被拒绝', async () => {
      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${validToken}`); // ST001不是管理员

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('需要管理员权限');
    });

    test('Error Handling - 无token访问管理员接口', async () => {
      const response = await request(app)
        .get('/api/admin/students');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });

    test('Edge Case - 验证管理员ID列表', async () => {
      // 测试ADMIN002也应该有管理员权限
      const admin002Token = jwt.sign(
        { studentId: 'ADMIN002' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // 先创建ADMIN002用户
      await query('INSERT IGNORE INTO students (id, name, password) VALUES (?, ?, ?)', 
        ['ADMIN002', '管理员2', 'hashedpass']);

      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${admin002Token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 清理测试数据
      await query('DELETE FROM students WHERE id = ?', ['ADMIN002']);
    });
  });

  describe('密码修改检查中间件测试', () => {
    test('Happy Path - 已修改密码的用户正常访问', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${validToken}`); // ST001已修改密码

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Error Handling - 需要强制修改密码的用户被拦截', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${forceChangeToken}`); // ST002需要修改密码

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('请先修改初始密码');
      expect(response.body.requirePasswordChange).toBe(true);
    });

    test('Happy Path - 强制修改密码接口不被拦截', async () => {
      const response = await request(app)
        .post('/api/auth/force-change-password')
        .set('Authorization', `Bearer ${forceChangeToken}`)
        .send({
          newPassword: 'NewPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Edge Case - 管理员不受密码修改检查影响', async () => {
      // 设置管理员需要强制修改密码
      await query('UPDATE students SET force_password_change = TRUE WHERE id = ?', ['ADMIN001']);

      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      // 管理员接口不应该被密码修改检查拦截
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // 恢复管理员状态
      await query('UPDATE students SET force_password_change = FALSE WHERE id = ?', ['ADMIN001']);
    });
  });

  describe('中间件组合测试', () => {
    test('认证 + 权限检查组合', async () => {
      // 无token访问管理员接口
      const response1 = await request(app)
        .get('/api/admin/students');
      expect(response1.status).toBe(401); // 先被认证中间件拦截

      // 普通用户访问管理员接口
      const response2 = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${validToken}`);
      expect(response2.status).toBe(403); // 被权限中间件拦截
      expect(response2.body.message).toBe('需要管理员权限');
    });

    test('认证 + 密码修改检查组合', async () => {
      // 无token访问需要密码检查的接口
      const response1 = await request(app)
        .get('/api/tasks');
      expect(response1.status).toBe(401); // 先被认证中间件拦截

      // 需要修改密码的用户访问
      const response2 = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${forceChangeToken}`);
      expect(response2.status).toBe(403); // 被密码检查中间件拦截
      expect(response2.body.requirePasswordChange).toBe(true);
    });

    test('全部中间件通过的正常流程', async () => {
      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('错误处理和边界情况', () => {
    test('JWT密钥错误处理', async () => {
      // 使用错误密钥生成的token
      const wrongSecretToken = jwt.sign(
        { studentId: 'ST001' },
        'wrong_secret_key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('畸形JWT token处理', async () => {
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature';

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${malformedToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('超长token处理', async () => {
      const veryLongToken = 'a'.repeat(10000); // 超长字符串

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${veryLongToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('特殊字符token处理', async () => {
      const specialCharToken = 'token@#$%^&*()_+{}|:"<>?[]\\;\',./"';

      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${specialCharToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });
  });
});
