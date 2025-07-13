const { query, transaction } = require('./config/database');

async function fixMissingDates() {
  try {
    console.log('=== 修复缺失的日期任务 ===');
    
    // 需要修复的日期映射：实际存储日期 -> 应该的日期
    const dateMapping = {
      '2025-06-30': '2025-07-01',  // 7月1日的任务存储在6月30日
      '2025-07-06': '2025-07-07',  // 7月7日的任务存储在7月6日
      '2025-07-13': '2025-07-14',  // 7月14日的任务存储在7月13日
      '2025-07-27': '2025-07-28'   // 7月28日的任务存储在7月27日
    };
    
    await transaction(async (connection) => {
      for (const [wrongDate, correctDate] of Object.entries(dateMapping)) {
        console.log(`\n处理 ${wrongDate} -> ${correctDate}`);
        
        // 检查错误日期的任务
        const [wrongTasks] = await connection.execute(`
          SELECT id, student_id, task_type, title
          FROM tasks 
          WHERE task_date = ? AND student_id = 'ST001'
        `, [wrongDate]);
        
        console.log(`  ${wrongDate} 有 ${wrongTasks.length} 个ST001的任务`);
        
        if (wrongTasks.length > 0) {
          // 检查正确日期是否已有任务
          const [correctTasks] = await connection.execute(`
            SELECT id FROM tasks 
            WHERE task_date = ? AND student_id = 'ST001'
          `, [correctDate]);
          
          console.log(`  ${correctDate} 已有 ${correctTasks.length} 个ST001的任务`);
          
          if (correctTasks.length === 0) {
            // 如果正确日期没有任务，移动任务
            const [updateResult] = await connection.execute(`
              UPDATE tasks 
              SET task_date = ?
              WHERE task_date = ? AND student_id = 'ST001'
            `, [correctDate, wrongDate]);
            
            console.log(`  ✅ 移动了 ${updateResult.affectedRows} 个任务到 ${correctDate}`);
          } else {
            console.log(`  ⏭️ ${correctDate} 已有任务，跳过移动`);
          }
        }
      }
      
      // 特殊处理：确保7月1日有任务
      console.log('\n特殊处理：确保7月1日有任务');
      
      const [july1Tasks] = await connection.execute(`
        SELECT id FROM tasks 
        WHERE task_date = '2025-07-01' AND student_id = 'ST001'
      `);
      
      if (july1Tasks.length === 0) {
        console.log('  7月1日没有任务，创建任务...');
        
        const july1TasksData = [
          { type: '数学', title: '高等数学微积分练习' },
          { type: '专业课', title: '机器学习基础理论' },
          { type: '英语', title: '背诵核心词汇100个' }
        ];
        
        for (const taskData of july1TasksData) {
          const taskId = `ST001-2025-07-01-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await connection.execute(`
            INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status, created_at)
            VALUES (?, 'ST001', '2025-07-01', ?, ?, FALSE, 'normal', NOW())
          `, [taskId, taskData.type, taskData.title]);
        }
        
        console.log('  ✅ 创建了3个7月1日的任务');
      } else {
        console.log(`  ✅ 7月1日已有 ${july1Tasks.length} 个任务`);
      }
    });
    
    // 验证修复结果
    console.log('\n=== 验证修复结果 ===');
    
    const testDates = ['2025-07-01', '2025-07-07', '2025-07-14', '2025-07-28'];
    
    for (const testDate of testDates) {
      const tasks = await query(`
        SELECT task_type, title
        FROM tasks 
        WHERE task_date = ? AND student_id = 'ST001'
        ORDER BY task_type
      `, [testDate]);
      
      console.log(`\n${testDate}: ${tasks.length}个任务 ${tasks.length > 0 ? '✅' : '❌'}`);
      tasks.forEach(task => {
        console.log(`  ${task.task_type} - ${task.title}`);
      });
    }
    
    console.log('\n🎉 缺失日期修复完成！');
    
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixMissingDates();
