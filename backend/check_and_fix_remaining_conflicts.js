const { query, transaction } = require('./config/database');

async function checkAndFixRemainingConflicts() {
  try {
    console.log('🔍 检查剩余的休息日冲突');
    console.log('=====================================\n');

    // 查找所有有休息任务的日期
    const restDates = await query(`
      SELECT DISTINCT task_date 
      FROM tasks 
      WHERE task_type = '休息'
      ORDER BY task_date
    `);

    console.log(`找到 ${restDates.length} 个有休息任务的日期:`);
    
    const conflictDates = [];
    
    for (const row of restDates) {
      const dateStr = row.task_date.toISOString().split('T')[0];
      
      // 检查该日期的任务类型
      const dayTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
        ORDER BY task_type
      `, [dateStr]);
      
      const taskTypes = dayTasks.map(t => t.task_type);
      const hasConflict = taskTypes.length > 1;
      
      console.log(`  ${dateStr}: ${taskTypes.join(', ')} ${hasConflict ? '❌' : '✅'}`);
      
      if (hasConflict) {
        conflictDates.push(dateStr);
      }
    }

    if (conflictDates.length === 0) {
      console.log('\n✅ 没有发现冲突，所有休息日都正常');
      return;
    }

    console.log(`\n发现 ${conflictDates.length} 个仍有冲突的日期: ${conflictDates.join(', ')}`);
    console.log('\n🔧 开始修复...');

    await transaction(async (connection) => {
      for (const dateStr of conflictDates) {
        console.log(`\n修复 ${dateStr}:`);
        
        // 查看该日期的详细任务
        const [allTasks] = await connection.execute(`
          SELECT id, student_id, task_type, title
          FROM tasks 
          WHERE task_date = ?
          ORDER BY student_id, task_type
        `, [dateStr]);
        
        console.log(`  当前任务:`);
        allTasks.forEach(task => {
          console.log(`    ${task.student_id} - ${task.task_type}: ${task.title}`);
        });
        
        // 删除所有非休息任务
        const [deleteResult] = await connection.execute(`
          DELETE FROM tasks 
          WHERE task_date = ? AND task_type != '休息'
        `, [dateStr]);
        
        console.log(`  删除了 ${deleteResult.affectedRows} 个非休息任务`);
        
        // 检查剩余的休息任务
        const [remainingTasks] = await connection.execute(`
          SELECT id, student_id, title
          FROM tasks 
          WHERE task_date = ? AND task_type = '休息'
        `, [dateStr]);
        
        console.log(`  剩余 ${remainingTasks.length} 个休息任务`);
        
        // 确保每个学生只有一个休息任务
        const studentTasks = {};
        remainingTasks.forEach(task => {
          if (!studentTasks[task.student_id]) {
            studentTasks[task.student_id] = [];
          }
          studentTasks[task.student_id].push(task);
        });
        
        // 删除重复的休息任务
        for (const [studentId, tasks] of Object.entries(studentTasks)) {
          if (tasks.length > 1) {
            const tasksToDelete = tasks.slice(1);
            for (const task of tasksToDelete) {
              await connection.execute('DELETE FROM tasks WHERE id = ?', [task.id]);
            }
            console.log(`  ${studentId}: 删除了 ${tasksToDelete.length} 个重复的休息任务`);
          }
        }
        
        // 确保所有学生都有休息任务
        const allStudents = ['ST001', 'ST002'];
        for (const studentId of allStudents) {
          if (!studentTasks[studentId] || studentTasks[studentId].length === 0) {
            const taskId = `${studentId}-${dateStr}-rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await connection.execute(`
              INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, created_at)
              VALUES (?, ?, ?, '休息', '今日休息调整状态', FALSE, NOW())
            `, [taskId, studentId, dateStr]);
            console.log(`  ${studentId}: 创建了休息任务`);
          }
        }
      }
    });

    // 最终验证
    console.log('\n🔍 最终验证...');
    
    for (const dateStr of conflictDates) {
      const finalTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
      `, [dateStr]);
      
      const taskTypes = finalTasks.map(t => t.task_type);
      const isFixed = taskTypes.length === 1 && taskTypes[0] === '休息';
      
      console.log(`  ${dateStr}: ${taskTypes.join(', ')} ${isFixed ? '✅' : '❌'}`);
    }

    console.log('\n🎉 修复完成！');
    process.exit(0);
    
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkAndFixRemainingConflicts();
