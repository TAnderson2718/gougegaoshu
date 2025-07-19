const { query, transaction } = require('./config/database');
const { handleLeaveDefer, findNextWorkDate } = require('./services/taskScheduleService');
const moment = require('moment');

async function testRestDaySkip() {
  try {
    console.log('🧪 测试休息日跳过逻辑');
    console.log('=====================================\n');

    // 1. 测试从休息日前一天查找下一个工作日
    await testSkipRestDay();

    // 2. 测试请假顺延跳过休息日
    await testLeaveSkipRestDay();

    console.log('\n🎉 休息日跳过测试完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

async function testSkipRestDay() {
  console.log('1️⃣ 测试跳过休息日逻辑');
  console.log('-----------------------------------');

  await transaction(async (connection) => {
    // 查找一个休息日
    const [restDays] = await connection.execute(
      `SELECT task_date FROM tasks WHERE student_id = ? AND task_type = '休息' ORDER BY task_date LIMIT 1`,
      ['ST001']
    );

    if (restDays.length === 0) {
      console.log('⚠️ 数据库中没有休息日，跳过此测试');
      return;
    }

    const restDate = moment(restDays[0].task_date).format('YYYY-MM-DD');
    const beforeRestDate = moment(restDate).subtract(1, 'day').format('YYYY-MM-DD');
    
    console.log(`📅 找到休息日: ${restDate}`);
    console.log(`📅 休息日前一天: ${beforeRestDate}`);

    // 测试从休息日前一天查找下一个工作日
    const nextWorkDate = await findNextWorkDate('ST001', beforeRestDate, connection);
    console.log(`📅 从 ${beforeRestDate} 查找到的下一个工作日: ${nextWorkDate}`);

    // 验证结果日期不是休息日
    const [restCheck] = await connection.execute(
      `SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = '休息'`,
      ['ST001', nextWorkDate]
    );

    const isRestDay = restCheck.length > 0;
    console.log(`✅ 结果日期 ${nextWorkDate} 是否为休息日: ${isRestDay ? '是' : '否'}`);
    console.log(`✅ 是否正确跳过休息日 ${restDate}: ${nextWorkDate > restDate ? '是' : '否'}`);

    if (isRestDay) {
      throw new Error(`findNextWorkDate 返回了休息日: ${nextWorkDate}`);
    }

    if (nextWorkDate <= restDate) {
      throw new Error(`findNextWorkDate 没有跳过休息日 ${restDate}`);
    }
  });

  console.log('✅ 跳过休息日测试通过\n');
}

async function testLeaveSkipRestDay() {
  console.log('2️⃣ 测试请假顺延跳过休息日');
  console.log('-----------------------------------');

  // 查找一个休息日
  const [restDays] = await query(
    `SELECT task_date FROM tasks WHERE student_id = ? AND task_type = '休息' ORDER BY task_date LIMIT 1`,
    ['ST001']
  );

  if (restDays.length === 0) {
    console.log('⚠️ 数据库中没有休息日，跳过此测试');
    return;
  }

  const restDate = moment(restDays[0].task_date).format('YYYY-MM-DD');
  const beforeRestDate = moment(restDate).subtract(1, 'day').format('YYYY-MM-DD');
  
  console.log(`📅 找到休息日: ${restDate}`);
  console.log(`📅 将在休息日前一天 ${beforeRestDate} 创建任务并请假`);

  const testTasks = [
    { id: 'test-skip-rest-1', title: '跳过休息日测试1', type: '数学' },
    { id: 'test-skip-rest-2', title: '跳过休息日测试2', type: '语文' }
  ];

  // 创建测试任务
  await transaction(async (connection) => {
    // 先删除可能存在的测试任务
    await connection.execute(
      `DELETE FROM tasks WHERE student_id = ? AND id LIKE 'test-skip-rest-%'`,
      ['ST001']
    );

    // 在休息日前一天创建任务
    for (const task of testTasks) {
      await connection.execute(
        `INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, original_date, task_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [task.id, 'ST001', beforeRestDate, task.type, task.title, false, beforeRestDate, 'normal']
      );
    }

    console.log(`✅ 在 ${beforeRestDate} 创建了 ${testTasks.length} 个测试任务`);
  });

  // 执行请假顺延
  console.log(`\n🏖️ 执行请假顺延 (日期: ${beforeRestDate})...`);
  
  await transaction(async (connection) => {
    const deferResult = await handleLeaveDefer('ST001', beforeRestDate, connection);
    
    console.log(`顺延结果:`, deferResult);

    if (deferResult.deferredTo) {
      console.log(`📅 任务被顺延到: ${deferResult.deferredTo}`);
      console.log(`📅 休息日: ${restDate}`);
      
      // 检查是否正确跳过了休息日
      if (deferResult.deferredTo <= restDate) {
        throw new Error(`请假顺延没有跳过休息日 ${restDate}，顺延到了 ${deferResult.deferredTo}`);
      }

      // 检查顺延目标日期是否为休息日
      const [restCheck] = await connection.execute(
        `SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = '休息'`,
        ['ST001', deferResult.deferredTo]
      );

      const isRestDay = restCheck.length > 0;
      console.log(`✅ 顺延目标日期 ${deferResult.deferredTo} 是否为休息日: ${isRestDay ? '是' : '否'}`);
      console.log(`✅ 是否正确跳过休息日: ${deferResult.deferredTo > restDate ? '是' : '否'}`);

      if (isRestDay) {
        throw new Error(`请假顺延的目标日期是休息日: ${deferResult.deferredTo}`);
      }

      // 验证任务确实被顺延了
      const [deferredTasks] = await connection.execute(
        `SELECT id, task_date, title FROM tasks 
         WHERE student_id = ? AND task_date = ? AND id LIKE 'test-skip-rest-%'`,
        ['ST001', deferResult.deferredTo]
      );

      console.log(`\n📋 顺延到 ${deferResult.deferredTo} 的任务:`);
      deferredTasks.forEach(task => {
        console.log(`  - ${task.title} (ID: ${task.id})`);
      });

      if (deferredTasks.length !== testTasks.length) {
        throw new Error(`期望顺延 ${testTasks.length} 个任务，实际顺延了 ${deferredTasks.length} 个`);
      }
    }

    // 清理测试数据
    await connection.execute(
      `DELETE FROM tasks WHERE student_id = ? AND id LIKE 'test-skip-rest-%'`,
      ['ST001']
    );
  });

  console.log('✅ 请假顺延跳过休息日测试通过\n');
}

testRestDaySkip();
