const { query } = require('./config/database');

async function finalRestDayCheck() {
  try {
    console.log('🔍 最终检查所有休息日');
    console.log('=====================================\n');

    // 查找所有有休息任务的日期
    const restDates = await query(`
      SELECT DISTINCT task_date 
      FROM tasks 
      WHERE task_type = '休息'
      ORDER BY task_date
    `);

    console.log(`找到 ${restDates.length} 个有休息任务的日期:\n`);
    
    let allGood = true;
    
    for (const row of restDates) {
      const dateStr = row.task_date.toISOString().split('T')[0];
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      
      // 检查该日期的所有任务
      const dayTasks = await query(`
        SELECT task_type, title, student_id
        FROM tasks 
        WHERE task_date = ?
        ORDER BY student_id, task_type
      `, [dateStr]);
      
      // 统计任务类型
      const taskTypes = {};
      dayTasks.forEach(task => {
        if (!taskTypes[task.task_type]) {
          taskTypes[task.task_type] = 0;
        }
        taskTypes[task.task_type]++;
      });
      
      const typeList = Object.keys(taskTypes);
      const isRestOnly = typeList.length === 1 && typeList[0] === '休息';
      const status = isRestOnly ? '✅' : '❌';
      
      console.log(`${dateStr} (周${dayNames[dayOfWeek]}): ${status}`);
      console.log(`  任务类型: ${typeList.join(', ')}`);
      console.log(`  总任务数: ${dayTasks.length}`);
      
      if (!isRestOnly) {
        allGood = false;
        console.log(`  ⚠️  详细任务:`);
        dayTasks.forEach(task => {
          console.log(`    ${task.student_id} - ${task.task_type}: ${task.title}`);
        });
      }
      
      console.log('');
    }

    // 检查是否有其他日期意外包含休息任务
    console.log('🔍 检查是否有其他日期意外包含休息任务...\n');
    
    const allRestTasks = await query(`
      SELECT task_date, student_id, title
      FROM tasks 
      WHERE task_type = '休息'
      ORDER BY task_date, student_id
    `);
    
    console.log(`总共有 ${allRestTasks.length} 个休息任务:`);
    allRestTasks.forEach(task => {
      const dateStr = task.task_date.toISOString().split('T')[0];
      console.log(`  ${dateStr} - ${task.student_id}: ${task.title}`);
    });

    // 总结
    console.log('\n=====================================');
    if (allGood) {
      console.log('🎉 所有休息日都已正确设置！');
      console.log('✅ 每个休息日只包含休息任务');
      console.log('✅ 没有学习任务与休息任务混合的情况');
    } else {
      console.log('❌ 仍有休息日存在问题');
      console.log('需要进一步检查和修复');
    }

    // 显示休息日分布
    console.log('\n📅 休息日分布:');
    const restDateStrings = restDates.map(row => row.task_date.toISOString().split('T')[0]);
    restDateStrings.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      console.log(`  ${dateStr} (周${dayNames[dayOfWeek]})`);
    });

    process.exit(0);
    
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

finalRestDayCheck();
