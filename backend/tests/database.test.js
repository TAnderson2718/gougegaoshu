/**
 * 数据库连接和健康检查模块测试
 * 测试数据库连接、健康检查接口、数据库状态等功能
 */

const request = require('supertest');
const app = require('../server');
const { query, testConnection } = require('../config/database');

describe('数据库连接和健康检查模块测试', () => {
  describe('GET /health - 健康检查接口', () => {
    test('Happy Path - 正常健康检查', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('服务运行正常');
      expect(response.body.database).toBe('连接正常');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
      expect(response.body.environment).toBe('development');
    });

    test('Edge Case - 多次连续健康检查', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(request(app).get('/health'));
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.database).toBe('连接正常');
      });
    });

    test('Happy Path - 响应时间检查', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/health');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 响应时间应该小于1秒
    });

    test('Edge Case - 验证时间戳格式', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      
      // 验证时间戳是有效的ISO字符串
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
      
      // 验证时间戳是最近的（在过去1分钟内）
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(60000); // 小于1分钟
    });
  });

  describe('GET /api/db-status - 数据库状态检查', () => {
    test('Happy Path - 正常数据库状态', async () => {
      const response = await request(app)
        .get('/api/db-status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('name');
      expect(response.body.database).toHaveProperty('tables');
      expect(response.body.database).toHaveProperty('studentCount');
      expect(response.body).toHaveProperty('timestamp');

      // 验证表列表
      expect(response.body.database.tables).toBeInstanceOf(Array);
      expect(response.body.database.tables.length).toBeGreaterThan(0);
      
      // 验证必要的表存在
      const expectedTables = ['students', 'student_profiles', 'tasks', 'leave_records', 'system_config'];
      expectedTables.forEach(table => {
        expect(response.body.database.tables).toContain(table);
      });

      // 验证学生数量
      expect(typeof response.body.database.studentCount).toBe('number');
      expect(response.body.database.studentCount).toBeGreaterThanOrEqual(0);
    });

    test('Edge Case - 验证数据库名称', async () => {
      const response = await request(app)
        .get('/api/db-status');

      expect(response.status).toBe(200);
      expect(response.body.database.name).toMatch(/task_manager.*db/); // 匹配测试或生产数据库名
    });

    test('Happy Path - 验证学生数量准确性', async () => {
      // 先获取当前学生数量
      const studentsResult = await query('SELECT COUNT(*) as count FROM students');
      const actualCount = studentsResult[0].count;

      const response = await request(app)
        .get('/api/db-status');

      expect(response.status).toBe(200);
      expect(response.body.database.studentCount).toBe(actualCount);
    });
  });

  describe('数据库连接功能测试', () => {
    test('Happy Path - 直接数据库连接测试', async () => {
      const isConnected = await testConnection();
      expect(isConnected).toBe(true);
    });

    test('Happy Path - 数据库查询功能', async () => {
      const result = await query('SELECT 1 as test');
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
      expect(result[0].test).toBe(1);
    });

    test('Happy Path - 数据库事务功能', async () => {
      // 测试简单的插入和回滚
      try {
        await query('START TRANSACTION');
        
        // 插入测试数据
        await query('INSERT INTO students (id, name, password) VALUES (?, ?, ?)', 
          ['TEST_TRANS', '事务测试', 'password']);
        
        // 验证数据存在
        const result = await query('SELECT * FROM students WHERE id = ?', ['TEST_TRANS']);
        expect(result).toHaveLength(1);
        
        // 回滚事务
        await query('ROLLBACK');
        
        // 验证数据已被回滚
        const afterRollback = await query('SELECT * FROM students WHERE id = ?', ['TEST_TRANS']);
        expect(afterRollback).toHaveLength(0);
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
    });

    test('Error Handling - 无效SQL查询', async () => {
      await expect(query('INVALID SQL QUERY')).rejects.toThrow();
    });

    test('Edge Case - 空查询参数', async () => {
      const result = await query('SELECT COUNT(*) as count FROM students WHERE id = ?', ['']);
      expect(result).toBeInstanceOf(Array);
      expect(result[0].count).toBe(0);
    });

    test('Edge Case - NULL参数查询', async () => {
      const result = await query('SELECT COUNT(*) as count FROM students WHERE id = ?', [null]);
      expect(result).toBeInstanceOf(Array);
      expect(result[0].count).toBe(0);
    });

    test('Happy Path - 批量查询性能', async () => {
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(query('SELECT COUNT(*) as count FROM students'));
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeInstanceOf(Array);
        expect(result[0]).toHaveProperty('count');
      });
      
      // 10个查询应该在合理时间内完成
      expect(endTime - startTime).toBeLessThan(5000); // 5秒内
    });
  });

  describe('数据库表结构验证', () => {
    test('Happy Path - 验证students表结构', async () => {
      const columns = await query('DESCRIBE students');
      
      const expectedColumns = ['id', 'name', 'password', 'force_password_change', 'created_at', 'updated_at'];
      const actualColumns = columns.map(col => col.Field);
      
      expectedColumns.forEach(col => {
        expect(actualColumns).toContain(col);
      });
      
      // 验证主键
      const primaryKey = columns.find(col => col.Key === 'PRI');
      expect(primaryKey.Field).toBe('id');
    });

    test('Happy Path - 验证tasks表结构', async () => {
      const columns = await query('DESCRIBE tasks');
      
      const expectedColumns = ['id', 'student_id', 'task_date', 'task_type', 'title', 'completed'];
      const actualColumns = columns.map(col => col.Field);
      
      expectedColumns.forEach(col => {
        expect(actualColumns).toContain(col);
      });
    });

    test('Happy Path - 验证外键约束', async () => {
      // 测试外键约束是否生效
      await expect(
        query('INSERT INTO tasks (id, student_id, task_date, task_type, title) VALUES (?, ?, ?, ?, ?)', 
          ['test-fk', 'NONEXISTENT', '2024-01-01', '测试', '外键测试'])
      ).rejects.toThrow(); // 应该因为外键约束失败
    });

    test('Happy Path - 验证唯一约束', async () => {
      // 测试学生ID的唯一约束
      await expect(
        query('INSERT INTO students (id, name, password) VALUES (?, ?, ?)', 
          ['ST001', '重复ID测试', 'password']) // ST001已存在
      ).rejects.toThrow(); // 应该因为唯一约束失败
    });
  });

  describe('数据库性能和稳定性测试', () => {
    test('Edge Case - 大量数据查询', async () => {
      const startTime = Date.now();
      
      // 查询所有表的数据
      const tables = ['students', 'student_profiles', 'tasks', 'leave_records', 'system_config'];
      const promises = tables.map(table => query(`SELECT COUNT(*) as count FROM ${table}`));
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(tables.length);
      expect(endTime - startTime).toBeLessThan(3000); // 3秒内完成
    });

    test('Edge Case - 连接池压力测试', async () => {
      const promises = [];
      
      // 创建20个并发查询
      for (let i = 0; i < 20; i++) {
        promises.push(query('SELECT SLEEP(0.1), ? as query_id', [i]));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(20);
      results.forEach((result, index) => {
        expect(result[0].query_id).toBe(index);
      });
    });

    test('Happy Path - 数据库连接恢复测试', async () => {
      // 测试连接是否能正常恢复
      let isConnected = await testConnection();
      expect(isConnected).toBe(true);
      
      // 等待一小段时间后再次测试
      await new Promise(resolve => setTimeout(resolve, 100));
      
      isConnected = await testConnection();
      expect(isConnected).toBe(true);
    });
  });
});
