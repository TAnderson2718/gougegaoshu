const { query, transaction } = require('./config/database');

async function fixTimezoneDates() {
  try {
    console.log('=== 修复时区导致的日期偏移问题 ===');
    
    // 1. 检查当前的日期偏移情况
    console.log('\n1. 检查当前日期偏移情况...');
    
    const sampleTasks = await query(`
      SELECT task_date, COUNT(*) as count
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date LIKE '2025-07-%'
      GROUP BY task_date
      ORDER BY task_date
      LIMIT 10
    `);
    
    console.log('当前数据库中的日期分布（前10个）:');
    sampleTasks.forEach(row => {
      const date = row.task_date.toISOString().split('T')[0];
      console.log(`  ${date}: ${row.count}个任务`);
    });
    
    // 2. 修复日期偏移
    console.log('\n2. 开始修复日期偏移...');
    
    await transaction(async (connection) => {
      // 将所有任务的日期往后调整一天
      const [updateResult] = await connection.execute(`
        UPDATE tasks 
        SET task_date = DATE_ADD(task_date, INTERVAL 1 DAY)
        WHERE task_date LIKE '2025-%'
      `);
      
      console.log(`✅ 更新了 ${updateResult.affectedRows} 个任务的日期`);
      
      // 同时更新 original_date 字段（如果存在）
      const [updateOriginalResult] = await connection.execute(`
        UPDATE tasks 
        SET original_date = DATE_ADD(original_date, INTERVAL 1 DAY)
        WHERE original_date IS NOT NULL AND original_date LIKE '2025-%'
      `);
      
      console.log(`✅ 更新了 ${updateOriginalResult.affectedRows} 个任务的原始日期`);
    });
    
    // 3. 验证修复结果
    console.log('\n3. 验证修复结果...');
    
    const testDates = ['2025-07-01', '2025-07-07', '2025-07-14', '2025-07-28'];
    
    for (const testDate of testDates) {
      const tasks = await query(
        'SELECT COUNT(*) as count FROM tasks WHERE student_id = ? AND task_date = ?',
        ['ST001', testDate]
      );
      
      const count = tasks[0].count;
      console.log(`  ${testDate}: ${count}个任务 ${count > 0 ? '✅' : '❌'}`);
    }
    
    // 4. 检查周日休息日
    console.log('\n4. 检查周日休息日...');
    
    const sundays = ['2025-07-06', '2025-07-13', '2025-07-20', '2025-07-27'];
    
    for (const sunday of sundays) {
      const tasks = await query(
        'SELECT task_type, COUNT(*) as count FROM tasks WHERE student_id = ? AND task_date = ? GROUP BY task_type',
        ['ST001', sunday]
      );
      
      console.log(`  ${sunday} (周日):`);
      if (tasks.length === 0) {
        console.log('    ❌ 没有任务');
      } else {
        tasks.forEach(row => {
          console.log(`    ${row.task_type}: ${row.count}个`);
        });
      }
    }
    
    console.log('\n🎉 时区日期修复完成！');
    
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixTimezoneDates();
