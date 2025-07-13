// 测试新的递归顺延逻辑
const { query, transaction } = require('../config/database');
const { handleMidnightTaskReschedule, scheduleTasksRecursively } = require('../services/taskScheduleService');

async function testRecursiveDeferLogic() {
  try {
    console.log('=== 测试新的递归顺延逻辑 ===');
    
    // 1. 清理测试环境
    await cleanupTestData();
    
    // 2. 创建测试数据
    await createTestData();
    
    // 3. 测试递归顺延函数
    await testRecursiveFunction();
    
    // 4. 测试24:00处理
    await testMidnightProcessing();
    
    // 5. 验证结果
    await verifyResults();
    
    console.log('\n🎉 所有测试完成');
    
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  }
}

async function cleanupTestData() {
  try {
    console.log('\n1. 清理测试数据...');
    
    await query(`DELETE FROM tasks WHERE student_id = 'ST001' AND id LIKE 'RECURSIVE-TEST-%'`);
    await query(`DELETE FROM task_schedule_history WHERE student_id = 'ST001' AND operation_date BETWEEN '2025-07-25' AND '2025-08-05'`);
    
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('清理测试数据失败:', error);
    throw error;
  }
}

async function createTestData() {
  try {
    console.log('\n2. 创建测试数据...');
    
    // 创建7月29日-31日的测试任务
    const testTasks = [
      // 7月29日：3个任务
      { date: '2025-07-29', type: '专业课', title: '递归测试-专业课1' },
      { date: '2025-07-29', type: '数学', title: '递归测试-数学1' },
      { date: '2025-07-29', type: '英语', title: '递归测试-英语1' },
      
      // 7月30日：3个任务
      { date: '2025-07-30', type: '专业课', title: '递归测试-专业课2' },
      { date: '2025-07-30', type: '数学', title: '递归测试-数学2' },
      { date: '2025-07-30', type: '英语', title: '递归测试-英语2' },
      
      // 7月31日：3个任务
      { date: '2025-07-31', type: '专业课', title: '递归测试-专业课3' },
      { date: '2025-07-31', type: '数学', title: '递归测试-数学3' },
      { date: '2025-07-31', type: '英语', title: '递归测试-英语3' }
    ];
    
    for (let i = 0; i < testTasks.length; i++) {
      const task = testTasks[i];
      const taskId = `RECURSIVE-TEST-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      await query(`
        INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status, created_at)
        VALUES (?, 'ST001', ?, ?, ?, FALSE, 'normal', NOW())
      `, [taskId, task.date, task.type, task.title]);
    }
    
    console.log(`✅ 创建了 ${testTasks.length} 个测试任务`);
    
    // 验证创建结果
    const createdTasks = await query(`
      SELECT task_date, COUNT(*) as count
      FROM tasks 
      WHERE student_id = 'ST001' AND id LIKE 'RECURSIVE-TEST-%'
      GROUP BY task_date
      ORDER BY task_date
    `);
    
    console.log('创建的任务分布:');
    createdTasks.forEach(row => {
      const date = row.task_date.toISOString().split('T')[0];
      console.log(`  ${date}: ${row.count}个任务`);
    });
    
  } catch (error) {
    console.error('创建测试数据失败:', error);
    throw error;
  }
}

async function testRecursiveFunction() {
  try {
    console.log('\n3. 测试递归顺延函数...');
    
    // 模拟：7月29日有3个未完成任务需要顺延
    const tasksToDefer = await query(`
      SELECT id, task_type, title, task_date
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date = '2025-07-29' AND id LIKE 'RECURSIVE-TEST-%'
    `);
    
    console.log(`准备顺延7月29日的 ${tasksToDefer.length} 个任务`);
    
    // 删除原任务
    const taskIds = tasksToDefer.map(t => t.id);
    await query(`DELETE FROM tasks WHERE id IN (${taskIds.map(() => '?').join(',')})`, taskIds);
    
    // 使用递归函数顺延
    await transaction(async (connection) => {
      const result = await scheduleTasksRecursively('ST001', '2025-07-29', tasksToDefer, connection);
      console.log(`递归顺延结果: ${result.details}`);
    });
    
    console.log('✅ 递归顺延函数测试完成');
    
  } catch (error) {
    console.error('递归函数测试失败:', error);
    throw error;
  }
}

async function testMidnightProcessing() {
  try {
    console.log('\n4. 测试24:00处理...');
    
    // 模拟7月30日24:00处理
    console.log('模拟7月30日24:00处理（假设有3个未完成任务）');
    
    // 先检查7月30日的任务
    const july30Tasks = await query(`
      SELECT id, task_type, title, completed
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date = '2025-07-30' AND id LIKE 'RECURSIVE-TEST-%'
    `);
    
    console.log(`7月30日任务数: ${july30Tasks.length}`);
    
    if (july30Tasks.length >= 3) {
      await handleMidnightTaskReschedule('ST001', '2025-07-30');
      console.log('✅ 24:00处理完成');
    } else {
      console.log('⏭️ 任务数不足3个，跳过24:00处理测试');
    }
    
  } catch (error) {
    console.error('24:00处理测试失败:', error);
    throw error;
  }
}

async function verifyResults() {
  try {
    console.log('\n5. 验证结果...');
    
    // 检查最终的任务分布
    const finalDistribution = await query(`
      SELECT task_date, COUNT(*) as count,
             GROUP_CONCAT(CONCAT(task_type, ':', title) SEPARATOR '; ') as tasks
      FROM tasks 
      WHERE student_id = 'ST001' AND id LIKE 'RECURSIVE-TEST-%'
      GROUP BY task_date
      ORDER BY task_date
    `);
    
    console.log('\n最终任务分布:');
    finalDistribution.forEach(row => {
      const date = row.task_date.toISOString().split('T')[0];
      console.log(`  ${date}: ${row.count}个任务`);
      console.log(`    ${row.tasks}`);
    });
    
    // 检查是否有任务被顺延到8月
    const augustTasks = finalDistribution.filter(row => 
      row.task_date.toISOString().split('T')[0].startsWith('2025-08')
    );
    
    if (augustTasks.length > 0) {
      console.log('\n✅ 成功验证：有任务被顺延到8月');
      augustTasks.forEach(row => {
        const date = row.task_date.toISOString().split('T')[0];
        console.log(`  ${date}: ${row.count}个任务（符合预期）`);
      });
    } else {
      console.log('\n📝 注意：没有任务被顺延到8月');
    }
    
    // 检查任务ID是否有冲突
    const allTasks = await query(`
      SELECT id, task_date, task_type, title
      FROM tasks 
      WHERE student_id = 'ST001' AND id LIKE 'RECURSIVE-TEST-%'
      ORDER BY task_date, id
    `);
    
    const uniqueIds = new Set(allTasks.map(t => t.id));
    if (uniqueIds.size === allTasks.length) {
      console.log(`✅ 任务ID唯一性验证通过: ${allTasks.length}个任务，${uniqueIds.size}个唯一ID`);
    } else {
      console.log(`❌ 任务ID冲突: ${allTasks.length}个任务，但只有${uniqueIds.size}个唯一ID`);
    }
    
  } catch (error) {
    console.error('验证结果失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testRecursiveDeferLogic()
    .then(() => {
      console.log('\n测试完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = { testRecursiveDeferLogic };
