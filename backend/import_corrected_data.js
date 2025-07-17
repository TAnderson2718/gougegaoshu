const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function importCorrectedData() {
  try {
    console.log('📥 开始导入修正版测试数据...');
    
    // 清空现有任务数据
    await query('DELETE FROM tasks WHERE student_id IN ("ST001", "ST002")');
    console.log('🗑️ 清空现有任务数据');
    
    // 读取修正版CSV文件
    const csvPath = path.join(__dirname, '..', 'july_tasks_corrected.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    console.log(`📄 读取CSV文件，共 ${lines.length} 行数据`);
    
    let importCount = 0;
    
    // 解析并导入数据
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      if (parts.length < 4) continue;
      
      const [studentId, date, type, ...contentParts] = parts.map(item => item.trim());
      const title = contentParts.join(',');
      
      if (!studentId || !date || !title) continue;
      
      const taskId = `${studentId}_${date}_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title) VALUES (?, ?, ?, ?, ?)',
        [taskId, studentId, date, type, title]
      );
      
      importCount++;
    }
    
    console.log(`✅ 成功导入 ${importCount} 个修正版任务`);
    
    // 验证休息日的导入结果
    const restDays = await query(`
      SELECT task_date, task_type, title, DAYNAME(task_date) as day_name
      FROM tasks 
      WHERE student_id = "ST001" AND task_type = "休息"
      ORDER BY task_date
    `);
    
    console.log('\n🎯 休息日验证结果:');
    restDays.forEach(row => {
      console.log(`  ${row.task_date} (${row.day_name}): ${row.title}`);
    });
    
    console.log('\n📊 预期显示效果:');
    console.log('  - 7月4日设置为休息 → 应该在7月6日显示');
    console.log('  - 7月11日设置为休息 → 应该在7月13日显示');
    console.log('  - 7月18日设置为休息 → 应该在7月20日显示');
    console.log('  - 7月25日设置为休息 → 应该在7月27日显示');
    
    // 验证7月份所有数据
    const julyTasks = await query(`
      SELECT 
        task_date,
        task_type,
        COUNT(*) as count,
        DAYNAME(task_date) as day_name
      FROM tasks 
      WHERE student_id = "ST001" 
        AND task_date BETWEEN "2025-07-01" AND "2025-07-31"
      GROUP BY task_date, task_type 
      ORDER BY task_date, task_type
    `);
    
    console.log('\n📅 7月份完整数据概览:');
    julyTasks.forEach(row => {
      const emoji = row.task_type === '休息' ? '😴' : '📚';
      console.log(`  ${row.task_date} (${row.day_name}): ${emoji} ${row.task_type} (${row.count}个)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 导入修正版数据失败:', error);
    process.exit(1);
  }
}

importCorrectedData();
