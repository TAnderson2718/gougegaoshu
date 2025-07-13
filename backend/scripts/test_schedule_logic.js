// 测试修复后的调度逻辑
const { query } = require('../config/database');

async function testScheduleLogic() {
  try {
    console.log('=== 测试修复后的调度逻辑 ===');
    
    // 1. 测试新的结转阈值
    await testCarryOverThreshold();
    
    // 2. 测试请假处理
    await testLeaveHandling();
    
    // 3. 测试24:00任务处理
    await testMidnightProcessing();
    
    // 4. 验证任务分布
    await verifyTaskDistribution();
    
    console.log('\n🎉 所有测试完成');
    
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  }
}

async function testCarryOverThreshold() {
  try {
    console.log('\n=== 测试结转阈值 ===');
    
    // 检查当前配置
    const configs = await query('SELECT * FROM schedule_config WHERE student_id = "ST001"');
    const config = configs[0];
    
    console.log(`当前配置: 结转阈值=${config.carry_over_threshold}, 每日限制=${config.daily_task_limit}`);
    
    // 模拟不同未完成任务数量的处理
    const testCases = [
      { incomplete: 2, expected: 'carry_over' },
      { incomplete: 4, expected: 'carry_over' },
      { incomplete: 5, expected: 'defer' },
      { incomplete: 6, expected: 'defer' }
    ];
    
    console.log('\n模拟24:00处理逻辑:');
    testCases.forEach(testCase => {
      const { incomplete, expected } = testCase;
      const threshold = config.carry_over_threshold;
      
      const actualMode = incomplete >= threshold ? 'defer' : 'carry_over';
      const status = actualMode === expected ? '✅' : '❌';
      
      console.log(`  ${incomplete}个未完成任务: ${actualMode} ${status}`);
    });
    
  } catch (error) {
    console.error('测试结转阈值失败:', error);
    throw error;
  }
}

async function testLeaveHandling() {
  try {
    console.log('\n=== 测试请假处理逻辑 ===');
    
    // 检查当前请假记录
    const leaveRecords = await query('SELECT * FROM leave_records ORDER BY leave_date DESC LIMIT 3');
    
    console.log('当前请假记录:');
    leaveRecords.forEach(record => {
      const date = record.leave_date.toISOString().split('T')[0];
      console.log(`  ${record.student_id} - ${date}`);
    });
    
    // 分析请假对任务的影响
    if (leaveRecords.length > 0) {
      const latestLeave = leaveRecords[0];
      const leaveDate = latestLeave.leave_date.toISOString().split('T')[0];
      
      console.log(`\n分析 ${leaveDate} 请假的影响:`);
      
      // 检查请假当天的任务
      const leaveDayTasks = await query(`
        SELECT COUNT(*) as count, task_status
        FROM tasks 
        WHERE student_id = ? AND task_date = ?
        GROUP BY task_status
      `, [latestLeave.student_id, leaveDate]);
      
      leaveDayTasks.forEach(row => {
        console.log(`  请假当天任务: ${row.count}个 (状态: ${row.task_status})`);
      });
      
      // 检查后续几天的任务状态
      const futureTasks = await query(`
        SELECT task_date, COUNT(*) as count, 
               SUM(CASE WHEN task_status = 'deferred' THEN 1 ELSE 0 END) as deferred_count
        FROM tasks 
        WHERE student_id = ? AND task_date > ? AND task_date <= DATE_ADD(?, INTERVAL 5 DAY)
        GROUP BY task_date
        ORDER BY task_date
      `, [latestLeave.student_id, leaveDate, leaveDate]);
      
      console.log('后续5天的任务状态:');
      futureTasks.forEach(row => {
        const date = row.task_date.toISOString().split('T')[0];
        console.log(`  ${date}: 总计${row.count}个, 顺延${row.deferred_count}个`);
      });
    }
    
  } catch (error) {
    console.error('测试请假处理失败:', error);
    throw error;
  }
}

async function testMidnightProcessing() {
  try {
    console.log('\n=== 测试24:00任务处理 ===');
    
    // 检查最近的24:00处理历史
    const midnightHistory = await query(`
      SELECT operation_date, affected_tasks, details
      FROM task_schedule_history 
      WHERE student_id = 'ST001' AND operation_type = 'midnight_process'
      ORDER BY operation_date DESC
      LIMIT 3
    `);
    
    if (midnightHistory.length > 0) {
      console.log('最近的24:00处理记录:');
      midnightHistory.forEach(record => {
        const date = record.operation_date.toISOString().split('T')[0];
        console.log(`  ${date}: 处理${record.affected_tasks}个任务`);
      });
    } else {
      console.log('没有24:00处理记录');
    }
    
    // 模拟当前日期的24:00处理
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n模拟 ${today} 的24:00处理:`);
    
    const todayTasks = await query(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as incomplete
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date = ?
        AND task_type NOT IN ('leave', '休息')
    `, [today]);
    
    if (todayTasks.length > 0 && todayTasks[0].total > 0) {
      const { total, incomplete } = todayTasks[0];
      const threshold = 5; // 新阈值
      
      console.log(`  今日任务: 总计${total}个, 未完成${incomplete || 0}个`);
      
      if ((incomplete || 0) >= threshold) {
        console.log(`  -> 会触发整体顺延 (${incomplete} >= ${threshold})`);
      } else {
        console.log(`  -> 会使用结转模式 (${incomplete || 0} < ${threshold})`);
      }
    } else {
      console.log('  今日没有任务');
    }
    
  } catch (error) {
    console.error('测试24:00处理失败:', error);
    throw error;
  }
}

async function verifyTaskDistribution() {
  try {
    console.log('\n=== 验证任务分布 ===');
    
    // 检查7月份的任务分布
    const julyStats = await query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(DISTINCT task_date) as active_days,
        SUM(CASE WHEN task_status = 'normal' THEN 1 ELSE 0 END) as normal_tasks,
        SUM(CASE WHEN task_status = 'deferred' THEN 1 ELSE 0 END) as deferred_tasks,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks
      FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_date BETWEEN '2025-07-01' AND '2025-07-31'
        AND task_type NOT IN ('leave', '休息')
    `);
    
    if (julyStats.length > 0) {
      const stats = julyStats[0];
      console.log('7月份任务统计:');
      console.log(`  总任务数: ${stats.total_tasks}`);
      console.log(`  活跃天数: ${stats.active_days}`);
      console.log(`  正常任务: ${stats.normal_tasks}`);
      console.log(`  顺延任务: ${stats.deferred_tasks}`);
      console.log(`  已完成: ${stats.completed_tasks}`);
      console.log(`  平均每天: ${(stats.total_tasks / stats.active_days).toFixed(1)}个任务`);
    }
    
    // 检查8月份的任务分布
    const augustStats = await query(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(DISTINCT task_date) as active_days
      FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_date BETWEEN '2025-08-01' AND '2025-08-31'
        AND task_type NOT IN ('leave', '休息')
    `);
    
    if (augustStats.length > 0 && augustStats[0].total_tasks > 0) {
      const stats = augustStats[0];
      console.log('\n8月份任务统计:');
      console.log(`  总任务数: ${stats.total_tasks}`);
      console.log(`  活跃天数: ${stats.active_days}`);
    } else {
      console.log('\n8月份: 没有任务 ✅');
    }
    
  } catch (error) {
    console.error('验证任务分布失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testScheduleLogic()
    .then(() => {
      console.log('\n测试完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = { testScheduleLogic };
