const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const moment = require('moment');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 应用认证和管理员权限中间件
router.use(authenticateToken);
router.use(requireAdmin);

// 获取所有学生列表
router.get('/students', async (req, res) => {
  try {
    const students = await query(
      'SELECT id, name, force_password_change, created_at FROM students ORDER BY created_at DESC'
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
      'INSERT INTO students (id, name, password, force_password_change) VALUES (?, ?, ?, TRUE)',
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
      'UPDATE students SET password = ?, force_password_change = TRUE WHERE id = ?',
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
        id: student.id,
        name: student.name,
        forcePasswordChange: student.force_password_change,
        createdAt: student.created_at,
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

// 批量导入任务
router.post('/tasks/bulk-import', async (req, res) => {
  try {
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'CSV数据不能为空'
      });
    }

    const lines = csvData.trim().split('\n').slice(1); // 跳过标题行
    const tasks = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      if (parts.length < 4) continue;

      const [studentId, dateStr, taskType, ...contentParts] = parts.map(item => item.trim());
      const content = contentParts.join(',');

      if (!studentId || !dateStr || !content) continue;

      // 验证日期格式
      const taskDate = moment(dateStr);
      if (!taskDate.isValid()) {
        console.warn(`无效日期格式，跳过行: ${line}`);
        continue;
      }

      // 验证学生是否存在
      const students = await query('SELECT id FROM students WHERE id = ?', [studentId]);
      if (students.length === 0) {
        console.warn(`学生不存在，跳过行: ${line}`);
        continue;
      }

      tasks.push({
        id: `${studentId}-${taskDate.format('YYYY-MM-DD')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        student_id: studentId,
        task_date: taskDate.format('YYYY-MM-DD'),
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

    // 批量插入任务
    await transaction(async (connection) => {
      for (const task of tasks) {
        await connection.execute(
          'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
          [task.id, task.student_id, task.task_date, task.task_type, task.title, task.completed]
        );
      }
    });

    res.json({
      success: true,
      message: `成功导入 ${tasks.length} 个任务`
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
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: '日期参数不能为空'
      });
    }

    const tasks = await query(`
      SELECT 
        t.id, t.student_id, s.name as student_name, t.task_type, t.title,
        t.completed, t.duration_hour, t.duration_minute, t.proof_image
      FROM tasks t
      JOIN students s ON t.student_id = s.id
      WHERE t.task_date = ? AND t.task_type NOT IN ('休息', 'leave')
      ORDER BY s.name, t.created_at
    `, [date]);

    res.json({
      success: true,
      data: tasks.map(task => ({
        id: task.id,
        studentId: task.student_id,
        studentName: task.student_name,
        type: task.task_type,
        title: task.title,
        completed: task.completed,
        duration: task.duration_hour || task.duration_minute ? {
          hour: task.duration_hour || 0,
          minute: task.duration_minute || 0
        } : null,
        proof: task.proof_image
      }))
    });

  } catch (error) {
    console.error('获取任务报告错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
