const express = require('express');
const moment = require('moment');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { handleLeaveDefer, handleMidnightTaskReschedule } = require('../services/taskScheduleService');
const { validators } = require('../middleware/validation');
const { asyncHandler } = require('../utils/ResponseHandler');
const { cacheService, createCacheMiddleware } = require('../services/CacheService');
const queryOptimizer = require('../services/QueryOptimizer');
const logger = require('../utils/Logger');

const router = express.Router();

// 应用认证中间件
router.use(authenticateToken);

// 创建任务缓存中间件
const taskCacheMiddleware = createCacheMiddleware({
  ttl: 180, // 3分钟缓存
  cacheType: 'main',
  keyGenerator: (req) => {
    const { startDate, endDate, view } = req.query;
    const studentId = req.user?.studentId;
    return `tasks:${studentId}:${startDate || 'all'}:${endDate || 'all'}:${view || 'default'}`;
  },
  condition: (req) => req.user && req.user.studentId, // 只为学生请求缓存
  skipCache: (req) => req.query.nocache === 'true' // 支持跳过缓存
});

// 获取学生任务（按日期范围）
router.get('/', validators.dateRange, taskCacheMiddleware, asyncHandler(async (req, res) => {
  const { startDate, endDate, view } = req.validatedQuery;
  const studentId = req.user.studentId;

  // 使用优化的查询方法
  const tasksByDate = await queryOptimizer.getStudentTasksOptimized(
    studentId,
    startDate,
    endDate
  );

  // 如果是月度视图，需要特殊处理
  if (view === 'month') {
    // 转换为月度视图格式
    const monthlyData = {};

    Object.keys(tasksByDate).forEach(date => {
      const tasks = tasksByDate[date];
      monthlyData[date] = {
        total: tasks.length,
        completed: tasks.filter(task => task.completed).length,
        tasks: tasks.map(task => ({
          id: task.id,
          type: task.task_type,
          title: task.title,
          completed: task.completed,
          duration: task.duration_hour || task.duration_minute ? {
            hour: task.duration_hour || 0,
            minute: task.duration_minute || 0
          } : null,
          proof: task.proof_image,
          originalDate: date,
          isDeferred: false
        }))
      };
    });

    res.json({
      success: true,
      data: monthlyData
    });
  } else {
    // 标准视图：直接返回按日期分组的任务
    res.json({
      success: true,
      data: tasksByDate
    });
  }
}));

// 更新任务状态
router.put('/:taskId', validators.updateTask, asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { completed, duration, proof, completed_date, is_future_task } = req.validatedBody;
  const studentId = req.user.studentId;

    // 验证任务是否属于当前学生
    const tasks = await query(
      'SELECT id FROM tasks WHERE id = ? AND student_id = ?',
      [taskId, studentId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: '任务不存在或无权限'
      });
    }

    // 构建更新SQL
    let updateFields = [];
    let updateValues = [];

    if (typeof completed === 'boolean') {
      updateFields.push('completed = ?');
      updateValues.push(completed);
    }

    if (duration) {
      updateFields.push('duration_hour = ?', 'duration_minute = ?');
      updateValues.push(duration.hour || 0, duration.minute || 0);
    }

    if (proof !== undefined) {
      updateFields.push('proof_image = ?');
      updateValues.push(proof);
    }

    if (completed_date !== undefined) {
      updateFields.push('completed_date = ?');
      updateValues.push(completed_date);
    }

    if (is_future_task !== undefined) {
      updateFields.push('is_future_task = ?');
      updateValues.push(is_future_task);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的字段'
      });
    }

    updateValues.push(taskId, studentId);

    await query(
      `UPDATE tasks SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND student_id = ?`,
      updateValues
    );

    // 清除相关缓存
    await cacheService.delByPattern(`tasks:${studentId}:.*`, 'main');

    logger.logBusiness('task_update', studentId, {
      taskId,
      fields: updateFields,
      requestId: req.requestId
    });

  res.json({
    success: true,
    message: '任务更新成功'
  });
}));

// 请假申请
router.post('/leave', validators.leaveRequest, asyncHandler(async (req, res) => {
  const { date } = req.validatedBody;
  const studentId = req.user.studentId;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: '请假日期不能为空'
      });
    }

    let deferResult;
    
    await transaction(async (connection) => {
      // 检查是否已经请过假
      const [existingLeave] = await connection.execute(
        'SELECT id FROM leave_records WHERE student_id = ? AND leave_date = ?',
        [studentId, date]
      );

      if (existingLeave.length > 0) {
        throw new Error('该日期已经请过假');
      }

      // 检查请假日期是否是今天或未来日期
      const today = moment().format('YYYY-MM-DD');
      if (moment(date).isBefore(today)) {
        throw new Error('不能请过去日期的假');
      }

      // 处理任务顺延逻辑
      deferResult = await handleLeaveDefer(studentId, date, connection);

      // 添加请假记录
      await connection.execute(
        'INSERT INTO leave_records (student_id, leave_date) VALUES (?, ?)',
        [studentId, date]
      );

      // 添加请假任务标记
      await connection.execute(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, "leave", "已请假", TRUE)',
        [`leave-${studentId}-${date}`, studentId, date]
      );
    });

    res.json({
      success: true,
      message: '请假申请成功',
      data: {
        leaveDate: date,
        deferResult: deferResult
      }
    });

}));

// 获取请假记录
router.get('/leave-records', async (req, res) => {
  try {
    const studentId = req.user.studentId;
    
    const leaveRecords = await query(
      'SELECT leave_date, created_at FROM leave_records WHERE student_id = ? ORDER BY leave_date DESC',
      [studentId]
    );

    res.json({
      success: true,
      data: leaveRecords
    });

  } catch (error) {
    console.error('获取请假记录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 手动触发24:00任务处理（测试用）
router.post('/midnight-process', async (req, res) => {
  try {
    const { date } = req.body;
    const studentId = req.user.studentId;

    const targetDate = date || moment().format('YYYY-MM-DD');

    console.log(`🕛 学生 ${studentId} 手动触发24:00处理，日期: ${targetDate}`);

    // 检查是否已经处理过该日期的24:00任务
    const processHistory = await query(
      `SELECT * FROM task_schedule_history
       WHERE student_id = ? AND operation_date = ? AND operation_type = 'midnight_process'
       ORDER BY created_at DESC LIMIT 1`,
      [studentId, targetDate]
    );

    if (processHistory.length > 0) {
      const lastProcess = processHistory[0];
      const timeDiff = Date.now() - new Date(lastProcess.created_at).getTime();

      // 如果在5分钟内已经处理过，则跳过
      if (timeDiff < 5 * 60 * 1000) {
        console.log(`⏭️ ${targetDate} 的24:00任务在5分钟内已处理过，跳过重复处理`);
        return res.json({
          success: true,
          message: '24:00任务已处理过，跳过重复处理',
          data: {
            studentId,
            processedDate: targetDate,
            lastProcessedAt: lastProcess.created_at,
            skipped: true
          }
        });
      }
    }

    // 先查询当前未完成任务数量
    const incompleteTasks = await query(
      `SELECT * FROM tasks
       WHERE student_id = ? AND task_date = ? AND completed = FALSE
       AND task_type NOT IN ('休息', 'leave')
       ORDER BY created_at ASC`,
      [studentId, targetDate]
    );

    console.log(`📊 ${targetDate} 未完成任务数量: ${incompleteTasks.length}`);

    if (incompleteTasks.length > 0) {
      await handleMidnightTaskReschedule(studentId, targetDate);
      console.log(`✅ 24:00任务处理完成，处理了 ${incompleteTasks.length} 个未完成任务`);

      // 记录处理历史
      await query(
        `INSERT INTO task_schedule_history
         (student_id, operation_type, operation_date, affected_tasks, details)
         VALUES (?, 'midnight_process', ?, ?, ?)`,
        [
          studentId,
          targetDate,
          incompleteTasks.length,
          JSON.stringify({
            processedDate: targetDate,
            incompleteTasks: incompleteTasks.length,
            processedAt: new Date().toISOString()
          })
        ]
      );
    } else {
      console.log(`ℹ️ ${targetDate} 没有未完成任务，无需处理`);
    }

    res.json({
      success: true,
      message: '24:00任务处理完成',
      data: {
        studentId,
        processedDate: targetDate,
        incompleteTasks: incompleteTasks.length,
        processedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 手动24:00处理错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
});

// 重置学生任务到初始状态（测试用）- 清空所有任务数据
router.post('/reset-to-initial', async (req, res) => {
  try {
    const studentId = req.user.studentId;
    console.log(`🔄 学生 ${studentId} 请求清空所有任务数据`);

    await transaction(async (connection) => {
      // 1. 删除所有请假记录
      const [leaveResult] = await connection.execute(
        'DELETE FROM leave_records WHERE student_id = ?',
        [studentId]
      );

      // 2. 删除所有任务调度历史（如果表存在）
      let historyResult = { affectedRows: 0 };
      try {
        [historyResult] = await connection.execute(
          'DELETE FROM task_schedule_history WHERE student_id = ?',
          [studentId]
        );
      } catch (error) {
        if (error.code === 'ER_NO_SUCH_TABLE') {
          console.log('   - task_schedule_history 表不存在，跳过删除');
        } else {
          throw error;
        }
      }

      // 3. 删除所有任务（而不是重置）
      const [tasksResult] = await connection.execute(
        'DELETE FROM tasks WHERE student_id = ?',
        [studentId]
      );

      console.log(`✅ 学生 ${studentId} 数据清空完成:`);
      console.log(`   - 删除了 ${leaveResult.affectedRows} 条请假记录`);
      console.log(`   - 删除了 ${historyResult.affectedRows} 条任务调度历史`);
      console.log(`   - 删除了 ${tasksResult.affectedRows} 个任务`);
    });

    res.json({
      success: true,
      message: '所有任务数据已清空',
      data: {
        studentId,
        resetAt: new Date().toISOString(),
        action: '所有任务、请假记录和调度历史已完全删除，可重新导入任务'
      }
    });

  } catch (error) {
    console.error('❌ 清空任务数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
});

module.exports = router;
