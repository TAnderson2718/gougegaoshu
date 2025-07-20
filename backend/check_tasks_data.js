const { query } = require('./config/database');

async function checkTasksData() {
  try {
    console.log('🔍 检查任务数据...');
    
    // 检查ST001的任务数量
    const st001Tasks = await query('SELECT COUNT(*) as count FROM tasks WHERE student_id = ?', ['ST001']);
    console.log('ST001任务总数:', st001Tasks[0].count);
    
    // 检查今日任务
    const todayTasks = await query(
      'SELECT * FROM tasks WHERE student_id = ? AND task_date = ? LIMIT 5', 
      ['ST001', '2025-07-29']
    );
    console.log('ST001今日任务数量:', todayTasks.length);
    console.log('今日任务详情:', todayTasks);
    
    // 检查所有学生的任务数量
    const allTasks = await query('SELECT student_id, COUNT(*) as count FROM tasks GROUP BY student_id');
    console.log('所有学生任务统计:', allTasks);
    
    // 检查任务表结构
    const tableInfo = await query('DESCRIBE tasks');
    console.log('任务表结构:', tableInfo);
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
  process.exit(0);
}

checkTasksData();
