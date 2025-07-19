const { query, transaction } = require('./config/database.js');

async function addSaturdayTasks() {
  try {
    console.log('=== 添加7月19日和26日（周六）的学习任务 ===');
    
    // 7月19日和26日的任务数据
    const saturdayTasks = [
      // 7月19日（周六）任务
      { studentId: 'ST001', date: '2025-07-19', type: '数学', title: '概率论与数理统计' },
      { studentId: 'ST001', date: '2025-07-19', type: '英语', title: '阅读理解技巧' },
      { studentId: 'ST001', date: '2025-07-19', type: '专业课', title: '软件工程原理' },
      
      { studentId: 'ST002', date: '2025-07-19', type: '数学', title: '概率论与数理统计' },
      { studentId: 'ST002', date: '2025-07-19', type: '英语', title: '阅读理解技巧' },
      { studentId: 'ST002', date: '2025-07-19', type: '专业课', title: '软件工程原理' },
      
      // 7月26日（周六）任务
      { studentId: 'ST001', date: '2025-07-26', type: '数学', title: '线性代数复习' },
      { studentId: 'ST001', date: '2025-07-26', type: '英语', title: '写作技巧训练' },
      { studentId: 'ST001', date: '2025-07-26', type: '专业课', title: '数据结构算法' },
      
      { studentId: 'ST002', date: '2025-07-26', type: '数学', title: '线性代数复习' },
      { studentId: 'ST002', date: '2025-07-26', type: '英语', title: '写作技巧训练' },
      { studentId: 'ST002', date: '2025-07-26', type: '专业课', title: '数据结构算法' }
    ];
    
    console.log(`准备添加 ${saturdayTasks.length} 个周六任务`);
    
    // 检查这些日期是否已有任务
    console.log('\n检查现有任务:');
    for (const date of ['2025-07-19', '2025-07-26']) {
      const existingTasks = await query(
        'SELECT student_id, task_type, title FROM tasks WHERE task_date = ? ORDER BY student_id, task_type',
        [date]
      );
      
      console.log(`${date}: ${existingTasks.length} 个现有任务`);
      if (existingTasks.length > 0) {
        existingTasks.forEach(task => {
          console.log(`  ${task.student_id}: ${task.task_type} - ${task.title}`);
        });
      }
    }
    
    // 使用事务批量插入任务
    let addedCount = 0;
    await transaction(async (connection) => {
      for (const task of saturdayTasks) {
        // 检查是否已存在相同任务
        const [existing] = await connection.execute(
          'SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = ? AND title = ?',
          [task.studentId, task.date, task.type, task.title]
        );
        
        if (existing.length === 0) {
          // 生成唯一任务ID
          const taskId = `${task.studentId}-${task.date}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          await connection.execute(
            'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, duration_hour, duration_minute) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [taskId, task.studentId, task.date, task.type, task.title, 0, 0, 0]
          );
          
          addedCount++;
          console.log(`✅ 添加任务: ${task.studentId} - ${task.date} - ${task.type}: ${task.title}`);
        } else {
          console.log(`⏭️ 跳过重复任务: ${task.studentId} - ${task.date} - ${task.type}: ${task.title}`);
        }
      }
    });
    
    console.log(`\n✅ 成功添加 ${addedCount} 个新任务`);
    
    // 验证添加结果
    console.log('\n验证添加结果:');
    for (const date of ['2025-07-19', '2025-07-26']) {
      const tasks = await query(
        'SELECT student_id, task_type, title FROM tasks WHERE task_date = ? ORDER BY student_id, task_type',
        [date]
      );
      
      console.log(`\n${date} (${tasks.length}个任务):`);
      const tasksByStudent = {};
      tasks.forEach(task => {
        if (!tasksByStudent[task.student_id]) {
          tasksByStudent[task.student_id] = [];
        }
        tasksByStudent[task.student_id].push(task);
      });
      
      Object.keys(tasksByStudent).forEach(studentId => {
        console.log(`  ${studentId}:`);
        tasksByStudent[studentId].forEach(task => {
          console.log(`    ${task.task_type}: ${task.title}`);
        });
      });
    }
    
    // 检查这些日期是星期几
    console.log('\n日期验证:');
    const july19 = new Date('2025-07-19');
    const july26 = new Date('2025-07-26');
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    console.log(`2025年7月19日: 星期${dayNames[july19.getDay()]}`);
    console.log(`2025年7月26日: 星期${dayNames[july26.getDay()]}`);
    
    console.log('\n🎉 周六学习任务添加完成！');
    console.log('现在7月19日和26日应该显示为有学习任务的工作日，而不是休息日。');
    
    process.exit(0);
  } catch (error) {
    console.error('添加周六任务失败:', error);
    process.exit(1);
  }
}

addSaturdayTasks();
