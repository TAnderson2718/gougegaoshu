const { query, transaction } = require('./config/database');

async function ultimateCleanup() {
  try {
    console.log('🧹 终极清理：修复所有剩余问题');
    console.log('=====================================\n');

    // 1. 找出所有有问题的日期
    console.log('1️⃣ 识别有问题的日期...');
    
    const allJulyDates = [];
    for (let day = 1; day <= 31; day++) {
      allJulyDates.push('2025-07-' + day.toString().padStart(2, '0'));
    }

    const problemDates = [];
    
    for (const dateStr of allJulyDates) {
      const dayTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
      `, [dateStr]);
      
      if (dayTasks.length === 0) continue;
      
      const taskTypes = dayTasks.map(t => t.task_type);
      const hasRest = taskTypes.includes('休息');
      const hasOthers = taskTypes.some(t => t !== '休息');
      
      // 有问题的情况：
      // 1. 既有休息任务又有其他任务（混合日）
      // 2. 只有休息任务但数量不是2个
      if ((hasRest && hasOthers) || (hasRest && !hasOthers && dayTasks[0].count !== 2)) {
        problemDates.push(dateStr);
        console.log(`  ❌ ${dateStr}: ${taskTypes.join(', ')} ${hasRest && hasOthers ? '(混合)' : '(休息任务数量错误)'}`);
      }
    }

    if (problemDates.length === 0) {
      console.log('✅ 没有发现问题日期');
      return;
    }

    console.log(`\n发现 ${problemDates.length} 个有问题的日期，开始修复...\n`);

    // 2. 修复每个有问题的日期
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
        
        const restTasks = allTasks.filter(t => t.task_type === '休息');
        const otherTasks = allTasks.filter(t => t.task_type !== '休息');
        
        console.log(`  当前: ${restTasks.length}个休息任务, ${otherTasks.length}个其他任务`);
        
        if (restTasks.length > 0 && otherTasks.length > 0) {
          // 混合日：删除所有非休息任务
          for (const task of otherTasks) {
            await connection.execute('DELETE FROM tasks WHERE id = ?', [task.id]);
          }
          console.log(`  删除了 ${otherTasks.length} 个非休息任务`);
        }
        
        // 确保休息任务数量正确（每个学生一个）
        if (restTasks.length > 0) {
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
        
        console.log('');
      }
    });

    // 3. 最终验证
    console.log('🔍 最终验证...\n');
    
    let allFixed = true;
    
    for (const dateStr of problemDates) {
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

    // 4. 检查是否还有其他问题
    console.log('\n🔍 检查是否还有其他问题...');
    
    const remainingProblems = await query(`
      SELECT 
        task_date,
        COUNT(DISTINCT task_type) as type_count,
        GROUP_CONCAT(DISTINCT task_type) as types,
        SUM(CASE WHEN task_type = '休息' THEN 1 ELSE 0 END) as rest_count
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      HAVING (type_count > 1 AND rest_count > 0) OR (type_count = 1 AND types = '休息' AND rest_count != 2)
      ORDER BY task_date
    `);

    if (remainingProblems.length > 0) {
      console.log(`❌ 仍有 ${remainingProblems.length} 个问题日期:`);
      remainingProblems.forEach(row => {
        const dateStr = row.task_date.toISOString().split('T')[0];
        console.log(`  ${dateStr}: ${row.types} (休息任务数: ${row.rest_count})`);
      });
    } else {
      console.log('✅ 没有发现其他问题');
    }

    console.log('\n=====================================');
    if (allFixed && remainingProblems.length === 0) {
      console.log('🎉 终极清理完成！所有问题都已修复！');
    } else {
      console.log('❌ 仍有部分问题未解决');
    }

    process.exit(0);
    
  } catch (error) {
    console.error('清理失败:', error);
    process.exit(1);
  }
}

ultimateCleanup();
