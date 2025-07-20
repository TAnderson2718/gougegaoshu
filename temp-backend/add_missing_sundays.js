const { query, transaction } = require('./config/database');

async function fixSundayTasks() {
  try {
    console.log('=== 修复周日任务问题 ===');

    // 所有7月的周日
    const sundays = [
      '2025-07-06', // 周日
      '2025-07-13', // 周日
      '2025-07-20', // 周日
      '2025-07-27'  // 周日
    ];

    // 任务模板 - 为两个学生准备不同的任务
    const taskTemplatesForST001 = [
      ['数学', '线性代数矩阵运算'],
      ['英语', '学术论文阅读'],
      ['专业课', '数据结构与算法']
    ];

    const taskTemplatesForST002 = [
      ['数学', '高等数学微积分'],
      ['英语', '英语写作技巧'],
      ['专业课', '计算机网络原理']
    ];

    await transaction(async (connection) => {
      for (const dateStr of sundays) {
        console.log(`\n处理 ${dateStr} (周日)...`);

        // 处理ST001学生
        await processSundayForStudent(connection, 'ST001', dateStr, taskTemplatesForST001);

        // 处理ST002学生
        await processSundayForStudent(connection, 'ST002', dateStr, taskTemplatesForST002);
      }
    });

    console.log('\n✅ 周日任务修复完成');

    // 验证结果
    console.log('\n=== 验证结果 ===');
    for (const dateStr of sundays) {
      console.log(`\n${dateStr} (周日):`);

      for (const studentId of ['ST001', 'ST002']) {
        const tasks = await query(
          'SELECT task_type, title FROM tasks WHERE student_id = ? AND task_date = ? ORDER BY task_type',
          [studentId, dateStr]
        );
        console.log(`  ${studentId}: ${tasks.length} 个任务`);
        tasks.forEach(task => {
          console.log(`    ${task.task_type} - ${task.title}`);
        });
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

async function processSundayForStudent(connection, studentId, dateStr, taskTemplates) {
  // 检查该日期现有任务
  const [existing] = await connection.execute(
    'SELECT id, task_type, title FROM tasks WHERE student_id = ? AND task_date = ?',
    [studentId, dateStr]
  );

  console.log(`  ${studentId} 现有任务: ${existing.length} 个`);

  // 如果只有休息任务，删除它们并添加正常任务
  const restTasks = existing.filter(task => task.task_type === '休息');
  const normalTasks = existing.filter(task => task.task_type !== '休息');

  if (restTasks.length > 0 && normalTasks.length === 0) {
    console.log(`    删除 ${restTasks.length} 个休息任务`);
    for (const task of restTasks) {
      await connection.execute('DELETE FROM tasks WHERE id = ?', [task.id]);
    }
  }

  // 如果没有正常任务，添加3个任务
  if (normalTasks.length === 0) {
    console.log(`    添加 3 个正常任务`);
    for (const [taskType, title] of taskTemplates) {
      const taskId = `${studentId}-${dateStr}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await connection.execute(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status) VALUES (?, ?, ?, ?, ?, FALSE, "normal")',
        [taskId, studentId, dateStr, taskType, title]
      );

      console.log(`      添加: ${taskType} - ${title}`);
    }
  } else {
    console.log(`    已有 ${normalTasks.length} 个正常任务，跳过`);
  }
}

fixSundayTasks();
