const { query } = require('./config/database');

async function checkJulyTasksCorrect() {
  try {
    console.log('=== 检查7月份任务分布（正确版本）===');
    
    const workDays = [];
    const restDays = [];
    const emptyDays = [];
    
    for (let day = 1; day <= 31; day++) {
      const dateStr = '2025-07-' + day.toString().padStart(2, '0');
      
      // 查询该日期的所有任务
      const tasks = await query(
        'SELECT task_type, title FROM tasks WHERE student_id = "ST001" AND task_date = ?',
        [dateStr]
      );
      
      if (tasks.length === 0) {
        emptyDays.push(dateStr);
        console.log('  ' + dateStr + ': 无任务');
      } else {
        // 检查是否是休息日
        const hasRestTask = tasks.some(task => task.task_type === '休息');
        
        if (hasRestTask) {
          restDays.push(dateStr);
          console.log('  ' + dateStr + ': 休息日');
        } else {
          workDays.push(dateStr);
          console.log('  ' + dateStr + ': ' + tasks.length + '个任务');
        }
      }
    }
    
    console.log('\n=== 统计信息 ===');
    console.log('工作日数量: ' + workDays.length);
    console.log('休息日数量: ' + restDays.length);
    console.log('无任务日期数量: ' + emptyDays.length);
    
    console.log('\n工作日列表:');
    workDays.forEach(date => console.log('  ' + date));
    
    console.log('\n休息日列表:');
    restDays.forEach(date => console.log('  ' + date));
    
    if (emptyDays.length > 0) {
      console.log('\n无任务的日期:');
      emptyDays.forEach(date => console.log('  ' + date));
    }
    
    // 检查是否符合要求
    const totalDays = 31;
    const expectedWorkDays = totalDays - restDays.length;
    const actualWorkDays = workDays.length;
    
    console.log('\n=== 符合性检查 ===');
    console.log('总天数: ' + totalDays);
    console.log('休息日: ' + restDays.length);
    console.log('应有工作日: ' + expectedWorkDays);
    console.log('实际工作日: ' + actualWorkDays);
    console.log('缺失工作日: ' + emptyDays.length);
    console.log('符合要求: ' + (emptyDays.length === 0 ? '是' : '否'));
    
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkJulyTasksCorrect();
