const express = require('express');
const Joi = require('joi');
const moment = require('moment');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { handleLeaveDefer, handleMidnightTaskReschedule } = require('../services/taskScheduleService');

const router = express.Router();

// 应用认证中间件
router.use(authenticateToken);

// 获取学生任务（按日期范围）
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, view } = req.query;
    const studentId = req.user.studentId;

    let sql = `SELECT
      id, student_id,
      DATE_FORMAT(task_date, '%Y-%m-%d') as task_date,
      task_type, title, completed,
      duration_hour, duration_minute, proof_image, created_at
    FROM tasks WHERE student_id = ?`;
    let params = [studentId];

    if (startDate && endDate) {
      sql += ' AND task_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      sql += ' AND task_date >= ?';
      params.push(startDate);
    }

    sql += ' ORDER BY task_date ASC, created_at ASC';

    const tasks = await query(sql, params);

    // 如果是月度视图，需要特殊处理
    if (view === 'month') {
      // 按原始日期分组，用于正确计算完成率
      const tasksByOriginalDate = {};
      const tasksByCurrentDate = {};

      tasks.forEach(task => {
        // 日期现在已经是格式化的字符串，直接使用
        const currentDateStr = task.task_date;
        const originalDateStr = currentDateStr; // 暂时使用当前日期作为原始日期

        // 按当前日期分组（用于显示任务）
        if (!tasksByCurrentDate[currentDateStr]) {
          tasksByCurrentDate[currentDateStr] = [];
        }
        tasksByCurrentDate[currentDateStr].push({
          id: task.id,
          type: task.task_type,
          title: task.title,
          completed: task.completed,
          duration: task.duration_hour || task.duration_minute ? {
            hour: task.duration_hour || 0,
            minute: task.duration_minute || 0
          } : null,
          proof: task.proof_image,
          originalDate: originalDateStr,
          isDeferred: !!task.original_date
        });

        // 按原始日期分组（用于计算完成率）
        if (!tasksByOriginalDate[originalDateStr]) {
          tasksByOriginalDate[originalDateStr] = {
            total: 0,
            completed: 0,
            tasks: []
          };
        }
        tasksByOriginalDate[originalDateStr].total++;
        if (task.completed) {
          tasksByOriginalDate[originalDateStr].completed++;
        }
        tasksByOriginalDate[originalDateStr].tasks.push({
          id: task.id,
          type: task.task_type,
          title: task.title,
          completed: task.completed,
          currentDate: currentDateStr,
          isDeferred: !!task.original_date
        });
      });

      res.json({
        success: true,
        data: tasksByCurrentDate,
        originalDateStats: tasksByOriginalDate
      });
    } else {
      // 普通视图，按当前日期分组
      const tasksByDate = {};
      tasks.forEach(task => {
        // 日期现在已经是格式化的字符串，直接使用
        const dateStr = task.task_date;

        if (!tasksByDate[dateStr]) {
          tasksByDate[dateStr] = [];
        }
        tasksByDate[dateStr].push({
          id: task.id,
          type: task.task_type,
          title: task.title,
          completed: task.completed,
          duration: task.duration_hour || task.duration_minute ? {
            hour: task.duration_hour || 0,
            minute: task.duration_minute || 0
          } : null,
          proof: task.proof_image
        });
      });

      res.json({
        success: true,
        data: tasksByDate
      });
    }

  } catch (error) {
    console.error('获取任务错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 更新任务状态
router.put('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completed, duration, proof, completed_date, is_future_task } = req.body;
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

    res.json({
      success: true,
      message: '任务更新成功'
    });

  } catch (error) {
    console.error('更新任务错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 请假申请
router.post('/leave', async (req, res) => {
  try {
    const { date } = req.body;
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
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, original_date, task_status) VALUES (?, ?, ?, "leave", "已请假", TRUE, ?, "normal")',
        [`leave-${studentId}-${date}`, studentId, date, date]
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

  } catch (error) {
    console.error('请假申请错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '服务器内部错误'
    });
  }
});

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
