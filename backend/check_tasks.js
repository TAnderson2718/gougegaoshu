const { query } = require('./config/database');

async function checkTasks() {
  try {
    console.log('🔍 检查ST001学生的任务数据...');
    
    // 查看7月21日的所有任务
    const july21Tasks = await query(`
      SELECT id, task_date, task_type, title, completed, created_at
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date = '2025-07-21'
      ORDER BY created_at
    `);
    
    console.log(`\n📅 7月21日任务详情 (共${july21Tasks.length}个):`);
    july21Tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.title} (${task.task_type}) - ${task.completed ? '✅已完成' : '❌未完成'} - ID: ${task.id}`);
    });
    
    // 查看所有日期的任务统计
    console.log('\n📊 所有日期任务统计:');
    const allTasks = await query(`
      SELECT 
        task_date,
        COUNT(*) as total,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_count,
        GROUP_CONCAT(CONCAT(title, '(', CASE WHEN completed = 1 THEN '✅' ELSE '❌' END, ')') SEPARATOR ', ') as task_details
      FROM tasks 
      WHERE student_id = 'ST001'
      GROUP BY task_date 
      ORDER BY task_date
    `);
    
    allTasks.forEach(row => {
      const completionRate = ((row.completed_count / row.total) * 100).toFixed(0);
      console.log(`   ${row.task_date}: ${row.completed_count}/${row.total} (${completionRate}%)`);
      console.log(`      ${row.task_details}`);
    });
    
    // 检查是否有重复或异常数据
    console.log('\n🔍 检查数据异常:');
    const duplicates = await query(`
      SELECT task_date, task_type, title, COUNT(*) as count
      FROM tasks 
      WHERE student_id = 'ST001'
      GROUP BY task_date, task_type, title
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log('⚠️ 发现重复任务:');
      duplicates.forEach(dup => {
        console.log(`   ${dup.task_date} - ${dup.title} (重复${dup.count}次)`);
      });
    } else {
      console.log('✅ 没有发现重复任务');
    }
    
    // 检查前端API返回的数据
    console.log('\n🌐 模拟前端API调用...');
    const apiTasks = await query(`
      SELECT 
        id, task_date, task_type as type, title, completed,
        duration_hour, duration_minute, proof_image as proof
      FROM tasks 
      WHERE student_id = 'ST001'
      ORDER BY task_date, created_at
    `);
    
    // 按日期分组（模拟前端逻辑）
    const groupedTasks = {};
    apiTasks.forEach(task => {
      const dateKey = task.task_date instanceof Date 
        ? task.task_date.toISOString().split('T')[0] 
        : task.task_date;
      
      if (!groupedTasks[dateKey]) {
        groupedTasks[dateKey] = [];
      }
      
      groupedTasks[dateKey].push({
        id: task.id,
        type: task.type,
        title: task.title,
        completed: task.completed,
        duration: task.duration_hour || task.duration_minute ? {
          hour: task.duration_hour || 0,
          minute: task.duration_minute || 0
        } : null,
        proof: task.proof
      });
    });
    
    console.log('📱 前端API数据格式:');
    Object.keys(groupedTasks).forEach(date => {
      const tasks = groupedTasks[date];
      const completedCount = tasks.filter(t => t.completed).length;
      console.log(`   ${date}: ${completedCount}/${tasks.length} 个任务`);
      tasks.forEach((task, index) => {
        console.log(`      ${index + 1}. ${task.title} - ${task.completed ? '✅' : '❌'}`);
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkTasks();
