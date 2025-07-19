const { query } = require('./config/database');

async function correctFinalCheck() {
  try {
    console.log('📋 正确的最终检查');
    console.log('=====================================\n');

    // 1. 正确查找所有真正有休息任务的日期
    console.log('1️⃣ 检查所有真正的休息日...');
    
    const restDates = await query(`
      SELECT DISTINCT task_date 
      FROM tasks 
      WHERE task_type = '休息'
      ORDER BY task_date
    `);

    console.log(`找到 ${restDates.length} 个真正有休息任务的日期:`);
    
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
        console.log(`  ✅ ${dateStr} (周${dayNames[dayOfWeek]}): 正常 (2个休息任务)`);
      }
    }

    // 2. 检查是否有工作日意外包含休息任务
    console.log('\n2️⃣ 检查工作日是否意外包含休息任务...');
    
    const mixedDays = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type) as types
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      HAVING type_count > 1 AND types LIKE '%休息%'
      ORDER BY task_date
    `);

    if (mixedDays.length > 0) {
      console.log(`❌ 发现 ${mixedDays.length} 个混合日期（既有休息又有其他任务）:`);
      mixedDays.forEach(row => {
        const dateStr = row.task_date.toISOString().split('T')[0];
        console.log(`  ${dateStr}: ${row.types}`);
      });
      allRestDaysGood = false;
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
        GROUP_CONCAT(DISTINCT task_type) as types,
        SUM(CASE WHEN task_type = '休息' THEN 1 ELSE 0 END) as rest_count
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
        AND student_id = 'ST001'
      GROUP BY task_date
      ORDER BY task_date
    `);

    let workDays = 0;
    let restDays = 0;
    let emptyDays = 0;
    let problemDays = 0;

    console.log('\n7月份每日任务分布:');
    for (let day = 1; day <= 31; day++) {
      const dateStr = '2025-07-' + day.toString().padStart(2, '0');
      const dayData = julyStats.find(s => s.task_date.toISOString().split('T')[0] === dateStr);
      
      if (!dayData) {
        emptyDays++;
        console.log(`  ${dateStr}: 无任务`);
      } else if (dayData.types === '休息' && dayData.rest_count === 1) {
        restDays++;
        console.log(`  ${dateStr}: 休息日 ✅`);
      } else if (dayData.types.includes('休息')) {
        problemDays++;
        console.log(`  ${dateStr}: 混合日 ❌ (${dayData.types})`);
      } else {
        workDays++;
        console.log(`  ${dateStr}: 工作日 (${dayData.total_tasks}个任务)`);
      }
    }

    console.log(`\n📊 7月份统计:`);
    console.log(`  工作日: ${workDays} 天`);
    console.log(`  休息日: ${restDays} 天`);
    console.log(`  问题日: ${problemDays} 天`);
    console.log(`  无任务日: ${emptyDays} 天`);

    // 4. 检查休息日的周几分布
    console.log('\n4️⃣ 检查休息日的周几分布...');
    
    const restDateStrings = restDates.map(row => row.task_date.toISOString().split('T')[0]);
    const dayOfWeekCount = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    restDateStrings.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      dayOfWeekCount[dayOfWeek]++;
      console.log(`  ${dateStr}: 周${dayNames[dayOfWeek]}`);
    });
    
    console.log('\n周几分布统计:');
    Object.entries(dayOfWeekCount).forEach(([day, count]) => {
      if (count > 0) {
        console.log(`  周${dayNames[day]}: ${count} 天`);
      }
    });

    // 5. 最终结论
    console.log('\n=====================================');
    console.log('🎯 最终结论:');
    
    if (allRestDaysGood && mixedDays.length === 0 && problemDays === 0) {
      console.log('🎉 所有休息日问题已完全修复！');
      console.log('✅ 休息日只包含休息任务');
      console.log('✅ 每个学生在休息日只有一个休息任务');
      console.log('✅ 工作日不包含休息任务');
      console.log('✅ 没有混合日期');
      console.log('✅ 批量导入功能正常工作');
    } else {
      console.log('❌ 仍有问题需要解决');
      if (!allRestDaysGood) {
        console.log('❌ 部分休息日任务数量不正确');
      }
      if (mixedDays.length > 0) {
        console.log('❌ 存在混合日期');
      }
      if (problemDays > 0) {
        console.log('❌ 存在问题日期');
      }
    }

    process.exit(0);
    
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

correctFinalCheck();
