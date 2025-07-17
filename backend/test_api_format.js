const { query } = require('./config/database');

async function testAPI() {
  try {
    console.log('🧪 测试任务API返回的数据格式...');
    
    // 模拟前端API调用
    const tasks = await query(`
      SELECT * FROM tasks 
      WHERE student_id = 'ST001' 
      AND task_date BETWEEN '2025-07-01' AND '2025-07-31'
      ORDER BY task_date ASC, created_at ASC
    `);
    
    // 按当前日期分组（模拟后端逻辑）
    const tasksByCurrentDate = {};
    const tasksByOriginalDate = {};

    tasks.forEach(task => {
      const currentDateStr = task.task_date instanceof Date 
        ? task.task_date.toISOString().split('T')[0]
        : task.task_date;
      const originalDateStr = task.original_date
        ? (task.original_date instanceof Date 
           ? task.original_date.toISOString().split('T')[0]
           : task.original_date)
        : currentDateStr;

      // 按当前日期分组（用于显示任务）
      if (!tasksByCurrentDate[currentDateStr]) {
        tasksByCurrentDate[currentDateStr] = [];
      }
      tasksByCurrentDate[currentDateStr].push({
        id: task.id,
        type: task.task_type,
        title: task.title,
        completed: task.completed,
        originalDate: originalDateStr,
        isDeferred: !!task.original_date
      });

      // 按原始日期分组（用于计算完成率）
      if (!tasksByOriginalDate[originalDateStr]) {
        tasksByOriginalDate[originalDateStr] = {
          total: 0,
          completed: 0,
          tasks: []
        };
      }
      tasksByOriginalDate[originalDateStr].total++;
      if (task.completed) {
        tasksByOriginalDate[originalDateStr].completed++;
      }
    });
    
    console.log('\n📊 关键日期验证:');
    ['2025-07-06', '2025-07-07', '2025-07-13'].forEach(dateStr => {
      const currentTasks = tasksByCurrentDate[dateStr] || [];
      const originalStats = tasksByOriginalDate[dateStr] || { total: 0, completed: 0 };
      
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString('zh-CN', { weekday: 'long' });
      
      console.log(`  ${dateStr} (${dayName}):`);
      console.log(`    当前显示任务: ${currentTasks.length}个`);
      console.log(`    任务类型: ${currentTasks.map(t => t.type).join(', ')}`);
      console.log(`    原始统计: ${originalStats.total}个任务, ${originalStats.completed}个完成`);
      
      // 检查是否为休息日
      const hasRestTask = currentTasks.some(task => task.type === '休息');
      console.log(`    是否休息日: ${hasRestTask ? '是' : '否'}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testAPI();
