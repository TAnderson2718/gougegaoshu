// 测试修复后的正确顺延逻辑
const { query, transaction } = require('../config/database');
const { handleMidnightTaskReschedule } = require('../services/taskScheduleService');

async function testCorrectDeferLogic() {
  try {
    console.log('=== 测试修复后的正确顺延逻辑 ===');
    
    // 1. 清理测试环境
    await cleanupTestEnvironment();
    
    // 2. 创建测试数据
    await createTestData();
    
    // 3. 模拟24:00处理
    await simulateMidnightProcessing();
    
    // 4. 验证结果
    await verifyResults();
    
    console.log('\n🎉 测试完成');
    
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  }
}

async function cleanupTestEnvironment() {
  try {
    console.log('\n1. 清理测试环境...');
    
    // 删除测试日期的任务
    await query(`
      DELETE FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_date BETWEEN '2025-07-25' AND '2025-08-05'
    `);
    
    // 删除相关的调度历史
    await query(`
      DELETE FROM task_schedule_history 
      WHERE student_id = 'ST001' 
        AND operation_date BETWEEN '2025-07-25' AND '2025-08-05'
    `);
    
    console.log('✅ 测试环境清理完成');
    
  } catch (error) {
    console.error('清理测试环境失败:', error);
    throw error;
  }
}

async function createTestData() {
  try {
    console.log('\n2. 创建测试数据...');
    
    // 创建7月29日-31日的测试任务
    const testDates = [
      { date: '2025-07-29', tasks: 3 }, // 周二，3个任务
      { date: '2025-07-30', tasks: 3 }, // 周三，3个任务  
      { date: '2025-07-31', tasks: 3 }  // 周四，3个任务
    ];
    
    for (const dateInfo of testDates) {
      for (let i = 0; i < dateInfo.tasks; i++) {
        const taskTypes = ['专业课', '数学', '英语'];
        const taskType = taskTypes[i % taskTypes.length];
        // 修复：使用唯一的任务ID，避免重复
        const taskId = `TEST-ST001-${dateInfo.date}-${taskType}-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        await query(`
          INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status, created_at)
          VALUES (?, 'ST001', ?, ?, ?, FALSE, 'normal', NOW())
        `, [taskId, dateInfo.date, taskType, `测试任务${i+1}-${dateInfo.date}`]);
      }

      console.log(`  ✅ 创建了${dateInfo.date}的${dateInfo.tasks}个任务`);
    }
    
  } catch (error) {
    console.error('创建测试数据失败:', error);
    throw error;
  }
}

async function simulateMidnightProcessing() {
  try {
    console.log('\n3. 模拟24:00处理...');
    
    // 模拟7月29日24:00处理（3个未完成任务，≥3，应该触发整体顺延）
    console.log('\n模拟7月29日24:00处理:');
    console.log('  - 有3个未完成任务');
    console.log('  - ≥3，应该触发整体顺延');
    console.log('  - 7月29日任务顺延到7月30日');
    console.log('  - 7月30日任务顺延到7月31日');
    console.log('  - 7月31日任务顺延到8月1日');
    
    await handleMidnightTaskReschedule('ST001', '2025-07-29');
    
    console.log('✅ 7月29日24:00处理完成');
    
  } catch (error) {
    console.error('模拟24:00处理失败:', error);
    throw error;
  }
}

async function verifyResults() {
  try {
    console.log('\n4. 验证结果...');
    
    // 检查任务分布
    const taskDistribution = await query(`
      SELECT task_date, COUNT(*) as count,
             GROUP_CONCAT(CONCAT(task_type, ':', title) SEPARATOR '; ') as tasks
      FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_date BETWEEN '2025-07-29' AND '2025-08-02'
        AND id LIKE 'TEST-%'
      GROUP BY task_date
      ORDER BY task_date
    `);
    
    console.log('\n任务分布结果:');
    taskDistribution.forEach(row => {
      const date = row.task_date.toISOString().split('T')[0];
      console.log(`  ${date}: ${row.count}个任务`);
      console.log(`    ${row.tasks}`);
    });
    
    // 验证预期结果
    console.log('\n验证预期结果:');
    
    const expectedDistribution = {
      '2025-07-29': 0, // 原任务已顺延
      '2025-07-30': 6, // 原3个 + 7月29日顺延的3个
      '2025-07-31': 3, // 原3个（7月30日的已顺延）
      '2025-08-01': 3  // 7月31日顺延的3个
    };
    
    let allCorrect = true;
    
    for (const [expectedDate, expectedCount] of Object.entries(expectedDistribution)) {
      const actual = taskDistribution.find(row => 
        row.task_date.toISOString().split('T')[0] === expectedDate
      );
      const actualCount = actual ? actual.count : 0;
      
      const status = actualCount === expectedCount ? '✅' : '❌';
      console.log(`  ${expectedDate}: 期望${expectedCount}个, 实际${actualCount}个 ${status}`);
      
      if (actualCount !== expectedCount) {
        allCorrect = false;
      }
    }
    
    if (allCorrect) {
      console.log('\n🎉 所有验证通过！顺延逻辑正确');
    } else {
      console.log('\n❌ 验证失败，顺延逻辑仍有问题');
    }
    
  } catch (error) {
    console.error('验证结果失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testCorrectDeferLogic()
    .then(() => {
      console.log('\n测试完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = { testCorrectDeferLogic };
