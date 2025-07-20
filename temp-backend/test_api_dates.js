const { query } = require('./config/database');
const moment = require('moment');

async function testTaskAPI() {
  try {
    console.log('=== 模拟前端API调用 ===');
    
    const studentId = 'ST001';
    const testDates = ['2025-07-01', '2025-07-07', '2025-07-14', '2025-07-28'];
    
    for (const testDate of testDates) {
      console.log(`\n测试日期: ${testDate}`);
      
      // 模拟后端API逻辑
      let sql = 'SELECT * FROM tasks WHERE student_id = ?';
      let params = [studentId];
      
      sql += ' AND task_date BETWEEN ? AND ?';
      params.push(testDate, testDate);
      
      sql += ' ORDER BY task_date ASC, created_at ASC';
      
      const tasks = await query(sql, params);
      
      console.log(`  数据库查询结果: ${tasks.length} 个任务`);
      
      // 按日期分组（模拟后端逻辑）
      const tasksByDate = {};
      tasks.forEach(task => {
        const dateStr = moment(task.task_date).format('YYYY-MM-DD');
        if (!tasksByDate[dateStr]) {
          tasksByDate[dateStr] = [];
        }
        tasksByDate[dateStr].push({
          id: task.id,
          type: task.task_type,
          title: task.title,
          completed: task.completed
        });
      });
      
      console.log(`  分组后的数据:`, Object.keys(tasksByDate));
      
      // 检查目标日期的任务
      const targetTasks = tasksByDate[testDate] || [];
      console.log(`  ${testDate} 的任务数: ${targetTasks.length}`);
      
      if (targetTasks.length > 0) {
        targetTasks.forEach(task => {
          console.log(`    - ${task.type}: ${task.title}`);
        });
      } else {
        console.log('    ❌ 该日期没有任务');
      }
    }
    
    // 额外检查：直接查询这些日期的原始数据
    console.log('\n=== 直接查询原始数据 ===');
    for (const testDate of testDates) {
      const rawTasks = await query(
        'SELECT id, task_date, task_type, title FROM tasks WHERE student_id = ? AND task_date = ?',
        [studentId, testDate]
      );
      
      console.log(`${testDate}: ${rawTasks.length} 个任务`);
      rawTasks.forEach(task => {
        const actualDate = task.task_date.toISOString().split('T')[0];
        console.log(`  ${task.task_type}: ${task.title} (实际日期: ${actualDate})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

testTaskAPI();
