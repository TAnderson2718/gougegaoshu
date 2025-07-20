const { query, transaction } = require('./config/database');

async function fixJulyTasks() {
  try {
    console.log('=== 修复7月份任务数据 ===');
    
    // 生成7月份完整的任务数据
    const julyTasks = generateJulyTasks();
    
    console.log(`生成了 ${julyTasks.length} 个任务`);
    
    // 批量插入任务
    let imported = 0;
    await transaction(async (connection) => {
      for (const task of julyTasks) {
        // 检查是否已存在相同的任务
        const [existingTasks] = await connection.execute(
          'SELECT id FROM tasks WHERE student_id = ? AND task_date = ? AND task_type = ? AND title = ?',
          [task.student_id, task.task_date, task.task_type, task.title]
        );
        
        // 如果不存在，则插入
        if (existingTasks.length === 0) {
          await connection.execute(
            'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, task_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [task.id, task.student_id, task.task_date, task.task_type, task.title, task.completed, task.task_status]
          );
          imported++;
        }
      }
    });
    
    console.log(`✅ 成功导入 ${imported} 个新任务，跳过 ${julyTasks.length - imported} 个重复任务`);
    
    // 验证结果
    await verifyJulyTasks();
    
    process.exit(0);
  } catch (error) {
    console.error('修复失败:', error);
    process.exit(1);
  }
}

function generateJulyTasks() {
  const tasks = [];
  
  // 任务模板
  const taskTemplates = {
    ST001: {
      数学: [
        '线性代数矩阵运算', '高等数学微积分', '概率论基础', '数理统计方法',
        '离散数学逻辑', '数值分析算法', '运筹学优化', '图论基础'
      ],
      英语: [
        '学术论文阅读', '英语写作技巧', '听力训练', '口语表达',
        '词汇扩展练习', '语法强化训练', '翻译技巧', '商务英语'
      ],
      专业课: [
        '数据结构与算法', '计算机网络原理', '操作系统设计', '数据库系统',
        '软件工程方法', '人工智能基础', '机器学习算法', '深度学习理论'
      ]
    },
    ST002: {
      数学: [
        '高等数学微积分', '线性代数矩阵', '概率统计理论', '数学建模',
        '复变函数论', '实分析基础', '抽象代数', '拓扑学入门'
      ],
      英语: [
        '英语写作技巧', '学术英语阅读', '英语听力训练', '口语交流',
        '专业词汇学习', '英语语法复习', '英语翻译练习', '国际交流英语'
      ],
      专业课: [
        '计算机网络原理', '数据结构算法', '软件架构设计', '分布式系统',
        '云计算技术', '大数据处理', '网络安全技术', '移动应用开发'
      ]
    }
  };
  
  // 生成7月1日到31日的任务
  for (let day = 1; day <= 31; day++) {
    const date = `2025-07-${day.toString().padStart(2, '0')}`;
    const dayOfWeek = new Date(date).getDay();
    
    // 周一：无任务（根据记忆）
    if (dayOfWeek === 1) {
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
      continue;
    }
    
    // 其他日期：每个学生3个任务
    for (const studentId of ['ST001', 'ST002']) {
      const templates = taskTemplates[studentId];
      const taskTypes = ['数学', '英语', '专业课'];
      
      for (const taskType of taskTypes) {
        const titles = templates[taskType];
        const title = titles[Math.floor(Math.random() * titles.length)];
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
  }
  
  return tasks;
}

async function verifyJulyTasks() {
  console.log('\n=== 验证7月份任务数据 ===');
  
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
    
    console.log(`${date} (${dayNames[dayOfWeek]}): ST001=${st001Tasks.length}个, ST002=${st002Tasks.length}个, 总计=${tasks.length}个`);
    
    // 检查异常情况
    if (dayOfWeek === 1 && tasks.length > 0) {
      console.log('  ⚠️  周一应该没有任务');
    } else if (dayOfWeek === 6 && tasks.length !== 2) {
      console.log('  ⚠️  周六应该有2个休息任务');
    } else if (dayOfWeek !== 1 && dayOfWeek !== 6 && tasks.length !== 6) {
      console.log('  ⚠️  非周一周六应该有6个任务');
    }
  }
}

fixJulyTasks();
