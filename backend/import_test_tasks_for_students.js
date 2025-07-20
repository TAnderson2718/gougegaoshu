const { query } = require('./config/database');

async function importTestTasks() {
  try {
    console.log('📥 开始导入测试任务数据...');
    
    // 生成从2025-07-20开始的任务（匹配前端显示的日期）
    const today = new Date('2025-07-20');
    const tasks = [];
    
    // 为ST001和ST002生成任务
    const students = ['ST001', 'ST002'];
    const taskTypes = ['数学', '英语', '政治', '专业课'];
    const taskTitles = {
      '数学': ['高等数学练习', '线性代数作业', '概率论习题', '数学分析'],
      '英语': ['单词背诵', '阅读理解', '听力练习', '写作训练'],
      '政治': ['马克思主义原理', '毛泽东思想', '中国近现代史', '思想道德修养'],
      '专业课': ['专业基础', '专业实践', '课程设计', '实验报告']
    };
    
    // 生成未来7天的任务
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const taskDate = new Date(today);
      taskDate.setDate(today.getDate() + dayOffset);
      const dateStr = taskDate.toISOString().split('T')[0];
      
      for (const studentId of students) {
        // 每天3个任务
        for (let i = 0; i < 3; i++) {
          const taskType = taskTypes[i % taskTypes.length];
          const titleOptions = taskTitles[taskType];
          const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];
          
          const taskId = `${studentId}-${dateStr}-${i + 1}`;
          
          tasks.push({
            id: taskId,
            student_id: studentId,
            task_date: dateStr,
            task_type: taskType,
            title: title,
            completed: false
          });
        }
      }
    }
    
    console.log(`📋 生成了 ${tasks.length} 个任务`);
    
    // 批量插入任务
    let imported = 0;
    for (const task of tasks) {
      try {
        await query(
          'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
          [task.id, task.student_id, task.task_date, task.task_type, task.title, task.completed]
        );
        imported++;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️ 任务 ${task.id} 已存在，跳过`);
        } else {
          throw error;
        }
      }
    }
    
    console.log(`✅ 成功导入 ${imported} 个任务`);
    
    // 验证导入结果
    const st001Count = await query('SELECT COUNT(*) as count FROM tasks WHERE student_id = ?', ['ST001']);
    const st002Count = await query('SELECT COUNT(*) as count FROM tasks WHERE student_id = ?', ['ST002']);
    
    console.log(`📊 ST001任务数量: ${st001Count[0].count}`);
    console.log(`📊 ST002任务数量: ${st002Count[0].count}`);
    
    // 显示今天的任务
    const todayStr = today.toISOString().split('T')[0];
    const todayTasks = await query(
      'SELECT * FROM tasks WHERE task_date = ? ORDER BY student_id, task_type',
      [todayStr]
    );
    
    console.log(`📅 今天 (${todayStr}) 的任务:`);
    todayTasks.forEach(task => {
      console.log(`   ${task.student_id}: ${task.task_type} - ${task.title}`);
    });
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
  }
  process.exit(0);
}

importTestTasks();
