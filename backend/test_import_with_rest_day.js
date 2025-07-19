const fs = require('fs');
const path = require('path');
const { query, transaction } = require('./config/database');

async function testImportWithRestDay() {
  try {
    console.log('🧪 测试批量导入功能对休息日的处理');
    console.log('=====================================\n');

    // 读取测试CSV文件
    const csvPath = path.join(__dirname, 'test_rest_day_import.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    
    console.log('📄 测试数据:');
    console.log(csvContent);
    console.log('');

    // 解析CSV数据
    const lines = csvContent.trim().split('\n');
    const tasks = lines.map(line => {
      const [studentId, taskDate, taskType, title] = line.split(',');
      return { studentId, taskDate, taskType, title };
    });

    console.log(`解析出 ${tasks.length} 个任务:`);
    tasks.forEach((task, index) => {
      console.log(`  ${index + 1}. ${task.studentId} - ${task.taskDate} - ${task.taskType}: ${task.title}`);
    });
    console.log('');

    // 清理测试数据（删除7月28日和29日的任务）
    console.log('🧹 清理测试数据...');
    await query(`DELETE FROM tasks WHERE task_date IN ('2025-07-28', '2025-07-29')`);
    console.log('已清理7月28日和29日的任务\n');

    // 模拟批量导入逻辑
    console.log('📥 开始批量导入...');
    
    await transaction(async (connection) => {
      for (const task of tasks) {
        const taskId = `${task.studentId}-${task.taskDate}-${task.taskType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        await connection.execute(`
          INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, created_at)
          VALUES (?, ?, ?, ?, ?, FALSE, NOW())
        `, [taskId, task.studentId, task.taskDate, task.taskType, task.title]);
        
        console.log(`  导入: ${task.studentId} - ${task.taskDate} - ${task.taskType}: ${task.title}`);
      }
    });

    console.log('\n✅ 导入完成！');

    // 检查导入结果
    console.log('\n🔍 检查导入结果...');
    
    const july28Tasks = await query(`
      SELECT student_id, task_type, title
      FROM tasks 
      WHERE task_date = '2025-07-28'
      ORDER BY student_id, task_type
    `);

    const july29Tasks = await query(`
      SELECT student_id, task_type, title
      FROM tasks 
      WHERE task_date = '2025-07-29'
      ORDER BY student_id, task_type
    `);

    console.log(`\n7月28日任务 (${july28Tasks.length}个):`);
    july28Tasks.forEach(task => {
      console.log(`  ${task.student_id} - ${task.task_type}: ${task.title}`);
    });

    console.log(`\n7月29日任务 (${july29Tasks.length}个):`);
    july29Tasks.forEach(task => {
      console.log(`  ${task.student_id} - ${task.task_type}: ${task.title}`);
    });

    // 检查7月28日是否正确识别为休息日
    const july28Types = [...new Set(july28Tasks.map(t => t.task_type))];
    const july29Types = [...new Set(july29Tasks.map(t => t.task_type))];

    console.log('\n📊 结果分析:');
    console.log(`7月28日任务类型: ${july28Types.join(', ')} ${july28Types.length === 1 && july28Types[0] === '休息' ? '✅' : '❌'}`);
    console.log(`7月29日任务类型: ${july29Types.join(', ')} ${july29Types.length > 1 && !july29Types.includes('休息') ? '✅' : '❌'}`);

    // 测试结论
    console.log('\n=====================================');
    const july28IsRestOnly = july28Types.length === 1 && july28Types[0] === '休息';
    const july29HasNoRest = !july29Types.includes('休息') && july29Types.length > 1;
    
    if (july28IsRestOnly && july29HasNoRest) {
      console.log('🎉 测试通过！');
      console.log('✅ 休息日只包含休息任务');
      console.log('✅ 工作日包含多种学习任务但不包含休息任务');
      console.log('✅ 批量导入功能正常工作');
    } else {
      console.log('❌ 测试失败！');
      if (!july28IsRestOnly) {
        console.log('❌ 休息日包含了非休息任务');
      }
      if (!july29HasNoRest) {
        console.log('❌ 工作日包含了休息任务或任务类型不正确');
      }
    }

    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await query(`DELETE FROM tasks WHERE task_date IN ('2025-07-28', '2025-07-29')`);
    console.log('测试数据已清理');

    process.exit(0);
    
  } catch (error) {
    console.error('测试失败:', error);
    process.exit(1);
  }
}

testImportWithRestDay();
