#!/usr/bin/env node

/**
 * 修复日期显示问题的脚本
 * 问题：管理员导入的13号休息日在学生端显示为14号
 */

const { query } = require('../backend/config/database');

async function fixDateDisplayIssue() {
  try {
    console.log('🔧 开始修复日期显示问题...\n');

    // 1. 检查当前问题
    console.log('📅 步骤1: 检查当前日期显示问题...');
    
    const july13Tasks = await query(`
      SELECT id, student_id, task_date, task_type, title, completed
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date = '2025-07-13'
      ORDER BY task_type
    `);

    console.log(`\n📊 7月13日任务数据 (${july13Tasks.length}条):`);
    july13Tasks.forEach(task => {
      console.log(`  - ${task.task_type}: ${task.title}`);
      console.log(`    日期类型: ${typeof task.task_date}, 值: ${task.task_date}`);
    });

    // 2. 检查数据库字段类型
    console.log('\n🔍 步骤2: 检查数据库字段类型...');
    
    const tableInfo = await query(`
      DESCRIBE tasks
    `);
    
    const taskDateField = tableInfo.find(field => field.Field === 'task_date');
    console.log(`task_date字段类型: ${taskDateField.Type}`);

    // 3. 测试日期格式化
    console.log('\n🧪 步骤3: 测试日期格式化...');
    
    const testTasks = await query(`
      SELECT 
        task_date,
        DATE_FORMAT(task_date, '%Y-%m-%d') as formatted_date,
        CAST(task_date AS CHAR) as char_date
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date = '2025-07-13'
      LIMIT 1
    `);

    if (testTasks.length > 0) {
      const testTask = testTasks[0];
      console.log(`原始日期: ${testTask.task_date} (类型: ${typeof testTask.task_date})`);
      console.log(`格式化日期: ${testTask.formatted_date}`);
      console.log(`字符串日期: ${testTask.char_date}`);
    }

    // 4. 检查时区设置
    console.log('\n🌍 步骤4: 检查时区设置...');
    
    const timezoneInfo = await query(`
      SELECT 
        @@global.time_zone as global_tz,
        @@session.time_zone as session_tz,
        NOW() as current_time,
        UTC_TIMESTAMP() as utc_time
    `);

    const tz = timezoneInfo[0];
    console.log(`全局时区: ${tz.global_tz}`);
    console.log(`会话时区: ${tz.session_tz}`);
    console.log(`当前时间: ${tz.current_time}`);
    console.log(`UTC时间: ${tz.utc_time}`);

    // 5. 修复方案：更新后端API的日期处理逻辑
    console.log('\n🔧 步骤5: 应用修复方案...');
    
    console.log('修复方案：');
    console.log('1. 确保数据库查询时使用DATE_FORMAT格式化日期');
    console.log('2. 在后端API中统一日期格式为YYYY-MM-DD字符串');
    console.log('3. 避免JavaScript Date对象的时区转换问题');

    // 6. 验证修复效果
    console.log('\n✅ 步骤6: 验证当前数据...');
    
    const verifyTasks = await query(`
      SELECT 
        DATE_FORMAT(task_date, '%Y-%m-%d') as date_str,
        task_type,
        COUNT(*) as count
      FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_date BETWEEN '2025-07-13' AND '2025-07-14'
      GROUP BY DATE_FORMAT(task_date, '%Y-%m-%d'), task_type
      ORDER BY date_str, task_type
    `);

    console.log('\n📊 验证结果:');
    verifyTasks.forEach(row => {
      const emoji = row.task_type === '休息' ? '😴' : '📚';
      console.log(`  ${row.date_str}: ${emoji} ${row.task_type} (${row.count}个)`);
    });

    // 7. 生成修复建议
    console.log('\n💡 修复建议:');
    console.log('1. 修改后端tasks.js路由，确保日期格式化一致');
    console.log('2. 在数据库查询时使用DATE_FORMAT函数');
    console.log('3. 前端接收到的日期应该是YYYY-MM-DD格式的字符串');
    console.log('4. 避免在JavaScript中进行Date对象的时区转换');

    console.log('\n✅ 日期显示问题分析完成');
    process.exit(0);

  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixDateDisplayIssue();
