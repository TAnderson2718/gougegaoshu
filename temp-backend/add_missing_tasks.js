const { query, transaction } = require('./config/database');

async function addMissingTasks() {
  try {
    console.log('📝 为缺失日期添加学习任务');
    console.log('=====================================\n');

    // 缺失任务的日期
    const missingDates = [
      '2025-07-01',
      '2025-07-08', 
      '2025-07-15',
      '2025-07-22',
      '2025-07-27',
      '2025-07-28',
      '2025-07-31'
    ];

    console.log(`需要补充任务的日期 (${missingDates.length}天):`);
    missingDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      console.log(`  ${dateStr} (周${dayNames[dayOfWeek]})`);
    });

    // 定义任务模板
    const taskTemplates = [
      // 专业课任务
      { type: '专业课', titles: [
        '计算机网络协议分析',
        '数据结构算法实现',
        '操作系统原理学习',
        '数据库系统设计',
        '软件工程方法论',
        '编译原理基础',
        '计算机组成原理',
        '人工智能算法'
      ]},
      // 数学任务
      { type: '数学', titles: [
        '高等数学微积分',
        '线性代数矩阵',
        '概率论统计',
        '离散数学逻辑',
        '数值分析方法',
        '数理统计应用',
        '复变函数理论',
        '实分析基础'
      ]},
      // 英语任务
      { type: '英语', titles: [
        '阅读理解训练',
        '写作技巧提升',
        '词汇记忆强化',
        '语法专项练习',
        '翻译技能训练',
        '听力理解提升',
        '口语表达练习',
        '学术英语写作'
      ]}
    ];

    console.log('\n🔧 开始添加任务...');

    await transaction(async (connection) => {
      for (let i = 0; i < missingDates.length; i++) {
        const dateStr = missingDates[i];
        console.log(`\n添加 ${dateStr} 的任务:`);
        
        // 为每个学生添加3种类型的任务
        const students = ['ST001', 'ST002'];
        
        for (const studentId of students) {
          for (const taskTemplate of taskTemplates) {
            // 根据日期选择不同的任务标题
            const titleIndex = i % taskTemplate.titles.length;
            const title = taskTemplate.titles[titleIndex];
            
            const taskId = `${studentId}-${dateStr}-${taskTemplate.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            await connection.execute(`
              INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, created_at)
              VALUES (?, ?, ?, ?, ?, FALSE, NOW())
            `, [taskId, studentId, dateStr, taskTemplate.type, title]);
            
            console.log(`    ${studentId} - ${taskTemplate.type}: ${title}`);
          }
        }
      }
    });

    console.log('\n✅ 任务添加完成！');

    // 验证添加结果
    console.log('\n🔍 验证添加结果...');
    
    for (const dateStr of missingDates) {
      const addedTasks = await query(`
        SELECT task_type, COUNT(*) as count
        FROM tasks 
        WHERE task_date = ?
        GROUP BY task_type
        ORDER BY task_type
      `, [dateStr]);
      
      const taskTypes = addedTasks.map(t => `${t.task_type}(${t.count})`);
      console.log(`  ${dateStr}: ${taskTypes.join(', ')}`);
    }

    // 最终统计
    console.log('\n📊 最终统计...');
    
    const finalStats = await query(`
      SELECT 
        COUNT(DISTINCT task_date) as total_dates,
        SUM(CASE WHEN task_type = '休息' THEN 1 ELSE 0 END) / 2 as rest_days,
        COUNT(DISTINCT CASE WHEN task_type != '休息' THEN task_date END) as work_days
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
    `);

    const stats = finalStats[0];
    console.log(`  总安排日期: ${stats.total_dates} 天`);
    console.log(`  休息日: ${stats.rest_days} 天`);
    console.log(`  工作日: ${stats.work_days} 天`);
    console.log(`  未安排日期: ${31 - stats.total_dates} 天`);

    console.log('\n=====================================');
    if (stats.total_dates === 31) {
      console.log('🎉 7月份所有日期都已安排任务！');
      console.log('✅ 除了纯休息日，其他日期都有学习任务');
    } else {
      console.log(`❌ 仍有 ${31 - stats.total_dates} 天未安排任务`);
    }

    process.exit(0);
    
  } catch (error) {
    console.error('添加任务失败:', error);
    process.exit(1);
  }
}

addMissingTasks();
