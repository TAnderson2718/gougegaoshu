const { query } = require('./config/database');

async function checkAllST001Tasks() {
  try {
    console.log('=== 重新检查ST001学生的所有任务 ===');
    
    const tasks = await query(
      'SELECT task_date, task_type, title, task_status FROM tasks WHERE student_id = ? ORDER BY task_date, task_type',
      ['ST001']
    );
    
    console.log(`ST001学生总任务数: ${tasks.length}`);
    
    console.log('\n按日期分组的任务:');
    const tasksByDate = {};
    tasks.forEach(task => {
      const dateStr = task.task_date.toISOString().split('T')[0];
      if (!tasksByDate[dateStr]) {
        tasksByDate[dateStr] = [];
      }
      tasksByDate[dateStr].push(task);
    });
    
    Object.keys(tasksByDate).sort().forEach(date => {
      const dayOfWeek = new Date(date).getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      console.log(`\n${date} (${dayNames[dayOfWeek]}): ${tasksByDate[date].length}个任务`);
      tasksByDate[date].forEach(task => {
        console.log(`  ${task.task_type} - ${task.title} [${task.task_status || 'normal'}]`);
      });
    });
    
    // 特别检查7月份的周日
    console.log('\n=== 7月份周日检查 ===');
    const sundays = ['2025-07-06', '2025-07-13', '2025-07-20', '2025-07-27'];
    for (const sunday of sundays) {
      const sundayTasks = await query(
        'SELECT task_type, title FROM tasks WHERE student_id = ? AND task_date = ?',
        ['ST001', sunday]
      );
      console.log(`${sunday}: ${sundayTasks.length}个任务`);
      sundayTasks.forEach(task => {
        console.log(`  ${task.task_type} - ${task.title}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkAllST001Tasks();
