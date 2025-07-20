const { query, transaction } = require('./config/database');

async function finalCleanupMixedDays() {
  try {
    console.log('🧹 最终清理混合日期');
    console.log('=====================================\n');

    // 找出所有有休息任务但同时有其他任务的日期
    const mixedDates = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type ORDER BY task_type) as types
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      HAVING type_count > 1 AND types LIKE '%休息%'
      ORDER BY task_date
    `);

    if (mixedDates.length === 0) {
      console.log('✅ 没有发现混合日期，所有休息日都正常');
      return;
    }

    console.log(`发现 ${mixedDates.length} 个混合日期:`);
    mixedDates.forEach(row => {
      const dateStr = row.task_date.toISOString().split('T')[0];
      console.log(`  ${dateStr}: ${row.types} (${row.type_count}种任务类型)`);
    });

    console.log('\n🔧 开始清理混合日期...');

    await transaction(async (connection) => {
      for (const row of mixedDates) {
        const dateStr = row.task_date.toISOString().split('T')[0];
        console.log(`\n清理 ${dateStr}:`);
        
        // 查看该日期的所有任务
        const [allTasks] = await connection.execute(`
          SELECT id, student_id, task_type, title
          FROM tasks 
          WHERE task_date = ?
          ORDER BY student_id, task_type
        `, [dateStr]);
        
        const restTasks = allTasks.filter(t => t.task_type === '休息');
        const otherTasks = allTasks.filter(t => t.task_type !== '休息');
        
        console.log(`  当前: ${restTasks.length}个休息任务, ${otherTasks.length}个其他任务`);
        
        // 删除所有非休息任务
        for (const task of otherTasks) {
          await connection.execute('DELETE FROM tasks WHERE id = ?', [task.id]);
        }
        console.log(`  删除了 ${otherTasks.length} 个非休息任务`);
        
        // 确保休息任务数量正确（每个学生一个）
        const studentRestTasks = {};
        restTasks.forEach(task => {
          if (!studentRestTasks[task.student_id]) {
            studentRestTasks[task.student_id] = [];
          }
          studentRestTasks[task.student_id].push(task);
        });
        
        // 删除重复的休息任务
        for (const [studentId, tasks] of Object.entries(studentRestTasks)) {
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
          if (!studentRestTasks[studentId] || studentRestTasks[studentId].length === 0) {
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

    // 验证修复结果
    console.log('\n🔍 验证修复结果...');
    
    const verifyMixed = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type ORDER BY task_type) as types
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      HAVING type_count > 1 AND types LIKE '%休息%'
      ORDER BY task_date
    `);

    if (verifyMixed.length > 0) {
      console.log(`❌ 仍有 ${verifyMixed.length} 个混合日期:`);
      verifyMixed.forEach(row => {
        const dateStr = row.task_date.toISOString().split('T')[0];
        console.log(`  ${dateStr}: ${row.types}`);
      });
    } else {
      console.log('✅ 所有混合日期都已修复');
    }

    // 最终统计
    console.log('\n📊 最终统计...');
    
    const finalStats = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type ORDER BY task_type) as types,
        COUNT(*) as total_tasks
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      ORDER BY task_date
    `);

    let workDays = 0;
    let restDays = 0;
    let emptyDays = 0;

    for (let day = 1; day <= 31; day++) {
      const dateStr = '2025-07-' + day.toString().padStart(2, '0');
      const dayData = finalStats.find(s => s.task_date.toISOString().split('T')[0] === dateStr);
      
      if (!dayData) {
        emptyDays++;
      } else if (dayData.types === '休息') {
        restDays++;
      } else if (!dayData.types.includes('休息')) {
        workDays++;
      }
    }

    console.log(`  工作日: ${workDays} 天 (只有学习任务)`);
    console.log(`  休息日: ${restDays} 天 (只有休息任务)`);
    console.log(`  无任务日: ${emptyDays} 天`);

    console.log('\n=====================================');
    if (verifyMixed.length === 0) {
      console.log('🎉 所有休息日问题修复完成！');
      console.log('✅ 没有混合日期');
      console.log('✅ 每个休息日只包含休息任务');
      console.log('✅ 每个学生在休息日只有一个休息任务');
    } else {
      console.log('❌ 仍有问题需要解决');
    }

    process.exit(0);
    
  } catch (error) {
    console.error('清理失败:', error);
    process.exit(1);
  }
}

finalCleanupMixedDays();
