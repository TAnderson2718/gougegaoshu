const { query, transaction } = require('./config/database');
const { findNextWorkDate } = require('./services/taskScheduleService');
const moment = require('moment');

async function testRestDaySimple() {
  try {
    console.log('🧪 测试休息日跳过逻辑（简化版）');
    console.log('=====================================\n');

    await testCreateAndSkipRestDay();

    console.log('\n🎉 休息日跳过测试完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

async function testCreateAndSkipRestDay() {
  console.log('1️⃣ 创建休息日并测试跳过逻辑');
  console.log('-----------------------------------');

  await transaction(async (connection) => {
    // 选择测试日期
    const testRestDate = '2025-08-01'; // 选择一个未来的日期作为休息日
    const beforeRestDate = '2025-07-31'; // 休息日前一天
    const afterRestDate = '2025-08-02'; // 休息日后一天

    console.log(`📅 测试休息日: ${testRestDate}`);
    console.log(`📅 休息日前一天: ${beforeRestDate}`);
    console.log(`📅 休息日后一天: ${afterRestDate}`);

    // 清理可能存在的测试数据
    await connection.execute(
      `DELETE FROM tasks WHERE student_id = ? AND task_date IN (?, ?, ?)`,
      ['ST001', beforeRestDate, testRestDate, afterRestDate]
    );

    // 创建休息日任务
    await connection.execute(
      `INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, original_date, task_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['test-rest-day', 'ST001', testRestDate, '休息', '测试休息日', true, testRestDate, 'normal']
    );

    console.log(`✅ 创建了休息日任务: ${testRestDate}`);

    // 测试从休息日前一天查找下一个工作日
    console.log(`\n🔍 测试从 ${beforeRestDate} 查找下一个工作日...`);
    const nextWorkDate1 = await findNextWorkDate('ST001', beforeRestDate, connection);
    console.log(`📅 结果: ${nextWorkDate1}`);

    // 验证结果
    if (nextWorkDate1 === testRestDate) {
      throw new Error(`findNextWorkDate 返回了休息日: ${nextWorkDate1}`);
    }

    if (nextWorkDate1 <= testRestDate) {
      throw new Error(`findNextWorkDate 没有跳过休息日 ${testRestDate}，返回了 ${nextWorkDate1}`);
    }

    console.log(`✅ 正确跳过了休息日 ${testRestDate}，找到工作日 ${nextWorkDate1}`);

    // 测试从休息日当天查找下一个工作日
    console.log(`\n🔍 测试从休息日当天 ${testRestDate} 查找下一个工作日...`);
    const nextWorkDate2 = await findNextWorkDate('ST001', testRestDate, connection);
    console.log(`📅 结果: ${nextWorkDate2}`);

    if (nextWorkDate2 <= testRestDate) {
      throw new Error(`从休息日查找下一个工作日失败，返回了 ${nextWorkDate2}`);
    }

    console.log(`✅ 从休息日正确找到下一个工作日 ${nextWorkDate2}`);

    // 创建连续的休息日来测试跳过多个休息日
    const restDate2 = '2025-08-03';
    const restDate3 = '2025-08-04';

    await connection.execute(
      `INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, original_date, task_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['test-rest-day-2', 'ST001', restDate2, '休息', '测试休息日2', true, restDate2, 'normal']
    );

    await connection.execute(
      `INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, original_date, task_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['test-rest-day-3', 'ST001', restDate3, '休息', '测试休息日3', true, restDate3, 'normal']
    );

    console.log(`\n✅ 创建了连续休息日: ${restDate2}, ${restDate3}`);

    // 测试跳过连续休息日
    console.log(`\n🔍 测试从 ${afterRestDate} 查找下一个工作日（跳过连续休息日）...`);
    const nextWorkDate3 = await findNextWorkDate('ST001', afterRestDate, connection);
    console.log(`📅 结果: ${nextWorkDate3}`);

    if (nextWorkDate3 <= restDate3) {
      throw new Error(`没有跳过连续休息日，返回了 ${nextWorkDate3}`);
    }

    console.log(`✅ 正确跳过了连续休息日，找到工作日 ${nextWorkDate3}`);

    // 验证找到的日期确实不是休息日
    const [restCheck] = await connection.execute(
      `SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = '休息'`,
      ['ST001', nextWorkDate3]
    );

    if (restCheck.length > 0) {
      throw new Error(`findNextWorkDate 返回的日期 ${nextWorkDate3} 仍然是休息日`);
    }

    console.log(`✅ 验证通过: ${nextWorkDate3} 不是休息日`);

    // 清理测试数据
    await connection.execute(
      `DELETE FROM tasks WHERE student_id = ? AND id LIKE 'test-rest-day%'`,
      ['ST001']
    );

    console.log(`\n🧹 清理了测试数据`);
  });

  console.log('✅ 休息日跳过逻辑测试通过');
}

testRestDaySimple();
