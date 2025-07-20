const { query, transaction } = require('./config/database');

async function fixRestDays() {
  try {
    console.log('=== 修复休息日时区问题 ===');
    
    // 1. 检查当前休息日分布
    console.log('\n1. 当前休息日分布:');
    const currentRestTasks = await query(`
      SELECT student_id, task_date, COUNT(*) as count
      FROM tasks 
      WHERE task_type = '休息' AND task_date LIKE '2025-07%'
      GROUP BY student_id, task_date
      ORDER BY task_date, student_id
    `);
    
    currentRestTasks.forEach(row => {
      const date = row.task_date.toISOString().split('T')[0];
      console.log(`  ${row.student_id} - ${date}: ${row.count}个休息任务`);
    });
    
    // 2. 根据规则，7月份的周日应该是休息日
    const july2025Sundays = [
      '2025-07-06',  // 第1个周日
      '2025-07-13',  // 第2个周日  
      '2025-07-20',  // 第3个周日
      '2025-07-27'   // 第4个周日
    ];
    
    console.log('\n2. 应该的休息日（周日）:');
    july2025Sundays.forEach(date => {
      const dayOfWeek = new Date(date).getDay();
      console.log(`  ${date} (周${dayOfWeek === 0 ? '日' : dayOfWeek})`);
    });
    
    // 3. 修复休息日
    console.log('\n3. 开始修复休息日...');
    
    await transaction(async (connection) => {
      // 删除所有现有的休息任务
      const [deleteResult] = await connection.execute(`
        DELETE FROM tasks WHERE task_type = '休息' AND task_date LIKE '2025-07%'
      `);
      console.log(`  删除了 ${deleteResult.affectedRows} 个旧的休息任务`);
      
      // 为每个周日创建正确的休息任务
      for (const sunday of july2025Sundays) {
        // ST001的休息任务
        const st001Id = `ST001-${sunday}-rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await connection.execute(`
          INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status, created_at)
          VALUES (?, 'ST001', ?, '休息', '今日休息调整状态', TRUE, 'normal', NOW())
        `, [st001Id, sunday]);
        
        // ST002的休息任务
        const st002Id = `ST002-${sunday}-rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await connection.execute(`
          INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status, created_at)
          VALUES (?, 'ST002', ?, '休息', '今日休息调整状态', TRUE, 'normal', NOW())
        `, [st002Id, sunday]);
        
        console.log(`  ✅ 创建了 ${sunday} 的休息任务`);
      }
    });
    
    // 4. 验证修复结果
    console.log('\n4. 验证修复结果:');
    
    const fixedRestTasks = await query(`
      SELECT student_id, task_date, title
      FROM tasks 
      WHERE task_type = '休息' AND task_date LIKE '2025-07%'
      ORDER BY task_date, student_id
    `);
    
    console.log(`修复后共有 ${fixedRestTasks.length} 个休息任务:`);
    fixedRestTasks.forEach(task => {
      const date = task.task_date.toISOString().split('T')[0];
      const dayOfWeek = new Date(date).getDay();
      const dayName = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek];
      console.log(`  ${task.student_id} - ${date} (周${dayName}) - ${task.title}`);
    });
    
    // 5. 检查是否还有其他日期的休息任务
    console.log('\n5. 检查7月5日的情况:');
    const july5Tasks = await query(`
      SELECT student_id, task_type, title
      FROM tasks 
      WHERE task_date = '2025-07-05'
      ORDER BY student_id, task_type
    `);
    
    console.log(`7月5日任务数: ${july5Tasks.length}`);
    const st001July5 = july5Tasks.filter(t => t.student_id === 'ST001');
    const st002July5 = july5Tasks.filter(t => t.student_id === 'ST002');
    
    console.log(`  ST001: ${st001July5.length}个任务`);
    st001July5.forEach(t => console.log(`    ${t.task_type} - ${t.title}`));
    
    console.log(`  ST002: ${st002July5.length}个任务`);
    st002July5.forEach(t => console.log(`    ${t.task_type} - ${t.title}`));
    
    console.log('\n🎉 休息日修复完成！');
    console.log('现在7月份的休息日统一为每周日：7月6日、13日、20日、27日');
    
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixRestDays();
