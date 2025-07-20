const { query } = require('./config/database');

async function checkRestDays() {
  try {
    console.log('=== 检查休息日导入情况 ===');
    
    // 检查7月份所有休息任务
    const restTasks = await query(`
      SELECT student_id, task_date, task_type, title, created_at
      FROM tasks 
      WHERE task_type = '休息' AND task_date LIKE '2025-07%'
      ORDER BY task_date, student_id
    `);
    
    console.log(`找到 ${restTasks.length} 个休息任务:`);
    
    restTasks.forEach(task => {
      const taskDate = task.task_date.toISOString().split('T')[0];
      const createdAt = task.created_at.toISOString();
      console.log(`  ${task.student_id} - ${taskDate} - ${task.title} (创建时间: ${createdAt})`);
    });
    
    // 检查7月5日和7月6日的所有任务
    console.log('\n=== 检查7月5日和7月6日的任务 ===');
    
    const dates = ['2025-07-05', '2025-07-06'];
    for (const date of dates) {
      console.log(`\n${date}:`);
      
      const tasks = await query(`
        SELECT student_id, task_type, title
        FROM tasks 
        WHERE task_date = ?
        ORDER BY student_id, task_type
      `, [date]);
      
      if (tasks.length === 0) {
        console.log('  没有任务');
      } else {
        const st001Tasks = tasks.filter(t => t.student_id === 'ST001');
        const st002Tasks = tasks.filter(t => t.student_id === 'ST002');
        
        console.log(`  ST001: ${st001Tasks.length}个任务`);
        st001Tasks.forEach(t => console.log(`    ${t.task_type} - ${t.title}`));
        
        console.log(`  ST002: ${st002Tasks.length}个任务`);
        st002Tasks.forEach(t => console.log(`    ${t.task_type} - ${t.title}`));
      }
    }
    
    // 检查周几
    console.log('\n=== 检查日期是周几 ===');
    dates.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      console.log(`${dateStr}: 周${dayNames[dayOfWeek]}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkRestDays();
