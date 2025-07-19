#!/usr/bin/env node

/**
 * 检查日期显示问题的脚本
 */

const { query } = require('../backend/config/database');

async function checkDateIssue() {
  try {
    console.log('🔍 检查日期显示问题...\n');

    // 1. 检查7月13日和14日的任务数据
    console.log('📅 步骤1: 检查7月13日和14日的任务数据...');
    
    const july13Tasks = await query(`
      SELECT id, student_id, task_date, task_type, title, completed, created_at
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date = '2025-07-13'
      ORDER BY task_type
    `);
    
    const july14Tasks = await query(`
      SELECT id, student_id, task_date, task_type, title, completed, created_at
      FROM tasks 
      WHERE student_id = 'ST001' AND task_date = '2025-07-14'
      ORDER BY task_type
    `);

    console.log(`\n📊 7月13日任务数据 (${july13Tasks.length}条):`);
    july13Tasks.forEach(task => {
      console.log(`  - ${task.task_type}: ${task.title} (完成: ${task.completed})`);
    });

    console.log(`\n📊 7月14日任务数据 (${july14Tasks.length}条):`);
    july14Tasks.forEach(task => {
      console.log(`  - ${task.task_type}: ${task.title} (完成: ${task.completed})`);
    });

    // 2. 检查是否有休息日任务
    console.log('\n🛌 步骤2: 检查休息日任务...');
    
    const restTasks = await query(`
      SELECT task_date, task_type, title, completed
      FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_type = '休息'
        AND task_date BETWEEN '2025-07-10' AND '2025-07-20'
      ORDER BY task_date
    `);

    console.log(`\n📊 休息日任务 (${restTasks.length}条):`);
    restTasks.forEach(task => {
      console.log(`  - ${task.task_date}: ${task.title} (完成: ${task.completed})`);
    });

    // 3. 检查7月13-15日的所有任务类型分布
    console.log('\n📈 步骤3: 检查7月13-15日任务类型分布...');
    
    const taskDistribution = await query(`
      SELECT 
        task_date,
        task_type,
        COUNT(*) as count,
        GROUP_CONCAT(title) as titles
      FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_date BETWEEN '2025-07-13' AND '2025-07-15'
      GROUP BY task_date, task_type
      ORDER BY task_date, task_type
    `);

    console.log('\n📊 任务类型分布:');
    taskDistribution.forEach(row => {
      console.log(`  ${row.task_date} - ${row.task_type}: ${row.count}个任务`);
      console.log(`    标题: ${row.titles}`);
    });

    // 4. 检查数据库时区设置
    console.log('\n🌍 步骤4: 检查数据库时区设置...');
    
    const timezone = await query('SELECT @@time_zone as timezone, NOW() as current_datetime');
    console.log(`数据库时区: ${timezone[0].timezone}`);
    console.log(`数据库当前时间: ${timezone[0].current_datetime}`);

    // 5. 检查最近导入的任务
    console.log('\n📥 步骤5: 检查最近导入的任务...');
    
    const recentTasks = await query(`
      SELECT task_date, task_type, title, created_at
      FROM tasks 
      WHERE student_id = 'ST001'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n📊 最近1小时导入的任务 (${recentTasks.length}条):`);
    recentTasks.forEach(task => {
      console.log(`  ${task.task_date} - ${task.task_type}: ${task.title}`);
      console.log(`    导入时间: ${task.created_at}`);
    });

    // 6. 检查前端API返回的数据格式
    console.log('\n🔍 步骤6: 模拟前端API调用...');
    
    const apiData = await query(`
      SELECT task_date, task_type, title, completed
      FROM tasks 
      WHERE student_id = 'ST001'
        AND task_date BETWEEN '2025-07-01' AND '2025-07-31'
      ORDER BY task_date, task_type
    `);

    // 按日期分组，模拟前端接收的数据结构
    const groupedData = {};
    apiData.forEach(task => {
      if (!groupedData[task.task_date]) {
        groupedData[task.task_date] = [];
      }
      groupedData[task.task_date].push({
        type: task.task_type,
        title: task.title,
        completed: task.completed
      });
    });

    console.log('\n📊 按日期分组的任务数据:');
    Object.keys(groupedData).sort().forEach(date => {
      const tasks = groupedData[date];
      const restTask = tasks.find(t => t.type === '休息');
      const emoji = restTask ? '😴' : '📚';
      console.log(`  ${date}: ${emoji} ${tasks.length}个任务`);
      tasks.forEach(task => {
        console.log(`    - ${task.type}: ${task.title} (${task.completed ? '✅' : '⭕'})`);
      });
    });

    console.log('\n✅ 日期问题检查完成');
    process.exit(0);

  } catch (error) {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  }
}

checkDateIssue();
