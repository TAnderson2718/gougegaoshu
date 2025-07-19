const { query } = require('./config/database.js');

async function fixJuly14RestTasks() {
  try {
    console.log('=== 修复7月14日的休息任务问题 ===');
    
    // 1. 检查7月14日的所有任务
    console.log('1. 检查7月14日的所有任务:');
    const july14Tasks = await query(
      'SELECT * FROM tasks WHERE DATE(task_date) = ? ORDER BY id',
      ['2025-07-14']
    );

    console.log(`7月14日共有 ${july14Tasks.length} 个任务:`);
    july14Tasks.forEach(task => {
      console.log(`  ID: ${task.id}, 类型: ${task.task_type}, 内容: ${task.content || task.title || '无内容'}`);
    });

    // 2. 找出类型为'休息'的任务
    const restTasks = july14Tasks.filter(task => task.task_type === '休息');
    console.log(`\n2. 找到 ${restTasks.length} 个休息类型的任务:`);
    restTasks.forEach(task => {
      console.log(`  ID: ${task.id}, 内容: ${task.content || task.title || '无内容'}`);
    });
    
    if (restTasks.length === 0) {
      console.log('✅ 没有发现休息类型的任务，问题可能已经解决');
      return;
    }
    
    // 3. 删除这些错误的休息任务
    console.log('\n3. 删除错误的休息任务:');
    for (const task of restTasks) {
      console.log(`  删除任务 ID: ${task.id} - ${task.content || task.title || '无内容'}`);
      await query('DELETE FROM tasks WHERE id = ?', [task.id]);
    }

    // 4. 验证修复结果
    console.log('\n4. 验证修复结果:');
    const remainingTasks = await query(
      'SELECT * FROM tasks WHERE DATE(task_date) = ? ORDER BY id',
      ['2025-07-14']
    );

    console.log(`7月14日现在有 ${remainingTasks.length} 个任务:`);
    remainingTasks.forEach(task => {
      console.log(`  ID: ${task.id}, 类型: ${task.task_type}, 内容: ${task.content || task.title || '无内容'}`);
    });

    const hasRestTasks = remainingTasks.some(task => task.task_type === '休息');
    if (hasRestTasks) {
      console.log('❌ 仍然存在休息类型的任务');
    } else {
      console.log('✅ 已成功移除所有休息类型的任务');
    }
    
    console.log('\n✅ 修复完成！');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixJuly14RestTasks();
