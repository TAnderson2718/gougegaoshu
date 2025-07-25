const { databaseManager } = require('../config/database');
const logger = require('../utils/Logger');

/**
 * 创建数据库索引以优化查询性能
 */
async function createIndexes() {
  try {
    const db = await databaseManager.getConnection();
    
    logger.info('开始创建数据库索引...');

    // 任务表索引
    const taskIndexes = [
      // 学生ID和任务日期的复合索引（最常用的查询）
      'CREATE INDEX IF NOT EXISTS idx_tasks_student_date ON tasks(student_id, task_date)',
      
      // 任务日期索引（按日期范围查询）
      'CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(task_date)',
      
      // 学生ID索引（按学生查询所有任务）
      'CREATE INDEX IF NOT EXISTS idx_tasks_student ON tasks(student_id)',
      
      // 完成状态索引（查询未完成任务）
      'CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)',
      
      // 任务类型索引（按类型统计）
      'CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type)',
      
      // 创建时间索引（按创建时间排序）
      'CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at)',
      
      // 复合索引：学生ID + 完成状态 + 日期（查询学生的未完成任务）
      'CREATE INDEX IF NOT EXISTS idx_tasks_student_completed_date ON tasks(student_id, completed, task_date)'
    ];

    // 学生表索引
    const studentIndexes = [
      // 学生姓名索引（按姓名搜索）
      'CREATE INDEX IF NOT EXISTS idx_students_name ON students(name)',
      
      // 创建时间索引（按注册时间排序）
      'CREATE INDEX IF NOT EXISTS idx_students_created ON students(created_at)'
    ];

    // 管理员表索引
    const adminIndexes = [
      // 角色索引（按角色查询）
      'CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role)',
      
      // 创建时间索引
      'CREATE INDEX IF NOT EXISTS idx_admins_created ON admins(created_at)'
    ];

    // 请假记录表索引
    const leaveIndexes = [
      // 学生ID和请假日期的复合索引
      'CREATE INDEX IF NOT EXISTS idx_leave_student_date ON leave_records(student_id, leave_date)',
      
      // 请假日期索引
      'CREATE INDEX IF NOT EXISTS idx_leave_date ON leave_records(leave_date)',
      
      // 学生ID索引
      'CREATE INDEX IF NOT EXISTS idx_leave_student ON leave_records(student_id)'
    ];

    // 执行所有索引创建
    const allIndexes = [
      ...taskIndexes,
      ...studentIndexes,
      ...adminIndexes,
      ...leaveIndexes
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const indexSql of allIndexes) {
      try {
        await db.exec(indexSql);
        
        // 提取索引名称用于日志
        const indexNameMatch = indexSql.match(/idx_\w+/);
        const indexName = indexNameMatch ? indexNameMatch[0] : 'unknown';
        
        logger.debug('索引创建成功', { indexName, sql: indexSql });
        createdCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          skippedCount++;
        } else {
          logger.error('索引创建失败', { 
            sql: indexSql, 
            error: error.message 
          });
          throw error;
        }
      }
    }

    logger.info('数据库索引创建完成', {
      total: allIndexes.length,
      created: createdCount,
      skipped: skippedCount
    });

    // 分析表统计信息以优化查询计划
    await analyzeTableStats(db);

    return {
      success: true,
      total: allIndexes.length,
      created: createdCount,
      skipped: skippedCount
    };

  } catch (error) {
    logger.error('创建数据库索引失败', { error: error.message });
    throw error;
  }
}

/**
 * 分析表统计信息
 */
async function analyzeTableStats(db) {
  try {
    logger.info('开始分析表统计信息...');

    const tables = ['tasks', 'students', 'admins', 'leave_records'];
    
    for (const table of tables) {
      try {
        // SQLite的ANALYZE命令用于更新查询优化器的统计信息
        await db.exec(`ANALYZE ${table}`);
        logger.debug('表统计信息分析完成', { table });
      } catch (error) {
        logger.warn('表统计信息分析失败', { 
          table, 
          error: error.message 
        });
      }
    }

    logger.info('表统计信息分析完成');
  } catch (error) {
    logger.error('分析表统计信息失败', { error: error.message });
  }
}

/**
 * 获取索引使用情况统计
 */
async function getIndexStats() {
  try {
    const db = await databaseManager.getConnection();
    
    // 查询所有索引信息
    const indexes = await db.all(`
      SELECT 
        name,
        tbl_name as table_name,
        sql
      FROM sqlite_master 
      WHERE type = 'index' 
        AND name LIKE 'idx_%'
      ORDER BY tbl_name, name
    `);

    // 获取表的行数统计
    const tableStats = {};
    const tables = ['tasks', 'students', 'admins', 'leave_records'];
    
    for (const table of tables) {
      try {
        const result = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
        tableStats[table] = result.count;
      } catch (error) {
        tableStats[table] = 0;
      }
    }

    return {
      indexes: indexes.length,
      indexList: indexes,
      tableStats
    };

  } catch (error) {
    logger.error('获取索引统计失败', { error: error.message });
    return {
      indexes: 0,
      indexList: [],
      tableStats: {}
    };
  }
}

/**
 * 删除所有自定义索引（用于重置）
 */
async function dropAllIndexes() {
  try {
    const db = await databaseManager.getConnection();
    
    // 查询所有自定义索引
    const indexes = await db.all(`
      SELECT name 
      FROM sqlite_master 
      WHERE type = 'index' 
        AND name LIKE 'idx_%'
    `);

    let droppedCount = 0;

    for (const index of indexes) {
      try {
        await db.exec(`DROP INDEX IF EXISTS ${index.name}`);
        logger.debug('索引删除成功', { indexName: index.name });
        droppedCount++;
      } catch (error) {
        logger.error('索引删除失败', { 
          indexName: index.name, 
          error: error.message 
        });
      }
    }

    logger.info('索引删除完成', {
      total: indexes.length,
      dropped: droppedCount
    });

    return {
      success: true,
      total: indexes.length,
      dropped: droppedCount
    };

  } catch (error) {
    logger.error('删除索引失败', { error: error.message });
    throw error;
  }
}

module.exports = {
  createIndexes,
  getIndexStats,
  dropAllIndexes,
  analyzeTableStats
};
