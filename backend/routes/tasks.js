const express = require('express');
const Joi = require('joi');
const moment = require('moment');
const { query, transaction } = require('../config/database');
const { authenticateToken, checkPasswordChange } = require('../middleware/auth');

const router = express.Router();

// 应用认证中间件
router.use(authenticateToken);
router.use(checkPasswordChange);

// 获取学生任务（按日期范围）
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const studentId = req.user.studentId;

    let sql = 'SELECT * FROM tasks WHERE student_id = ?';
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

    // 按日期分组
    const tasksByDate = {};
    tasks.forEach(task => {
      const dateStr = moment(task.task_date).format('YYYY-MM-DD');
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
    const { completed, duration, proof } = req.body;
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

    await transaction(async (connection) => {
      // 检查是否已经请过假
      const [existingLeave] = await connection.execute(
        'SELECT id FROM leave_records WHERE student_id = ? AND leave_date = ?',
        [studentId, date]
      );

      if (existingLeave.length > 0) {
        throw new Error('该日期已经请过假');
      }

      // 获取当天的未完成任务
      const [incompleteTasks] = await connection.execute(
        'SELECT * FROM tasks WHERE student_id = ? AND task_date = ? AND completed = FALSE AND task_type NOT IN ("休息", "leave")',
        [studentId, date]
      );

      // 删除当天的未完成任务
      if (incompleteTasks.length > 0) {
        await connection.execute(
          'DELETE FROM tasks WHERE student_id = ? AND task_date = ? AND completed = FALSE AND task_type NOT IN ("休息", "leave")',
          [studentId, date]
        );
      }

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

      // TODO: 这里应该实现任务重新调度逻辑，将未完成的任务安排到后续日期
      // 由于逻辑复杂，这里简化处理
    });

    res.json({
      success: true,
      message: '请假申请成功'
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
      'SELECT leave_date, reason, created_at FROM leave_records WHERE student_id = ? ORDER BY leave_date DESC',
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

module.exports = router;
