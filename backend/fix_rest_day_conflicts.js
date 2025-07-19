const { query, transaction } = require('./config/database');

async function fixRestDayConflicts() {
  try {
    console.log('🔧 修复休息日冲突问题');
    console.log('=====================================\n');

    // 步骤1: 找出所有有冲突的休息日
    console.log('📊 步骤1: 检查所有休息日的冲突情况...');
    
    const conflictDates = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type) as types,
        COUNT(*) as total_tasks
      FROM tasks 
      WHERE task_date IN (
        SELECT DISTINCT task_date 
        FROM tasks 
        WHERE task_type = '休息'
      )
      GROUP BY task_date
      ORDER BY task_date
    `);

    console.log('休息日任务分布:');
    const problemDates = [];
    
    conflictDates.forEach(row => {
      const dateStr = row.task_date.toISOString().split('T')[0];
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      
      console.log(`  ${dateStr} (周${dayNames[dayOfWeek]}): ${row.total_tasks}个任务，${row.type_count}种类型`);
      console.log(`    任务类型: ${row.types}`);
      
      if (row.type_count > 1) {
        problemDates.push(dateStr);
        console.log(`    ❌ 有冲突！`);
      } else {
        console.log(`    ✅ 正常`);
      }
    });

    if (problemDates.length === 0) {
      console.log('\n✅ 没有发现休息日冲突，无需修复');
      return;
    }

    console.log(`\n发现 ${problemDates.length} 个有冲突的休息日: ${problemDates.join(', ')}`);

    // 步骤2: 修复每个有冲突的休息日
    console.log('\n🔧 步骤2: 修复冲突的休息日...');
    
    await transaction(async (connection) => {
      for (const dateStr of problemDates) {
        console.log(`\n修复 ${dateStr}:`);
        
        // 查看该日期的所有任务
        const [dayTasks] = await connection.execute(`
          SELECT id, student_id, task_type, title
          FROM tasks 
          WHERE task_date = ?
          ORDER BY student_id, task_type
        `, [dateStr]);
        
        console.log(`  当前有 ${dayTasks.length} 个任务`);
        
        // 删除所有非休息任务
        const [deleteResult] = await connection.execute(`
          DELETE FROM tasks 
          WHERE task_date = ? AND task_type != '休息'
        `, [dateStr]);
        
        console.log(`  删除了 ${deleteResult.affectedRows} 个非休息任务`);
        
        // 检查现有的休息任务
        const [restTasks] = await connection.execute(`
          SELECT id, student_id, title
          FROM tasks 
          WHERE task_date = ? AND task_type = '休息'
        `, [dateStr]);
        
        console.log(`  保留了 ${restTasks.length} 个休息任务`);
        
        // 确保每个学生只有一个休息任务
        const studentRestTasks = {};
        restTasks.forEach(task => {
          if (!studentRestTasks[task.student_id]) {
            studentRestTasks[task.student_id] = [];
          }
          studentRestTasks[task.student_id].push(task);
        });
        
        for (const [studentId, tasks] of Object.entries(studentRestTasks)) {
          if (tasks.length > 1) {
            // 保留第一个，删除其余的
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

    // 步骤3: 验证修复结果
    console.log('\n🔍 步骤3: 验证修复结果...');
    
    const verifyResults = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type) as types,
        COUNT(*) as total_tasks
      FROM tasks 
      WHERE task_date IN (${problemDates.map(() => '?').join(',')})
      GROUP BY task_date
      ORDER BY task_date
    `, problemDates);

    console.log('修复后的休息日状态:');
    verifyResults.forEach(row => {
      const dateStr = row.task_date.toISOString().split('T')[0];
      const status = row.type_count === 1 && row.types === '休息' ? '✅ 正常' : '❌ 仍有问题';
      console.log(`  ${dateStr}: ${row.total_tasks}个任务，${row.type_count}种类型 (${row.types}) ${status}`);
    });

    // 步骤4: 最终检查所有休息日
    console.log('\n🔍 步骤4: 最终检查所有休息日...');
    
    const finalCheck = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type) as types
      FROM tasks 
      WHERE task_date IN (
        SELECT DISTINCT task_date 
        FROM tasks 
        WHERE task_type = '休息'
      )
      GROUP BY task_date
      HAVING type_count > 1
      ORDER BY task_date
    `);

    if (finalCheck.length > 0) {
      console.log('❌ 仍有问题的休息日:');
      finalCheck.forEach(row => {
        const dateStr = row.task_date.toISOString().split('T')[0];
        console.log(`  ${dateStr}: 有 ${row.type_count} 种任务类型 (${row.types})`);
      });
    } else {
      console.log('✅ 所有休息日都已正确设置，只包含休息任务');
    }

    console.log('\n🎉 修复完成！');
    process.exit(0);
    
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixRestDayConflicts();
