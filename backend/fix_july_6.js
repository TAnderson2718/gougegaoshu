const { query, transaction } = require('./config/database');

async function fixJuly6() {
  try {
    console.log('🔧 专门修复7月6日的冲突');
    console.log('=====================================\n');

    // 检查7月6日的当前状态
    console.log('📊 检查7月6日的当前状态...');
    
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

    // 统计任务类型
    const taskTypes = {};
    july6Tasks.forEach(task => {
      if (!taskTypes[task.task_type]) {
        taskTypes[task.task_type] = 0;
      }
      taskTypes[task.task_type]++;
    });

    console.log('\n任务类型统计:');
    Object.entries(taskTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}个`);
    });

    if (Object.keys(taskTypes).length === 1 && taskTypes['休息']) {
      console.log('\n✅ 7月6日已经只有休息任务，无需修复');
      return;
    }

    console.log('\n🔧 开始修复...');

    await transaction(async (connection) => {
      // 删除所有非休息任务
      const [deleteResult] = await connection.execute(`
        DELETE FROM tasks 
        WHERE task_date = '2025-07-06' AND task_type != '休息'
      `);
      
      console.log(`删除了 ${deleteResult.affectedRows} 个非休息任务`);

      // 检查剩余的休息任务
      const [restTasks] = await connection.execute(`
        SELECT id, student_id, title
        FROM tasks 
        WHERE task_date = '2025-07-06' AND task_type = '休息'
      `);
      
      console.log(`剩余 ${restTasks.length} 个休息任务`);

      // 按学生分组
      const studentTasks = {};
      restTasks.forEach(task => {
        if (!studentTasks[task.student_id]) {
          studentTasks[task.student_id] = [];
        }
        studentTasks[task.student_id].push(task);
      });

      // 确保每个学生只有一个休息任务
      for (const [studentId, tasks] of Object.entries(studentTasks)) {
        if (tasks.length > 1) {
          // 保留第一个，删除其余的
          const tasksToDelete = tasks.slice(1);
          for (const task of tasksToDelete) {
            await connection.execute('DELETE FROM tasks WHERE id = ?', [task.id]);
          }
          console.log(`${studentId}: 删除了 ${tasksToDelete.length} 个重复的休息任务`);
        }
      }

      // 确保所有学生都有休息任务
      const allStudents = ['ST001', 'ST002'];
      for (const studentId of allStudents) {
        if (!studentTasks[studentId] || studentTasks[studentId].length === 0) {
          const taskId = `${studentId}-2025-07-06-rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await connection.execute(`
            INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, created_at)
            VALUES (?, ?, '2025-07-06', '休息', '今日休息调整状态', FALSE, NOW())
          `, [taskId, studentId]);
          console.log(`${studentId}: 创建了休息任务`);
        }
      }
    });

    // 验证修复结果
    console.log('\n🔍 验证修复结果...');
    
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

    // 最终检查
    const finalTypes = {};
    verifyTasks.forEach(task => {
      if (!finalTypes[task.task_type]) {
        finalTypes[task.task_type] = 0;
      }
      finalTypes[task.task_type]++;
    });

    const isFixed = Object.keys(finalTypes).length === 1 && finalTypes['休息'];
    console.log(`\n修复结果: ${isFixed ? '✅ 成功' : '❌ 仍有问题'}`);

    if (isFixed) {
      console.log('🎉 7月6日修复完成！现在只有休息任务');
    } else {
      console.log('❌ 修复失败，仍有其他类型的任务');
      Object.entries(finalTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}个`);
      });
    }

    process.exit(0);
    
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

fixJuly6();
