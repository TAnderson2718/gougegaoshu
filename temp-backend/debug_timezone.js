const { query } = require('./config/database');

async function debugTimezone() {
  try {
    console.log('🔍 调试时区问题...');
    
    // 1. 检查数据库时区设置
    console.log('\n🌍 步骤1: 检查数据库时区设置');
    const timezone = await query('SELECT @@time_zone as timezone, @@system_time_zone as system_timezone, NOW() as current_datetime');
    console.log('数据库时区:', timezone[0].timezone);
    console.log('系统时区:', timezone[0].system_timezone);
    console.log('数据库当前时间:', timezone[0].current_datetime);
    
    // 2. 检查Node.js时区
    console.log('\n⏰ 步骤2: 检查Node.js时区');
    console.log('Node.js时区:', process.env.TZ || 'system default');
    console.log('Node.js当前时间:', new Date().toISOString());
    console.log('Node.js本地时间:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
    
    // 3. 检查具体任务的日期存储
    console.log('\n📅 步骤3: 检查任务日期存储');
    const tasks = await query(`
      SELECT 
        id,
        title,
        task_date,
        CAST(task_date AS CHAR) as date_string,
        DATE_FORMAT(task_date, '%Y-%m-%d') as formatted_date,
        UNIX_TIMESTAMP(task_date) as timestamp,
        completed
      FROM tasks 
      WHERE student_id = 'ST001' 
      AND task_date BETWEEN '2025-07-20' AND '2025-07-22'
      ORDER BY task_date
    `);
    
    console.log('任务日期详情:');
    tasks.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.title}`);
      console.log(`     task_date: ${task.task_date} (类型: ${typeof task.task_date})`);
      console.log(`     字符串: ${task.date_string}`);
      console.log(`     格式化: ${task.formatted_date}`);
      console.log(`     时间戳: ${task.timestamp}`);
      console.log(`     完成状态: ${task.completed ? '✅' : '❌'}`);
      
      // 转换时间戳为JavaScript Date
      if (task.timestamp) {
        const jsDate = new Date(task.timestamp * 1000);
        console.log(`     JS Date: ${jsDate.toISOString()}`);
        console.log(`     JS 本地: ${jsDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);
      }
      console.log('');
    });
    
    // 4. 模拟后端API的日期处理
    console.log('\n🌐 步骤4: 模拟后端API日期处理');
    const apiTasks = await query(`
      SELECT
        id, student_id,
        DATE_FORMAT(task_date, '%Y-%m-%d') as task_date,
        task_type, title, completed,
        duration_hour, duration_minute, proof_image, created_at
      FROM tasks 
      WHERE student_id = 'ST001'
      AND task_date BETWEEN '2025-07-20' AND '2025-07-22'
      ORDER BY task_date ASC, created_at ASC
    `);
    
    console.log('API返回的任务数据:');
    const tasksByDate = {};
    apiTasks.forEach(task => {
      const dateStr = task.task_date;
      
      if (!tasksByDate[dateStr]) {
        tasksByDate[dateStr] = [];
      }
      tasksByDate[dateStr].push({
        id: task.id,
        type: task.task_type,
        title: task.title,
        completed: task.completed
      });
    });
    
    Object.keys(tasksByDate).forEach(date => {
      const tasks = tasksByDate[date];
      const completedCount = tasks.filter(t => t.completed).length;
      console.log(`  ${date}: ${completedCount}/${tasks.length} 个任务`);
      tasks.forEach((task, index) => {
        console.log(`    ${index + 1}. ${task.title} - ${task.completed ? '✅' : '❌'}`);
      });
    });
    
    // 5. 测试不同的日期查询方式
    console.log('\n🧪 步骤5: 测试不同的日期查询方式');
    
    // 方式1: 直接使用DATE函数
    const method1 = await query(`
      SELECT 
        DATE(task_date) as date_only,
        title,
        completed
      FROM tasks 
      WHERE student_id = 'ST001' 
      AND DATE(task_date) = '2025-07-21'
    `);
    
    console.log('方式1 - DATE(task_date) = "2025-07-21":');
    method1.forEach(task => {
      console.log(`  ${task.title} (${task.date_only}) - ${task.completed ? '✅' : '❌'}`);
    });
    
    // 方式2: 使用BETWEEN
    const method2 = await query(`
      SELECT 
        task_date,
        title,
        completed
      FROM tasks 
      WHERE student_id = 'ST001' 
      AND task_date BETWEEN '2025-07-21 00:00:00' AND '2025-07-21 23:59:59'
    `);
    
    console.log('\n方式2 - BETWEEN "2025-07-21 00:00:00" AND "2025-07-21 23:59:59":');
    method2.forEach(task => {
      console.log(`  ${task.title} (${task.task_date}) - ${task.completed ? '✅' : '❌'}`);
    });
    
    // 方式3: 使用DATE_FORMAT
    const method3 = await query(`
      SELECT 
        task_date,
        DATE_FORMAT(task_date, '%Y-%m-%d') as formatted,
        title,
        completed
      FROM tasks 
      WHERE student_id = 'ST001' 
      AND DATE_FORMAT(task_date, '%Y-%m-%d') = '2025-07-21'
    `);
    
    console.log('\n方式3 - DATE_FORMAT(task_date, "%Y-%m-%d") = "2025-07-21":');
    method3.forEach(task => {
      console.log(`  ${task.title} (${task.task_date} -> ${task.formatted}) - ${task.completed ? '✅' : '❌'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 调试失败:', error);
    process.exit(1);
  }
}

debugTimezone();
