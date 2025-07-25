const BaseRepository = require('./BaseRepository');
const logger = require('../utils/Logger');

/**
 * 任务仓库类
 * 处理任务相关的数据访问
 */
class TaskRepository extends BaseRepository {
  constructor() {
    super('tasks');
  }

  /**
   * 根据学生ID和日期范围查找任务
   */
  async findTasksByStudentAndDateRange(studentId, startDate = null, endDate = null) {
    let sql = `
      SELECT 
        t.id,
        t.student_id,
        strftime('%Y-%m-%d', t.task_date) as task_date,
        t.task_type,
        t.title,
        t.completed,
        t.duration_hour,
        t.duration_minute,
        t.proof_image,
        t.created_at,
        t.updated_at,
        s.name as student_name
      FROM tasks t
      INNER JOIN students s ON t.student_id = s.id
      WHERE t.student_id = ?
    `;
    
    const params = [studentId];

    if (startDate && endDate) {
      sql += ` AND t.task_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else if (startDate) {
      sql += ` AND t.task_date >= ?`;
      params.push(startDate);
    } else if (endDate) {
      sql += ` AND t.task_date <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY t.task_date DESC, t.created_at DESC`;

    const tasks = await this.query(sql, params);
    
    // 按日期分组
    const tasksByDate = {};
    tasks.forEach(task => {
      const date = task.task_date;
      if (!tasksByDate[date]) {
        tasksByDate[date] = [];
      }
      tasksByDate[date].push(task);
    });

    return tasksByDate;
  }

  /**
   * 根据任务ID和学生ID查找任务
   */
  async findTaskByIdAndStudent(taskId, studentId) {
    const sql = `
      SELECT * FROM tasks 
      WHERE id = ? AND student_id = ?
    `;
    return await this.queryOne(sql, [taskId, studentId]);
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId, studentId, updateData) {
    const { completed, duration, proof, completed_date, is_future_task } = updateData;
    
    const updateFields = [];
    const updateValues = [];

    if (typeof completed === 'boolean') {
      updateFields.push('completed = ?');
      updateValues.push(completed ? 1 : 0);
    }

    if (duration) {
      if (typeof duration.hour === 'number') {
        updateFields.push('duration_hour = ?');
        updateValues.push(duration.hour);
      }
      if (typeof duration.minute === 'number') {
        updateFields.push('duration_minute = ?');
        updateValues.push(duration.minute);
      }
    }

    if (proof !== undefined) {
      updateFields.push('proof_image = ?');
      updateValues.push(proof);
    }

    if (completed_date) {
      updateFields.push('completed_date = ?');
      updateValues.push(completed_date);
    }

    if (typeof is_future_task === 'boolean') {
      updateFields.push('is_future_task = ?');
      updateValues.push(is_future_task ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return null;
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(taskId, studentId);

    const sql = `
      UPDATE tasks 
      SET ${updateFields.join(', ')} 
      WHERE id = ? AND student_id = ?
    `;

    const result = await this.execute(sql, updateValues);
    
    if (result.success) {
      logger.logBusiness('task_updated', studentId, {
        taskId,
        fields: updateFields.map(f => f.split(' = ')[0])
      });
      
      return await this.findTaskByIdAndStudent(taskId, studentId);
    }

    return null;
  }

  /**
   * 获取学生任务统计
   */
  async getStudentTaskStats(studentId, dateRange = null) {
    let sql = `
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        SUM(duration_hour * 60 + duration_minute) as total_minutes,
        COUNT(DISTINCT task_date) as active_days
      FROM tasks 
      WHERE student_id = ?
    `;
    
    const params = [studentId];

    if (dateRange && dateRange.startDate && dateRange.endDate) {
      sql += ` AND task_date BETWEEN ? AND ?`;
      params.push(dateRange.startDate, dateRange.endDate);
    }

    const result = await this.queryOne(sql, params);
    
    if (!result) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        totalMinutes: 0,
        activeDays: 0,
        completionRate: 0,
        averageMinutesPerDay: 0
      };
    }

    const completionRate = result.total_tasks > 0 
      ? Math.round((result.completed_tasks / result.total_tasks) * 100) 
      : 0;
    
    const averageMinutesPerDay = result.active_days > 0 
      ? Math.round(result.total_minutes / result.active_days) 
      : 0;

    return {
      totalTasks: result.total_tasks,
      completedTasks: result.completed_tasks,
      totalMinutes: result.total_minutes || 0,
      activeDays: result.active_days,
      completionRate,
      averageMinutesPerDay
    };
  }

  /**
   * 获取任务完成率统计
   */
  async getTaskCompletionStats(dateRange = null) {
    let sql = `
      SELECT 
        strftime('%Y-%m-%d', task_date) as date,
        task_type,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        ROUND(
          (SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
        ) as completion_rate
      FROM tasks
    `;
    
    const params = [];

    if (dateRange && dateRange.startDate && dateRange.endDate) {
      sql += ` WHERE task_date BETWEEN ? AND ?`;
      params.push(dateRange.startDate, dateRange.endDate);
    }

    sql += `
      GROUP BY strftime('%Y-%m-%d', task_date), task_type
      ORDER BY date DESC, task_type
    `;

    return await this.query(sql, params);
  }

  /**
   * 获取学生学习时长排行
   */
  async getStudentStudyTimeRanking(limit = 10, dateRange = null) {
    let sql = `
      SELECT 
        s.id,
        s.name,
        SUM(t.duration_hour * 60 + t.duration_minute) as total_minutes,
        COUNT(CASE WHEN t.completed = 1 THEN 1 END) as completed_tasks,
        COUNT(t.id) as total_tasks,
        ROUND(
          (COUNT(CASE WHEN t.completed = 1 THEN 1 END) * 100.0 / COUNT(t.id)), 2
        ) as completion_rate
      FROM students s
      LEFT JOIN tasks t ON s.id = t.student_id
    `;
    
    const params = [];

    if (dateRange && dateRange.startDate && dateRange.endDate) {
      sql += ` WHERE t.task_date BETWEEN ? AND ?`;
      params.push(dateRange.startDate, dateRange.endDate);
    }

    sql += `
      GROUP BY s.id, s.name
      HAVING total_minutes > 0
      ORDER BY total_minutes DESC
      LIMIT ?
    `;
    
    params.push(limit);

    return await this.query(sql, params);
  }

  /**
   * 批量创建任务
   */
  async createTasksBatch(tasksData) {
    const results = [];
    
    await this.transaction(async (db) => {
      for (const taskData of tasksData) {
        try {
          const sql = `
            INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, 
                             duration_hour, duration_minute, proof_image, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          const values = [
            taskData.id,
            taskData.student_id,
            taskData.task_date,
            taskData.task_type,
            taskData.title,
            taskData.completed || 0,
            taskData.duration_hour || 0,
            taskData.duration_minute || 0,
            taskData.proof_image || null,
            new Date().toISOString(),
            new Date().toISOString()
          ];
          
          const result = await this.execute(sql, values);
          
          if (result.success) {
            results.push({ success: true, taskId: taskData.id });
          } else {
            results.push({ success: false, taskId: taskData.id, error: 'Insert failed' });
          }
        } catch (error) {
          results.push({ 
            success: false, 
            taskId: taskData.id, 
            error: error.message 
          });
        }
      }
    });
    
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    logger.logBusiness('tasks_batch_created', 'system', {
      total: results.length,
      successful,
      failed
    });
    
    return {
      total: results.length,
      successful,
      failed,
      results
    };
  }

  /**
   * 删除学生的所有任务
   */
  async deleteAllTasksByStudent(studentId) {
    const sql = `DELETE FROM tasks WHERE student_id = ?`;
    const result = await this.execute(sql, [studentId]);
    
    logger.logBusiness('all_tasks_deleted', studentId, {
      deletedCount: result.changes
    });
    
    return result.changes;
  }

  /**
   * 获取任务类型统计
   */
  async getTaskTypeStats(dateRange = null) {
    let sql = `
      SELECT 
        task_type,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        SUM(duration_hour * 60 + duration_minute) as total_minutes,
        ROUND(
          (SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
        ) as completion_rate
      FROM tasks
    `;
    
    const params = [];

    if (dateRange && dateRange.startDate && dateRange.endDate) {
      sql += ` WHERE task_date BETWEEN ? AND ?`;
      params.push(dateRange.startDate, dateRange.endDate);
    }

    sql += `
      GROUP BY task_type
      ORDER BY total_tasks DESC
    `;

    return await this.query(sql, params);
  }

  /**
   * 获取每日任务统计
   */
  async getDailyTaskStats(dateRange = null) {
    let sql = `
      SELECT 
        strftime('%Y-%m-%d', task_date) as date,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        COUNT(DISTINCT student_id) as active_students,
        SUM(duration_hour * 60 + duration_minute) as total_minutes
      FROM tasks
    `;
    
    const params = [];

    if (dateRange && dateRange.startDate && dateRange.endDate) {
      sql += ` WHERE task_date BETWEEN ? AND ?`;
      params.push(dateRange.startDate, dateRange.endDate);
    }

    sql += `
      GROUP BY strftime('%Y-%m-%d', task_date)
      ORDER BY date DESC
    `;

    return await this.query(sql, params);
  }
}

module.exports = TaskRepository;
