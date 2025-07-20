const { query } = require('./config/database.js');

async function debugST001July14() {
  try {
    console.log('=== 调试ST001在7月14日的任务问题 ===');
    
    // 1. 查看表结构
    console.log('1. 查看tasks表结构:');
    const columns = await query('DESCRIBE tasks');
    columns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });
    
    // 2. 查看ST001在7月14日的所有任务
    console.log('\n2. ST001在7月14日的任务:');
    const st001Tasks = await query(
      'SELECT * FROM tasks WHERE student_id = ? AND DATE(task_date) = ?',
      ['ST001', '2025-07-14']
    );
    
    console.log(`找到 ${st001Tasks.length} 个任务:`);
    st001Tasks.forEach((task, index) => {
      console.log(`任务 ${index + 1}:`);
      console.log(`  ID: ${task.id}`);
      console.log(`  学生ID: ${task.student_id}`);
      console.log(`  日期: ${task.task_date}`);
      console.log(`  类型: ${task.task_type}`);
      console.log(`  标题: ${task.title || '无标题'}`);
      console.log(`  内容: ${task.content || '无内容'}`);
      console.log(`  状态: ${task.status || '无状态'}`);
      console.log('  ---');
    });
    
    // 3. 检查是否有休息类型的任务
    const restTasks = st001Tasks.filter(t => t.task_type === '休息');
    console.log(`\n3. 休息类型任务: ${restTasks.length} 个`);
    if (restTasks.length > 0) {
      console.log('休息任务详情:');
      restTasks.forEach(task => {
        console.log(`  ID: ${task.id}, 标题: ${task.title}, 内容: ${task.content}`);
      });
      
      console.log('\n准备删除这些休息任务...');
      for (const task of restTasks) {
        console.log(`删除任务 ${task.id}`);
        await query('DELETE FROM tasks WHERE id = ?', [task.id]);
      }
      
      console.log('✅ 已删除所有休息任务');
    } else {
      console.log('✅ 没有找到休息类型的任务');
    }
    
    // 4. 验证删除结果
    console.log('\n4. 验证删除结果:');
    const remainingTasks = await query(
      'SELECT * FROM tasks WHERE student_id = ? AND DATE(task_date) = ?',
      ['ST001', '2025-07-14']
    );
    
    console.log(`删除后剩余 ${remainingTasks.length} 个任务:`);
    remainingTasks.forEach(task => {
      console.log(`  ${task.task_type}: ${task.title || task.content}`);
    });
    
    const stillHasRest = remainingTasks.some(t => t.task_type === '休息');
    if (stillHasRest) {
      console.log('❌ 仍然有休息任务');
    } else {
      console.log('✅ 已成功清除所有休息任务');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 调试失败:', error);
    process.exit(1);
  }
}

debugST001July14();
