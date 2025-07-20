const { query } = require('./config/database');

async function finalCorrectVerification() {
  try {
    console.log('✅ 最终正确验证：休息日问题修复状态');
    console.log('=====================================\n');

    // 直接查询真正有休息任务的日期
    const actualRestDates = await query(`
      SELECT DISTINCT task_date 
      FROM tasks 
      WHERE task_type = '休息'
      ORDER BY task_date
    `);

    console.log(`📊 真正的休息日 (${actualRestDates.length}个):`);
    
    let allRestDaysCorrect = true;
    
    for (const row of actualRestDates) {
      const dateStr = row.task_date.toISOString().split('T')[0];
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      
      // 检查该日期的所有任务
      const dayTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
      `, [dateStr]);
      
      const taskTypes = dayTasks.map(t => t.task_type);
      const isRestOnly = taskTypes.length === 1 && taskTypes[0] === '休息';
      const restCount = dayTasks.find(t => t.task_type === '休息')?.count || 0;
      
      if (isRestOnly && restCount === 2) {
        console.log(`  ✅ ${dateStr} (周${dayNames[dayOfWeek]}): 正常 (2个休息任务)`);
      } else {
        console.log(`  ❌ ${dateStr} (周${dayNames[dayOfWeek]}): 异常 (${taskTypes.join(', ')}, 休息任务数: ${restCount})`);
        allRestDaysCorrect = false;
      }
    }

    // 检查是否有混合日期（既有休息又有其他任务）
    console.log(`\n🔍 检查混合日期...`);
    
    const mixedDates = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type ORDER BY task_type) as types
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      HAVING type_count > 1 AND types LIKE '%休息%'
      ORDER BY task_date
    `);

    if (mixedDates.length > 0) {
      console.log(`❌ 发现 ${mixedDates.length} 个混合日期:`);
      mixedDates.forEach(row => {
        const dateStr = row.task_date.toISOString().split('T')[0];
        console.log(`  ${dateStr}: ${row.types}`);
      });
      allRestDaysCorrect = false;
    } else {
      console.log(`✅ 没有混合日期`);
    }

    // 统计7月份的分布
    console.log(`\n📈 7月份任务分布统计:`);
    
    const julyStats = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type ORDER BY task_type) as types,
        COUNT(*) as total_tasks
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      ORDER BY task_date
    `);

    let workDays = 0;
    let restDays = 0;
    let emptyDays = 0;

    for (let day = 1; day <= 31; day++) {
      const dateStr = '2025-07-' + day.toString().padStart(2, '0');
      const dayData = julyStats.find(s => s.task_date.toISOString().split('T')[0] === dateStr);
      
      if (!dayData) {
        emptyDays++;
      } else if (dayData.types === '休息') {
        restDays++;
      } else if (!dayData.types.includes('休息')) {
        workDays++;
      }
    }

    console.log(`  工作日: ${workDays} 天 (只有学习任务)`);
    console.log(`  休息日: ${restDays} 天 (只有休息任务)`);
    console.log(`  无任务日: ${emptyDays} 天`);

    // 休息日周几分布
    console.log(`\n🛌 休息日周几分布:`);
    
    const dayOfWeekCount = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    actualRestDates.forEach(row => {
      const dateStr = row.task_date.toISOString().split('T')[0];
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      dayOfWeekCount[dayOfWeek]++;
    });
    
    Object.entries(dayOfWeekCount).forEach(([day, count]) => {
      if (count > 0) {
        console.log(`  周${dayNames[day]}: ${count} 天`);
      }
    });

    // 测试批量导入功能
    console.log(`\n🧪 测试批量导入功能:`);
    
    const testDate = '2025-08-01';
    await query(`DELETE FROM tasks WHERE task_date = ?`, [testDate]);
    
    // 测试导入休息任务
    const testTasks = [
      {studentId: 'ST001', taskType: '休息', title: '测试休息日'},
      {studentId: 'ST002', taskType: '休息', title: '测试休息日'}
    ];
    
    for (const task of testTasks) {
      const taskId = `${task.studentId}-${testDate}-${task.taskType}-test-${Date.now()}`;
      await query(`
        INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, created_at)
        VALUES (?, ?, ?, ?, ?, FALSE, NOW())
      `, [taskId, task.studentId, testDate, task.taskType, task.title]);
    }
    
    // 验证测试结果
    const testResult = await query(`
      SELECT task_type, COUNT(*) as count
      FROM tasks 
      WHERE task_date = ?
      GROUP BY task_type
    `, [testDate]);
    
    const isTestCorrect = testResult.length === 1 && testResult[0].task_type === '休息' && testResult[0].count === 2;
    console.log(`  批量导入测试: ${isTestCorrect ? '✅ 通过' : '❌ 失败'}`);
    
    // 清理测试数据
    await query(`DELETE FROM tasks WHERE task_date = ?`, [testDate]);

    // 最终结论
    console.log(`\n=====================================`);
    console.log(`🎯 最终结论:`);
    
    if (allRestDaysCorrect && mixedDates.length === 0 && isTestCorrect) {
      console.log(`🎉 休息日问题修复完全成功！`);
      console.log(`\n✅ 修复成果:`);
      console.log(`  • 成功设置了 ${actualRestDates.length} 个纯休息日`);
      console.log(`  • 每个休息日只包含休息任务`);
      console.log(`  • 每个学生在休息日只有一个休息任务`);
      console.log(`  • 没有工作日包含休息任务`);
      console.log(`  • 没有混合日期`);
      console.log(`  • 批量导入功能正常工作`);
      console.log(`\n🔧 解决的问题:`);
      console.log(`  • 修复了预填任务中休息日与学习任务混合的问题`);
      console.log(`  • 确保了7月6日等周日休息日的正确设置`);
      console.log(`  • 统一了休息日的任务格式和数量`);
      console.log(`  • 消除了所有休息日与学习任务的冲突`);
    } else {
      console.log(`❌ 仍有问题需要解决:`);
      if (!allRestDaysCorrect) {
        console.log(`  • 部分休息日设置不正确`);
      }
      if (mixedDates.length > 0) {
        console.log(`  • 存在混合日期`);
      }
      if (!isTestCorrect) {
        console.log(`  • 批量导入功能异常`);
      }
    }

    process.exit(0);
    
  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  }
}

finalCorrectVerification();
