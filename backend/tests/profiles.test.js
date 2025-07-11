/**
 * 学生档案模块测试
 * 测试档案获取、更新等功能
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { query } = require('../config/database');

describe('学生档案模块测试', () => {
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

  describe('GET /api/profiles - 获取学生档案', () => {
    test('Happy Path - 已有档案数据', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('profile');
      expect(response.body.data.profile).toHaveProperty('gender');
      expect(response.body.data.profile).toHaveProperty('age');
      expect(response.body.data.profile.age).toBe(22);
      expect(response.body.data.profile.gender).toBe('男');
    });

    test('Edge Case - 无档案数据的新用户', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${st002Token}`); // ST002没有档案数据

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toBeNull();
    });

    test('Error Handling - 无效token', async () => {
      const response = await request(app)
        .get('/api/profiles')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌无效');
    });

    test('Error Handling - 无token', async () => {
      const response = await request(app)
        .get('/api/profiles');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });
  });

  describe('PUT /api/profiles - 更新学生档案', () => {
    const validProfileData = {
      gender: '女',
      age: 23,
      studyStatus: '无业全职考研',
      mathType: '数学一',
      targetScore: 380,
      dailyHours: 9.5,
      gaoKaoYear: '2020',
      gaoKaoProvince: '北京',
      gaoKaoScore: 580,
      gradExamYear: '2024',
      gradExamProvince: '上海',
      gradExamMajor: '计算机科学与技术',
      upgradeExam: '是',
      upgradeExamMajor: '软件工程',
      upgradeExamMathType: '高等数学',
      upgradeExamScore: 85,
      purchasedBooks: '高等数学教材,线性代数',
      notes: '这是测试备注信息'
    };

    test('Happy Path - 完整档案更新', async () => {
      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${st002Token}`) // 使用没有档案的用户
        .send(validProfileData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('档案更新成功');

      // 验证数据库中的数据
      const profiles = await query('SELECT * FROM student_profiles WHERE student_id = ?', ['ST002']);
      expect(profiles).toHaveLength(1);
      expect(profiles[0].gender).toBe('女');
      expect(profiles[0].age).toBe(23);
      expect(profiles[0].target_score).toBe(380);
    });

    test('Happy Path - 部分字段更新', async () => {
      const partialData = {
        age: 24,
        targetScore: 400
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(partialData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('档案更新成功');

      // 验证部分更新
      const profiles = await query('SELECT age, target_score FROM student_profiles WHERE student_id = ?', ['ST001']);
      expect(profiles[0].age).toBe(24);
      expect(profiles[0].target_score).toBe(400);
    });

    test('Edge Case - 空数据对象', async () => {
      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('档案数据不能为空');
    });

    test('Error Handling - 无效数据类型', async () => {
      const invalidData = {
        age: 'invalid_age', // 应该是数字
        targetScore: 'invalid_score'
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('数据格式错误');
    });

    test('Edge Case - 边界值测试', async () => {
      const boundaryData = {
        age: 0, // 最小值
        targetScore: 500, // 最大值
        dailyHours: 24.0 // 最大小时数
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(boundaryData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Error Handling - 超出范围的值', async () => {
      const outOfRangeData = {
        age: -1, // 负数年龄
        targetScore: 1000, // 超出合理范围
        dailyHours: 25.0 // 超过24小时
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(outOfRangeData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('数据格式错误');
    });

    test('Happy Path - 字符串字段长度测试', async () => {
      const longStringData = {
        notes: 'A'.repeat(1000), // 长备注
        purchasedBooks: 'B'.repeat(500) // 长书单
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(longStringData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Error Handling - 无效的枚举值', async () => {
      const invalidEnumData = {
        gender: '其他', // 不在枚举范围内
        studyStatus: '无效状态'
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidEnumData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('数据格式错误');
    });

    test('Error Handling - 无token', async () => {
      const response = await request(app)
        .put('/api/profiles')
        .send(validProfileData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('访问令牌缺失');
    });

    test('Happy Path - 更新已存在的档案', async () => {
      const updateData = {
        gender: '女',
        age: 25,
        studyStatus: '在职考研'
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`) // ST001已有档案
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('档案更新成功');

      // 验证更新
      const profiles = await query('SELECT gender, age, study_status FROM student_profiles WHERE student_id = ?', ['ST001']);
      expect(profiles[0].gender).toBe('女');
      expect(profiles[0].age).toBe(25);
      expect(profiles[0].study_status).toBe('在职考研');
    });
  });

  describe('档案数据验证测试', () => {
    test('Edge Case - 特殊字符处理', async () => {
      const specialCharData = {
        notes: '这是包含特殊字符的备注：@#$%^&*()_+{}|:"<>?[]\\;\',./',
        purchasedBooks: '书名包含引号"测试"和单引号\'测试\''
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(specialCharData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Edge Case - 空字符串字段', async () => {
      const emptyStringData = {
        notes: '',
        purchasedBooks: '',
        gaoKaoProvince: ''
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(emptyStringData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Edge Case - null值处理', async () => {
      const nullData = {
        age: null,
        targetScore: null,
        dailyHours: null
      };

      const response = await request(app)
        .put('/api/profiles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(nullData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
