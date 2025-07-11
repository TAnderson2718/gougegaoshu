/**
 * 管理员功能模块测试
 * 测试学生管理、任务导入、报告生成等管理员功能
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { query } = require('../config/database');

describe('管理员功能模块测试', () => {
  let adminToken;
  let studentToken;

  beforeAll(async () => {
    // 生成管理员token
    adminToken = jwt.sign(
      { studentId: 'ADMIN001' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 生成普通学生token
    studentToken = jwt.sign(
      { studentId: 'ST001' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/admin/students - 获取学生列表', () => {
    test('Happy Path - 管理员获取学生列表', async () => {
      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2); // 至少有ST001, ST002
      
      // 验证返回的学生信息结构
      const student = response.body.data[0];
      expect(student).toHaveProperty('id');
      expect(student).toHaveProperty('name');
      expect(student).toHaveProperty('force_password_change');
      expect(student).toHaveProperty('created_at');
    });

    test('Error Handling - 普通用户无权限', async () => {
      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('需要管理员权限');
    });

    test('Error Handling - 无token', async () => {
      const response = await request(app)
        .get('/api/admin/students');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });

    test('Error Handling - 无效token', async () => {
      const response = await request(app)
        .get('/api/admin/students')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });
  });

  describe('POST /api/admin/students - 创建学生', () => {
    test('Happy Path - 创建新学生', async () => {
      const response = await request(app)
        .post('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '新测试学生'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('学生创建成功');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('initialPassword');
      expect(response.body.data.name).toBe('新测试学生');
      expect(response.body.data.id).toMatch(/^ST\d{3}$/); // 格式如ST003

      // 验证学生确实被创建
      const students = await query('SELECT * FROM students WHERE id = ?', [response.body.data.id]);
      expect(students).toHaveLength(1);
      expect(students[0].name).toBe('新测试学生');
      expect(students[0].force_password_change).toBe(1);
    });

    test('Edge Case - 空姓名', async () => {
      const response = await request(app)
        .post('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('学生姓名不能为空');
    });

    test('Edge Case - 只有空格的姓名', async () => {
      const response = await request(app)
        .post('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '   '
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('学生姓名不能为空');
    });

    test('Error Handling - 普通用户无权限', async () => {
      const response = await request(app)
        .post('/api/admin/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: '测试学生'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('需要管理员权限');
    });

    test('Edge Case - 缺少name字段', async () => {
      const response = await request(app)
        .post('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('学生姓名不能为空');
    });

    test('Happy Path - 姓名前后有空格', async () => {
      const response = await request(app)
        .post('/api/admin/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '  测试学生带空格  '
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('测试学生带空格'); // 应该被trim
    });
  });

  describe('POST /api/admin/students/:studentId/reset-password - 重置学生密码', () => {
    test('Happy Path - 重置存在学生的密码', async () => {
      const response = await request(app)
        .post('/api/admin/students/ST001/reset-password')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('密码重置成功');
      expect(response.body.data).toHaveProperty('initialPassword');

      // 验证force_password_change被设置为TRUE
      const students = await query('SELECT force_password_change FROM students WHERE id = ?', ['ST001']);
      expect(students[0].force_password_change).toBe(1);
    });

    test('Error Handling - 不存在的学生', async () => {
      const response = await request(app)
        .post('/api/admin/students/INVALID/reset-password')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('学生不存在');
    });

    test('Error Handling - 普通用户无权限', async () => {
      const response = await request(app)
        .post('/api/admin/students/ST001/reset-password')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('需要管理员权限');
    });
  });

  describe('GET /api/admin/students/:studentId/profile - 获取学生档案', () => {
    test('Happy Path - 获取有档案的学生信息', async () => {
      const response = await request(app)
        .get('/api/admin/students/ST001/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('student');
      expect(response.body.data).toHaveProperty('profile');
      expect(response.body.data.student.id).toBe('ST001');
      expect(response.body.data.profile).not.toBeNull();
    });

    test('Happy Path - 获取无档案的学生信息', async () => {
      const response = await request(app)
        .get('/api/admin/students/ST002/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('student');
      expect(response.body.data).toHaveProperty('profile');
      expect(response.body.data.student.id).toBe('ST002');
      expect(response.body.data.profile).toBeNull();
    });

    test('Error Handling - 不存在的学生', async () => {
      const response = await request(app)
        .get('/api/admin/students/INVALID/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('学生不存在');
    });
  });

  describe('POST /api/admin/tasks/bulk-import - 批量导入任务', () => {
    const validCSV = `学生ID,日期,任务类型,任务内容
ST001,2024-02-01,数学,线性代数第一章
ST001,2024-02-01,英语,单词背诵200个
ST002,2024-02-01,政治,毛概第一章`;

    test('Happy Path - 有效CSV数据导入', async () => {
      const response = await request(app)
        .post('/api/admin/tasks/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          csvData: validCSV
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('任务导入成功');
      expect(response.body.data).toHaveProperty('imported');
      expect(response.body.data.imported).toBeGreaterThan(0);

      // 验证任务确实被导入
      const tasks = await query('SELECT * FROM tasks WHERE task_date = ?', ['2024-02-01']);
      expect(tasks.length).toBeGreaterThanOrEqual(3);
    });

    test('Edge Case - 空CSV数据', async () => {
      const response = await request(app)
        .post('/api/admin/tasks/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          csvData: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('CSV数据不能为空');
    });

    test('Error Handling - 格式错误的CSV', async () => {
      const invalidCSV = `无效的CSV格式
这不是正确的格式`;

      const response = await request(app)
        .post('/api/admin/tasks/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          csvData: invalidCSV
        });

      // 应该部分成功或返回错误信息
      expect(response.status).toBe(200); // 可能部分成功
      expect(response.body.success).toBe(true);
    });

    test('Edge Case - 缺少csvData字段', async () => {
      const response = await request(app)
        .post('/api/admin/tasks/bulk-import')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('CSV数据不能为空');
    });

    test('Error Handling - 普通用户无权限', async () => {
      const response = await request(app)
        .post('/api/admin/tasks/bulk-import')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          csvData: validCSV
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('需要管理员权限');
    });
  });

  describe('GET /api/admin/reports/tasks - 获取任务报告', () => {
    beforeEach(async () => {
      // 为报告测试准备数据
      await query(`
        INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES 
        ('report-test-1', 'ST001', '2024-03-01', '数学', '测试任务1', TRUE),
        ('report-test-2', 'ST001', '2024-03-01', '英语', '测试任务2', FALSE),
        ('report-test-3', 'ST002', '2024-03-01', '政治', '测试任务3', TRUE)
      `);
    });

    test('Happy Path - 获取指定日期的任务报告', async () => {
      const response = await request(app)
        .get('/api/admin/reports/tasks')
        .query({ date: '2024-03-01' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      // 验证报告数据结构
      const task = response.body.data[0];
      expect(task).toHaveProperty('id');
      expect(task).toHaveProperty('studentId');
      expect(task).toHaveProperty('studentName');
      expect(task).toHaveProperty('type');
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('completed');
    });

    test('Edge Case - 无日期参数', async () => {
      const response = await request(app)
        .get('/api/admin/reports/tasks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('日期参数不能为空');
    });

    test('Happy Path - 无任务数据的日期', async () => {
      const response = await request(app)
        .get('/api/admin/reports/tasks')
        .query({ date: '2024-12-31' }) // 未来日期，应该没有数据
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('Error Handling - 普通用户无权限', async () => {
      const response = await request(app)
        .get('/api/admin/reports/tasks')
        .query({ date: '2024-03-01' })
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('需要管理员权限');
    });
  });
});
