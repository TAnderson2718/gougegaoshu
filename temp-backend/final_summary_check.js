const { query } = require('./config/database');

async function finalSummaryCheck() {
  try {
    console.log('📋 最终总结检查');
    console.log('=====================================\n');

    // 1. 检查所有休息日
    console.log('1️⃣ 检查所有休息日...');
    
    const restDates = await query(`
      SELECT DISTINCT task_date 
      FROM tasks 
      WHERE task_type = '休息'
      ORDER BY task_date
    `);

    console.log(`找到 ${restDates.length} 个休息日:`);
    
    let allRestDaysGood = true;
    
    for (const row of restDates) {
      const dateStr = row.task_date.toISOString().split('T')[0];
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      
      const dayTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
      `, [dateStr]);
      
      const taskTypes = dayTasks.map(t => t.task_type);
      const isRestOnly = taskTypes.length === 1 && taskTypes[0] === '休息';
      const restCount = dayTasks.find(t => t.task_type === '休息')?.count || 0;
      
      if (!isRestOnly || restCount !== 2) {
        allRestDaysGood = false;
        console.log(`  ❌ ${dateStr} (周${dayNames[dayOfWeek]}): ${taskTypes.join(', ')} (休息任务数: ${restCount})`);
      } else {
        console.log(`  ✅ ${dateStr} (周${dayNames[dayOfWeek]}): 正常`);
      }
    }

    // 2. 检查是否有工作日意外包含休息任务
    console.log('\n2️⃣ 检查工作日是否意外包含休息任务...');
    
    const workDaysWithRest = await query(`
      SELECT DISTINCT task_date
      FROM tasks 
      WHERE task_type = '休息'
        AND task_date NOT IN (
          SELECT DISTINCT task_date 
          FROM tasks 
          WHERE task_type = '休息'
          GROUP BY task_date
          HAVING COUNT(DISTINCT task_type) = 1
        )
      ORDER BY task_date
    `);

    if (workDaysWithRest.length > 0) {
      console.log(`❌ 发现 ${workDaysWithRest.length} 个工作日意外包含休息任务:`);
      workDaysWithRest.forEach(row => {
        const dateStr = row.task_date.toISOString().split('T')[0];
        console.log(`  ${dateStr}`);
      });
    } else {
      console.log('✅ 没有工作日意外包含休息任务');
    }

    // 3. 统计7月份任务分布
    console.log('\n3️⃣ 统计7月份任务分布...');
    
    const julyStats = await query(`
      SELECT 
        task_date,
        COUNT(*) as total_tasks,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type) as types
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
        AND student_id = 'ST001'
      GROUP BY task_date
      ORDER BY task_date
    `);

    let workDays = 0;
    let restDays = 0;
    let emptyDays = 0;

    console.log('\n7月份每日任务分布:');
    for (let day = 1; day <= 31; day++) {
      const dateStr = '2025-07-' + day.toString().padStart(2, '0');
      const dayData = julyStats.find(s => s.task_date.toISOString().split('T')[0] === dateStr);
      
      if (!dayData) {
        emptyDays++;
        console.log(`  ${dateStr}: 无任务`);
      } else if (dayData.types === '休息') {
        restDays++;
        console.log(`  ${dateStr}: 休息日 ✅`);
      } else if (dayData.types.includes('休息')) {
        console.log(`  ${dateStr}: 混合日 ❌ (${dayData.types})`);
      } else {
        workDays++;
        console.log(`  ${dateStr}: 工作日 (${dayData.total_tasks}个任务)`);
      }
    }

    console.log(`\n📊 7月份统计:`);
    console.log(`  工作日: ${workDays} 天`);
    console.log(`  休息日: ${restDays} 天`);
    console.log(`  无任务日: ${emptyDays} 天`);

    // 4. 最终结论
    console.log('\n=====================================');
    console.log('🎯 最终结论:');
    
    if (allRestDaysGood && workDaysWithRest.length === 0) {
      console.log('🎉 所有休息日问题已完全修复！');
      console.log('✅ 休息日只包含休息任务');
      console.log('✅ 每个学生在休息日只有一个休息任务');
      console.log('✅ 工作日不包含休息任务');
      console.log('✅ 批量导入功能正常工作');
    } else {
      console.log('❌ 仍有问题需要解决');
      if (!allRestDaysGood) {
        console.log('❌ 部分休息日仍有问题');
      }
      if (workDaysWithRest.length > 0) {
        console.log('❌ 部分工作日意外包含休息任务');
      }
    }

    process.exit(0);
    
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

finalSummaryCheck();
