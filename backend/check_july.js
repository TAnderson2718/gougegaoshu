const { query } = require('./config/database');

async function checkJulyTasks() {
  try {
    console.log('=== 检查7月份任务分布 ===');
    
    // 检查7月份每一天的任务数量
    const julyTasks = await query(
      'SELECT task_date, COUNT(*) as task_count, SUM(CASE WHEN task_type = "休息" THEN 1 ELSE 0 END) as rest_count FROM tasks WHERE student_id = "ST001" AND task_date >= "2025-07-01" AND task_date <= "2025-07-31" GROUP BY task_date ORDER BY task_date',
      []
    );
    
    console.log('7月份任务分布:');
    for (let day = 1; day <= 31; day++) {
      const dateStr = '2025-07-' + day.toString().padStart(2, '0');
      const taskData = julyTasks.find(t => t.task_date.toISOString().split('T')[0] === dateStr);
      
      if (taskData) {
        const isRestDay = taskData.rest_count > 0;
        const status = isRestDay ? '休息日' : taskData.task_count + '个任务';
        console.log('  ' + dateStr + ': ' + status);
      } else {
        console.log('  ' + dateStr + ': 无任务');
      }
    }
    
    // 统计工作日和休息日
    console.log('\n=== 统计信息 ===');
    const workDays = julyTasks.filter(t => t.rest_count == 0);
    const restDays = julyTasks.filter(t => t.rest_count > 0);
    const emptyDays = [];
    
    for (let day = 1; day <= 31; day++) {
      const dateStr = '2025-07-' + day.toString().padStart(2, '0');
      const hasTask = julyTasks.some(t => t.task_date.toISOString().split('T')[0] === dateStr);
      if (!hasTask) {
        emptyDays.push(dateStr);
      }
    }
    
    console.log('工作日数量: ' + workDays.length);
    console.log('休息日数量: ' + restDays.length);
    console.log('无任务日期数量: ' + emptyDays.length);
    
    if (emptyDays.length > 0) {
      console.log('\n无任务的日期:');
      emptyDays.forEach(date => console.log('  ' + date));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkJulyTasks();
