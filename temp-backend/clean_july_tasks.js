const { query, transaction } = require('./config/database');

async function cleanJulyTasks() {
  try {
    console.log('=== 清理7月份任务数据 ===');
    
    await transaction(async (connection) => {
      // 1. 清理周一的任务（周一应该没有任务）
      console.log('\n1. 清理周一任务...');
      const mondays = ['2025-07-07', '2025-07-14', '2025-07-21', '2025-07-28'];
      for (const monday of mondays) {
        const [mondayTasks] = await connection.execute(
          'SELECT id, student_id, task_type, title FROM tasks WHERE task_date = ?',
          [monday]
        );
        
        if (mondayTasks.length > 0) {
          console.log(`  删除 ${monday} 的 ${mondayTasks.length} 个任务`);
          await connection.execute('DELETE FROM tasks WHERE task_date = ?', [monday]);
        }
      }
      
      // 2. 标准化周六的休息任务
      console.log('\n2. 标准化周六休息任务...');
      const saturdays = ['2025-07-05', '2025-07-12', '2025-07-19', '2025-07-26'];
      for (const saturday of saturdays) {
        // 删除该日期的所有任务
        await connection.execute('DELETE FROM tasks WHERE task_date = ?', [saturday]);
        
        // 为每个学生添加一个休息任务
        for (const studentId of ['ST001', 'ST002']) {
          const taskId = `${studentId}-${saturday}-rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await connection.execute(
            'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [taskId, studentId, saturday, '休息', '今日休息调整状态', false, 'normal']
          );
        }
        console.log(`  ${saturday} 添加2个休息任务`);
      }
      
      // 3. 清理重复任务
      console.log('\n3. 清理重复任务...');
      const duplicates = await connection.execute(`
        SELECT student_id, task_date, task_type, title, COUNT(*) as count
        FROM tasks 
        WHERE task_date LIKE '2025-07-%'
        GROUP BY student_id, task_date, task_type, title
        HAVING COUNT(*) > 1
      `);
      
      if (duplicates[0].length > 0) {
        console.log(`  发现 ${duplicates[0].length} 组重复任务`);
        
        for (const dup of duplicates[0]) {
          // 保留第一个，删除其余的
          const [allDups] = await connection.execute(
            'SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = ? AND title = ? ORDER BY id',
            [dup.student_id, dup.task_date, dup.task_type, dup.title]
          );
          
          if (allDups.length > 1) {
            const idsToDelete = allDups.slice(1).map(t => t.id);
            for (const id of idsToDelete) {
              await connection.execute('DELETE FROM tasks WHERE id = ?', [id]);
            }
            console.log(`    删除 ${dup.student_id} ${dup.task_date} ${dup.task_type} 的 ${idsToDelete.length} 个重复任务`);
          }
        }
      }
      
      // 4. 确保每个非周一非周六的日期都有6个任务（每个学生3个）
      console.log('\n4. 补充缺失的任务...');
      for (let day = 1; day <= 31; day++) {
        const date = `2025-07-${day.toString().padStart(2, '0')}`;
        const dayOfWeek = new Date(date).getDay();
        
        // 跳过周一和周六
        if (dayOfWeek === 1 || dayOfWeek === 6) continue;
        
        for (const studentId of ['ST001', 'ST002']) {
          const [tasks] = await connection.execute(
            'SELECT COUNT(*) as count FROM tasks WHERE student_id = ? AND task_date = ? AND task_type != "休息"',
            [studentId, date]
          );
          
          const currentCount = tasks[0].count;
          if (currentCount < 3) {
            const needed = 3 - currentCount;
            console.log(`    ${studentId} ${date} 需要补充 ${needed} 个任务`);
            
            // 获取已有的任务类型
            const [existingTypes] = await connection.execute(
              'SELECT DISTINCT task_type FROM tasks WHERE student_id = ? AND task_date = ? AND task_type != "休息"',
              [studentId, date]
            );
            
            const existing = existingTypes.map(t => t.task_type);
            const allTypes = ['数学', '英语', '专业课'];
            const missingTypes = allTypes.filter(type => !existing.includes(type));
            
            // 补充缺失的任务类型
            for (let i = 0; i < needed && i < missingTypes.length; i++) {
              const taskType = missingTypes[i];
              const title = getTaskTitle(studentId, taskType);
              const taskId = `${studentId}-${date}-${taskType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              await connection.execute(
                'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [taskId, studentId, date, taskType, title, false, 'normal']
              );
            }
          }
        }
      }
    });
    
    console.log('\n✅ 7月份任务数据清理完成');
    
    // 验证结果
    await verifyCleanedTasks();
    
    process.exit(0);
  } catch (error) {
    console.error('清理失败:', error);
    process.exit(1);
  }
}

function getTaskTitle(studentId, taskType) {
  const titles = {
    ST001: {
      数学: '线性代数矩阵运算',
      英语: '学术论文阅读',
      专业课: '数据结构与算法'
    },
    ST002: {
      数学: '高等数学微积分',
      英语: '英语写作技巧',
      专业课: '计算机网络原理'
    }
  };
  
  return titles[studentId][taskType] || `${taskType}学习任务`;
}

async function verifyCleanedTasks() {
  console.log('\n=== 验证清理后的任务数据 ===');
  
  let totalIssues = 0;
  
  for (let day = 1; day <= 31; day++) {
    const date = `2025-07-${day.toString().padStart(2, '0')}`;
    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    const tasks = await query(
      'SELECT student_id, task_type, title FROM tasks WHERE student_id IN (?, ?) AND task_date = ? ORDER BY student_id, task_type',
      ['ST001', 'ST002', date]
    );
    
    const st001Tasks = tasks.filter(t => t.student_id === 'ST001');
    const st002Tasks = tasks.filter(t => t.student_id === 'ST002');
    
    let status = '✅';
    let expectedCount = 6; // 默认每天6个任务
    
    if (dayOfWeek === 1) { // 周一
      expectedCount = 0;
      if (tasks.length !== 0) {
        status = '❌';
        totalIssues++;
      }
    } else if (dayOfWeek === 6) { // 周六
      expectedCount = 2;
      if (tasks.length !== 2 || !tasks.every(t => t.task_type === '休息')) {
        status = '❌';
        totalIssues++;
      }
    } else { // 其他日期
      if (tasks.length !== 6 || st001Tasks.length !== 3 || st002Tasks.length !== 3) {
        status = '❌';
        totalIssues++;
      }
    }
    
    console.log(`${status} ${date} (${dayNames[dayOfWeek]}): ST001=${st001Tasks.length}个, ST002=${st002Tasks.length}个, 总计=${tasks.length}个 (期望${expectedCount}个)`);
  }
  
  console.log(`\n总结: ${totalIssues === 0 ? '✅ 所有日期都正确' : `❌ 发现 ${totalIssues} 个问题日期`}`);
}

cleanJulyTasks();
