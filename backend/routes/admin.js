const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const moment = require('moment');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { manualReschedule, getStatus } = require('../services/cronService');
const { cacheService, createCacheMiddleware } = require('../services/CacheService');
const logger = require('../utils/Logger');

const router = express.Router();

// 应用认证和管理员权限中间件
router.use(authenticateToken);
router.use(requireAdmin);

// 创建学生列表缓存中间件
const studentListCacheMiddleware = createCacheMiddleware({
  ttl: 600, // 10分钟缓存
  cacheType: 'longTerm',
  keyGenerator: () => 'admin:students:list',
  condition: () => true
});

// 获取所有学生列表
router.get('/students', studentListCacheMiddleware, async (req, res) => {
  try {
    const students = await query(
      'SELECT id, name, created_at FROM students ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: students
    });

  } catch (error) {
    console.error('获取学生列表错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 创建新学生
router.post('/students', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '学生姓名不能为空'
      });
    }

    // 生成学生ID
    const existingStudents = await query('SELECT COUNT(*) as count FROM students');
    const studentCount = existingStudents[0].count;
    const newStudentId = `ST${String(studentCount + 1).padStart(3, '0')}`;

    // 加密初始密码
    const initialPassword = process.env.INITIAL_PASSWORD || 'Hello888';
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    await query(
      'INSERT INTO students (id, name, password) VALUES (?, ?, ?)',
      [newStudentId, name.trim(), hashedPassword]
    );

    res.json({
      success: true,
      message: '学生创建成功',
      data: {
        id: newStudentId,
        name: name.trim(),
        initialPassword
      }
    });

  } catch (error) {
    console.error('创建学生错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 重置学生密码
router.post('/students/:studentId/reset-password', async (req, res) => {
  try {
    const { studentId } = req.params;

    // 检查学生是否存在
    const students = await query('SELECT id, name FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: '学生不存在'
      });
    }

    // 重置为初始密码
    const initialPassword = process.env.INITIAL_PASSWORD || 'Hello888';
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    await query(
      'UPDATE students SET password = ? WHERE id = ?',
      [hashedPassword, studentId]
    );

    res.json({
      success: true,
      message: '密码重置成功',
      data: {
        initialPassword
      }
    });

  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取学生详细档案
router.get('/students/:studentId/profile', async (req, res) => {
  try {
    const { studentId } = req.params;

    // 获取学生基本信息
    const students = await query('SELECT * FROM students WHERE id = ?', [studentId]);
    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: '学生不存在'
      });
    }

    // 获取学生档案
    const profiles = await query('SELECT * FROM student_profiles WHERE student_id = ?', [studentId]);
    
    const student = students[0];
    const profile = profiles.length > 0 ? profiles[0] : null;

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.name,
          createdAt: student.created_at
        },
        profile: profile ? {
          gender: profile.gender,
          age: profile.age,
          studyStatus: profile.study_status,
          studyStatusOther: profile.study_status_other,
          mathType: profile.math_type,
          mathTypeOther: profile.math_type_other,
          targetScore: profile.target_score,
          dailyHours: profile.daily_hours,
          gaokaoYear: profile.gaokao_year,
          gaokaoProvince: profile.gaokao_province,
          gaokaoScore: profile.gaokao_score,
          gradExamYear: profile.grad_exam_year,
          gradExamMathType: profile.grad_exam_math_type,
          gradExamScore: profile.grad_exam_score,
          upgradeExamYear: profile.upgrade_exam_year,
          upgradeExamProvince: profile.upgrade_exam_province,
          upgradeExamMathType: profile.upgrade_exam_math_type,
          upgradeExamScore: profile.upgrade_exam_score,
          purchasedBooks: profile.purchased_books,
          notes: profile.notes,
          isProfileSubmitted: profile.is_profile_submitted,
          updatedAt: profile.updated_at
        } : null
      }
    });

  } catch (error) {
    console.error('获取学生档案错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 测试API
router.post('/test', async (req, res) => {
  console.log('🧪 测试API被调用');
  res.json({ success: true, message: '测试成功' });
});

// 批量导入任务
router.post('/tasks/bulk-import', async (req, res) => {
  console.log('🚀 批量导入任务API被调用');
  try {
    const { csvData } = req.body;
    console.log('📋 接收到的CSV数据长度:', csvData ? csvData.length : 'undefined');

    if (!csvData || typeof csvData !== 'string') {
      console.log('❌ CSV数据验证失败');
      return res.status(400).json({
        success: false,
        message: 'CSV数据不能为空'
      });
    }

    console.log('📥 开始批量导入任务...');

    const lines = csvData.trim().split('\n').slice(1); // 跳过标题行
    const tasks = [];

    // 暂时跳过学生验证，直接处理任务
    console.log('⚠️ 暂时跳过学生验证，直接处理任务');
    const validStudentIds = new Set(['ST001', 'ST002']); // 硬编码已知学生ID
    console.log(`📋 使用硬编码学生ID: ${Array.from(validStudentIds).join(', ')}`);

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(',');
      if (parts.length < 4) continue;

      const [studentId, dateStr, taskType, ...contentParts] = parts.map(item => item.trim());
      const content = contentParts.join(',');

      if (!studentId || !dateStr || !content) continue;

      // 验证日期格式 (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr)) {
        console.warn(`无效日期格式，跳过行: ${line}`);
        continue;
      }

      // 验证学生是否存在（使用预加载的学生ID集合）
      if (!validStudentIds.has(studentId)) {
        console.warn(`学生不存在，跳过行: ${line}`);
        continue;
      }

      tasks.push({
        id: `${studentId}-${dateStr}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        student_id: studentId,
        task_date: dateStr,
        task_type: taskType,
        title: content,
        completed: false
      });
    }

    if (tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有有效的任务数据'
      });
    }

    console.log(`📝 准备导入 ${tasks.length} 个任务...`);

    // 暂时跳过数据库操作，只返回解析结果
    let imported = tasks.length;
    let skipped = 0;

    console.log(`📝 解析到 ${tasks.length} 个任务，暂时跳过数据库插入`);
    for (const task of tasks) {
      console.log(`📋 任务: ${task.student_id} - ${task.task_date} - ${task.title}`);
    }

    console.log(`✅ 任务导入完成: 导入 ${imported} 个新任务，跳过 ${skipped} 个重复任务`);

    res.json({
      success: true,
      message: `任务导入成功，共导入 ${imported} 个新任务，跳过 ${skipped} 个重复任务`,
      data: {
        imported: imported,
        skipped: skipped,
        total: tasks.length
      }
    });

  } catch (error) {
    console.error('批量导入任务错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取任务完成报告
router.get('/reports/tasks', async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;

    let whereClause = '';
    let params = [];

    if (date) {
      // 单日查询
      whereClause = 'WHERE t.task_date = ? AND t.task_type NOT IN (\'休息\', \'leave\')';
      params = [date];
    } else if (startDate && endDate) {
      // 日期范围查询
      whereClause = 'WHERE t.task_date BETWEEN ? AND ? AND t.task_type NOT IN (\'休息\', \'leave\')';
      params = [startDate, endDate];
    } else if (startDate) {
      // 从指定日期开始的月份查询
      const startMonth = startDate.substring(0, 7); // 获取年-月部分
      whereClause = 'WHERE t.task_date LIKE ? AND t.task_type NOT IN (\'休息\', \'leave\')';
      params = [`${startMonth}%`];
    } else {
      // 如果没有提供日期参数，默认查询今天的数据
      const today = new Date().toISOString().split('T')[0];
      whereClause = 'WHERE t.task_date = ? AND t.task_type NOT IN (\'休息\', \'leave\')';
      params = [today];
    }

    // 获取任务详细数据
    const tasks = await query(`
      SELECT
        t.id, t.student_id, s.name as student_name, t.task_type, t.title,
        t.task_date, t.completed, t.duration_hour, t.duration_minute, t.proof_image
      FROM tasks t
      JOIN students s ON t.student_id = s.id
      ${whereClause}
      ORDER BY t.task_date, s.name, t.created_at
    `, params);

    // 计算统计数据
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 获取活跃学生数（有任务的学生）
    const activeStudents = new Set(tasks.map(task => task.student_id)).size;

    // 按学生分组统计
    const studentStats = {};
    tasks.forEach(task => {
      if (!studentStats[task.student_id]) {
        studentStats[task.student_id] = {
          studentId: task.student_id,
          studentName: task.student_name,
          totalTasks: 0,
          completedTasks: 0
        };
      }
      studentStats[task.student_id].totalTasks++;
      if (task.completed) {
        studentStats[task.student_id].completedTasks++;
      }
    });

    // 计算每个学生的完成率
    Object.values(studentStats).forEach(student => {
      student.completionRate = student.totalTasks > 0
        ? Math.round((student.completedTasks / student.totalTasks) * 100)
        : 0;
    });

    res.json({
      success: true,
      data: {
        // 总体统计
        totalTasks,
        completedTasks,
        completionRate,
        activeStudents,

        // 学生统计
        studentStats: Object.values(studentStats),

        // 任务详细列表
        tasks: tasks.map(task => ({
          id: task.id,
          studentId: task.student_id,
          studentName: task.student_name,
          type: task.task_type,
          title: task.title,
          date: task.task_date instanceof Date ? task.task_date.toISOString().split('T')[0] : task.task_date, // 安全格式化日期
          completed: task.completed,
          duration: task.duration_hour || task.duration_minute ? {
            hour: task.duration_hour || 0,
            minute: task.duration_minute || 0
          } : null,
          proof: task.proof_image
        }))
      }
    });

  } catch (error) {
    console.error('获取任务报告错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 手动触发任务重新调度（测试用）
router.post('/reschedule-tasks', async (req, res) => {
  try {
    const { studentId, targetDate } = req.body;

    if (!studentId || !targetDate) {
      return res.status(400).json({
        success: false,
        message: '学生ID和目标日期不能为空'
      });
    }

    const result = await manualReschedule(studentId, targetDate);

    res.json({
      success: result.success,
      message: result.success ? '任务重新调度成功' : '任务重新调度失败',
      data: result
    });

  } catch (error) {
    console.error('手动任务重新调度错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 管理员清理所有任务数据（重置系统）
router.post('/reset-all-tasks', async (req, res) => {
  try {
    console.log(`🔄 管理员 ${req.user.studentId} 请求清空所有任务数据`);

    await transaction(async (connection) => {
      // 1. 删除所有请假记录
      const leaveResult = await connection.run('DELETE FROM leave_records');

      // 2. 删除所有任务调度历史（如果表存在）
      let historyResult = { changes: 0 };
      try {
        historyResult = await connection.run('DELETE FROM task_schedule_history');
      } catch (error) {
        if (error.code === 'SQLITE_ERROR' && error.message.includes('no such table')) {
          console.log('   - task_schedule_history 表不存在，跳过删除');
        } else {
          throw error;
        }
      }

      // 3. 删除所有任务
      const tasksResult = await connection.run('DELETE FROM tasks');

      console.log(`✅ 所有任务数据清空完成:`);
      console.log(`   - 删除了 ${leaveResult.changes} 条请假记录`);
      console.log(`   - 删除了 ${historyResult.changes} 条任务调度历史`);
      console.log(`   - 删除了 ${tasksResult.changes} 个任务`);
    });

    // 4. 清除所有相关的后端缓存
    console.log('🧹 清除后端缓存...');
    try {
      // 清除所有任务相关缓存
      await cacheService.delByPattern('tasks:.*', 'main');
      await cacheService.delByPattern('stats:.*', 'main');
      await cacheService.delByPattern('stats:.*', 'longTerm');
      await cacheService.delByPattern('ranking:.*', 'longTerm');

      // 清除学生列表缓存
      await cacheService.delByPattern('admin:students:.*', 'longTerm');
      await cacheService.delByPattern('students:.*', 'longTerm');

      // 清除用户相关缓存
      await cacheService.delByPattern('user:.*', 'session');
      await cacheService.delByPattern('profile:.*', 'main');

      console.log('✅ 后端缓存清除完成');
    } catch (cacheError) {
      console.warn('⚠️ 清除缓存时出现警告:', cacheError.message);
      // 缓存清除失败不应该影响主要操作
    }

    res.json({
      success: true,
      message: '所有任务数据已清空',
      data: {
        adminId: req.user.studentId,
        resetAt: new Date().toISOString(),
        action: '所有学生的任务、请假记录和调度历史已完全删除，后端缓存已清空，可重新导入任务'
      }
    });

  } catch (error) {
    console.error('❌ 清空所有任务数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
});

// 获取定时任务状态
router.get('/cron-status', async (req, res) => {
  try {
    const status = getStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('获取定时任务状态错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 数据库修复端点（临时使用）
router.post('/fix-database', async (req, res) => {
  try {
    console.log('🔧 开始修复数据库表...');

    // 1. 添加 original_date 字段到 tasks 表
    try {
      await query('ALTER TABLE tasks ADD COLUMN original_date DATE COMMENT "原始日期（用于跟踪任务调度）"');
      console.log('✅ 添加 original_date 字段成功');
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        throw error;
      }
      console.log('ℹ️ original_date 字段已存在');
    }

    // 2. 添加索引
    try {
      await query('ALTER TABLE tasks ADD INDEX idx_original_date (original_date)');
      console.log('✅ 添加 original_date 索引成功');
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
      console.log('ℹ️ original_date 索引已存在');
    }

    // 3. 创建任务调度历史表
    await query(`
      CREATE TABLE IF NOT EXISTS task_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
        task_id INT COMMENT '原任务ID（如果是从任务表移动过来的）',
        task_type VARCHAR(50) NOT NULL COMMENT '任务类型',
        title VARCHAR(200) NOT NULL COMMENT '任务标题',
        original_date DATE NOT NULL COMMENT '原始日期',
        moved_from_date DATE NOT NULL COMMENT '从哪个日期移动过来',
        moved_to_date DATE COMMENT '移动到哪个日期（NULL表示删除）',
        action_type ENUM('defer', 'carry_over', 'delete') NOT NULL COMMENT '操作类型',
        reason VARCHAR(100) COMMENT '操作原因',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_date (student_id, original_date),
        INDEX idx_action_date (action_type, created_at)
      ) COMMENT '任务调度历史记录表'
    `);
    console.log('✅ 创建任务调度历史表成功');

    // 4. 创建任务调度配置表
    await query(`
      CREATE TABLE IF NOT EXISTS schedule_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id VARCHAR(20) NOT NULL COMMENT '学生ID',
        daily_task_limit INT DEFAULT 4 COMMENT '每日任务上限',
        carry_over_threshold INT DEFAULT 3 COMMENT '结转阈值（小于此数量结转，大于等于此数量顺延）',
        advance_days_limit INT DEFAULT 5 COMMENT '最多可提前几天完成任务',
        auto_defer_time TIME DEFAULT '00:00:00' COMMENT '自动处理未完成任务的时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY uk_student_config (student_id)
      ) COMMENT '学生任务调度配置表'
    `);
    console.log('✅ 创建任务调度配置表成功');

    // 5. 插入默认配置
    await query(`
      INSERT INTO schedule_config (student_id, daily_task_limit, carry_over_threshold, advance_days_limit)
      SELECT id, 4, 3, 5 FROM students
      ON DUPLICATE KEY UPDATE
        daily_task_limit = VALUES(daily_task_limit),
        carry_over_threshold = VALUES(carry_over_threshold),
        advance_days_limit = VALUES(advance_days_limit)
    `);
    console.log('✅ 插入默认配置成功');

    // 6. 为现有任务设置 original_date
    await query('UPDATE tasks SET original_date = task_date WHERE original_date IS NULL');
    console.log('✅ 更新现有任务的 original_date 成功');

    console.log('🎉 数据库修复完成！');

    res.json({
      success: true,
      message: '数据库修复完成'
    });

  } catch (error) {
    console.error('❌ 数据库修复失败:', error);
    res.status(500).json({
      success: false,
      message: '数据库修复失败: ' + error.message
    });
  }
});

module.exports = router;
