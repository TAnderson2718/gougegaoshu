const { query, transaction } = require('./config/database');

async function fixJuly6RestDay() {
  try {
    console.log('🔧 修复7月6日休息日问题');
    console.log('=====================================\n');

    // 步骤1: 检查7月6日的当前任务
    console.log('📊 步骤1: 检查7月6日的当前任务...');
    
    const july6Tasks = await query(`
      SELECT id, student_id, task_type, title
      FROM tasks 
      WHERE task_date = '2025-07-06'
      ORDER BY student_id, task_type
    `);

    console.log(`7月6日当前有 ${july6Tasks.length} 个任务:`);
    july6Tasks.forEach(task => {
      console.log(`  ${task.student_id} - ${task.task_type}: ${task.title}`);
    });

    // 步骤2: 删除7月6日的所有非休息任务
    console.log('\n🗑️ 步骤2: 删除7月6日的所有非休息任务...');
    
    await transaction(async (connection) => {
      // 删除7月6日的所有非休息任务
      const [deleteResult] = await connection.execute(`
        DELETE FROM tasks 
        WHERE task_date = '2025-07-06' 
          AND task_type != '休息'
      `);
      
      console.log(`删除了 ${deleteResult.affectedRows} 个非休息任务`);

      // 检查现有的休息任务
      const [existingRestTasks] = await connection.execute(`
        SELECT id, student_id 
        FROM tasks 
        WHERE task_date = '2025-07-06' AND task_type = '休息'
      `);
      
      console.log(`现有 ${existingRestTasks.length} 个休息任务`);

      // 按学生分组
      const tasksByStudent = {};
      existingRestTasks.forEach(task => {
        if (!tasksByStudent[task.student_id]) {
          tasksByStudent[task.student_id] = [];
        }
        tasksByStudent[task.student_id].push(task);
      });

      // 确保每个学生只有一个休息任务
      const students = ['ST001', 'ST002'];
      for (const studentId of students) {
        const studentTasks = tasksByStudent[studentId] || [];
        
        if (studentTasks.length > 1) {
          // 保留第一个，删除其余的
          const tasksToDelete = studentTasks.slice(1);
          for (const task of tasksToDelete) {
            await connection.execute('DELETE FROM tasks WHERE id = ?', [task.id]);
          }
          console.log(`  ${studentId}: 删除了 ${tasksToDelete.length} 个重复的休息任务`);
        } else if (studentTasks.length === 0) {
          // 如果没有休息任务，创建一个
          const taskId = `${studentId}-2025-07-06-rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await connection.execute(`
            INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status, created_at)
            VALUES (?, ?, '2025-07-06', '休息', '今日休息调整状态', FALSE, 'normal', NOW())
          `, [taskId, studentId]);
          console.log(`  ${studentId}: 创建了休息任务`);
        } else {
          console.log(`  ${studentId}: 已有1个休息任务，无需修改`);
        }
      }
    });

    // 步骤3: 验证修复结果
    console.log('\n🔍 步骤3: 验证修复结果...');
    
    const verifyTasks = await query(`
      SELECT id, student_id, task_type, title
      FROM tasks 
      WHERE task_date = '2025-07-06'
      ORDER BY student_id, task_type
    `);

    console.log(`7月6日修复后有 ${verifyTasks.length} 个任务:`);
    verifyTasks.forEach(task => {
      console.log(`  ${task.student_id} - ${task.task_type}: ${task.title}`);
    });

    // 步骤4: 检查是否还有其他混合的休息日
    console.log('\n🔍 步骤4: 检查是否还有其他混合的休息日...');
    
    const mixedRestDays = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type) as types,
        COUNT(*) as total_tasks
      FROM tasks 
      WHERE task_date LIKE '2025-07%'
        AND task_date IN (
          SELECT DISTINCT task_date 
          FROM tasks 
          WHERE task_type = '休息'
        )
      GROUP BY task_date
      HAVING type_count > 1
      ORDER BY task_date
    `);

    if (mixedRestDays.length > 0) {
      console.log('❌ 仍有混合的休息日:');
      mixedRestDays.forEach(row => {
        const dateStr = row.task_date.toISOString().split('T')[0];
        console.log(`  ${dateStr}: ${row.total_tasks}个任务，${row.type_count}种类型 (${row.types})`);
      });
    } else {
      console.log('✅ 所有休息日都已正确设置，只包含休息任务');
    }

    console.log('\n🎉 7月6日休息日修复完成！');
    console.log('✅ 7月6日现在只包含休息任务');
    console.log('\n📱 建议重新验证学生端API:');
    console.log('  ./check_student_api_curl.sh');

  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.message);
  }
}

fixJuly6RestDay();
