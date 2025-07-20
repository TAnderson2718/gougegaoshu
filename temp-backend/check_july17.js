const { query } = require('./config/database');

async function checkJuly17Tasks() {
  try {
    console.log('=== 检查7月17日任务状态 ===');
    
    // 检查7月17日的所有任务
    const tasks = await query(`
      SELECT id, task_type, title, completed, task_status, defer_reason, original_date, task_date, created_at
      FROM tasks 
      WHERE student_id = 'ST001' AND (task_date = '2025-07-17' OR original_date = '2025-07-17')
      ORDER BY task_date, created_at
    `);
    
    console.log(`找到 ${tasks.length} 个与7月17日相关的任务:`);
    
    let originalTasks = 0;
    let completedTasks = 0;
    let deferredTasks = 0;
    
    tasks.forEach(task => {
      const taskDate = task.task_date ? task.task_date.toISOString().split('T')[0] : '无';
      const originalDate = task.original_date ? task.original_date.toISOString().split('T')[0] : '无';
      
      console.log(`\n任务: ${task.title}`);
      console.log(`  当前日期: ${taskDate}`);
      console.log(`  原始日期: ${originalDate}`);
      console.log(`  完成状态: ${task.completed ? '已完成' : '未完成'}`);
      console.log(`  任务状态: ${task.task_status}`);
      console.log(`  顺延原因: ${task.defer_reason || '无'}`);
      
      // 统计原本属于7月17日的任务
      if (originalDate === '2025-07-17' || (taskDate === '2025-07-17' && !task.original_date)) {
        originalTasks++;
        if (task.completed) {
          completedTasks++;
        }
        if (task.task_status === 'deferred' || task.task_status === 'carried_over') {
          deferredTasks++;
        }
      }
    });
    
    console.log(`\n=== 7月17日任务统计 ===`);
    console.log(`原本的任务数: ${originalTasks}`);
    console.log(`已完成任务数: ${completedTasks}`);
    console.log(`被顺延任务数: ${deferredTasks}`);
    
    if (originalTasks > 0) {
      const completionRate = Math.round((completedTasks / originalTasks) * 100);
      console.log(`实际完成率: ${completionRate}%`);
    }
    
    // 检查当前7月17日显示的任务
    console.log(`\n=== 当前7月17日显示的任务 ===`);
    const currentTasks = await query(`
      SELECT task_type, title, completed
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date = '2025-07-17'
      ORDER BY task_type
    `);
    
    console.log(`当前显示的任务数: ${currentTasks.length}`);
    currentTasks.forEach(task => {
      console.log(`  ${task.task_type}: ${task.title} [${task.completed ? '已完成' : '未完成'}]`);
    });
    
    if (currentTasks.length > 0) {
      const currentCompleted = currentTasks.filter(t => t.completed).length;
      const currentRate = Math.round((currentCompleted / currentTasks.length) * 100);
      console.log(`当前显示完成率: ${currentRate}%`);
    }
    
    // 检查24:00处理历史
    console.log(`\n=== 检查24:00处理历史 ===`);
    const processHistory = await query(`
      SELECT operation_date, operation_type, details, created_at
      FROM task_schedule_history 
      WHERE student_id = 'ST001' AND operation_date = '2025-07-17'
      ORDER BY created_at DESC
    `);
    
    console.log(`找到 ${processHistory.length} 条处理记录:`);
    processHistory.forEach(record => {
      console.log(`  ${record.operation_type} - ${record.operation_date} - ${record.details}`);
      console.log(`    时间: ${record.created_at}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkJuly17Tasks();
