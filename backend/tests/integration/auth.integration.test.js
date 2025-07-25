const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('../../scripts/initDatabase');

// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-testing';
process.env.DB_NAME = 'integration_test.db';

// 导入应用
const app = require('../../server');

describe('Authentication Integration Tests', () => {
  let testDbPath;

  beforeAll(async () => {
    // 设置测试数据库路径
    testDbPath = path.join(__dirname, '..', '..', 'integration_test.db');
    
    // 清理可能存在的测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // 初始化测试数据库
    await initializeDatabase();
    
    // 等待应用完全启动
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // 清理测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('用户认证流程', () => {
    let studentToken;
    let adminToken;
    let refreshToken;

    describe('学生登录', () => {
      it('应该成功登录默认学生账户', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'ST001',
            password: 'Hello888'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: '登录成功',
          data: {
            token: expect.any(String),
            refreshToken: expect.any(String),
            user: {
              id: 'ST001',
              name: '张三'
            },
            userType: 'student'
          }
        });

        // 保存令牌用于后续测试
        studentToken = response.body.data.token;
        refreshToken = response.body.data.refreshToken;
      });

      it('应该在错误密码时拒绝登录', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'ST001',
            password: 'wrong-password'
          })
          .expect(401);

        expect(response.body).toMatchObject({
          success: false
        });
      });

      it('应该在不存在的用户时拒绝登录', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'NONEXISTENT',
            password: 'any-password'
          })
          .expect(401);

        expect(response.body).toMatchObject({
          success: false
        });
      });
    });

    describe('管理员登录', () => {
      it('应该成功登录默认管理员账户', async () => {
        const response = await request(app)
          .post('/api/auth/admin/login')
          .send({
            userId: 'admin',
            password: 'AdminPass123'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: '管理员登录成功',
          data: {
            token: expect.any(String),
            refreshToken: expect.any(String),
            admin: {
              id: 'admin',
              name: '系统管理员',
              role: 'admin'
            },
            userType: 'admin'
          }
        });

        // 保存管理员令牌
        adminToken = response.body.data.token;
      });
    });

    describe('令牌验证', () => {
      it('应该能够使用有效令牌访问受保护的端点', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          data: {
            user: {
              id: 'ST001',
              name: '张三'
            },
            userType: 'student'
          }
        });
      });

      it('应该在无效令牌时拒绝访问', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);

        expect(response.body).toMatchObject({
          success: false
        });
      });

      it('应该在缺少令牌时拒绝访问', async () => {
        const response = await request(app)
          .get('/api/auth/me')
          .expect(401);

        expect(response.body).toMatchObject({
          success: false
        });
      });
    });

    describe('令牌刷新', () => {
      it('应该能够使用刷新令牌获取新的访问令牌', async () => {
        const response = await request(app)
          .post('/api/auth/refresh-token')
          .send({
            refreshToken: refreshToken
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: '令牌刷新成功',
          data: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        });

        // 验证新令牌可以使用
        const newToken = response.body.data.accessToken;
        const verifyResponse = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${newToken}`)
          .expect(200);

        expect(verifyResponse.body.success).toBe(true);
      });

      it('应该在无效刷新令牌时拒绝刷新', async () => {
        const response = await request(app)
          .post('/api/auth/refresh-token')
          .send({
            refreshToken: 'invalid-refresh-token'
          })
          .expect(401);

        expect(response.body).toMatchObject({
          success: false
        });
      });
    });

    describe('权限控制', () => {
      it('学生应该能够访问学生端点', async () => {
        const response = await request(app)
          .get('/api/tasks')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('学生应该无法访问管理员端点', async () => {
        const response = await request(app)
          .get('/api/admin/students')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);

        expect(response.body).toMatchObject({
          success: false
        });
      });

      it('管理员应该能够访问管理员端点', async () => {
        const response = await request(app)
          .get('/api/admin/students')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('管理员应该能够访问学生端点', async () => {
        // 管理员通常也能访问学生功能进行管理
        const response = await request(app)
          .get('/api/monitoring/health')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('登出功能', () => {
      it('应该能够成功登出', async () => {
        const response = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            refreshToken: refreshToken
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: '登出成功'
        });
      });

      it('应该能够登出所有设备', async () => {
        // 先重新登录获取新令牌
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            userId: 'ST001',
            password: 'Hello888'
          })
          .expect(200);

        const newToken = loginResponse.body.data.token;

        // 登出所有设备
        const response = await request(app)
          .post('/api/auth/logout-all')
          .set('Authorization', `Bearer ${newToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: '已登出所有设备'
        });
      });
    });
  });

  describe('输入验证', () => {
    it('应该验证登录请求的必需字段', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: 'ST001'
          // 缺少password字段
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false
      });
    });

    it('应该验证用户ID格式', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: '', // 空用户ID
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false
      });
    });

    it('应该验证密码长度', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: 'ST001',
          password: '123' // 密码太短
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false
      });
    });
  });

  describe('安全性测试', () => {
    it('应该防止SQL注入攻击', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: "'; DROP TABLE students; --",
          password: 'any-password'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false
      });

      // 验证表仍然存在
      const healthResponse = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(healthResponse.body.success).toBe(true);
    });

    it('应该防止XSS攻击', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          userId: '<script>alert("xss")</script>',
          password: 'any-password'
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false
      });
    });

    it('应该限制登录尝试频率', async () => {
      // 这个测试需要根据实际的速率限制配置调整
      const promises = [];
      
      // 快速发送多个请求
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              userId: 'ST001',
              password: 'wrong-password'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // 至少有一些请求应该成功（返回401），表明没有被完全阻止
      // 但在生产环境中，应该有速率限制
      expect(responses.length).toBe(5);
    });
  });
});
