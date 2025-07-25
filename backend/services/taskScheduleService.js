const moment = require('moment');
const { query, transaction } = require('../config/database');

/**
 * 任务调度服务
 * 处理任务的顺延、结转等复杂逻辑
 */

/**
 * 请假时的任务顺延处理
 * @param {string} studentId 学生ID
 * @param {string} leaveDate 请假日期 (YYYY-MM-DD)
 * @param {object} connection 数据库连接（事务中使用）
 */
async function handleLeaveDefer(studentId, leaveDate, connection) {
  try {
    // 1. 获取请假当天的未完成任务
    const incompleteTasks = await connection.all(
      `SELECT * FROM tasks
       WHERE student_id = ? AND task_date = ? AND completed = 0
       AND task_type NOT IN ('休息', 'leave')
       ORDER BY created_at ASC`,
      [studentId, leaveDate]
    );

    console.log(`请假日期 ${leaveDate} 的未完成任务数量: ${incompleteTasks.length}`);

    if (incompleteTasks.length === 0) {
      return { affectedTasks: 0, details: '无需顺延任务' };
    }

    // 2. 获取全局调度配置
    const configs = await connection.all(
      'SELECT config_key, config_value FROM schedule_config'
    );

    // 解析配置
    const configMap = {};
    configs.forEach(row => {
      configMap[row.config_key] = row.config_value;
    });

    const config = {
      daily_task_limit: parseInt(configMap.daily_task_limit) || 4,
      carry_over_threshold: parseInt(configMap.carry_over_threshold) || 3,
      advance_days_limit: parseInt(configMap.advance_days_limit) || 5
    };

    // 3. 找到下一个非休息日作为顺延目标日期
    const nextWorkDate = await findNextWorkDate(studentId, leaveDate, connection);
    
    // 4. 准备请假当天的未完成任务数据
    const tasksToDefer = incompleteTasks.map(task => ({
      id: task.id,
      task_type: task.task_type,
      title: task.title,
      task_date: leaveDate,
      original_date: task.original_date || leaveDate,
      task_status: task.task_status || 'normal'
    }));

    // 5. 删除请假当天的未完成任务
    const taskIds = incompleteTasks.map(task => task.id);
    await connection.run(
      `DELETE FROM tasks WHERE id IN (${taskIds.map(() => '?').join(',')})`,
      taskIds
    );

    // 6. 使用递归函数重新安排任务
    const deferResult = await scheduleTasksRecursively(studentId, leaveDate, tasksToDefer, connection, { currentDepth: 0 });

    // 6. 记录调度历史
    await connection.run(
      `INSERT INTO task_schedule_history
       (student_id, operation_type, operation_date, affected_tasks, details)
       VALUES (?, 'defer', ?, ?, ?)`,
      [
        studentId,
        leaveDate,
        incompleteTasks.length,
        JSON.stringify({
          leaveDate,
          deferredTo: nextWorkDate,
          taskIds: taskIds
        })
      ]
    );

    return {
      affectedTasks: deferResult.affectedTasks,
      deferredTo: nextWorkDate,
      details: `请假顺延: ${deferResult.details}`
    };

  } catch (error) {
    console.error('请假顺延处理失败:', error);
    throw error;
  }
}

/**
 * 递归级联顺延逻辑（借鉴HTML版本的简洁实现）
 * @param {string} studentId 学生ID
 * @param {string} startDate 开始顺延的日期
 * @param {Array} tasksToSchedule 需要顺延的任务列表
 * @param {object} connection 数据库连接
 * @param {object} options 选项
 */
async function scheduleTasksRecursively(studentId, startDate, tasksToSchedule, connection, options = {}) {
  try {
    const { maxDepth = 50, currentDepth = 0 } = options;

    // 防止无限递归
    if (currentDepth > maxDepth) {
      console.log(`⚠️ 达到最大递归深度 ${maxDepth}，停止顺延`);
      return { affectedTasks: 0, details: '达到最大递归深度' };
    }

    // 如果没有任务需要顺延，直接返回
    if (!tasksToSchedule || tasksToSchedule.length === 0) {
      return { affectedTasks: 0, details: '没有任务需要顺延' };
    }

    console.log(`🔄 递归顺延 (深度${currentDepth}): 日期=${startDate}, 任务数=${tasksToSchedule.length}`);

    // 找到下一个工作日
    const targetDate = await findNextWorkDate(studentId, startDate, connection);
    console.log(`📅 目标日期: ${targetDate}`);

    // 获取目标日期的现有任务
    const existingTasks = await connection.all(
      `SELECT id, task_type, title, task_status, original_date
       FROM tasks
       WHERE student_id = ? AND task_date = ? AND task_type NOT IN ('leave', '休息')`,
      [studentId, targetDate]
    );

    console.log(`📋 目标日期 ${targetDate} 现有任务: ${existingTasks.length}个`);

    // 为新任务生成唯一ID（避免冲突）
    const tasksWithNewIds = tasksToSchedule.map((task, index) => {
      // 提取原始任务的基础信息
      const parts = task.id.split('-');
      const studentId = parts[0];
      const originalDate = parts[1];

      // 生成新的简短ID
      const newId = `${studentId}-${targetDate}-${Date.now()}-${index}`;

      return {
        ...task,
        id: newId,
        original_date: task.original_date || task.task_date || startDate,
        task_status: 'deferred',
        defer_reason: 'cascade_defer'
      };
    });

    // 插入新任务到目标日期
    for (const task of tasksWithNewIds) {
      await connection.run(
        `INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status, defer_reason, original_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          task.id,
          studentId,
          targetDate,
          task.task_type,
          task.title,
          false,
          task.task_status,
          task.defer_reason,
          task.original_date
        ]
      );
    }

    console.log(`✅ 插入了 ${tasksWithNewIds.length} 个任务到 ${targetDate}`);

    // 如果目标日期有现有任务，需要递归顺延这些被挤占的任务
    let recursiveResult = { affectedTasks: 0, details: '' };
    if (existingTasks.length > 0) {
      console.log(`🔄 递归处理被挤占的 ${existingTasks.length} 个任务`);

      // 删除被挤占的任务
      const existingTaskIds = existingTasks.map(t => t.id);
      await connection.run(
        `DELETE FROM tasks WHERE id IN (${existingTaskIds.map(() => '?').join(',')})`,
        existingTaskIds
      );

      // 递归顺延被挤占的任务
      recursiveResult = await scheduleTasksRecursively(
        studentId,
        targetDate,
        existingTasks,
        connection,
        { maxDepth, currentDepth: currentDepth + 1 }
      );
    }

    return {
      affectedTasks: tasksWithNewIds.length + recursiveResult.affectedTasks,
      details: `顺延${tasksWithNewIds.length}个任务到${targetDate}${recursiveResult.details ? ', ' + recursiveResult.details : ''}`
    };

  } catch (error) {
    const depth = options?.currentDepth || 0;
    console.error(`❌ 递归顺延失败 (深度${depth}):`, error);
    throw error;
  }
}

/**
 * 简化的级联顺延入口函数
 */
async function deferFutureTasks(studentId, fromDate, connection) {
  try {
    console.log(`🔄 开始级联顺延: 学生=${studentId}, 起始日期=${fromDate}`);

    // 获取需要顺延的未来任务
    const futureTasks = await connection.all(
      `SELECT id, task_type, title, task_status, original_date, task_date
       FROM tasks
       WHERE student_id = ? AND task_date > ?
       AND task_type NOT IN ('leave', '休息')
       ORDER BY task_date ASC`,
      [studentId, fromDate]
    );

    if (futureTasks.length === 0) {
      console.log('📌 没有需要顺延的未来任务');
      return { affectedTasks: 0, details: '没有需要顺延的未来任务' };
    }

    console.log(`📊 找到 ${futureTasks.length} 个需要顺延的任务`);

    // 删除原有的未来任务
    const futureTaskIds = futureTasks.map(t => t.id);
    await connection.run(
      `DELETE FROM tasks WHERE id IN (${futureTaskIds.map(() => '?').join(',')})`,
      futureTaskIds
    );

    // 使用递归函数重新安排这些任务
    const result = await scheduleTasksRecursively(studentId, fromDate, futureTasks, connection, { currentDepth: 0 });

    console.log(`🎉 级联顺延完成: ${result.details}`);
    return result;

  } catch (error) {
    console.error('❌ 级联顺延失败:', error);
    throw error;
  }
}

/**
 * 查找下一个工作日（非休息日）
 * @param {string} studentId 学生ID
 * @param {string} fromDate 开始日期
 * @param {object} connection 数据库连接
 * @returns {string} 下一个工作日期
 */
async function findNextWorkDate(studentId, fromDate, connection) {
  let checkDate = moment(fromDate).add(1, 'day');
  const maxCheck = 7; // 最多检查7天，避免跳跃太远
  let checkCount = 0;

  while (checkCount < maxCheck) {
    const dateStr = checkDate.format('YYYY-MM-DD');

    // 检查这一天是否是休息日
    const restTasks = await connection.all(
      `SELECT id FROM tasks
       WHERE student_id = ? AND task_date = ? AND task_type = '休息'`,
      [studentId, dateStr]
    );

    if (restTasks.length === 0) {
      return dateStr; // 找到非休息日
    }

    checkDate.add(1, 'day');
    checkCount++;
  }

  // 如果7天内都是休息日，直接返回明天（不再跳跃太远）
  return moment(fromDate).add(1, 'day').format('YYYY-MM-DD');
}

/**
 * 从指定日期开始查找下一个工作日（如果指定日期本身不是休息日，就返回它）
 */
async function findNextWorkDateFrom(studentId, fromDate, connection) {
  const checkDate = moment(fromDate);
  const maxCheck = 7; // 最多检查7天，避免跳跃太远
  let checkCount = 0;

  while (checkCount < maxCheck) {
    const dateStr = checkDate.format('YYYY-MM-DD');

    // 检查这一天是否是休息日
    const restTasks = await connection.all(
      `SELECT id FROM tasks
       WHERE student_id = ? AND task_date = ? AND task_type = '休息'`,
      [studentId, dateStr]
    );

    if (restTasks.length === 0) {
      return dateStr; // 找到非休息日
    }

    checkDate.add(1, 'day');
    checkCount++;
  }

  // 如果7天内都是休息日，直接返回指定日期
  return fromDate;
}

/**
 * 处理24:00的未完成任务自动调度
 * @param {string} studentId 学生ID
 * @param {string} targetDate 目标日期
 */
async function handleMidnightTaskReschedule(studentId, targetDate) {
  try {
    console.log(`🕛 开始处理24:00任务调度: 学生=${studentId}, 日期=${targetDate}`);
    
    await transaction(async (connection) => {
      // 获取当天未完成的任务
      const incompleteTasks = await connection.all(
        `SELECT * FROM tasks
         WHERE student_id = ? AND task_date = ? AND completed = 0
         AND task_type NOT IN ('休息', 'leave')
         ORDER BY created_at ASC`,
        [studentId, targetDate]
      );

      console.log(`📊 查询到 ${incompleteTasks.length} 个未完成任务`);
      if (incompleteTasks.length > 0) {
        incompleteTasks.forEach((task, index) => {
          console.log(`  ${index + 1}. ${task.title} (ID: ${task.id})`);
        });
      }

      if (incompleteTasks.length === 0) {
        console.log(`ℹ️ ${studentId} 在 ${targetDate} 没有未完成任务，无需处理`);
        return;
      }

      // 获取学生的个人配置，如果没有则使用默认值
      const studentConfigs = await connection.all(
        'SELECT config_value FROM schedule_config WHERE (student_id = ? OR student_id IS NULL) AND config_key = ? ORDER BY student_id DESC LIMIT 1',
        [studentId, 'carry_over_threshold']
      );

      let threshold = 3; // 默认阈值
      if (studentConfigs.length > 0) {
        threshold = parseInt(studentConfigs[0].config_value) || 3;
      }
      console.log(`⚖️ 结转阈值: ${threshold}, 当前未完成任务数: ${incompleteTasks.length}`);

      if (incompleteTasks.length < threshold) {
        console.log(`📦 执行结转模式 (${incompleteTasks.length} < ${threshold})`);
        await carryOverTasks(studentId, targetDate, incompleteTasks, connection);
      } else {
        console.log(`🔄 执行顺延模式 (${incompleteTasks.length} >= ${threshold})`);
        await deferTasksAsNewDay(studentId, targetDate, incompleteTasks, connection);
      }
    });

  } catch (error) {
    console.error('❌ 24:00任务重新调度失败:', error);
    throw error;
  }
}

/**
 * 结转任务到下一天
 */
async function carryOverTasks(studentId, fromDate, tasks, connection) {
  console.log(`🔄 开始结转任务: 学生=${studentId}, 原日期=${fromDate}, 任务数=${tasks.length}`);
  
  const nextWorkDate = await findNextWorkDate(studentId, fromDate, connection);
  console.log(`📅 找到下一个工作日: ${nextWorkDate}`);
  
  const taskIds = tasks.map(t => t.id);
  console.log(`📝 需要结转的任务ID: ${taskIds.join(', ')}`);

  const updateResult = await connection.run(
    `UPDATE tasks
     SET original_date = COALESCE(original_date, task_date),
         task_date = ?,
         task_status = 'carried_over',
         defer_reason = 'incomplete'
     WHERE id IN (${taskIds.map(() => '?').join(',')})`,
    [nextWorkDate, ...taskIds]
  );

  console.log(`✅ 结转 ${tasks.length} 个任务到 ${nextWorkDate}，影响行数: ${updateResult.changes}`);
}

/**
 * 顺延任务形成新的一天
 */
async function deferTasksAsNewDay(studentId, fromDate, tasks, connection) {
  console.log(`🔄 整体顺延模式: 处理 ${tasks.length} 个未完成任务 (${fromDate})`);

  try {
    // 准备当天未完成任务的数据
    const tasksToDefer = tasks.map(task => ({
      id: task.id,
      task_type: task.task_type,
      title: task.title,
      task_date: fromDate,
      original_date: task.original_date || fromDate,
      task_status: task.task_status || 'normal'
    }));

    // 删除当天的未完成任务
    const taskIds = tasks.map(t => t.id);
    await connection.run(
      `DELETE FROM tasks WHERE id IN (${taskIds.map(() => '?').join(',')})`,
      taskIds
    );

    console.log(`🗑️ 删除了当天 ${tasks.length} 个未完成任务`);

    // 使用递归函数重新安排所有任务（包括当天的和后续的）
    const result = await scheduleTasksRecursively(studentId, fromDate, tasksToDefer, connection, { currentDepth: 0 });

    console.log(`🎉 整体顺延完成: ${result.details}`);
    return result;

  } catch (error) {
    console.error('❌ 整体顺延失败:', error);
    throw error;
  }
}

module.exports = {
  handleLeaveDefer,
  handleMidnightTaskReschedule,
  findNextWorkDate,
  deferFutureTasks,
  scheduleTasksRecursively
};