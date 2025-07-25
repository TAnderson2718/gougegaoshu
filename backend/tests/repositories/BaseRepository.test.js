const BaseRepository = require('../../repositories/BaseRepository');
const { databaseManager } = require('../../config/database');

// 模拟数据库管理器
jest.mock('../../config/database');

describe('BaseRepository', () => {
  let repository;
  let mockDb;

  beforeEach(() => {
    // 创建模拟数据库连接
    mockDb = {
      all: jest.fn(),
      get: jest.fn(),
      run: jest.fn(),
      exec: jest.fn()
    };

    // 设置数据库管理器模拟
    databaseManager.getConnection.mockResolvedValue(mockDb);
    databaseManager.transaction.mockImplementation(async (callback) => {
      return await callback(mockDb);
    });

    // 创建测试仓库实例
    repository = new BaseRepository('test_table');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('query', () => {
    it('应该成功执行查询并返回结果', async () => {
      // 准备测试数据
      const sql = 'SELECT * FROM test_table WHERE id = ?';
      const params = [1];
      const expectedResult = [{ id: 1, name: 'Test' }];

      // 设置模拟返回值
      mockDb.all.mockResolvedValue(expectedResult);

      // 执行测试
      const result = await repository.query(sql, params);

      // 验证结果
      expect(result).toEqual(expectedResult);
      expect(mockDb.all).toHaveBeenCalledWith(sql, params);
    });

    it('应该在查询失败时抛出错误', async () => {
      // 准备测试数据
      const sql = 'INVALID SQL';
      const params = [];
      const error = new Error('SQL syntax error');

      // 设置模拟抛出错误
      mockDb.all.mockRejectedValue(error);

      // 执行测试并验证错误
      await expect(repository.query(sql, params)).rejects.toThrow(error);
    });
  });

  describe('queryOne', () => {
    it('应该返回第一个结果', async () => {
      // 准备测试数据
      const sql = 'SELECT * FROM test_table WHERE id = ?';
      const params = [1];
      const queryResult = [{ id: 1, name: 'Test' }, { id: 2, name: 'Test2' }];

      // 设置模拟返回值
      mockDb.all.mockResolvedValue(queryResult);

      // 执行测试
      const result = await repository.queryOne(sql, params);

      // 验证结果
      expect(result).toEqual(queryResult[0]);
    });

    it('应该在没有结果时返回null', async () => {
      // 准备测试数据
      const sql = 'SELECT * FROM test_table WHERE id = ?';
      const params = [999];

      // 设置模拟返回值
      mockDb.all.mockResolvedValue([]);

      // 执行测试
      const result = await repository.queryOne(sql, params);

      // 验证结果
      expect(result).toBeNull();
    });
  });

  describe('execute', () => {
    it('应该成功执行插入/更新/删除操作', async () => {
      // 准备测试数据
      const sql = 'INSERT INTO test_table (name) VALUES (?)';
      const params = ['Test'];
      const runResult = { changes: 1, lastID: 123 };

      // 设置模拟返回值
      mockDb.run.mockResolvedValue(runResult);

      // 执行测试
      const result = await repository.execute(sql, params);

      // 验证结果
      expect(result).toEqual({
        changes: 1,
        lastID: 123,
        success: true
      });
      expect(mockDb.run).toHaveBeenCalledWith(sql, params);
    });

    it('应该在没有影响行数时返回success: false', async () => {
      // 准备测试数据
      const sql = 'UPDATE test_table SET name = ? WHERE id = ?';
      const params = ['New Name', 999];
      const runResult = { changes: 0, lastID: null };

      // 设置模拟返回值
      mockDb.run.mockResolvedValue(runResult);

      // 执行测试
      const result = await repository.execute(sql, params);

      // 验证结果
      expect(result).toEqual({
        changes: 0,
        lastID: null,
        success: false
      });
    });
  });

  describe('findAll', () => {
    it('应该返回所有记录', async () => {
      // 准备测试数据
      const expectedResult = [
        { id: 1, name: 'Test1' },
        { id: 2, name: 'Test2' }
      ];

      // 设置模拟返回值
      mockDb.all.mockResolvedValue(expectedResult);

      // 执行测试
      const result = await repository.findAll();

      // 验证结果
      expect(result).toEqual(expectedResult);
      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM test_table WHERE 1=1', []);
    });

    it('应该支持条件查询', async () => {
      // 准备测试数据
      const conditions = { name: 'Test', active: true };
      const expectedResult = [{ id: 1, name: 'Test', active: true }];

      // 设置模拟返回值
      mockDb.all.mockResolvedValue(expectedResult);

      // 执行测试
      const result = await repository.findAll(conditions);

      // 验证结果
      expect(result).toEqual(expectedResult);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE name = ? AND active = ?',
        ['Test', true]
      );
    });

    it('应该支持排序和限制', async () => {
      // 准备测试数据
      const conditions = {};
      const options = { orderBy: 'name ASC', limit: 10, offset: 5 };
      const expectedResult = [{ id: 1, name: 'Test' }];

      // 设置模拟返回值
      mockDb.all.mockResolvedValue(expectedResult);

      // 执行测试
      const result = await repository.findAll(conditions, options);

      // 验证结果
      expect(result).toEqual(expectedResult);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM test_table WHERE 1=1 ORDER BY name ASC LIMIT 10 OFFSET 5',
        []
      );
    });
  });

  describe('findById', () => {
    it('应该根据ID查找记录', async () => {
      // 准备测试数据
      const id = 1;
      const expectedResult = [{ id: 1, name: 'Test' }];

      // 设置模拟返回值
      mockDb.all.mockResolvedValue(expectedResult);

      // 执行测试
      const result = await repository.findById(id);

      // 验证结果
      expect(result).toEqual(expectedResult[0]);
      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM test_table WHERE id = ?', [id]);
    });
  });

  describe('create', () => {
    it('应该成功创建记录', async () => {
      // 准备测试数据
      const data = { name: 'New Test', active: true };
      const runResult = { changes: 1, lastID: 123 };
      const createdRecord = { id: 123, ...data };

      // 设置模拟返回值
      mockDb.run.mockResolvedValue(runResult);
      mockDb.all.mockResolvedValue([createdRecord]);

      // 执行测试
      const result = await repository.create(data);

      // 验证结果
      expect(result).toEqual(createdRecord);
      expect(mockDb.run).toHaveBeenCalledWith(
        'INSERT INTO test_table (name, active) VALUES (?, ?)',
        ['New Test', true]
      );
      expect(mockDb.all).toHaveBeenCalledWith('SELECT * FROM test_table WHERE id = ?', [123]);
    });

    it('应该在创建失败时返回null', async () => {
      // 准备测试数据
      const data = { name: 'Test' };
      const runResult = { changes: 0, lastID: null };

      // 设置模拟返回值
      mockDb.run.mockResolvedValue(runResult);

      // 执行测试
      const result = await repository.create(data);

      // 验证结果
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('应该成功更新记录', async () => {
      // 准备测试数据
      const id = 1;
      const data = { name: 'Updated Test' };
      const runResult = { changes: 1 };
      const updatedRecord = { id: 1, name: 'Updated Test' };

      // 设置模拟返回值
      mockDb.run.mockResolvedValue(runResult);
      mockDb.all.mockResolvedValue([updatedRecord]);

      // 执行测试
      const result = await repository.update(id, data);

      // 验证结果
      expect(result).toEqual(updatedRecord);
      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE test_table SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['Updated Test', id]
      );
    });
  });

  describe('delete', () => {
    it('应该成功删除记录', async () => {
      // 准备测试数据
      const id = 1;
      const runResult = { changes: 1 };

      // 设置模拟返回值
      mockDb.run.mockResolvedValue(runResult);

      // 执行测试
      const result = await repository.delete(id);

      // 验证结果
      expect(result).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM test_table WHERE id = ?', [id]);
    });

    it('应该在删除失败时返回false', async () => {
      // 准备测试数据
      const id = 999;
      const runResult = { changes: 0 };

      // 设置模拟返回值
      mockDb.run.mockResolvedValue(runResult);

      // 执行测试
      const result = await repository.delete(id);

      // 验证结果
      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('应该返回记录总数', async () => {
      // 准备测试数据
      const countResult = [{ count: 5 }];

      // 设置模拟返回值
      mockDb.all.mockResolvedValue(countResult);

      // 执行测试
      const result = await repository.count();

      // 验证结果
      expect(result).toBe(5);
      expect(mockDb.all).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM test_table WHERE 1=1', []);
    });

    it('应该支持条件计数', async () => {
      // 准备测试数据
      const conditions = { active: true };
      const countResult = [{ count: 3 }];

      // 设置模拟返回值
      mockDb.all.mockResolvedValue(countResult);

      // 执行测试
      const result = await repository.count(conditions);

      // 验证结果
      expect(result).toBe(3);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM test_table WHERE active = ?',
        [true]
      );
    });
  });

  describe('buildWhereClause', () => {
    it('应该构建简单的WHERE子句', () => {
      // 准备测试数据
      const conditions = { name: 'Test', age: 25 };

      // 执行测试
      const result = repository.buildWhereClause(conditions);

      // 验证结果
      expect(result).toEqual({
        where: 'name = ? AND age = ?',
        params: ['Test', 25]
      });
    });

    it('应该处理IN查询', () => {
      // 准备测试数据
      const conditions = { id: [1, 2, 3] };

      // 执行测试
      const result = repository.buildWhereClause(conditions);

      // 验证结果
      expect(result).toEqual({
        where: 'id IN (?, ?, ?)',
        params: [1, 2, 3]
      });
    });

    it('应该处理NULL查询', () => {
      // 准备测试数据
      const conditions = { deleted_at: null };

      // 执行测试
      const result = repository.buildWhereClause(conditions);

      // 验证结果
      expect(result).toEqual({
        where: 'deleted_at IS NULL',
        params: []
      });
    });

    it('应该处理自定义操作符', () => {
      // 准备测试数据
      const conditions = {
        age: { operator: '>', value: 18 },
        name: { operator: 'LIKE', value: '%test%' }
      };

      // 执行测试
      const result = repository.buildWhereClause(conditions);

      // 验证结果
      expect(result).toEqual({
        where: 'age > ? AND name LIKE ?',
        params: [18, '%test%']
      });
    });

    it('应该在没有条件时返回默认WHERE子句', () => {
      // 准备测试数据
      const conditions = {};

      // 执行测试
      const result = repository.buildWhereClause(conditions);

      // 验证结果
      expect(result).toEqual({
        where: '1=1',
        params: []
      });
    });
  });
});
