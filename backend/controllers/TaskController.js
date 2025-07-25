const taskService = require('../services/TaskService');
const { asyncHandler } = require('../utils/ResponseHandler');
const { validators } = require('../middleware/validation');
const logger = require('../utils/Logger');
const { handleMidnightTaskReschedule } = require('../services/taskScheduleService');
const { query } = require('../config/database');
const moment = require('moment');

/**
 * 任务控制器
 * 处理任务相关的HTTP请求
 */
class TaskController {
  /**
   * 获取学生任务
   */
  static getTasks = asyncHandler(async (req, res) => {
    const { startDate, endDate, view } = req.validatedQuery;
    const studentId = req.user.studentId;

    const tasksByDate = await taskService.getStudentTasks(studentId, startDate, endDate);

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

      res.success(monthlyData, '获取月度任务成功');
    } else {
      // 标准视图：直接返回按日期分组的任务
      res.success(tasksByDate, '获取任务成功');
    }
  });

  /**
   * 更新任务状态
   */
  static updateTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const studentId = req.user.studentId;
    const updateData = req.validatedBody;

    const updatedTask = await taskService.updateTaskStatus(taskId, studentId, updateData);

    res.success({
      task: updatedTask
    }, '任务更新成功');
  });

  /**
   * 获取任务详情
   */
  static getTaskDetail = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const studentId = req.user.studentId;

    const task = await taskService.getTaskDetail(taskId, studentId);

    res.success({
      task
    }, '获取任务详情成功');
  });

  /**
   * 获取学生任务统计
   */
  static getStudentStats = asyncHandler(async (req, res) => {
    const studentId = req.user.studentId;
    const { startDate, endDate } = req.query;
    
    const dateRange = startDate && endDate ? { startDate, endDate } : null;
    const stats = await taskService.getStudentTaskStats(studentId, dateRange);

    res.success(stats, '获取学生统计成功');
  });

  /**
   * 获取任务完成率统计（管理员功能）
   */
  static getCompletionStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const dateRange = startDate && endDate ? { startDate, endDate } : null;
    
    const stats = await taskService.getTaskCompletionStats(dateRange);

    res.success(stats, '获取完成率统计成功');
  });

  /**
   * 获取学习时长排行榜（管理员功能）
   */
  static getStudyTimeRanking = asyncHandler(async (req, res) => {
    const { limit = 10, startDate, endDate } = req.query;
    const dateRange = startDate && endDate ? { startDate, endDate } : null;
    
    const ranking = await taskService.getStudentStudyTimeRanking(parseInt(limit), dateRange);

    res.success(ranking, '获取学习时长排行成功');
  });

  /**
   * 批量创建任务（管理员功能）
   */
  static createTasksBatch = asyncHandler(async (req, res) => {
    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.validationError([{
        field: 'tasks',
        message: '任务数组不能为空'
      }]);
    }

    const result = await taskService.createTasksBatch(tasks);

    res.success(result, '批量创建任务完成');
  });

  /**
   * 删除学生所有任务（管理员功能）
   */
  static deleteAllStudentTasks = asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    const deletedCount = await taskService.deleteAllStudentTasks(studentId);

    res.success({
      deletedCount
    }, `成功删除 ${deletedCount} 个任务`);
  });

  /**
   * 获取任务类型统计（管理员功能）
   */
  static getTaskTypeStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const dateRange = startDate && endDate ? { startDate, endDate } : null;
    
    const stats = await taskService.getTaskTypeStats(dateRange);

    res.success(stats, '获取任务类型统计成功');
  });

  /**
   * 获取每日任务统计（管理员功能）
   */
  static getDailyStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const dateRange = startDate && endDate ? { startDate, endDate } : null;
    
    const stats = await taskService.getDailyTaskStats(dateRange);

    res.success(stats, '获取每日统计成功');
  });

  /**
   * 清除任务缓存（管理员功能）
   */
  static clearCache = asyncHandler(async (req, res) => {
    const { studentId } = req.query;

    await taskService.clearTaskCaches(studentId);

    const message = studentId 
      ? `清除学生 ${studentId} 的任务缓存成功`
      : '清除所有任务缓存成功';

    res.success(null, message);
  });

  /**
   * 获取任务服务统计（管理员功能）
   */
  static getServiceStats = asyncHandler(async (req, res) => {
    const stats = await taskService.getServiceStats();

    res.success(stats, '获取服务统计成功');
  });

  /**
   * 请假申请
   */
  static requestLeave = asyncHandler(async (req, res) => {
    const { date, reason } = req.validatedBody;
    const studentId = req.user.studentId;

    // 这里应该调用请假服务，暂时返回成功响应
    // 实际实现需要创建LeaveService和LeaveRepository

    logger.logBusiness('leave_requested', studentId, {
      date,
      reason: reason || 'No reason provided'
    });

    res.success({
      date,
      reason,
      status: 'pending'
    }, '请假申请提交成功');
  });

  /**
   * 获取请假记录
   */
  static getLeaveRecords = asyncHandler(async (req, res) => {
    const studentId = req.user.studentId;
    const { startDate, endDate } = req.query;

    // 这里应该调用请假服务获取请假记录
    // 暂时返回空数组

    res.success([], '获取请假记录成功');
  });

  /**
   * 任务重新调度（管理员功能）
   */
  static rescheduleTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { newDate, reason } = req.body;

    if (!newDate || !reason) {
      return res.validationError([
        { field: 'newDate', message: '新日期是必需的' },
        { field: 'reason', message: '重新调度原因是必需的' }
      ]);
    }

    // 这里应该实现任务重新调度逻辑
    logger.logBusiness('task_rescheduled', req.user.userId, {
      taskId,
      newDate,
      reason
    });

    res.success({
      taskId,
      newDate,
      reason,
      rescheduledAt: new Date().toISOString()
    }, '任务重新调度成功');
  });

  /**
   * 获取任务历史（管理员功能）
   */
  static getTaskHistory = asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    // 这里应该实现任务历史查询逻辑
    // 暂时返回空数组

    res.success([], '获取任务历史成功');
  });

  /**
   * 手动触发24:00任务处理（测试用）
   */
  static processMidnightTasks = asyncHandler(async (req, res) => {
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
      console.log(`ℹ️ ${targetDate} 的24:00任务已处理过，跳过重复处理`);
      return res.success({
        studentId,
        processedDate: targetDate,
        skipped: true,
        lastProcessedAt: processHistory[0].created_at
      }, '24:00任务已处理过');
    }

    // 查找当天未完成的任务
    const incompleteTasks = await query(
      `SELECT id, task_type, title, task_date, completed
       FROM tasks
       WHERE student_id = ? AND task_date = ? AND completed = 0 AND task_type NOT IN ('休息', 'leave')
       ORDER BY created_at`,
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

    res.success({
      studentId,
      processedDate: targetDate,
      incompleteTasks: incompleteTasks.length,
      processedAt: new Date().toISOString()
    }, '24:00任务处理完成');
  });
}

module.exports = TaskController;
