// 恢复被顺延的任务脚本
const { query } = require('../config/database');

async function restoreDeferredTasks() {
  try {
    console.log('=== 开始恢复被顺延的任务 ===');
    
    // 1. 检查当前被顺延的任务
    console.log('\n1. 检查被顺延的任务...');
    const deferredTasks = await query(`
      SELECT id, student_id, task_date, original_date, task_type, title, task_status 
      FROM tasks 
      WHERE student_id = 'ST001' AND task_status = 'deferred' AND original_date IS NOT NULL
      ORDER BY original_date
    `);
    
    console.log(`发现 ${deferredTasks.length} 个被顺延的任务`);
    
    if (deferredTasks.length === 0) {
      console.log('没有需要恢复的任务');
      return;
    }
    
    // 2. 显示恢复计划
    console.log('\n2. 恢复计划:');
    const restorePlan = {};
    deferredTasks.forEach(task => {
      const originalDate = task.original_date.toISOString().split('T')[0];
      const currentDate = task.task_date.toISOString().split('T')[0];
      
      if (!restorePlan[originalDate]) {
        restorePlan[originalDate] = [];
      }
      restorePlan[originalDate].push({
        id: task.id,
        type: task.task_type,
        title: task.title,
        currentDate: currentDate
      });
    });
    
    Object.keys(restorePlan).sort().forEach(date => {
      console.log(`  ${date}: ${restorePlan[date].length} 个任务`);
      restorePlan[date].forEach(task => {
        console.log(`    ${task.type} - ${task.title} (当前在: ${task.currentDate})`);
      });
    });
    
    // 3. 恢复7月14-15日的任务
    await restoreSpecificDates(['2025-07-14', '2025-07-15']);
    
  } catch (error) {
    console.error('恢复任务失败:', error);
    throw error;
  }
}

async function restoreSpecificDates(targetDates) {
  try {
    console.log(`\n=== 恢复指定日期的任务: ${targetDates.join(', ')} ===`);
    
    for (const targetDate of targetDates) {
      console.log(`\n处理 ${targetDate}...`);
      
      // 查找该日期的被顺延任务
      const tasksToRestore = await query(`
        SELECT id, task_type, title, task_date, original_date
        FROM tasks 
        WHERE student_id = 'ST001' 
          AND task_status = 'deferred' 
          AND original_date = ?
      `, [targetDate]);
      
      if (tasksToRestore.length === 0) {
        console.log(`  ${targetDate}: 没有需要恢复的任务`);
        continue;
      }
      
      console.log(`  找到 ${tasksToRestore.length} 个任务需要恢复`);
      
      // 恢复任务
      for (const task of tasksToRestore) {
        await query(`
          UPDATE tasks 
          SET task_date = original_date, 
              task_status = 'normal',
              updated_at = NOW()
          WHERE id = ?
        `, [task.id]);
        
        console.log(`    ✓ 恢复: ${task.task_type} - ${task.title}`);
      }
    }
    
    console.log('\n=== 恢复完成 ===');
    
    // 验证恢复结果
    console.log('\n验证恢复结果:');
    for (const targetDate of targetDates) {
      const restoredTasks = await query(`
        SELECT task_type, title, task_status
        FROM tasks 
        WHERE student_id = 'ST001' AND task_date = ?
        ORDER BY task_type
      `, [targetDate]);
      
      console.log(`${targetDate}: ${restoredTasks.length} 个任务`);
      restoredTasks.forEach(task => {
        console.log(`  ${task.task_type} - ${task.title} [${task.task_status}]`);
      });
    }
    
  } catch (error) {
    console.error('恢复指定日期任务失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  restoreDeferredTasks()
    .then(() => {
      console.log('\n任务恢复完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

/**
 * 智能恢复过度顺延的任务
 */
async function restoreOverDeferredTasks() {
  try {
    console.log('=== 智能恢复过度顺延的任务 ===');

    // 1. 找到过度顺延的任务（顺延超过7天的）
    const overDeferredTasks = await query(`
      SELECT original_date, task_date, COUNT(*) as count,
             GROUP_CONCAT(id) as task_ids,
             GROUP_CONCAT(CONCAT(task_type, ':', title) SEPARATOR '; ') as task_details
      FROM tasks
      WHERE student_id = 'ST001'
        AND task_status = 'deferred'
        AND original_date IS NOT NULL
        AND DATEDIFF(task_date, original_date) > 7
      GROUP BY original_date, task_date
      ORDER BY original_date
    `);

    console.log(`发现 ${overDeferredTasks.length} 组过度顺延的任务`);

    if (overDeferredTasks.length === 0) {
      console.log('没有过度顺延的任务需要恢复');
      return;
    }

    // 2. 分析恢复策略
    console.log('\n分析恢复策略:');
    const restoreStrategy = [];

    for (const taskGroup of overDeferredTasks) {
      const originalDate = taskGroup.original_date.toISOString().split('T')[0];
      const currentDate = taskGroup.task_date.toISOString().split('T')[0];
      const deferDays = Math.floor((new Date(currentDate) - new Date(originalDate)) / (1000 * 60 * 60 * 24));

      console.log(`  ${originalDate} -> ${currentDate}: ${taskGroup.count}个任务 (顺延${deferDays}天)`);

      // 确定恢复目标日期
      let targetDate;
      const today = new Date().toISOString().split('T')[0];

      if (originalDate < today) {
        // 过去的日期，恢复到最近的工作日
        targetDate = await findNearestWorkDate(originalDate);
      } else {
        // 未来的日期，恢复到原始日期
        targetDate = originalDate;
      }

      restoreStrategy.push({
        originalDate,
        currentDate,
        targetDate,
        taskIds: taskGroup.task_ids.split(','),
        count: taskGroup.count,
        details: taskGroup.task_details
      });
    }

    // 3. 执行恢复
    console.log('\n执行恢复:');
    let totalRestored = 0;

    for (const strategy of restoreStrategy) {
      console.log(`恢复 ${strategy.originalDate} 的 ${strategy.count} 个任务到 ${strategy.targetDate}`);

      const taskIds = strategy.taskIds;
      await query(`
        UPDATE tasks
        SET task_date = ?,
            task_status = 'normal',
            defer_reason = NULL,
            updated_at = NOW()
        WHERE id IN (${taskIds.map(() => '?').join(',')})
      `, [strategy.targetDate, ...taskIds]);

      totalRestored += strategy.count;
      console.log(`  ✅ 恢复了 ${strategy.count} 个任务`);
    }

    console.log(`\n🎉 智能恢复完成，共恢复 ${totalRestored} 个任务`);

    // 4. 验证恢复结果
    await verifyRestoreResult();

  } catch (error) {
    console.error('智能恢复失败:', error);
    throw error;
  }
}

/**
 * 找到最近的工作日
 */
async function findNearestWorkDate(fromDate) {
  const today = new Date().toISOString().split('T')[0];

  // 如果原始日期是今天或未来，直接返回
  if (fromDate >= today) {
    return fromDate;
  }

  // 否则返回今天
  return today;
}

/**
 * 验证恢复结果
 */
async function verifyRestoreResult() {
  try {
    console.log('\n=== 验证恢复结果 ===');

    // 检查还有多少过度顺延的任务
    const remainingOverDeferred = await query(`
      SELECT COUNT(*) as count
      FROM tasks
      WHERE student_id = 'ST001'
        AND task_status = 'deferred'
        AND original_date IS NOT NULL
        AND DATEDIFF(task_date, original_date) > 7
    `);

    console.log(`剩余过度顺延任务: ${remainingOverDeferred[0].count} 个`);

    // 检查7月份的任务分布
    const julyTasks = await query(`
      SELECT task_date, COUNT(*) as count
      FROM tasks
      WHERE student_id = 'ST001'
        AND task_date BETWEEN '2025-07-01' AND '2025-07-31'
        AND task_type NOT IN ('leave', '休息')
      GROUP BY task_date
      ORDER BY task_date
    `);

    console.log('\n7月份任务分布:');
    julyTasks.forEach(row => {
      const date = row.task_date.toISOString().split('T')[0];
      console.log(`  ${date}: ${row.count}个任务`);
    });

  } catch (error) {
    console.error('验证失败:', error);
    throw error;
  }
}

module.exports = {
  restoreDeferredTasks,
  restoreSpecificDates,
  restoreOverDeferredTasks,
  verifyRestoreResult
};
