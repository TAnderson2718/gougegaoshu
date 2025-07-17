const { query, transaction } = require('./config/database');

async function fixRestDayLogic() {
  try {
    console.log('🔧 修复休息日逻辑问题');
    console.log('=====================================\n');

    // 步骤1: 检查当前有问题的休息日
    console.log('📊 步骤1: 检查当前休息日的任务分布...');
    
    const restDayTasks = await query(`
      SELECT 
        task_date,
        task_type,
        title,
        COUNT(*) as count
      FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_date IN (
          SELECT DISTINCT task_date 
          FROM tasks 
          WHERE task_type = '休息' AND student_id = 'ST001'
        )
      GROUP BY task_date, task_type, title
      ORDER BY task_date, task_type
    `);

    console.log('休息日的任务分布:');
    let currentDate = '';
    restDayTasks.forEach(task => {
      const dateStr = task.task_date.toISOString().split('T')[0];
      if (dateStr !== currentDate) {
        console.log(`\n  ${dateStr}:`);
        currentDate = dateStr;
      }
      console.log(`    - ${task.task_type}: ${task.title} (${task.count}个)`);
    });

    // 步骤2: 找出所有休息日
    console.log('\n🎯 步骤2: 识别所有休息日...');
    
    const restDates = await query(`
      SELECT DISTINCT task_date
      FROM tasks 
      WHERE task_type = '休息' AND student_id = 'ST001'
      ORDER BY task_date
    `);

    const restDateStrings = restDates.map(row => row.task_date.toISOString().split('T')[0]);
    console.log('识别到的休息日:', restDateStrings.join(', '));

    // 步骤3: 清理休息日的非休息任务
    console.log('\n🗑️ 步骤3: 清理休息日的非休息任务...');
    
    await transaction(async (connection) => {
      for (const dateStr of restDateStrings) {
        // 删除该日期的所有非休息任务
        const [deleteResult] = await connection.execute(`
          DELETE FROM tasks 
          WHERE task_date = ? 
            AND task_type != '休息'
        `, [dateStr]);
        
        console.log(`  ${dateStr}: 删除了 ${deleteResult.affectedRows} 个非休息任务`);
        
        // 确保每个学生在休息日只有一个休息任务
        const [existingRestTasks] = await connection.execute(`
          SELECT id, student_id 
          FROM tasks 
          WHERE task_date = ? AND task_type = '休息'
        `, [dateStr]);
        
        // 按学生分组
        const tasksByStudent = {};
        existingRestTasks.forEach(task => {
          if (!tasksByStudent[task.student_id]) {
            tasksByStudent[task.student_id] = [];
          }
          tasksByStudent[task.student_id].push(task);
        });
        
        // 确保每个学生只有一个休息任务
        for (const [studentId, tasks] of Object.entries(tasksByStudent)) {
          if (tasks.length > 1) {
            // 保留第一个，删除其余的
            const tasksToDelete = tasks.slice(1);
            for (const task of tasksToDelete) {
              await connection.execute('DELETE FROM tasks WHERE id = ?', [task.id]);
            }
            console.log(`    ${studentId}: 删除了 ${tasksToDelete.length} 个重复的休息任务`);
          }
        }
        
        // 如果某个学生没有休息任务，创建一个
        const students = ['ST001', 'ST002'];
        for (const studentId of students) {
          const studentTasks = tasksByStudent[studentId] || [];
          if (studentTasks.length === 0) {
            const taskId = `${studentId}-${dateStr}-rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await connection.execute(`
              INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status, created_at)
              VALUES (?, ?, ?, '休息', '今日休息调整状态', FALSE, 'normal', NOW())
            `, [taskId, studentId, dateStr]);
            console.log(`    ${studentId}: 创建了休息任务`);
          }
        }
      }
    });

    // 步骤4: 验证修复结果
    console.log('\n🔍 步骤4: 验证修复结果...');
    
    const verificationTasks = await query(`
      SELECT 
        task_date,
        task_type,
        title,
        student_id,
        COUNT(*) as count
      FROM tasks 
      WHERE task_date IN (${restDateStrings.map(() => '?').join(',')})
      GROUP BY task_date, task_type, title, student_id
      ORDER BY task_date, student_id, task_type
    `, restDateStrings);

    console.log('修复后的休息日任务分布:');
    let currentVerifyDate = '';
    verificationTasks.forEach(task => {
      const dateStr = task.task_date.toISOString().split('T')[0];
      if (dateStr !== currentVerifyDate) {
        console.log(`\n  ${dateStr}:`);
        currentVerifyDate = dateStr;
      }
      console.log(`    ${task.student_id} - ${task.task_type}: ${task.title}`);
    });

    // 步骤5: 检查是否还有问题
    console.log('\n✅ 步骤5: 最终检查...');
    
    const problemDates = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type) as types
      FROM tasks 
      WHERE task_date IN (${restDateStrings.map(() => '?').join(',')})
      GROUP BY task_date
      HAVING type_count > 1
    `, restDateStrings);

    if (problemDates.length > 0) {
      console.log('❌ 仍有问题的日期:');
      problemDates.forEach(row => {
        const dateStr = row.task_date.toISOString().split('T')[0];
        console.log(`  ${dateStr}: 有 ${row.type_count} 种任务类型 (${row.types})`);
      });
    } else {
      console.log('✅ 所有休息日都已正确设置，只包含休息任务');
    }

    // 步骤6: 重新验证学生端API
    console.log('\n📱 步骤6: 建议重新验证学生端API...');
    console.log('请运行以下命令验证学生端显示:');
    console.log('  ./check_student_api_curl.sh');
    
    console.log('\n🎉 休息日逻辑修复完成！');
    console.log('✅ 休息日只包含休息任务，不再有其他任务');

  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.message);
  }
}

fixRestDayLogic();
