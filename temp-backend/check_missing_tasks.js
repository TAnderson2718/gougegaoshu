const { query } = require('./config/database');

async function checkMissingTasks() {
  try {
    console.log('📅 检查7月份缺失任务的日期');
    console.log('=====================================\n');

    // 获取7月份所有有任务的日期
    const existingDates = await query(`
      SELECT DISTINCT task_date
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      ORDER BY task_date
    `);

    const existingDateStrings = existingDates.map(row => 
      row.task_date.toISOString().split('T')[0]
    );

    console.log(`📊 当前有任务的日期 (${existingDateStrings.length}天):`);
    existingDateStrings.forEach(dateStr => {
      console.log(`  ${dateStr}`);
    });

    // 检查7月份所有日期
    const missingDates = [];
    const restDates = [];
    const workDates = [];

    for (let day = 1; day <= 31; day++) {
      const dateStr = '2025-07-' + day.toString().padStart(2, '0');
      
      if (existingDateStrings.includes(dateStr)) {
        // 检查是否是休息日
        const dayTasks = await query(`
          SELECT DISTINCT task_type
          FROM tasks 
          WHERE task_date = ?
        `, [dateStr]);
        
        if (dayTasks.length === 1 && dayTasks[0].task_type === '休息') {
          restDates.push(dateStr);
        } else {
          workDates.push(dateStr);
        }
      } else {
        missingDates.push(dateStr);
      }
    }

    console.log(`\n📈 7月份任务分布统计:`);
    console.log(`  ✅ 工作日: ${workDates.length} 天`);
    console.log(`  🛌 休息日: ${restDates.length} 天`);
    console.log(`  ❌ 缺失任务日: ${missingDates.length} 天`);

    if (missingDates.length > 0) {
      console.log(`\n❌ 缺失任务的日期 (${missingDates.length}天):`);
      missingDates.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
        console.log(`  ${dateStr} (周${dayNames[dayOfWeek]})`);
      });

      console.log(`\n💡 建议:`);
      console.log(`  这些日期需要安排学习任务或设置为休息日`);
      console.log(`  如果是工作日，建议安排专业课、数学、英语等学习任务`);
      console.log(`  如果是休息日，建议设置为休息任务`);
    } else {
      console.log(`\n✅ 7月份所有日期都已安排任务！`);
    }

    // 显示休息日分布
    console.log(`\n🛌 休息日分布:`);
    const dayOfWeekCount = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    restDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      dayOfWeekCount[dayOfWeek]++;
    });
    
    Object.entries(dayOfWeekCount).forEach(([day, count]) => {
      if (count > 0) {
        console.log(`  周${dayNames[day]}: ${count} 天`);
      }
    });

    // 显示工作日分布
    console.log(`\n💼 工作日分布:`);
    workDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      console.log(`  ${dateStr} (周${dayNames[dayOfWeek]})`);
    });

    console.log(`\n=====================================`);
    console.log(`📋 总结:`);
    console.log(`  • 7月份共31天`);
    console.log(`  • 已安排工作日: ${workDates.length} 天`);
    console.log(`  • 已安排休息日: ${restDates.length} 天`);
    console.log(`  • 未安排任务: ${missingDates.length} 天`);
    
    if (missingDates.length > 0) {
      console.log(`  • 需要补充 ${missingDates.length} 天的任务安排`);
    }

    process.exit(0);
    
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkMissingTasks();
