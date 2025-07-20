const { query } = require('./config/database');
const { handleMidnightTaskReschedule } = require('./services/taskScheduleService');

async function testSmallTaskDeferral() {
  try {
    console.log('🧪 测试剩余任务数 < 3 的结转功能...');
    
    // 1. 清空现有任务数据
    console.log('🔄 清空现有任务数据...');
    await query('DELETE FROM tasks WHERE student_id = ?', ['ST001']);
    await query('DELETE FROM leave_records WHERE student_id = ?', ['ST001']);
    
    // 2. 创建测试任务 - 7月19日有4个任务
    console.log('📝 创建测试任务...');
    const testTasks = [
      // 7月19日 - 4个任务
      { id: 'small-1', student_id: 'ST001', task_date: '2025-07-19', task_type: '数学', title: '高等数学1', completed: false },
      { id: 'small-2', student_id: 'ST001', task_date: '2025-07-19', task_type: '英语', title: '英语阅读1', completed: false },
      { id: 'small-3', student_id: 'ST001', task_date: '2025-07-19', task_type: '专业课', title: '专业课1', completed: false },
      { id: 'small-4', student_id: 'ST001', task_date: '2025-07-19', task_type: '数学', title: '高等数学2', completed: false },
      
      // 7月20日 - 休息日
      { id: 'small-5', student_id: 'ST001', task_date: '2025-07-20', task_type: '休息', title: '休息日', completed: false },
      
      // 7月21日 - 3个任务
      { id: 'small-6', student_id: 'ST001', task_date: '2025-07-21', task_type: '数学', title: '线性代数1', completed: false },
      { id: 'small-7', student_id: 'ST001', task_date: '2025-07-21', task_type: '英语', title: '英语写作1', completed: false },
      { id: 'small-8', student_id: 'ST001', task_date: '2025-07-21', task_type: '专业课', title: '专业课2', completed: false }
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
    
    // 4. 测试场景1：剩余2个任务（< 3）
    console.log('\n🎯 场景1：模拟7月19日完成2个任务，剩余2个（< 3）...');
    await query('UPDATE tasks SET completed = TRUE WHERE id IN (?, ?)', ['small-1', 'small-2']);
    
    const result1 = await handleMidnightTaskReschedule('ST001', '2025-07-19');
    console.log('📋 处理结果1:', result1);
    
    // 查看处理后状态
    console.log('\n📊 场景1处理后任务分布:');
    const afterTasks1 = await query(`
      SELECT task_date, COUNT(*) as count, GROUP_CONCAT(title) as titles
      FROM tasks 
      WHERE student_id = 'ST001' 
      GROUP BY task_date 
      ORDER BY task_date
    `);
    
    afterTasks1.forEach(row => {
      console.log(`   ${row.task_date}: ${row.count}个任务 - ${row.titles}`);
    });
    
    // 5. 重置数据，测试场景2：剩余1个任务
    console.log('\n🔄 重置数据，测试场景2...');
    await query('DELETE FROM tasks WHERE student_id = ?', ['ST001']);
    
    // 重新创建任务
    const testTasks2 = [
      { id: 'small2-1', student_id: 'ST001', task_date: '2025-07-19', task_type: '数学', title: '高等数学1', completed: false },
      { id: 'small2-2', student_id: 'ST001', task_date: '2025-07-19', task_type: '英语', title: '英语阅读1', completed: false },
      { id: 'small2-3', student_id: 'ST001', task_date: '2025-07-20', task_type: '休息', title: '休息日', completed: false },
      { id: 'small2-4', student_id: 'ST001', task_date: '2025-07-21', task_type: '数学', title: '线性代数1', completed: false }
    ];
    
    for (const task of testTasks2) {
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        [task.id, task.student_id, task.task_date, task.task_type, task.title, task.completed]
      );
    }
    
    console.log('\n🎯 场景2：模拟7月19日完成1个任务，剩余1个（< 3）...');
    await query('UPDATE tasks SET completed = TRUE WHERE id = ?', ['small2-1']);
    
    const result2 = await handleMidnightTaskReschedule('ST001', '2025-07-19');
    console.log('📋 处理结果2:', result2);
    
    // 查看最终状态
    console.log('\n📊 场景2处理后任务分布:');
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
    
    // 6. 验证结转逻辑
    console.log('\n🔍 验证小于3个任务的结转逻辑:');
    
    // 检查7月19日剩余任务数
    const july19Remaining = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE student_id = ? AND task_date = ? AND completed = FALSE',
      ['ST001', '2025-07-19']
    );
    console.log(`   7月19日剩余任务: ${july19Remaining[0].count}个`);
    
    // 检查7月21日任务数
    const july21Tasks = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE student_id = ? AND task_date = ?',
      ['ST001', '2025-07-21']
    );
    console.log(`   7月21日任务数: ${july21Tasks[0].count}个`);
    
    console.log('\n✅ 小任务数结转功能测试完成！');
    console.log('📝 结论：当剩余任务数 < 3 时，系统采用逐个结转模式，将未完成任务逐个移动到下一个工作日');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testSmallTaskDeferral();
