const { query } = require('./config/database');

async function importTestTasks() {
  try {
    console.log('🚀 开始导入测试任务...');
    
    // 测试任务数据
    const tasks = [
      {
        id: `ST001-2025-07-19-${Date.now()}-1`,
        student_id: 'ST001',
        task_date: '2025-07-19',
        task_type: '数学',
        title: '高等数学微分学',
        completed: false
      },
      {
        id: `ST001-2025-07-19-${Date.now()}-2`,
        student_id: 'ST001',
        task_date: '2025-07-19',
        task_type: '英语',
        title: '考研词汇Unit1-10',
        completed: false
      },
      {
        id: `ST001-2025-07-19-${Date.now()}-3`,
        student_id: 'ST001',
        task_date: '2025-07-19',
        task_type: '专业课',
        title: '数据结构与算法基础',
        completed: false
      },
      {
        id: `ST002-2025-07-19-${Date.now()}-4`,
        student_id: 'ST002',
        task_date: '2025-07-19',
        task_type: '数学',
        title: '线性代数矩阵运算',
        completed: false
      },
      {
        id: `ST002-2025-07-19-${Date.now()}-5`,
        student_id: 'ST002',
        task_date: '2025-07-19',
        task_type: '英语',
        title: '阅读理解专项训练',
        completed: false
      },
      {
        id: `ST001-2025-07-20-${Date.now()}-6`,
        student_id: 'ST001',
        task_date: '2025-07-20',
        task_type: '休息',
        title: '休息日',
        completed: false
      },
      {
        id: `ST002-2025-07-20-${Date.now()}-7`,
        student_id: 'ST002',
        task_date: '2025-07-20',
        task_type: '休息',
        title: '休息日',
        completed: false
      },
      {
        id: `ST001-2025-07-21-${Date.now()}-8`,
        student_id: 'ST001',
        task_date: '2025-07-21',
        task_type: '数学',
        title: '高等数学积分学',
        completed: false
      },
      {
        id: `ST001-2025-07-21-${Date.now()}-9`,
        student_id: 'ST001',
        task_date: '2025-07-21',
        task_type: '英语',
        title: '阅读理解专项训练',
        completed: false
      },
      {
        id: `ST002-2025-07-21-${Date.now()}-10`,
        student_id: 'ST002',
        task_date: '2025-07-21',
        task_type: '数学',
        title: '概率论与数理统计',
        completed: false
      }
    ];
    
    // 插入任务
    for (const task of tasks) {
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        [task.id, task.student_id, task.task_date, task.task_type, task.title, task.completed]
      );
    }
    
    console.log(`✅ 成功导入 ${tasks.length} 个测试任务`);
    
    // 验证导入结果
    const result = await query('SELECT COUNT(*) as count FROM tasks');
    console.log(`📊 数据库中总任务数: ${result[0].count}`);
    
    const todayTasks = await query('SELECT * FROM tasks WHERE task_date = ? ORDER BY student_id, task_type', ['2025-07-19']);
    console.log(`📅 今日任务数: ${todayTasks.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  }
}

importTestTasks();
