const { query } = require('./backend/config/database');
require('dotenv').config({ path: './backend/.env' });

async function checkTasks() {
  try {
    console.log('🔍 检查任务数据...');
    
    // 检查任务总数
    const result = await query('SELECT COUNT(*) as count FROM tasks WHERE task_type NOT IN (?, ?)', ['休息', 'leave']);
    console.log('总任务数:', result[0].count);
    
    // 检查今天的任务
    const today = new Date().toISOString().split('T')[0];
    const todayResult = await query('SELECT COUNT(*) as count FROM tasks WHERE task_date = ? AND task_type NOT IN (?, ?)', [today, '休息', 'leave']);
    console.log('今天任务数:', todayResult[0].count);
    
    // 检查最近几天的任务
    const recentResult = await query('SELECT task_date, COUNT(*) as count FROM tasks WHERE task_type NOT IN (?, ?) GROUP BY task_date ORDER BY task_date DESC LIMIT 5', ['休息', 'leave']);
    console.log('最近任务分布:');
    recentResult.forEach(row => {
      console.log(`  ${row.task_date.toISOString().split('T')[0]}: ${row.count} 个任务`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

checkTasks();
