const { query } = require('./config/database');

async function checkTaskDistribution() {
  try {
    console.log('🔍 检查任务分配情况...');
    
    // 1. 检查7月份所有任务的分布
    console.log('\n📊 7月份任务分布统计:');
    const julyStats = await query(`
      SELECT
        DATE_FORMAT(task_date, '%Y-%m-%d') as date,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks,
        GROUP_CONCAT(CONCAT(title, '(', CASE WHEN completed = 1 THEN '✅' ELSE '❌' END, ')') SEPARATOR ', ') as task_list
      FROM tasks
      WHERE student_id = 'ST001'
      AND task_date >= '2025-07-01'
      AND task_date < '2025-08-01'
      GROUP BY DATE_FORMAT(task_date, '%Y-%m-%d')
      ORDER BY date
    `);
    
    console.log('日期 | 完成/总数 | 完成率 | 任务列表');
    console.log('-----|----------|--------|----------');
    
    julyStats.forEach(row => {
      const completionRate = row.total_tasks > 0 ? Math.round((row.completed_tasks / row.total_tasks) * 100) : 0;
      console.log(`${row.date} | ${row.completed_tasks}/${row.total_tasks} | ${completionRate}% | ${row.task_list}`);
    });
    
    // 2. 检查是否有任务被意外移动到其他日期
    console.log('\n🔍 检查任务调度历史:');
    const scheduleHistory = await query(`
      SELECT 
        operation_date,
        operation_type,
        affected_tasks,
        details,
        created_at
      FROM task_schedule_history 
      WHERE student_id = 'ST001'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (scheduleHistory.length > 0) {
      console.log('最近的任务调度记录:');
      scheduleHistory.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.operation_date} - ${record.operation_type}`);
        console.log(`     影响任务数: ${record.affected_tasks}`);
        console.log(`     时间: ${record.created_at}`);
        if (record.details) {
          try {
            const details = JSON.parse(record.details);
            console.log(`     详情: ${JSON.stringify(details, null, 6)}`);
          } catch (e) {
            console.log(`     详情: ${record.details}`);
          }
        }
        console.log('');
      });
    } else {
      console.log('没有找到任务调度历史记录');
    }
    
    // 3. 检查是否有original_date字段的任务（被延期的任务）
    console.log('\n📅 检查延期任务:');
    const deferredTasks = await query(`
      SELECT 
        id,
        title,
        DATE_FORMAT(task_date, '%Y-%m-%d') as task_current_date,
        DATE_FORMAT(original_date, '%Y-%m-%d') as original_date,
        completed,
        task_status
      FROM tasks 
      WHERE student_id = 'ST001' 
      AND original_date IS NOT NULL
      ORDER BY original_date, task_date
    `);
    
    if (deferredTasks.length > 0) {
      console.log('发现延期任务:');
      deferredTasks.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.title}`);
        console.log(`     原始日期: ${task.original_date}`);
        console.log(`     当前日期: ${task.task_current_date}`);
        console.log(`     状态: ${task.completed ? '✅已完成' : '❌未完成'}`);
        console.log(`     任务状态: ${task.task_status}`);
        console.log('');
      });
    } else {
      console.log('没有发现延期任务');
    }
    
    // 4. 检查请假记录
    console.log('\n🏖️ 检查请假记录:');
    const leaveRecords = await query(`
      SELECT 
        DATE_FORMAT(leave_date, '%Y-%m-%d') as leave_date,
        created_at
      FROM leave_records 
      WHERE student_id = 'ST001'
      ORDER BY leave_date
    `);
    
    if (leaveRecords.length > 0) {
      console.log('请假记录:');
      leaveRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.leave_date} (申请时间: ${record.created_at})`);
      });
    } else {
      console.log('没有请假记录');
    }
    
    // 5. 检查7月21日前后几天的详细情况
    console.log('\n🎯 7月21日前后任务详情:');
    const detailedTasks = await query(`
      SELECT 
        id,
        title,
        task_type,
        DATE_FORMAT(task_date, '%Y-%m-%d') as task_date,
        DATE_FORMAT(original_date, '%Y-%m-%d') as original_date,
        completed,
        task_status,
        created_at
      FROM tasks 
      WHERE student_id = 'ST001' 
      AND task_date BETWEEN '2025-07-19' AND '2025-07-23'
      ORDER BY task_date, created_at
    `);
    
    detailedTasks.forEach(task => {
      console.log(`📋 ${task.task_date}: ${task.title} (${task.task_type})`);
      console.log(`   状态: ${task.completed ? '✅已完成' : '❌未完成'}`);
      console.log(`   任务状态: ${task.task_status || 'normal'}`);
      if (task.original_date && task.original_date !== task.task_date) {
        console.log(`   ⚠️ 原始日期: ${task.original_date} -> 当前日期: ${task.task_date}`);
      }
      console.log(`   创建时间: ${task.created_at}`);
      console.log('');
    });
    
    // 6. 总结分析
    console.log('\n📈 分析总结:');
    const totalTasks = julyStats.reduce((sum, row) => sum + row.total_tasks, 0);
    const totalCompleted = julyStats.reduce((sum, row) => sum + row.completed_tasks, 0);
    const overallRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;
    
    console.log(`总任务数: ${totalTasks}`);
    console.log(`已完成: ${totalCompleted}`);
    console.log(`总完成率: ${overallRate}%`);
    
    // 检查是否有异常的日期分布
    const tasksPerDay = julyStats.filter(row => !row.task_list.includes('休息') && !row.task_list.includes('请假'));
    const taskCounts = tasksPerDay.map(row => row.total_tasks);
    const avgTasksPerDay = taskCounts.length > 0 ? (taskCounts.reduce((a, b) => a + b, 0) / taskCounts.length).toFixed(1) : 0;
    
    console.log(`工作日平均任务数: ${avgTasksPerDay}`);
    
    const anomalies = tasksPerDay.filter(row => row.total_tasks === 1);
    if (anomalies.length > 0) {
      console.log('\n⚠️ 发现异常（只有1个任务的工作日）:');
      anomalies.forEach(row => {
        console.log(`  ${row.date}: ${row.task_list}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkTaskDistribution();
