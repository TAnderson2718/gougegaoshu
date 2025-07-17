const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function importCorrectedV2() {
  try {
    console.log('📥 开始导入修正版V2测试数据...');
    
    // 清空现有任务数据
    await query('DELETE FROM tasks WHERE student_id IN ("ST001", "ST002")');
    console.log('🗑️ 清空现有任务数据');
    
    // 读取修正版V2 CSV文件
    const csvPath = path.join(__dirname, '..', 'july_tasks_corrected_v2.csv');
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
    
    console.log(`✅ 成功导入 ${importCount} 个修正版V2任务`);
    
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
    
    console.log('\n📊 预期显示效果（如果有+4天偏移）:');
    console.log('  - 7月2日设置为休息 → 应该在7月6日显示');
    console.log('  - 7月9日设置为休息 → 应该在7月13日显示');
    console.log('  - 7月16日设置为休息 → 应该在7月20日显示');
    console.log('  - 7月23日设置为休息 → 应该在7月27日显示');
    
    // 生成关键日期的对比
    const keyDates = ['2025-07-02', '2025-07-06', '2025-07-09', '2025-07-13', '2025-07-16', '2025-07-20', '2025-07-23', '2025-07-27'];
    
    console.log('\n📅 关键日期验证:');
    for (const date of keyDates) {
      const dayTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE student_id = "ST001" AND task_date = ?
        GROUP BY task_type
        ORDER BY task_type
      `, [date]);
      
      const hasRest = dayTasks.some(t => t.task_type === '休息');
      const emoji = hasRest ? '😴' : '📚';
      const taskSummary = dayTasks.map(t => `${t.task_type}(${t.count})`).join(', ');
      
      console.log(`  ${date}: ${emoji} ${taskSummary || '无任务'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 导入修正版V2数据失败:', error);
    process.exit(1);
  }
}

importCorrectedV2();
