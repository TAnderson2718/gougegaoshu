const TaskRepository = require('../repositories/TaskRepository');
const UserRepository = require('../repositories/UserRepository');
const { cacheService } = require('./CacheService');
const { ValidationError, NotFoundError, BusinessError } = require('../utils/AppError');
const logger = require('../utils/Logger');

/**
 * 任务服务类
 * 处理任务相关的业务逻辑
 */
class TaskService {
  constructor() {
    this.taskRepository = new TaskRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * 获取学生任务
   */
  async getStudentTasks(studentId, startDate = null, endDate = null, useCache = true) {
    const cacheKey = `tasks:${studentId}:${startDate || 'all'}:${endDate || 'all'}`;
    
    if (useCache) {
      // 尝试从缓存获取
      const cachedTasks = await cacheService.get(cacheKey, 'main');
      if (cachedTasks) {
        return cachedTasks;
      }
    }

    // 验证学生是否存在
    const student = await this.userRepository.findStudentById(studentId);
    if (!student) {
      throw new NotFoundError('学生', studentId);
    }

    // 从数据库获取任务
    const tasksByDate = await this.taskRepository.findTasksByStudentAndDateRange(
      studentId, 
      startDate, 
      endDate
    );

    // 缓存结果
    if (useCache) {
      await cacheService.set(cacheKey, tasksByDate, 180, 'main'); // 3分钟缓存
    }

    logger.logBusiness('tasks_retrieved', studentId, {
      dateRange: { startDate, endDate },
      taskCount: Object.values(tasksByDate).flat().length
    });

    return tasksByDate;
  }

  /**
   * 更新任务状态
   */
  async updateTaskStatus(taskId, studentId, updateData) {
    // 验证任务是否存在且属于该学生
    const existingTask = await this.taskRepository.findTaskByIdAndStudent(taskId, studentId);
    if (!existingTask) {
      throw new NotFoundError('任务', taskId);
    }

    // 验证更新数据
    this.validateTaskUpdateData(updateData);

    // 更新任务
    const updatedTask = await this.taskRepository.updateTaskStatus(taskId, studentId, updateData);
    
    if (!updatedTask) {
      throw new BusinessError('任务更新失败', 'TASK_UPDATE_FAILED');
    }

    // 清除相关缓存
    await cacheService.delByPattern(`tasks:${studentId}:.*`, 'main');

    logger.logBusiness('task_status_updated', studentId, {
      taskId,
      updateFields: Object.keys(updateData)
    });

    return updatedTask;
  }

  /**
   * 获取学生任务统计
   */
  async getStudentTaskStats(studentId, dateRange = null) {
    const cacheKey = `stats:student:${studentId}:${JSON.stringify(dateRange)}`;
    
    // 尝试从缓存获取
    let stats = await cacheService.get(cacheKey, 'main');
    
    if (!stats) {
      // 验证学生是否存在
      const student = await this.userRepository.findStudentById(studentId);
      if (!student) {
        throw new NotFoundError('学生', studentId);
      }

      stats = await this.taskRepository.getStudentTaskStats(studentId, dateRange);
      
      // 缓存统计信息
      await cacheService.set(cacheKey, stats, 300, 'main'); // 5分钟缓存
    }

    return stats;
  }

  /**
   * 获取任务完成率统计
   */
  async getTaskCompletionStats(dateRange = null) {
    const cacheKey = `stats:completion:${JSON.stringify(dateRange)}`;
    
    // 尝试从缓存获取
    let stats = await cacheService.get(cacheKey, 'longTerm');
    
    if (!stats) {
      stats = await this.taskRepository.getTaskCompletionStats(dateRange);
      
      // 缓存统计信息
      await cacheService.set(cacheKey, stats, 600, 'longTerm'); // 10分钟缓存
    }

    return stats;
  }

  /**
   * 获取学生学习时长排行
   */
  async getStudentStudyTimeRanking(limit = 10, dateRange = null) {
    const cacheKey = `ranking:study_time:${limit}:${JSON.stringify(dateRange)}`;
    
    // 尝试从缓存获取
    let ranking = await cacheService.get(cacheKey, 'longTerm');
    
    if (!ranking) {
      ranking = await this.taskRepository.getStudentStudyTimeRanking(limit, dateRange);
      
      // 缓存排行榜
      await cacheService.set(cacheKey, ranking, 600, 'longTerm'); // 10分钟缓存
    }

    return ranking;
  }

  /**
   * 批量创建任务
   */
  async createTasksBatch(tasksData) {
    // 验证任务数据
    this.validateTasksBatchData(tasksData);

    // 验证所有学生是否存在
    const studentIds = [...new Set(tasksData.map(task => task.student_id))];
    for (const studentId of studentIds) {
      const student = await this.userRepository.findStudentById(studentId);
      if (!student) {
        throw new NotFoundError('学生', studentId);
      }
    }

    // 批量创建任务
    const result = await this.taskRepository.createTasksBatch(tasksData);

    // 清除相关缓存
    for (const studentId of studentIds) {
      await cacheService.delByPattern(`tasks:${studentId}:.*`, 'main');
      await cacheService.delByPattern(`stats:student:${studentId}:.*`, 'main');
    }
    
    // 清除全局统计缓存
    await cacheService.delByPattern('stats:completion:.*', 'longTerm');
    await cacheService.delByPattern('ranking:.*', 'longTerm');

    return result;
  }

  /**
   * 删除学生所有任务
   */
  async deleteAllStudentTasks(studentId) {
    // 验证学生是否存在
    const student = await this.userRepository.findStudentById(studentId);
    if (!student) {
      throw new NotFoundError('学生', studentId);
    }

    // 删除所有任务
    const deletedCount = await this.taskRepository.deleteAllTasksByStudent(studentId);

    // 清除相关缓存
    await cacheService.delByPattern(`tasks:${studentId}:.*`, 'main');
    await cacheService.delByPattern(`stats:student:${studentId}:.*`, 'main');
    await cacheService.delByPattern('stats:completion:.*', 'longTerm');
    await cacheService.delByPattern('ranking:.*', 'longTerm');

    logger.logBusiness('all_student_tasks_deleted', studentId, {
      deletedCount
    });

    return deletedCount;
  }

  /**
   * 获取任务类型统计
   */
  async getTaskTypeStats(dateRange = null) {
    const cacheKey = `stats:task_types:${JSON.stringify(dateRange)}`;
    
    // 尝试从缓存获取
    let stats = await cacheService.get(cacheKey, 'longTerm');
    
    if (!stats) {
      stats = await this.taskRepository.getTaskTypeStats(dateRange);
      
      // 缓存统计信息
      await cacheService.set(cacheKey, stats, 600, 'longTerm'); // 10分钟缓存
    }

    return stats;
  }

  /**
   * 获取每日任务统计
   */
  async getDailyTaskStats(dateRange = null) {
    const cacheKey = `stats:daily:${JSON.stringify(dateRange)}`;
    
    // 尝试从缓存获取
    let stats = await cacheService.get(cacheKey, 'longTerm');
    
    if (!stats) {
      stats = await this.taskRepository.getDailyTaskStats(dateRange);
      
      // 缓存统计信息
      await cacheService.set(cacheKey, stats, 600, 'longTerm'); // 10分钟缓存
    }

    return stats;
  }

  /**
   * 获取任务详情
   */
  async getTaskDetail(taskId, studentId) {
    const task = await this.taskRepository.findTaskByIdAndStudent(taskId, studentId);
    
    if (!task) {
      throw new NotFoundError('任务', taskId);
    }

    return task;
  }

  /**
   * 验证任务更新数据
   */
  validateTaskUpdateData(updateData) {
    const { completed, duration, proof, completed_date, is_future_task } = updateData;

    if (completed !== undefined && typeof completed !== 'boolean') {
      throw new ValidationError('completed 字段必须是布尔值');
    }

    if (duration) {
      if (duration.hour !== undefined && (typeof duration.hour !== 'number' || duration.hour < 0 || duration.hour > 23)) {
        throw new ValidationError('duration.hour 必须是0-23之间的数字');
      }
      if (duration.minute !== undefined && (typeof duration.minute !== 'number' || duration.minute < 0 || duration.minute > 59)) {
        throw new ValidationError('duration.minute 必须是0-59之间的数字');
      }
    }

    if (proof !== undefined && proof !== null && typeof proof !== 'string') {
      throw new ValidationError('proof 字段必须是字符串或null');
    }

    if (completed_date && !/^\d{4}-\d{2}-\d{2}$/.test(completed_date)) {
      throw new ValidationError('completed_date 必须是YYYY-MM-DD格式');
    }

    if (is_future_task !== undefined && typeof is_future_task !== 'boolean') {
      throw new ValidationError('is_future_task 字段必须是布尔值');
    }
  }

  /**
   * 验证批量任务数据
   */
  validateTasksBatchData(tasksData) {
    if (!Array.isArray(tasksData) || tasksData.length === 0) {
      throw new ValidationError('任务数据必须是非空数组');
    }

    const requiredFields = ['id', 'student_id', 'task_date', 'task_type', 'title'];
    
    tasksData.forEach((task, index) => {
      requiredFields.forEach(field => {
        if (!task[field]) {
          throw new ValidationError(`任务 ${index + 1} 缺少必需字段: ${field}`);
        }
      });

      if (!/^\d{4}-\d{2}-\d{2}$/.test(task.task_date)) {
        throw new ValidationError(`任务 ${index + 1} 的 task_date 必须是YYYY-MM-DD格式`);
      }
    });
  }

  /**
   * 清除任务相关缓存
   */
  async clearTaskCaches(studentId = null) {
    if (studentId) {
      // 清除特定学生的缓存
      await cacheService.delByPattern(`tasks:${studentId}:.*`, 'main');
      await cacheService.delByPattern(`stats:student:${studentId}:.*`, 'main');
    } else {
      // 清除所有任务相关缓存
      await cacheService.delByPattern('tasks:.*', 'main');
      await cacheService.delByPattern('stats:.*', 'main');
      await cacheService.delByPattern('stats:.*', 'longTerm');
      await cacheService.delByPattern('ranking:.*', 'longTerm');
    }

    logger.info('Task caches cleared', { studentId });
  }

  /**
   * 获取任务服务统计信息
   */
  async getServiceStats() {
    const cacheStats = cacheService.getStats();
    
    return {
      cache: cacheStats,
      timestamp: new Date().toISOString()
    };
  }
}

// 创建单例实例
const taskService = new TaskService();

module.exports = taskService;
