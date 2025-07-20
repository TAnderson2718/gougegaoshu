const { query } = require('./config/database');
const { handleMidnightTaskReschedule } = require('./services/taskScheduleService');

async function testTaskDeferral() {
  try {
    console.log('🧪 开始测试任务顺延结转机制...');
    
    // 1. 清空现有任务数据
    console.log('🔄 清空现有任务数据...');
    await query('DELETE FROM tasks WHERE student_id = ?', ['ST001']);
    await query('DELETE FROM leave_records WHERE student_id = ?', ['ST001']);
    
    // 2. 创建测试任务 - 7月19日有5个任务（超过3个）
    console.log('📝 创建测试任务...');
    const testTasks = [
      // 7月19日 - 5个任务（应该触发顺延）
      { id: 'test-1', student_id: 'ST001', task_date: '2025-07-19', task_type: '数学', title: '高等数学1', completed: false },
      { id: 'test-2', student_id: 'ST001', task_date: '2025-07-19', task_type: '英语', title: '英语阅读1', completed: false },
      { id: 'test-3', student_id: 'ST001', task_date: '2025-07-19', task_type: '专业课', title: '专业课1', completed: false },
      { id: 'test-4', student_id: 'ST001', task_date: '2025-07-19', task_type: '数学', title: '高等数学2', completed: false },
      { id: 'test-5', student_id: 'ST001', task_date: '2025-07-19', task_type: '英语', title: '英语阅读2', completed: false },
      
      // 7月20日 - 休息日
      { id: 'test-6', student_id: 'ST001', task_date: '2025-07-20', task_type: '休息', title: '休息日', completed: false },
      
      // 7月21日 - 3个任务
      { id: 'test-7', student_id: 'ST001', task_date: '2025-07-21', task_type: '数学', title: '线性代数1', completed: false },
      { id: 'test-8', student_id: 'ST001', task_date: '2025-07-21', task_type: '英语', title: '英语写作1', completed: false },
      { id: 'test-9', student_id: 'ST001', task_date: '2025-07-21', task_type: '专业课', title: '专业课2', completed: false },
      
      // 7月22日 - 2个任务
      { id: 'test-10', student_id: 'ST001', task_date: '2025-07-22', task_type: '数学', title: '概率论1', completed: false },
      { id: 'test-11', student_id: 'ST001', task_date: '2025-07-22', task_type: '英语', title: '英语听力1', completed: false }
    ];
    
    for (const task of testTasks) {
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        [task.id, task.student_id, task.task_date, task.task_type, task.title, task.completed]
      );
    }
    
    console.log('✅ 测试任务创建完成');
    
    // 3. 查看初始状态
    console.log('\n📊 初始任务分布:');
    const initialTasks = await query(`
      SELECT task_date, COUNT(*) as count, GROUP_CONCAT(title) as titles
      FROM tasks 
      WHERE student_id = 'ST001' 
      GROUP BY task_date 
      ORDER BY task_date
    `);
    
    initialTasks.forEach(row => {
      console.log(`   ${row.task_date}: ${row.count}个任务 - ${row.titles}`);
    });
    
    // 4. 模拟7月19日只完成2个任务（剩余3个，应该触发顺延）
    console.log('\n🎯 模拟7月19日完成2个任务，剩余3个...');
    await query('UPDATE tasks SET completed = TRUE WHERE id IN (?, ?)', ['test-1', 'test-2']);
    
    // 5. 触发24:00任务处理
    console.log('🕛 触发24:00任务处理...');
    const result = await handleMidnightTaskReschedule('ST001', '2025-07-19');
    
    console.log('📋 处理结果:', result);
    
    // 6. 查看处理后的任务分布
    console.log('\n📊 处理后任务分布:');
    const finalTasks = await query(`
      SELECT task_date, COUNT(*) as count, GROUP_CONCAT(title) as titles
      FROM tasks 
      WHERE student_id = 'ST001' 
      GROUP BY task_date 
      ORDER BY task_date
    `);
    
    finalTasks.forEach(row => {
      console.log(`   ${row.task_date}: ${row.count}个任务 - ${row.titles}`);
    });
    
    // 7. 验证顺延逻辑
    console.log('\n🔍 验证顺延逻辑:');
    
    // 检查7月19日剩余任务数
    const july19Remaining = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE student_id = ? AND task_date = ? AND completed = FALSE',
      ['ST001', '2025-07-19']
    );
    console.log(`   7月19日剩余任务: ${july19Remaining[0].count}个`);
    
    // 检查7月21日任务数（应该增加）
    const july21Tasks = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE student_id = ? AND task_date = ?',
      ['ST001', '2025-07-21']
    );
    console.log(`   7月21日任务数: ${july21Tasks[0].count}个`);
    
    // 检查7月22日任务数（应该增加）
    const july22Tasks = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE student_id = ? AND task_date = ?',
      ['ST001', '2025-07-22']
    );
    console.log(`   7月22日任务数: ${july22Tasks[0].count}个`);
    
    console.log('\n✅ 任务顺延结转机制测试完成！');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testTaskDeferral();
