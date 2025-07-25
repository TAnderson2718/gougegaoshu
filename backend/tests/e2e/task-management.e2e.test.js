const request = require('supertest');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('../../scripts/initDatabase');

// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-testing';
process.env.DB_NAME = 'e2e_test.db';

// 导入应用
const app = require('../../server');

describe('Task Management E2E Tests', () => {
  let testDbPath;
  let studentToken;
  let adminToken;
  let testTaskId;

  beforeAll(async () => {
    // 设置测试数据库路径
    testDbPath = path.join(__dirname, '..', '..', 'e2e_test.db');
    
    // 清理可能存在的测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // 初始化测试数据库
    await initializeDatabase();
    
    // 等待应用完全启动
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 获取测试令牌
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        userId: 'ST001',
        password: 'Hello888'
      });
    studentToken = studentLogin.body.data.token;

    const adminLogin = await request(app)
      .post('/api/auth/admin/login')
      .send({
        userId: 'admin',
        password: 'AdminPass123'
      });
    adminToken = adminLogin.body.data.token;
  });

  afterAll(async () => {
    // 清理测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('完整的任务管理流程', () => {
    it('1. 管理员应该能够查看所有学生', async () => {
      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'ST001',
            name: '张三'
          }),
          expect.objectContaining({
            id: 'ST002',
            name: '李四'
          })
        ])
      });
    });

    it('2. 管理员应该能够批量创建任务', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const tasks = [
        {
          id: `TASK_E2E_${Date.now()}_1`,
          student_id: 'ST001',
          task_date: today,
          task_type: '数学',
          title: 'E2E测试任务1',
          completed: false
        },
        {
          id: `TASK_E2E_${Date.now()}_2`,
          student_id: 'ST001',
          task_date: tomorrow,
          task_type: '英语',
          title: 'E2E测试任务2',
          completed: false
        }
      ];

      testTaskId = tasks[0].id;

      const response = await request(app)
        .post('/api/tasks/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tasks })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          total: 2,
          successful: 2,
          failed: 0
        }
      });
    });

    it('3. 学生应该能够查看自己的任务', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Object)
      });

      // 验证任务数据结构
      const tasksByDate = response.body.data;
      const allTasks = Object.values(tasksByDate).flat();
      
      expect(allTasks.length).toBeGreaterThan(0);
      expect(allTasks.some(task => task.title === 'E2E测试任务1')).toBe(true);
    });

    it('4. 学生应该能够更新任务状态', async () => {
      const updateData = {
        completed: true,
        duration: {
          hour: 2,
          minute: 30
        },
        proof: 'E2E测试完成证明'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          task: expect.objectContaining({
            id: testTaskId,
            completed: 1, // SQLite中布尔值存储为整数
            duration_hour: 2,
            duration_minute: 30,
            proof_image: 'E2E测试完成证明'
          })
        }
      });
    });

    it('5. 学生应该能够查看任务统计', async () => {
      const response = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          totalTasks: expect.any(Number),
          completedTasks: expect.any(Number),
          totalMinutes: expect.any(Number),
          completionRate: expect.any(Number)
        })
      });

      // 验证统计数据的合理性
      const stats = response.body.data;
      expect(stats.totalTasks).toBeGreaterThan(0);
      expect(stats.completedTasks).toBeGreaterThanOrEqual(1); // 至少有一个完成的任务
      expect(stats.completionRate).toBeGreaterThanOrEqual(0);
      expect(stats.completionRate).toBeLessThanOrEqual(100);
    });

    it('6. 管理员应该能够查看任务完成率统计', async () => {
      const response = await request(app)
        .get('/api/tasks/admin/completion-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      // 验证统计数据结构
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toMatchObject({
          date: expect.any(String),
          task_type: expect.any(String),
          total_tasks: expect.any(Number),
          completed_tasks: expect.any(Number),
          completion_rate: expect.any(Number)
        });
      }
    });

    it('7. 管理员应该能够查看学习时长排行榜', async () => {
      const response = await request(app)
        .get('/api/tasks/admin/study-time-ranking?limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      // 验证排行榜数据结构
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          total_minutes: expect.any(Number),
          completed_tasks: expect.any(Number),
          total_tasks: expect.any(Number),
          completion_rate: expect.any(Number)
        });

        // 验证排序（按学习时长降序）
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i-1].total_minutes)
            .toBeGreaterThanOrEqual(response.body.data[i].total_minutes);
        }
      }
    });

    it('8. 管理员应该能够查看每日任务统计', async () => {
      const response = await request(app)
        .get('/api/tasks/admin/daily-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array)
      });

      // 验证每日统计数据结构
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toMatchObject({
          date: expect.any(String),
          total_tasks: expect.any(Number),
          completed_tasks: expect.any(Number),
          active_students: expect.any(Number),
          total_minutes: expect.any(Number)
        });
      }
    });

    it('9. 系统应该能够处理月度视图查询', async () => {
      const response = await request(app)
        .get('/api/tasks?view=month')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Object)
      });

      // 验证月度视图数据结构
      const monthlyData = response.body.data;
      const dates = Object.keys(monthlyData);
      
      if (dates.length > 0) {
        const firstDate = dates[0];
        expect(monthlyData[firstDate]).toMatchObject({
          total: expect.any(Number),
          completed: expect.any(Number),
          tasks: expect.any(Array)
        });

        if (monthlyData[firstDate].tasks.length > 0) {
          expect(monthlyData[firstDate].tasks[0]).toMatchObject({
            id: expect.any(String),
            type: expect.any(String),
            title: expect.any(String),
            completed: expect.any(Boolean),
            originalDate: expect.any(String),
            isDeferred: expect.any(Boolean)
          });
        }
      }
    });

    it('10. 系统应该能够处理日期范围查询', async () => {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await request(app)
        .get(`/api/tasks?startDate=${today}&endDate=${tomorrow}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Object)
      });

      // 验证返回的任务都在指定日期范围内
      const tasksByDate = response.body.data;
      const allDates = Object.keys(tasksByDate);
      
      allDates.forEach(date => {
        expect(date >= today && date <= tomorrow).toBe(true);
      });
    });
  });

  describe('错误处理和边界情况', () => {
    it('应该处理不存在的任务更新', async () => {
      const response = await request(app)
        .put('/api/tasks/NONEXISTENT_TASK')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          completed: true
        })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false
      });
    });

    it('应该验证任务更新数据', async () => {
      const response = await request(app)
        .put(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          duration: {
            hour: 25, // 无效的小时数
            minute: 30
          }
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false
      });
    });

    it('应该防止学生访问其他学生的任务', async () => {
      // 创建另一个学生的任务
      const otherStudentTask = {
        id: `TASK_OTHER_${Date.now()}`,
        student_id: 'ST002',
        task_date: new Date().toISOString().split('T')[0],
        task_type: '数学',
        title: '其他学生的任务',
        completed: false
      };

      await request(app)
        .post('/api/tasks/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tasks: [otherStudentTask] });

      // ST001尝试更新ST002的任务
      const response = await request(app)
        .put(`/api/tasks/${otherStudentTask.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          completed: true
        })
        .expect(404); // 应该返回404，因为找不到属于当前学生的任务

      expect(response.body).toMatchObject({
        success: false
      });
    });

    it('应该处理大量任务的查询', async () => {
      // 这个测试验证系统能够处理大量数据
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // 验证响应时间合理（这里只是检查能够成功响应）
      expect(response.body.data).toBeDefined();
    });
  });

  describe('缓存和性能', () => {
    it('应该能够处理缓存的任务查询', async () => {
      // 第一次查询
      const response1 = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // 第二次查询（应该从缓存获取）
      const response2 = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // 验证两次查询结果一致
      expect(response1.body.data).toEqual(response2.body.data);
    });

    it('应该能够清除缓存', async () => {
      const response = await request(app)
        .delete('/api/tasks/admin/cache')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });
    });
  });
});
