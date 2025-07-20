const { query, transaction } = require('./config/database');

async function completeJulyTasks() {
  try {
    console.log('📅 完善7月份任务安排');
    console.log('=====================================\n');

    // 1. 检查当前状态
    console.log('📊 检查当前7月份任务状态...');
    
    const currentTasks = await query(`
      SELECT 
        DAY(task_date) as day,
        task_date,
        COUNT(*) as task_count,
        GROUP_CONCAT(DISTINCT task_type ORDER BY task_type) as task_types
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      ORDER BY task_date
    `);

    const existingDays = currentTasks.map(row => row.day);
    const missingDays = [];
    const mixedDays = [];

    // 找出缺失的日期和混合日期
    for (let day = 1; day <= 31; day++) {
      if (!existingDays.includes(day)) {
        missingDays.push(day);
      }
    }

    // 找出混合日期（既有休息又有其他任务）
    currentTasks.forEach(row => {
      if (row.task_types.includes('休息') && row.task_types.includes(',')) {
        mixedDays.push(row.day);
      }
    });

    console.log(`当前状态:`);
    console.log(`  已安排日期: ${currentTasks.length} 天`);
    console.log(`  缺失日期: ${missingDays.length} 天 (${missingDays.join(', ')})`);
    console.log(`  混合日期: ${mixedDays.length} 天 (${mixedDays.join(', ')})`);

    // 2. 修复混合日期
    if (mixedDays.length > 0) {
      console.log(`\n🔧 修复混合日期...`);
      
      await transaction(async (connection) => {
        for (const day of mixedDays) {
          const dateStr = '2025-07-' + day.toString().padStart(2, '0');
          console.log(`  修复 ${dateStr}:`);
          
          // 删除非休息任务
          const [deleteResult] = await connection.execute(`
            DELETE FROM tasks 
            WHERE task_date = ? AND task_type != '休息'
          `, [dateStr]);
          
          console.log(`    删除了 ${deleteResult.affectedRows} 个非休息任务`);
        }
      });
    }

    // 3. 添加缺失日期的任务
    if (missingDays.length > 0) {
      console.log(`\n📝 为缺失日期添加学习任务...`);
      
      const taskTemplates = [
        { type: '专业课', titles: [
          '计算机网络协议分析', '数据结构算法实现', '操作系统原理学习',
          '数据库系统设计', '软件工程方法论', '编译原理基础'
        ]},
        { type: '数学', titles: [
          '高等数学微积分', '线性代数矩阵', '概率论统计',
          '离散数学逻辑', '数值分析方法', '数理统计应用'
        ]},
        { type: '英语', titles: [
          '阅读理解训练', '写作技巧提升', '词汇记忆强化',
          '语法专项练习', '翻译技能训练', '听力理解提升'
        ]}
      ];

      await transaction(async (connection) => {
        for (let i = 0; i < missingDays.length; i++) {
          const day = missingDays[i];
          const dateStr = '2025-07-' + day.toString().padStart(2, '0');
          console.log(`  添加 ${dateStr} 的任务:`);
          
          const students = ['ST001', 'ST002'];
          
          for (const studentId of students) {
            for (const taskTemplate of taskTemplates) {
              const titleIndex = i % taskTemplate.titles.length;
              const title = taskTemplate.titles[titleIndex];
              
              const taskId = `${studentId}-${dateStr}-${taskTemplate.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              
              await connection.execute(`
                INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, created_at)
                VALUES (?, ?, ?, ?, ?, FALSE, NOW())
              `, [taskId, studentId, dateStr, taskTemplate.type, title]);
            }
          }
          
          console.log(`    为两个学生各添加了3个任务`);
        }
      });
    }

    // 4. 最终验证
    console.log(`\n🔍 最终验证...`);
    
    const finalTasks = await query(`
      SELECT 
        DAY(task_date) as day,
        COUNT(*) as task_count,
        GROUP_CONCAT(DISTINCT task_type ORDER BY task_type) as task_types
      FROM tasks 
      WHERE task_date >= '2025-07-01' AND task_date <= '2025-07-31'
      GROUP BY task_date
      ORDER BY task_date
    `);

    let workDays = 0;
    let restDays = 0;
    let problemDays = 0;

    console.log(`\n7月份最终任务分布:`);
    finalTasks.forEach(row => {
      const dateStr = '2025-07-' + row.day.toString().padStart(2, '0');
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
      
      if (row.task_types === '休息') {
        restDays++;
        console.log(`  ${dateStr} (周${dayNames[dayOfWeek]}): 休息日 ✅`);
      } else if (!row.task_types.includes('休息')) {
        workDays++;
        console.log(`  ${dateStr} (周${dayNames[dayOfWeek]}): 工作日 (${row.task_count}个任务)`);
      } else {
        problemDays++;
        console.log(`  ${dateStr} (周${dayNames[dayOfWeek]}): 混合日 ❌ (${row.task_types})`);
      }
    });

    // 检查是否还有缺失的日期
    const finalDays = finalTasks.map(row => row.day);
    const stillMissing = [];
    for (let day = 1; day <= 31; day++) {
      if (!finalDays.includes(day)) {
        stillMissing.push(day);
      }
    }

    console.log(`\n📊 最终统计:`);
    console.log(`  工作日: ${workDays} 天`);
    console.log(`  休息日: ${restDays} 天`);
    console.log(`  问题日: ${problemDays} 天`);
    console.log(`  缺失日: ${stillMissing.length} 天`);

    console.log(`\n=====================================`);
    if (stillMissing.length === 0 && problemDays === 0) {
      console.log(`🎉 7月份任务安排完成！`);
      console.log(`✅ 所有31天都已安排任务`);
      console.log(`✅ 除了纯休息日，其他日期都有学习任务`);
      console.log(`✅ 没有混合日期`);
    } else {
      console.log(`❌ 仍有问题需要解决:`);
      if (stillMissing.length > 0) {
        console.log(`  缺失日期: ${stillMissing.join(', ')}`);
      }
      if (problemDays > 0) {
        console.log(`  混合日期: ${problemDays} 天`);
      }
    }

    process.exit(0);
    
  } catch (error) {
    console.error('完善任务失败:', error);
    process.exit(1);
  }
}

completeJulyTasks();
