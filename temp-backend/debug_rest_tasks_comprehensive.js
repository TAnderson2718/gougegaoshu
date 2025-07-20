const { query } = require('./config/database.js');

async function debugRestTasksComprehensive() {
  try {
    console.log('=== 全面调试休息任务问题 ===');
    
    // 1. 检查所有表
    console.log('\n1. 检查数据库中的所有表:');
    const tables = await query('SHOW TABLES');
    console.log('数据库表:', tables.map(t => Object.values(t)[0]));
    
    // 2. 检查tasks表的所有休息任务
    console.log('\n2. 检查所有休息任务:');
    const allRestTasks = await query(
      'SELECT * FROM tasks WHERE task_type = ? ORDER BY task_date, student_id',
      ['休息']
    );
    
    console.log(`找到 ${allRestTasks.length} 个休息任务:`);
    allRestTasks.forEach(task => {
      const dateStr = task.task_date.toISOString().split('T')[0];
      console.log(`  ${task.student_id} - ${dateStr} - ${task.title} (ID: ${task.id})`);
    });
    
    // 3. 检查7月14日的所有任务（包括所有字段）
    console.log('\n3. 检查7月14日的所有任务详情:');
    const july14Tasks = await query(
      'SELECT * FROM tasks WHERE DATE(task_date) = ? ORDER BY student_id, task_type',
      ['2025-07-14']
    );
    
    console.log(`7月14日共有 ${july14Tasks.length} 个任务:`);
    july14Tasks.forEach((task, index) => {
      console.log(`\n任务 ${index + 1}:`);
      console.log(`  ID: ${task.id}`);
      console.log(`  学生: ${task.student_id}`);
      console.log(`  日期: ${task.task_date.toISOString().split('T')[0]}`);
      console.log(`  类型: ${task.task_type}`);
      console.log(`  标题: ${task.title}`);
      console.log(`  完成: ${task.completed}`);
      console.log(`  创建时间: ${task.created_at}`);
      console.log(`  更新时间: ${task.updated_at}`);
    });
    
    // 4. 检查是否有其他可能的任务表或视图
    console.log('\n4. 检查是否有视图:');
    const views = await query('SHOW FULL TABLES WHERE Table_type = "VIEW"');
    console.log('视图:', views.map(v => Object.values(v)[0]));
    
    // 5. 检查tasks表结构
    console.log('\n5. 检查tasks表结构:');
    const structure = await query('DESCRIBE tasks');
    structure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(可空)' : '(非空)'} ${col.Key ? '(' + col.Key + ')' : ''}`);
    });
    
    // 6. 检查是否有重复的任务ID
    console.log('\n6. 检查任务ID重复情况:');
    const duplicateIds = await query(`
      SELECT id, COUNT(*) as count 
      FROM tasks 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateIds.length > 0) {
      console.log(`发现 ${duplicateIds.length} 个重复的任务ID:`);
      duplicateIds.forEach(dup => {
        console.log(`  ID: ${dup.id} (重复 ${dup.count} 次)`);
      });
    } else {
      console.log('✅ 没有重复的任务ID');
    }
    
    // 7. 检查7月14日周围的日期
    console.log('\n7. 检查7月14日周围的日期:');
    const surroundingDates = ['2025-07-13', '2025-07-14', '2025-07-15'];
    
    for (const date of surroundingDates) {
      const dateTasks = await query(
        'SELECT student_id, task_type, title FROM tasks WHERE DATE(task_date) = ? ORDER BY student_id, task_type',
        [date]
      );
      
      console.log(`\n${date} (${dateTasks.length}个任务):`);
      dateTasks.forEach(task => {
        console.log(`  ${task.student_id}: ${task.task_type} - ${task.title}`);
      });
    }
    
    // 8. 检查是否有任何包含"休息"、"泛函"、"分布式"、"词汇"的任务
    console.log('\n8. 检查特殊关键词的任务:');
    const keywords = ['休息', '泛函', '分布式', '词汇'];
    
    for (const keyword of keywords) {
      const keywordTasks = await query(
        'SELECT student_id, task_date, task_type, title FROM tasks WHERE title LIKE ? ORDER BY task_date',
        [`%${keyword}%`]
      );
      
      console.log(`\n包含"${keyword}"的任务 (${keywordTasks.length}个):`);
      keywordTasks.forEach(task => {
        const dateStr = task.task_date.toISOString().split('T')[0];
        console.log(`  ${task.student_id} - ${dateStr}: ${task.task_type} - ${task.title}`);
      });
    }
    
    // 9. 最终总结
    console.log('\n=== 总结 ===');
    console.log(`数据库中总共有 ${allRestTasks.length} 个休息任务`);
    console.log(`7月14日有 ${july14Tasks.length} 个任务`);
    
    const july14RestTasks = july14Tasks.filter(t => t.task_type === '休息');
    if (july14RestTasks.length > 0) {
      console.log(`❌ 7月14日有 ${july14RestTasks.length} 个休息任务，这是错误的！`);
      july14RestTasks.forEach(task => {
        console.log(`  错误任务: ${task.id} - ${task.title}`);
      });
    } else {
      console.log(`✅ 7月14日没有休息任务，数据库状态正确`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('调试失败:', error);
    process.exit(1);
  }
}

debugRestTasksComprehensive();
