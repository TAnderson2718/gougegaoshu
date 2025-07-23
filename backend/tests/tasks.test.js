/**
 * 任务管理模块测试
 * 测试任务获取、更新、请假申请等功能
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { query } = require('../config/database');

describe('任务管理模块测试', () => {
  let validToken;
  let st002Token;

  beforeAll(async () => {
    // 生成有效的测试token
    validToken = jwt.sign(
      { studentId: 'ST001' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    st002Token = jwt.sign(
      { studentId: 'ST002' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/tasks - 获取任务列表', () => {
    test('Happy Path - 获取所有任务', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data['2024-01-01']).toBeDefined();
      expect(response.body.data['2024-01-01']).toHaveLength(2); // ST001有2个任务
    });

    test('Happy Path - 按日期范围获取任务', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Object);
    });

    test('Edge Case - 新用户无任务数据', async () => {
      // 创建一个新用户token
      const newUserToken = jwt.sign(
        { studentId: 'ST999' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // 先创建用户 (设置为不需要强制修改密码)
      await query('INSERT INTO students (id, name, password, force_password_change) VALUES (?, ?, ?, ?)', 
        ['ST999', '新用户', 'hashedpass', false]);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual({});

      // 清理测试数据
      await query('DELETE FROM students WHERE id = ?', ['ST999']);
    });

    test('Error Handling - 无效token', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('Edge Case - 只获取指定开始日期后的任务', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .query({ startDate: '2024-01-01' })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/tasks/:taskId - 更新任务状态', () => {
    test('Happy Path - 完成任务', async () => {
      const response = await request(app)
        .put('/api/tasks/task-st001-2024-01-01-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          completed: true,
          duration: { hour: 2, minute: 30 }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('任务更新成功');

      // 验证数据库中的更新
      const tasks = await query('SELECT completed, duration_hour, duration_minute FROM tasks WHERE id = ?', 
        ['task-st001-2024-01-01-1']);
      expect(tasks[0].completed).toBe(1);
      expect(tasks[0].duration_hour).toBe(2);
      expect(tasks[0].duration_minute).toBe(30);
    });

    test('Happy Path - 添加完成证明', async () => {
      const proofData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

      const response = await request(app)
        .put('/api/tasks/task-st001-2024-01-01-2')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          proof: proofData
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('任务更新成功');
    });

    test('Edge Case - 空更新', async () => {
      const response = await request(app)
        .put('/api/tasks/task-st001-2024-01-01-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('没有要更新的字段');
    });

    test('Error Handling - 不存在的任务', async () => {
      const response = await request(app)
        .put('/api/tasks/invalid-task-id')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          completed: true
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('任务不存在或无权限');
    });

    test('Error Handling - 他人任务', async () => {
      const response = await request(app)
        .put('/api/tasks/task-st002-2024-01-01-1') // ST002的任务
        .set('Authorization', `Bearer ${validToken}`) // 但用ST001的token
        .send({
          completed: true
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('任务不存在或无权限');
    });

    test('Happy Path - 只更新完成状态', async () => {
      const response = await request(app)
        .put('/api/tasks/task-st001-2024-01-01-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          completed: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/tasks/leave - 请假申请', () => {
    test('Happy Path - 有效日期请假', async () => {
      // 使用未来的日期
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/tasks/leave')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          date: futureDateStr
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('请假申请成功');

      // 验证请假记录被创建
      const leaveRecords = await query('SELECT * FROM leave_records WHERE student_id = ? AND leave_date = ?',
        ['ST001', futureDateStr]);
      expect(leaveRecords).toHaveLength(1);

      // 验证请假任务被创建
      const leaveTasks = await query('SELECT * FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = ?',
        ['ST001', futureDateStr, 'leave']);
      expect(leaveTasks).toHaveLength(1);
      expect(leaveTasks[0].title).toBe('已请假');
      expect(leaveTasks[0].completed).toBe(1);
    });

    test('Edge Case - 空日期', async () => {
      const response = await request(app)
        .post('/api/tasks/leave')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          date: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('请假日期不能为空');
    });

    test('Error Handling - 重复请假', async () => {
      // 使用未来的日期
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // 先请一次假
      await request(app)
        .post('/api/tasks/leave')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          date: futureDateStr
        });

      // 再次请假同一天
      const response = await request(app)
        .post('/api/tasks/leave')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          date: futureDateStr
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('该日期已经请过假');
    });

    test('Edge Case - 无日期字段', async () => {
      const response = await request(app)
        .post('/api/tasks/leave')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('请假日期不能为空');
    });

    test('Error Handling - 无效token', async () => {
      const response = await request(app)
        .post('/api/tasks/leave')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          date: '2024-01-25'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });
  });

  describe('GET /api/tasks/leave-records - 获取请假记录', () => {
    beforeEach(async () => {
      // 清理并准备测试请假记录
      await query('DELETE FROM leave_records WHERE student_id = ? AND leave_date = ?', 
        ['ST001', '2024-01-10']);
      await query('INSERT INTO leave_records (student_id, leave_date) VALUES (?, ?)', 
        ['ST001', '2024-01-10']);
    });

    afterEach(async () => {
      // 清理测试数据
      await query('DELETE FROM leave_records WHERE student_id = ? AND leave_date = ?', 
        ['ST001', '2024-01-10']);
    });

    test('Happy Path - 获取请假记录', async () => {
      const response = await request(app)
        .get('/api/tasks/leave-records')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('Error Handling - 无token', async () => {
      const response = await request(app)
        .get('/api/tasks/leave-records');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });
  });

  describe('POST /api/tasks/reset-to-initial - 清空所有任务数据', () => {
    test('Happy Path - 成功清空所有任务数据', async () => {
      // 先创建一些任务数据（使用测试数据库的字段名）
      await query(`
        INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES
        ('test-task-1', 'ST001', '2025-07-15', '学习', '测试任务1', TRUE),
        ('test-task-2', 'ST001', '2025-07-16', '学习', '测试任务2', FALSE)
      `);

      // 创建一些请假记录（测试数据库没有reason字段）
      await query(`
        INSERT INTO leave_records (student_id, leave_date) VALUES
        ('ST001', '2025-07-17')
      `);

      const response = await request(app)
        .post('/api/tasks/reset-to-initial')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('所有任务数据已清空');
      expect(response.body.data).toHaveProperty('studentId', 'ST001');
      expect(response.body.data).toHaveProperty('action', '所有任务、请假记录和调度历史已完全删除，可重新导入任务');

      // 验证任务已被完全删除
      const tasks = await query('SELECT * FROM tasks WHERE student_id = ?', ['ST001']);
      expect(tasks.length).toBe(0);

      // 验证请假记录已被删除
      const leaveRecords = await query('SELECT * FROM leave_records WHERE student_id = ?', ['ST001']);
      expect(leaveRecords.length).toBe(0);
    });

    test('Error Handling - 无token', async () => {
      const response = await request(app)
        .post('/api/tasks/reset-to-initial');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });

    test('Error Handling - 无效token', async () => {
      const response = await request(app)
        .post('/api/tasks/reset-to-initial')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('Edge Case - 清空空数据', async () => {
      // 确保没有数据
      await query('DELETE FROM tasks WHERE student_id = ?', ['ST001']);
      await query('DELETE FROM leave_records WHERE student_id = ?', ['ST001']);

      const response = await request(app)
        .post('/api/tasks/reset-to-initial')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('所有任务数据已清空');
    });
  });
});
