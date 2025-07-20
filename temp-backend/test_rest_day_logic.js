const { query, transaction } = require('./config/database');
const { handleLeaveDefer, handleMidnightTaskReschedule, findNextWorkDate } = require('./services/taskScheduleService');
const moment = require('moment');

async function testRestDayLogic() {
  try {
    console.log('🧪 测试任务结转和顺延的休息日跳过逻辑');
    console.log('=====================================\n');

    // 1. 测试 findNextWorkDate 函数
    await testFindNextWorkDate();

    // 2. 测试请假顺延逻辑
    await testLeaveDefer();

    // 3. 测试24:00任务结转逻辑
    await testMidnightReschedule();

    console.log('\n🎉 所有测试完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

async function testFindNextWorkDate() {
  console.log('1️⃣ 测试 findNextWorkDate 函数');
  console.log('-----------------------------------');

  await transaction(async (connection) => {
    // 测试从工作日查找下一个工作日
    console.log('\n📅 测试场景1: 从工作日查找下一个工作日');
    const workDate1 = '2025-07-21'; // 假设这是工作日
    const nextWork1 = await findNextWorkDate('ST001', workDate1, connection);
    console.log(`从 ${workDate1} 查找下一个工作日: ${nextWork1}`);

    // 检查结果日期是否是休息日
    const [restCheck1] = await connection.execute(
      `SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = '休息'`,
      ['ST001', nextWork1]
    );
    console.log(`结果日期 ${nextWork1} 是否为休息日: ${restCheck1.length > 0 ? '是' : '否'}`);

    // 测试从休息日前一天查找下一个工作日
    console.log('\n📅 测试场景2: 从休息日前一天查找下一个工作日');
    
    // 先找一个休息日
    const [restDays] = await connection.execute(
      `SELECT task_date FROM tasks WHERE student_id = ? AND task_type = '休息' LIMIT 1`,
      ['ST001']
    );
    
    if (restDays.length > 0) {
      const restDate = moment(restDays[0].task_date).format('YYYY-MM-DD');
      const beforeRestDate = moment(restDate).subtract(1, 'day').format('YYYY-MM-DD');
      
      console.log(`休息日: ${restDate}`);
      console.log(`休息日前一天: ${beforeRestDate}`);
      
      const nextWork2 = await findNextWorkDate('ST001', beforeRestDate, connection);
      console.log(`从 ${beforeRestDate} 查找下一个工作日: ${nextWork2}`);
      
      // 检查是否跳过了休息日
      const [restCheck2] = await connection.execute(
        `SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = '休息'`,
        ['ST001', nextWork2]
      );
      console.log(`结果日期 ${nextWork2} 是否为休息日: ${restCheck2.length > 0 ? '是' : '否'}`);
      console.log(`是否正确跳过休息日 ${restDate}: ${nextWork2 > restDate ? '是' : '否'}`);
    }
  });

  console.log('✅ findNextWorkDate 测试完成\n');
}

async function testLeaveDefer() {
  console.log('2️⃣ 测试请假顺延逻辑');
  console.log('-----------------------------------');

  await transaction(async (connection) => {
    // 创建测试任务
    const testDate = '2025-07-25'; // 选择一个测试日期
    const testTasks = [
      { id: 'test-leave-1', title: '测试任务1', type: '数学' },
      { id: 'test-leave-2', title: '测试任务2', type: '语文' },
      { id: 'test-leave-3', title: '测试任务3', type: '英语' }
    ];

    console.log(`\n📝 在 ${testDate} 创建测试任务...`);
    
    // 先删除可能存在的测试任务
    await connection.execute(
      `DELETE FROM tasks WHERE student_id = ? AND id LIKE 'test-leave-%'`,
      ['ST001']
    );

    // 创建测试任务
    for (const task of testTasks) {
      await connection.execute(
        `INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, original_date, task_status)
         VALUES (?, ?, ?, ?, ?, FALSE, ?, 'normal')`,
        [task.id, 'ST001', testDate, task.type, task.title, testDate]
      );
    }

    console.log(`✅ 创建了 ${testTasks.length} 个测试任务`);

    // 执行请假顺延
    console.log(`\n🏖️ 执行请假顺延 (日期: ${testDate})...`);
    const deferResult = await handleLeaveDefer('ST001', testDate, connection);
    
    console.log(`顺延结果:`, deferResult);

    // 检查任务是否被正确顺延到工作日
    if (deferResult.deferredTo) {
      const [deferredTasks] = await connection.execute(
        `SELECT id, task_date, task_type, title FROM tasks 
         WHERE student_id = ? AND task_date = ? AND id LIKE 'test-leave-%'`,
        ['ST001', deferResult.deferredTo]
      );

      console.log(`\n📋 顺延到 ${deferResult.deferredTo} 的任务:`);
      deferredTasks.forEach(task => {
        console.log(`  - ${task.title} (${task.task_type})`);
      });

      // 检查顺延目标日期是否为休息日
      const [restCheck] = await connection.execute(
        `SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = '休息'`,
        ['ST001', deferResult.deferredTo]
      );
      console.log(`顺延目标日期 ${deferResult.deferredTo} 是否为休息日: ${restCheck.length > 0 ? '是' : '否'}`);
    }

    // 清理测试数据
    await connection.execute(
      `DELETE FROM tasks WHERE student_id = ? AND id LIKE 'test-leave-%'`,
      ['ST001']
    );
  });

  console.log('✅ 请假顺延测试完成\n');
}

async function testMidnightReschedule() {
  console.log('3️⃣ 测试24:00任务结转逻辑');
  console.log('-----------------------------------');

  const testDate = '2025-07-28'; // 选择一个不同的测试日期
  const testTasks = [
    { id: 'test-midnight-1', title: '未完成任务1', type: '数学' },
    { id: 'test-midnight-2', title: '未完成任务2', type: '语文' }
  ];

  // 先在一个事务中创建测试任务
  await transaction(async (connection) => {
    console.log(`\n📝 在 ${testDate} 创建未完成测试任务...`);

    // 先删除可能存在的测试任务
    await connection.execute(
      `DELETE FROM tasks WHERE student_id = ? AND id LIKE 'test-midnight-%'`,
      ['ST001']
    );

    // 创建未完成的测试任务
    for (const task of testTasks) {
      await connection.execute(
        `INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, original_date, task_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [task.id, 'ST001', testDate, task.type, task.title, false, testDate, 'normal']
      );
    }

    console.log(`✅ 创建了 ${testTasks.length} 个未完成测试任务`);
  });

  // 验证任务是否真的被创建（在新的事务中）
  await transaction(async (connection) => {
    const [verifyTasks] = await connection.execute(
      `SELECT id, title, completed, task_date FROM tasks WHERE student_id = ? AND id LIKE 'test-midnight-%'`,
      ['ST001']
    );
    console.log(`\n🔍 验证创建的任务:`);
    verifyTasks.forEach(task => {
      console.log(`  - ${task.title} (ID: ${task.id}, 完成: ${task.completed}, 日期: ${task.task_date})`);
    });

    // 使用与 handleMidnightTaskReschedule 相同的查询条件进行测试
    const [testQuery] = await connection.execute(
      `SELECT * FROM tasks
       WHERE student_id = ? AND task_date = ? AND completed = FALSE
       AND task_type NOT IN ('休息', 'leave')
       ORDER BY created_at ASC`,
      ['ST001', testDate]
    );
    console.log(`\n🔍 使用相同查询条件的结果: ${testQuery.length} 个任务`);
    testQuery.forEach(task => {
      console.log(`  - ${task.title} (类型: ${task.task_type}, 完成: ${task.completed})`);
    });
  });

  // 执行24:00任务重新调度（在独立的事务中）
  console.log(`\n🕛 执行24:00任务重新调度 (日期: ${testDate})...`);
  await handleMidnightTaskReschedule('ST001', testDate);

  // 检查任务是否被正确结转到工作日（在新的事务中）
  await transaction(async (connection) => {
    const [carriedTasks] = await connection.execute(
      `SELECT id, task_date, task_type, title, task_status FROM tasks
       WHERE student_id = ? AND id LIKE 'test-midnight-%' AND task_date > ?`,
      ['ST001', testDate]
    );

    console.log(`\n📋 结转后的任务:`);
    carriedTasks.forEach(task => {
      console.log(`  - ${task.title} (${task.task_type}) -> ${task.task_date} [${task.task_status}]`);
    });

    // 检查结转目标日期是否为休息日
    if (carriedTasks.length > 0) {
      const targetDate = carriedTasks[0].task_date;
      const [restCheck] = await connection.execute(
        `SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = '休息'`,
        ['ST001', targetDate]
      );
      console.log(`结转目标日期 ${targetDate} 是否为休息日: ${restCheck.length > 0 ? '是' : '否'}`);
    }

    // 清理测试数据
    await connection.execute(
      `DELETE FROM tasks WHERE student_id = ? AND id LIKE 'test-midnight-%'`,
      ['ST001']
    );
  });

  console.log('✅ 24:00任务结转测试完成\n');
}

testRestDayLogic();
