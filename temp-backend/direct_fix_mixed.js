const { query, transaction } = require('./config/database');

async function directFixMixed() {
  try {
    console.log('🔧 直接修复混合日期');
    console.log('=====================================\n');

    const mixedDates = ['2025-07-02', '2025-07-09', '2025-07-16', '2025-07-23'];
    
    console.log('修复这些混合日期:', mixedDates.join(', '));

    await transaction(async (connection) => {
      for (const dateStr of mixedDates) {
        console.log(`\n修复 ${dateStr}:`);
        
        // 查看当前任务
        const [allTasks] = await connection.execute(`
          SELECT id, student_id, task_type, title
          FROM tasks 
          WHERE task_date = ?
          ORDER BY task_type, student_id
        `, [dateStr]);
        
        console.log(`  当前有 ${allTasks.length} 个任务:`);
        allTasks.forEach(task => {
          console.log(`    ${task.student_id} - ${task.task_type}: ${task.title}`);
        });
        
        // 删除所有非休息任务
        const [deleteResult] = await connection.execute(`
          DELETE FROM tasks 
          WHERE task_date = ? AND task_type != '休息'
        `, [dateStr]);
        
        console.log(`  删除了 ${deleteResult.affectedRows} 个非休息任务`);
        
        // 检查剩余任务
        const [remainingTasks] = await connection.execute(`
          SELECT id, student_id, task_type, title
          FROM tasks 
          WHERE task_date = ?
          ORDER BY task_type, student_id
        `, [dateStr]);
        
        console.log(`  剩余 ${remainingTasks.length} 个任务:`);
        remainingTasks.forEach(task => {
          console.log(`    ${task.student_id} - ${task.task_type}: ${task.title}`);
        });
      }
    });

    // 验证结果
    console.log('\n🔍 验证修复结果...');
    
    for (const dateStr of mixedDates) {
      const verifyTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
      `, [dateStr]);
      
      const taskTypes = verifyTasks.map(t => t.task_type);
      const isFixed = taskTypes.length === 1 && taskTypes[0] === '休息';
      
      console.log(`  ${dateStr}: ${taskTypes.join(', ')} ${isFixed ? '✅' : '❌'}`);
    }

    console.log('\n🎉 修复完成！');
    process.exit(0);
    
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

directFixMixed();
