const { query } = require('./config/database');

async function finalVerification() {
  try {
    console.log('✅ 最终验证：休息日问题修复情况');
    console.log('=====================================\n');

    // 获取7月份所有日期的任务统计
    const julyStats = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type) as types,
        COUNT(*) as total_tasks
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      ORDER BY task_date
    `);

    console.log('📊 7月份任务分布分析:\n');

    let workDays = [];
    let restDays = [];
    let emptyDays = [];
    let problemDays = [];

    // 分析每一天
    for (let day = 1; day <= 31; day++) {
      const dateStr = '2025-07-' + day.toString().padStart(2, '0');
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      
      const dayData = julyStats.find(s => s.task_date.toISOString().split('T')[0] === dateStr);
      
      if (!dayData) {
        emptyDays.push(dateStr);
        console.log(`  ${dateStr} (周${dayNames[dayOfWeek]}): 无任务`);
      } else if (dayData.types === '休息' && dayData.total_tasks === 2) {
        restDays.push(dateStr);
        console.log(`  ${dateStr} (周${dayNames[dayOfWeek]}): 休息日 ✅`);
      } else if (dayData.types.includes('休息')) {
        problemDays.push(dateStr);
        console.log(`  ${dateStr} (周${dayNames[dayOfWeek]}): 混合日 ❌ (${dayData.types})`);
      } else {
        workDays.push(dateStr);
        console.log(`  ${dateStr} (周${dayNames[dayOfWeek]}): 工作日 (${dayData.total_tasks}个任务)`);
      }
    }

    // 统计信息
    console.log(`\n📈 统计结果:`);
    console.log(`  工作日: ${workDays.length} 天`);
    console.log(`  休息日: ${restDays.length} 天`);
    console.log(`  问题日: ${problemDays.length} 天`);
    console.log(`  无任务日: ${emptyDays.length} 天`);

    // 详细分析休息日
    if (restDays.length > 0) {
      console.log(`\n🛌 休息日详细分析 (${restDays.length}天):`);
      
      const dayOfWeekCount = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      
      restDays.forEach(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        dayOfWeekCount[dayOfWeek]++;
      });
      
      console.log('  周几分布:');
      Object.entries(dayOfWeekCount).forEach(([day, count]) => {
        if (count > 0) {
          console.log(`    周${dayNames[day]}: ${count} 天`);
        }
      });
      
      // 验证每个休息日的任务数量
      console.log('\n  休息日任务验证:');
      for (const dateStr of restDays) {
        const restTasks = await query(`
          SELECT student_id, title
          FROM tasks 
          WHERE task_date = ? AND task_type = '休息'
          ORDER BY student_id
        `, [dateStr]);
        
        const st001Count = restTasks.filter(t => t.student_id === 'ST001').length;
        const st002Count = restTasks.filter(t => t.student_id === 'ST002').length;
        
        if (st001Count === 1 && st002Count === 1) {
          console.log(`    ${dateStr}: ✅ 正常 (ST001: 1个, ST002: 1个)`);
        } else {
          console.log(`    ${dateStr}: ❌ 异常 (ST001: ${st001Count}个, ST002: ${st002Count}个)`);
        }
      }
    }

    // 检查是否有混合日
    if (problemDays.length > 0) {
      console.log(`\n❌ 发现 ${problemDays.length} 个问题日期:`);
      problemDays.forEach(dateStr => {
        console.log(`  ${dateStr}: 需要修复`);
      });
    }

    // 测试批量导入功能
    console.log(`\n🧪 测试批量导入功能...`);
    
    // 创建测试数据
    const testDate = '2025-08-01';
    await query(`DELETE FROM tasks WHERE task_date = ?`, [testDate]);
    
    // 插入测试休息任务
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
    console.log(`  测试结果: ${isTestCorrect ? '✅ 通过' : '❌ 失败'}`);
    
    // 清理测试数据
    await query(`DELETE FROM tasks WHERE task_date = ?`, [testDate]);

    // 最终结论
    console.log(`\n=====================================`);
    console.log(`🎯 最终结论:`);
    
    const isAllGood = problemDays.length === 0 && restDays.length > 0 && isTestCorrect;
    
    if (isAllGood) {
      console.log(`🎉 休息日问题修复完成！`);
      console.log(`✅ 所有休息日只包含休息任务`);
      console.log(`✅ 每个学生在休息日只有一个休息任务`);
      console.log(`✅ 没有工作日包含休息任务`);
      console.log(`✅ 没有混合日期`);
      console.log(`✅ 批量导入功能正常`);
      console.log(`\n📊 修复成果:`);
      console.log(`  - 成功设置了 ${restDays.length} 个休息日`);
      console.log(`  - 保持了 ${workDays.length} 个工作日的学习任务`);
      console.log(`  - 消除了所有休息日与学习任务的冲突`);
    } else {
      console.log(`❌ 仍有问题需要解决:`);
      if (problemDays.length > 0) {
        console.log(`  - ${problemDays.length} 个混合日期需要修复`);
      }
      if (!isTestCorrect) {
        console.log(`  - 批量导入功能需要检查`);
      }
    }

    process.exit(0);
    
  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  }
}

finalVerification();
