const { query } = require('./config/database');

async function addST003Tasks() {
  try {
    console.log('🔄 为ST003添加测试任务...');
    
    // 为ST003添加今日任务
    await query(`
      INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, created_at) VALUES
      ('ST003-2025-07-24-test-1', 'ST003', '2025-07-24', '数学', '高等数学基础', 0, NOW()),
      ('ST003-2025-07-24-test-2', 'ST003', '2025-07-24', '英语', '考研词汇练习', 0, NOW()),
      ('ST003-2025-07-24-test-3', 'ST003', '2025-07-24', '专业课', '计算机基础', 0, NOW())
    `);
    
    console.log('✅ ST003任务添加成功');
    
    // 验证添加的任务
    const tasks = await query(`
      SELECT id, task_date, task_type, title, completed 
      FROM tasks 
      WHERE student_id = 'ST003' 
      ORDER BY task_date, created_at
    `);
    
    console.log(`📊 ST003共有${tasks.length}个任务:`);
    tasks.forEach(task => {
      console.log(`   - ${task.task_date}: ${task.title} (${task.task_type}) - ${task.completed ? '✅已完成' : '❌未完成'}`);
    });
    
  } catch (error) {
    console.error('❌ 添加任务失败:', error);
  }
  
  process.exit(0);
}

addST003Tasks();
