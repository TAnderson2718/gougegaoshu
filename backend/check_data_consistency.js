const { query } = require('./config/database');

async function checkDataConsistency() {
  try {

    console.log('🔍 检查管理员CSV预填数据与数据库实际数据的一致性\n');

    // 查询数据库中ST001学生7月1-10日的任务
    const dbTasks = await query(`
      SELECT student_id, task_date, task_type, title
      FROM tasks
      WHERE student_id = 'ST001'
        AND task_date BETWEEN '2025-07-01' AND '2025-07-10'
      ORDER BY task_date, task_type
    `);

    console.log('📊 数据库中ST001学生7月1-10日的任务:');
    console.log('总数:', dbTasks.length);
    
    if (dbTasks.length > 0) {
      console.log('\n详细任务列表:');
      dbTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.task_date.toISOString().split('T')[0]} - ${task.task_type} - ${task.title}`);
      });
    } else {
      console.log('❌ 数据库中没有找到ST001学生的任务数据');
    }

    // 管理员界面预填的CSV数据（从AdminDashboard.js中提取的前10天数据）
    const csvPrefilledData = [
      ['ST001', '2025-07-01', '专业课', '数据结构与算法基础'],
      ['ST001', '2025-07-01', '数学', '高等数学微分学'],
      ['ST001', '2025-07-01', '英语', '考研词汇Unit1-10'],
      ['ST001', '2025-07-02', '专业课', '操作系统进程管理'],
      ['ST001', '2025-07-02', '数学', '高等数学积分学'],
      ['ST001', '2025-07-02', '英语', '阅读理解专项训练'],
      ['ST001', '2025-07-03', '专业课', '计算机网络TCP/IP'],
      ['ST001', '2025-07-03', '数学', '线性代数矩阵运算'],
      ['ST001', '2025-07-03', '英语', '写作技巧训练'],
      ['ST001', '2025-07-04', '专业课', '数据库系统原理'],
      ['ST001', '2025-07-04', '数学', '概率论基础概念'],
      ['ST001', '2025-07-04', '英语', '翻译技巧练习'],
      ['ST001', '2025-07-06', '休息', '周日休息日'],
      ['ST001', '2025-07-06', '专业课', '编译原理词法分析'],
      ['ST001', '2025-07-06', '数学', '离散数学图论'],
      ['ST001', '2025-07-06', '英语', '语法专项复习'],
      ['ST001', '2025-07-07', '专业课', '人工智能机器学习'],
      ['ST001', '2025-07-07', '数学', '数值分析方法'],
      ['ST001', '2025-07-07', '英语', '完形填空练习'],
      ['ST001', '2025-07-08', '专业课', '计算机组成原理'],
      ['ST001', '2025-07-08', '数学', '复变函数基础'],
      ['ST001', '2025-07-08', '英语', '新题型训练'],
      ['ST001', '2025-07-09', '专业课', '算法设计与分析'],
      ['ST001', '2025-07-09', '数学', '实变函数理论'],
      ['ST001', '2025-07-09', '英语', '考研真题演练'],
      ['ST001', '2025-07-10', '专业课', '容器化技术Docker'],
      ['ST001', '2025-07-10', '数学', '代数几何基础'],
      ['ST001', '2025-07-10', '英语', '商务英语表达']
    ];

    console.log('\n📋 管理员界面预填的CSV数据 (ST001, 7月1-10日):');
    console.log('总数:', csvPrefilledData.length);
    
    console.log('\n详细预填数据:');
    csvPrefilledData.forEach((task, index) => {
      console.log(`${index + 1}. ${task[1]} - ${task[2]} - ${task[3]}`);
    });

    // 对比分析
    console.log('\n🔍 一致性分析:');
    
    if (dbTasks.length === 0) {
      console.log('❌ 数据库中没有任务数据，无法进行对比');
      return;
    }

    // 检查数量是否一致
    if (dbTasks.length === csvPrefilledData.length) {
      console.log('✅ 任务数量一致:', dbTasks.length);
    } else {
      console.log('❌ 任务数量不一致:');
      console.log('  - 数据库:', dbTasks.length);
      console.log('  - CSV预填:', csvPrefilledData.length);
    }

    // 逐条对比任务内容
    let matchCount = 0;
    let mismatchDetails = [];

    for (let i = 0; i < Math.min(dbTasks.length, csvPrefilledData.length); i++) {
      const dbTask = dbTasks[i];
      const csvTask = csvPrefilledData[i];
      
      const dbDate = dbTask.task_date.toISOString().split('T')[0];
      const csvDate = csvTask[1];
      const dbType = dbTask.task_type;
      const csvType = csvTask[2];
      const dbTitle = dbTask.title;
      const csvTitle = csvTask[3];

      if (dbDate === csvDate && dbType === csvType && dbTitle === csvTitle) {
        matchCount++;
      } else {
        mismatchDetails.push({
          index: i + 1,
          db: `${dbDate} - ${dbType} - ${dbTitle}`,
          csv: `${csvDate} - ${csvType} - ${csvTitle}`
        });
      }
    }

    console.log(`\n📊 内容匹配结果:`);
    console.log(`✅ 匹配的任务: ${matchCount}/${Math.min(dbTasks.length, csvPrefilledData.length)}`);
    
    if (mismatchDetails.length > 0) {
      console.log(`❌ 不匹配的任务: ${mismatchDetails.length}`);
      console.log('\n不匹配详情:');
      mismatchDetails.forEach(detail => {
        console.log(`${detail.index}. 数据库: ${detail.db}`);
        console.log(`   CSV预填: ${detail.csv}`);
        console.log('');
      });
    } else {
      console.log('✅ 所有任务内容完全匹配!');
    }

  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
  }
}

checkDataConsistency();
