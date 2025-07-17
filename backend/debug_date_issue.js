const { query } = require('./config/database');

async function debugDateIssue() {
  try {
    console.log('🔍 调试日期偏移问题');
    console.log('=====================================\n');

    // 1. 检查系统配置中的日期设置
    console.log('📅 步骤1: 检查系统配置...');
    const systemConfig = await query('SELECT * FROM system_config WHERE config_key = "system_date"');
    if (systemConfig.length > 0) {
      console.log('系统配置日期:', systemConfig[0].config_value);
    } else {
      console.log('未找到系统日期配置');
    }

    // 2. 检查数据库时区设置
    console.log('\n🌍 步骤2: 检查数据库时区设置...');
    const timezone = await query('SELECT @@time_zone as timezone, NOW() as current_datetime');
    console.log('数据库时区:', timezone[0].timezone);
    console.log('数据库当前时间:', timezone[0].current_datetime);

    // 3. 检查Node.js时区
    console.log('\n⏰ 步骤3: 检查Node.js时区...');
    console.log('Node.js时区:', process.env.TZ || 'system default');
    console.log('Node.js当前时间:', new Date().toISOString());
    console.log('Node.js本地时间:', new Date().toLocaleString());

    // 4. 测试插入一个任务，看看实际存储的日期
    console.log('\n🧪 步骤4: 测试任务日期存储...');
    const testTaskId = `TEST-${Date.now()}`;
    const testDate = '2025-07-01';
    
    await query(
      'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
      [testTaskId, 'ST001', testDate, '测试', '测试任务', false]
    );
    
    console.log(`插入任务: 日期=${testDate}`);
    
    // 查询刚插入的任务
    const insertedTask = await query('SELECT task_date FROM tasks WHERE id = ?', [testTaskId]);
    if (insertedTask.length > 0) {
      const storedDate = insertedTask[0].task_date;
      console.log(`存储日期: ${storedDate.toISOString().split('T')[0]}`);
      
      if (storedDate.toISOString().split('T')[0] !== testDate) {
        console.log('❌ 发现日期偏移问题！');
        console.log(`  预期: ${testDate}`);
        console.log(`  实际: ${storedDate.toISOString().split('T')[0]}`);
      } else {
        console.log('✅ 日期存储正常');
      }
    }
    
    // 清理测试数据
    await query('DELETE FROM tasks WHERE id = ?', [testTaskId]);

    // 5. 检查现有任务的日期分布
    console.log('\n📊 步骤5: 检查现有任务的日期分布...');
    const dateCounts = await query(`
      SELECT 
        task_date,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT task_type) as types
      FROM tasks 
      WHERE student_id = 'ST001' 
      ORDER BY task_date
    `);
    
    console.log('现有任务日期分布:');
    dateCounts.forEach(row => {
      const dateStr = row.task_date.toISOString().split('T')[0];
      console.log(`  ${dateStr}: ${row.count} 个任务 (${row.types})`);
    });

    // 6. 检查是否有其他进程在修改任务
    console.log('\n🔍 步骤6: 检查任务表结构...');
    const tableStructure = await query('DESCRIBE tasks');
    console.log('任务表结构:');
    tableStructure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default}`);
    });

  } catch (error) {
    console.error('❌ 调试过程中出现错误:', error.message);
  }
}

debugDateIssue();
