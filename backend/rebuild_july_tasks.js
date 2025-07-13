const { query, transaction } = require('./config/database');

async function rebuildJulyTasks() {
  try {
    console.log('=== 重建7月份任务数据 ===');
    
    await transaction(async (connection) => {
      // 1. 删除所有7月份的任务
      console.log('1. 删除所有7月份任务...');
      const [deleted] = await connection.execute(
        'DELETE FROM tasks WHERE task_date LIKE "2025-07-%"'
      );
      console.log(`   删除了 ${deleted.affectedRows} 个任务`);
      
      // 2. 重新生成标准的7月份任务
      console.log('2. 重新生成7月份任务...');
      const tasks = generateStandardJulyTasks();
      
      console.log(`   生成了 ${tasks.length} 个任务`);
      
      // 3. 批量插入任务
      for (const task of tasks) {
        await connection.execute(
          'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [task.id, task.student_id, task.task_date, task.task_type, task.title, task.completed, task.task_status]
        );
      }
      
      console.log(`   插入了 ${tasks.length} 个任务`);
    });
    
    console.log('\n✅ 7月份任务数据重建完成');
    
    // 验证结果
    await verifyRebuildTasks();
    
    process.exit(0);
  } catch (error) {
    console.error('重建失败:', error);
    process.exit(1);
  }
}

function generateStandardJulyTasks() {
  const tasks = [];
  
  // 任务模板
  const taskTemplates = {
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
  
  // 生成7月1日到31日的任务
  for (let day = 1; day <= 31; day++) {
    const date = `2025-07-${day.toString().padStart(2, '0')}`;
    const dayOfWeek = new Date(date).getDay();
    
    console.log(`   处理 ${date} (${['日', '一', '二', '三', '四', '五', '六'][dayOfWeek]})`);
    
    // 周一：无任务（根据记忆）
    if (dayOfWeek === 1) {
      console.log(`     周一，跳过`);
      continue;
    }
    
    // 周六：休息日（根据记忆）
    if (dayOfWeek === 6) {
      for (const studentId of ['ST001', 'ST002']) {
        const taskId = `${studentId}-${date}-rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        tasks.push({
          id: taskId,
          student_id: studentId,
          task_date: date,
          task_type: '休息',
          title: '今日休息调整状态',
          completed: false,
          task_status: 'normal'
        });
      }
      console.log(`     周六，添加2个休息任务`);
      continue;
    }
    
    // 其他日期：每个学生3个任务
    for (const studentId of ['ST001', 'ST002']) {
      const templates = taskTemplates[studentId];
      const taskTypes = ['数学', '英语', '专业课'];
      
      for (const taskType of taskTypes) {
        const title = templates[taskType];
        const taskId = `${studentId}-${date}-${taskType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        tasks.push({
          id: taskId,
          student_id: studentId,
          task_date: date,
          task_type: taskType,
          title: title,
          completed: false,
          task_status: 'normal'
        });
      }
    }
    console.log(`     添加6个学习任务`);
  }
  
  return tasks;
}

async function verifyRebuildTasks() {
  console.log('\n=== 验证重建后的任务数据 ===');
  
  let totalIssues = 0;
  let correctDays = 0;
  
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
    let isCorrect = true;
    
    if (dayOfWeek === 1) { // 周一
      expectedCount = 0;
      if (tasks.length !== 0) {
        status = '❌';
        isCorrect = false;
      }
    } else if (dayOfWeek === 6) { // 周六
      expectedCount = 2;
      if (tasks.length !== 2 || !tasks.every(t => t.task_type === '休息')) {
        status = '❌';
        isCorrect = false;
      }
    } else { // 其他日期
      if (tasks.length !== 6 || st001Tasks.length !== 3 || st002Tasks.length !== 3) {
        status = '❌';
        isCorrect = false;
      }
    }
    
    if (!isCorrect) {
      totalIssues++;
    } else {
      correctDays++;
    }
    
    console.log(`${status} ${date} (${dayNames[dayOfWeek]}): ST001=${st001Tasks.length}个, ST002=${st002Tasks.length}个, 总计=${tasks.length}个 (期望${expectedCount}个)`);
  }
  
  console.log(`\n总结: ${totalIssues === 0 ? '🎉 所有31天都正确!' : `❌ 发现 ${totalIssues} 个问题日期`}`);
  console.log(`正确天数: ${correctDays}/31`);
  
  // 统计总任务数
  const totalTasks = await query(
    'SELECT COUNT(*) as count FROM tasks WHERE task_date LIKE "2025-07-%"'
  );
  console.log(`7月份总任务数: ${totalTasks[0].count}`);
  
  // 按学生统计
  for (const studentId of ['ST001', 'ST002']) {
    const studentTasks = await query(
      'SELECT COUNT(*) as count FROM tasks WHERE student_id = ? AND task_date LIKE "2025-07-%"',
      [studentId]
    );
    console.log(`${studentId}: ${studentTasks[0].count} 个任务`);
  }
}

rebuildJulyTasks();
