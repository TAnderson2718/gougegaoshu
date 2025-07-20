const { query } = require('./config/database');

async function testTasksAPI() {
  try {
    console.log('🔍 测试任务API数据...');
    
    // 模拟前端获取7月份任务的查询
    const startDate = '2025-07-01';
    const endDate = '2025-07-31';
    const studentId = 'ST001';
    
    console.log(`📅 查询范围: ${startDate} 到 ${endDate}`);
    console.log(`👤 学生ID: ${studentId}`);
    
    // 获取任务数据（模拟前端API调用）
    const tasks = await query(`
      SELECT 
        id,
        student_id,
        task_date,
        task_type,
        title,
        completed,
        duration_hour,
        duration_minute,
        proof_image,
        created_at,
        updated_at
      FROM tasks 
      WHERE student_id = ? 
        AND task_date BETWEEN ? AND ?
      ORDER BY task_date, task_type
    `, [studentId, startDate, endDate]);
    
    console.log(`📊 查询结果: 共 ${tasks.length} 个任务`);
    
    // 按日期分组显示
    const tasksByDate = {};
    tasks.forEach(task => {
      const dateStr = task.task_date.toISOString().split('T')[0];
      if (!tasksByDate[dateStr]) {
        tasksByDate[dateStr] = [];
      }
      tasksByDate[dateStr].push(task);
    });
    
    console.log('\n📅 按日期分组的任务:');
    Object.keys(tasksByDate).sort().forEach(date => {
      const dayTasks = tasksByDate[date];
      const restTask = dayTasks.find(t => t.task_type === '休息');
      const emoji = restTask ? '😴' : '📚';
      
      console.log(`\n${date} ${emoji}:`);
      dayTasks.forEach(task => {
        console.log(`  - ${task.task_type}: ${task.title}`);
      });
    });
    
    // 重点检查休息日
    const restDays = tasks.filter(t => t.task_type === '休息');
    console.log('\n🎯 休息日详情:');
    restDays.forEach(task => {
      const dateStr = task.task_date.toISOString().split('T')[0];
      console.log(`  ${dateStr}: ${task.title}`);
    });
    
    console.log('\n📋 前端应该显示的效果:');
    console.log('如果存在+2天偏移，那么:');
    console.log('  - 数据库7月4日的休息 → 前端应显示在7月6日');
    console.log('  - 数据库7月11日的休息 → 前端应显示在7月13日');
    console.log('  - 数据库7月18日的休息 → 前端应显示在7月20日');
    console.log('  - 数据库7月25日的休息 → 前端应显示在7月27日');
    
    // 模拟前端月视图数据处理
    console.log('\n🗓️ 模拟前端月视图处理:');
    const monthData = {};
    
    // 创建7月份的所有日期
    for (let day = 1; day <= 31; day++) {
      const dateStr = `2025-07-${day.toString().padStart(2, '0')}`;
      monthData[dateStr] = {
        date: dateStr,
        tasks: tasksByDate[dateStr] || [],
        hasRest: (tasksByDate[dateStr] || []).some(t => t.task_type === '休息')
      };
    }
    
    // 显示关键日期
    const keyDates = ['2025-07-04', '2025-07-06', '2025-07-11', '2025-07-13', '2025-07-18', '2025-07-20', '2025-07-25', '2025-07-27'];
    keyDates.forEach(date => {
      const dayData = monthData[date];
      const emoji = dayData.hasRest ? '😴' : '📚';
      console.log(`  ${date}: ${emoji} ${dayData.hasRest ? '休息日' : '正常学习'} (${dayData.tasks.length}个任务)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testTasksAPI();
