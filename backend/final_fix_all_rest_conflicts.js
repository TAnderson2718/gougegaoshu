const { query, transaction } = require('./config/database');

async function finalFixAllRestConflicts() {
  try {
    console.log('🔧 最终修复所有休息日冲突');
    console.log('=====================================\n');

    // 查找所有有休息任务的日期
    const restDates = await query(`
      SELECT DISTINCT task_date 
      FROM tasks 
      WHERE task_type = '休息'
      ORDER BY task_date
    `);

    console.log(`找到 ${restDates.length} 个有休息任务的日期\n`);
    
    const problemDates = [];
    
    // 检查每个日期是否有冲突
    for (const row of restDates) {
      const dateStr = row.task_date.toISOString().split('T')[0];
      
      const dayTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
        ORDER BY task_type
      `, [dateStr]);
      
      const taskTypes = dayTasks.map(t => t.task_type);
      const hasConflict = taskTypes.length > 1;
      const hasMultipleRest = dayTasks.find(t => t.task_type === '休息' && t.count > 2);
      
      if (hasConflict || hasMultipleRest) {
        problemDates.push(dateStr);
        console.log(`❌ ${dateStr}: ${taskTypes.join(', ')} ${hasMultipleRest ? '(重复休息任务)' : ''}`);
      } else {
        console.log(`✅ ${dateStr}: 正常`);
      }
    }

    if (problemDates.length === 0) {
      console.log('\n✅ 所有休息日都正常，无需修复');
      return;
    }

    console.log(`\n发现 ${problemDates.length} 个有问题的日期，开始修复...\n`);

    await transaction(async (connection) => {
      for (const dateStr of problemDates) {
        console.log(`修复 ${dateStr}:`);
        
        // 查看该日期的所有任务
        const [allTasks] = await connection.execute(`
          SELECT id, student_id, task_type, title
          FROM tasks 
          WHERE task_date = ?
          ORDER BY student_id, task_type
        `, [dateStr]);
        
        console.log(`  当前有 ${allTasks.length} 个任务`);
        
        // 删除所有非休息任务
        const [deleteResult] = await connection.execute(`
          DELETE FROM tasks 
          WHERE task_date = ? AND task_type != '休息'
        `, [dateStr]);
        
        if (deleteResult.affectedRows > 0) {
          console.log(`  删除了 ${deleteResult.affectedRows} 个非休息任务`);
        }
        
        // 检查剩余的休息任务
        const [restTasks] = await connection.execute(`
          SELECT id, student_id, title
          FROM tasks 
          WHERE task_date = ? AND task_type = '休息'
        `, [dateStr]);
        
        console.log(`  剩余 ${restTasks.length} 个休息任务`);
        
        // 按学生分组
        const studentTasks = {};
        restTasks.forEach(task => {
          if (!studentTasks[task.student_id]) {
            studentTasks[task.student_id] = [];
          }
          studentTasks[task.student_id].push(task);
        });
        
        // 删除重复的休息任务，每个学生只保留一个
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
        
        console.log('');
      }
    });

    // 最终验证
    console.log('🔍 最终验证所有休息日...\n');
    
    let allFixed = true;
    
    for (const row of restDates) {
      const dateStr = row.task_date.toISOString().split('T')[0];
      
      const finalTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
      `, [dateStr]);
      
      const taskTypes = finalTasks.map(t => t.task_type);
      const isFixed = taskTypes.length === 1 && taskTypes[0] === '休息' && finalTasks[0].count === 2;
      
      if (!isFixed) {
        allFixed = false;
        console.log(`❌ ${dateStr}: ${taskTypes.join(', ')} (${finalTasks.map(t => `${t.task_type}:${t.count}`).join(', ')})`);
      } else {
        console.log(`✅ ${dateStr}: 正常`);
      }
    }

    console.log('\n=====================================');
    if (allFixed) {
      console.log('🎉 所有休息日都已修复完成！');
      console.log('✅ 每个休息日只包含休息任务');
      console.log('✅ 每个学生在休息日只有一个休息任务');
    } else {
      console.log('❌ 仍有部分休息日存在问题');
    }

    process.exit(0);
    
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

finalFixAllRestConflicts();
