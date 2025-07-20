const { query } = require('./config/database');

async function simpleCheck() {
  try {
    console.log('🔍 简单检查数据库状态');
    console.log('=====================================\n');

    // 查询所有休息任务
    const restTasks = await query(`
      SELECT task_date, student_id, title
      FROM tasks 
      WHERE task_type = '休息'
      ORDER BY task_date, student_id
    `);

    console.log(`找到 ${restTasks.length} 个休息任务:`);
    
    const dateGroups = {};
    restTasks.forEach(task => {
      const dateStr = task.task_date.toISOString().split('T')[0];
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = [];
      }
      dateGroups[dateStr].push(task);
    });

    Object.entries(dateGroups).forEach(([dateStr, tasks]) => {
      console.log(`  ${dateStr}: ${tasks.length}个休息任务`);
      tasks.forEach(task => {
        console.log(`    ${task.student_id}: ${task.title}`);
      });
    });

    // 检查这些日期是否有其他任务
    console.log('\n🔍 检查休息日是否有其他任务...');
    
    const restDates = Object.keys(dateGroups);
    for (const dateStr of restDates) {
      const allTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
        ORDER BY task_type
      `, [dateStr]);
      
      const taskTypes = allTasks.map(t => t.task_type);
      const isRestOnly = taskTypes.length === 1 && taskTypes[0] === '休息';
      
      console.log(`  ${dateStr}: ${taskTypes.join(', ')} ${isRestOnly ? '✅' : '❌'}`);
    }

    console.log('\n=====================================');
    console.log(`总结: 找到 ${restDates.length} 个有休息任务的日期`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

simpleCheck();
