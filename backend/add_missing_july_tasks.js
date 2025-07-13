const { query, transaction } = require('./config/database');

async function addMissingJulyTasks() {
  try {
    console.log('=== 为缺失的7月日期添加任务 ===');
    
    // 缺失任务的日期
    const missingDates = [
      '2025-07-05', // 周六
      '2025-07-12', // 周六  
      '2025-07-19', // 周六
      '2025-07-26', // 周六
      '2025-07-31'  // 周四
    ];
    
    // 任务模板
    const taskTemplates = [
      ['数学', '高等数学综合练习'],
      ['英语', '学术英语写作'],
      ['专业课', '计算机系统原理']
    ];
    
    await transaction(async (connection) => {
      for (const dateStr of missingDates) {
        console.log(`\n为 ${dateStr} 添加任务...`);
        
        // 检查该日期是否已有任务
        const [existing] = await connection.execute(
          'SELECT COUNT(*) as count FROM tasks WHERE student_id = "ST001" AND task_date = ?',
          [dateStr]
        );
        
        if (existing[0].count > 0) {
          console.log(`  ${dateStr} 已有任务，跳过`);
          continue;
        }
        
        // 为该日期添加3个任务
        for (const [taskType, title] of taskTemplates) {
          const taskId = 'ST001-' + dateStr + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          
          await connection.execute(
            'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status) VALUES (?, ?, ?, ?, ?, FALSE, "normal")',
            [taskId, 'ST001', dateStr, taskType, title]
          );
          
          console.log(`  添加: ${taskType} - ${title}`);
        }
      }
    });
    
    console.log('\n✅ 缺失任务添加完成');
    
    // 验证结果
    console.log('\n=== 验证结果 ===');
    for (const dateStr of missingDates) {
      const tasks = await query(
        'SELECT COUNT(*) as count FROM tasks WHERE student_id = "ST001" AND task_date = ?',
        [dateStr]
      );
      console.log(`${dateStr}: ${tasks[0].count} 个任务`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('添加失败:', error);
    process.exit(1);
  }
}

addMissingJulyTasks();
