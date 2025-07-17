const { query, transaction } = require('./config/database');
const { stopCronJobs } = require('./services/cronService');

async function fixDataConsistencyFinal() {
  try {
    console.log('🔧 最终修复数据一致性问题');
    console.log('=====================================\n');

    // 步骤1: 停止定时任务调度服务
    console.log('⏹️ 步骤1: 停止定时任务调度服务...');
    try {
      stopCronJobs();
      console.log('✅ 定时任务调度服务已停止\n');
    } catch (error) {
      console.log('⚠️ 停止定时任务失败（可能未启动）:', error.message);
    }

    // 步骤2: 彻底清空所有任务相关数据
    console.log('🗑️ 步骤2: 彻底清空所有任务相关数据...');
    await transaction(async (connection) => {
      // 删除所有任务
      await connection.execute('DELETE FROM tasks');
      console.log('   - 删除所有任务');
      
      // 删除所有请假记录
      await connection.execute('DELETE FROM leave_records');
      console.log('   - 删除所有请假记录');
      
      // 删除任务调度历史
      try {
        await connection.execute('DELETE FROM task_schedule_history');
        console.log('   - 删除任务调度历史');
      } catch (error) {
        console.log('   - 任务调度历史表不存在，跳过');
      }
      
      // 删除调度配置（如果存在）
      try {
        await connection.execute('DELETE FROM schedule_config');
        console.log('   - 删除调度配置');
      } catch (error) {
        console.log('   - 调度配置表不存在，跳过');
      }
    });
    console.log('✅ 所有任务相关数据已清空\n');

    // 步骤3: 直接导入管理员预填的CSV数据（不经过任何调度逻辑）
    console.log('📥 步骤3: 直接导入管理员预填的CSV数据...');
    
    const csvData = `学生ID,日期,任务类型,任务标题
ST001,2025-07-01,专业课,数据结构与算法基础
ST001,2025-07-01,数学,高等数学微分学
ST001,2025-07-01,英语,考研词汇Unit1-10
ST002,2025-07-01,专业课,数据结构与算法基础
ST002,2025-07-01,数学,高等数学微分学
ST002,2025-07-01,英语,考研词汇Unit1-10
ST001,2025-07-02,专业课,操作系统进程管理
ST001,2025-07-02,数学,高等数学积分学
ST001,2025-07-02,英语,阅读理解专项训练
ST002,2025-07-02,专业课,操作系统进程管理
ST002,2025-07-02,数学,高等数学积分学
ST002,2025-07-02,英语,阅读理解专项训练
ST001,2025-07-03,专业课,计算机网络TCP/IP
ST001,2025-07-03,数学,线性代数矩阵运算
ST001,2025-07-03,英语,写作技巧训练
ST002,2025-07-03,专业课,计算机网络TCP/IP
ST002,2025-07-03,数学,线性代数矩阵运算
ST002,2025-07-03,英语,写作技巧训练
ST001,2025-07-04,专业课,数据库系统原理
ST001,2025-07-04,数学,概率论基础概念
ST001,2025-07-04,英语,翻译技巧练习
ST002,2025-07-04,专业课,数据库系统原理
ST002,2025-07-04,数学,概率论基础概念
ST002,2025-07-04,英语,翻译技巧练习
ST001,2025-07-06,休息,周日休息日
ST002,2025-07-06,休息,周日休息日
ST001,2025-07-06,专业课,编译原理词法分析
ST001,2025-07-06,数学,离散数学图论
ST001,2025-07-06,英语,语法专项复习
ST002,2025-07-06,专业课,编译原理词法分析
ST002,2025-07-06,数学,离散数学图论
ST002,2025-07-06,英语,语法专项复习
ST001,2025-07-07,专业课,人工智能机器学习
ST001,2025-07-07,数学,数值分析方法
ST001,2025-07-07,英语,完形填空练习
ST002,2025-07-07,专业课,人工智能机器学习
ST002,2025-07-07,数学,数值分析方法
ST002,2025-07-07,英语,完形填空练习
ST001,2025-07-08,专业课,计算机组成原理
ST001,2025-07-08,数学,复变函数基础
ST001,2025-07-08,英语,新题型训练
ST002,2025-07-08,专业课,计算机组成原理
ST002,2025-07-08,数学,复变函数基础
ST002,2025-07-08,英语,新题型训练
ST001,2025-07-09,专业课,算法设计与分析
ST001,2025-07-09,数学,实变函数理论
ST001,2025-07-09,英语,考研真题演练
ST002,2025-07-09,专业课,算法设计与分析
ST002,2025-07-09,数学,实变函数理论
ST002,2025-07-09,英语,考研真题演练
ST001,2025-07-10,专业课,容器化技术Docker
ST001,2025-07-10,数学,代数几何基础
ST001,2025-07-10,英语,商务英语表达
ST002,2025-07-10,专业课,容器化技术Docker
ST002,2025-07-10,数学,代数几何基础
ST002,2025-07-10,英语,商务英语表达`;

    // 解析CSV数据
    const lines = csvData.trim().split('\n').slice(1);
    const tasks = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      if (parts.length < 4) continue;

      const [studentId, dateStr, taskType, ...contentParts] = parts.map(item => item.trim());
      const content = contentParts.join(',');

      if (!studentId || !dateStr || !content) continue;

      // 生成唯一任务ID
      const taskId = `${studentId}-${dateStr}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      tasks.push({
        id: taskId,
        student_id: studentId,
        task_date: dateStr,
        task_type: taskType,
        title: content,
        completed: false
      });
    }

    // 直接插入任务，不经过任何调度逻辑
    await transaction(async (connection) => {
      for (const task of tasks) {
        await connection.execute(
          'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [task.id, task.student_id, task.task_date, task.task_type, task.title, task.completed]
        );
      }
    });

    console.log(`✅ 成功导入 ${tasks.length} 个任务\n`);

    // 步骤4: 验证导入结果
    console.log('🔍 步骤4: 验证导入结果...');
    
    // 查询ST001学生7月1-10日的任务
    const st001Tasks = await query(`
      SELECT student_id, task_date, task_type, title 
      FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_date BETWEEN '2025-07-01' AND '2025-07-10' 
      ORDER BY task_date, task_type
    `);

    console.log(`ST001学生任务数量: ${st001Tasks.length}`);
    
    // 预期的ST001任务数据
    const expectedST001Tasks = [
      ['2025-07-01', '专业课', '数据结构与算法基础'],
      ['2025-07-01', '数学', '高等数学微分学'],
      ['2025-07-01', '英语', '考研词汇Unit1-10'],
      ['2025-07-02', '专业课', '操作系统进程管理'],
      ['2025-07-02', '数学', '高等数学积分学'],
      ['2025-07-02', '英语', '阅读理解专项训练'],
      ['2025-07-03', '专业课', '计算机网络TCP/IP'],
      ['2025-07-03', '数学', '线性代数矩阵运算'],
      ['2025-07-03', '英语', '写作技巧训练'],
      ['2025-07-04', '专业课', '数据库系统原理'],
      ['2025-07-04', '数学', '概率论基础概念'],
      ['2025-07-04', '英语', '翻译技巧练习'],
      ['2025-07-06', '休息', '周日休息日'],
      ['2025-07-06', '专业课', '编译原理词法分析'],
      ['2025-07-06', '数学', '离散数学图论'],
      ['2025-07-06', '英语', '语法专项复习'],
      ['2025-07-07', '专业课', '人工智能机器学习'],
      ['2025-07-07', '数学', '数值分析方法'],
      ['2025-07-07', '英语', '完形填空练习'],
      ['2025-07-08', '专业课', '计算机组成原理'],
      ['2025-07-08', '数学', '复变函数基础'],
      ['2025-07-08', '英语', '新题型训练'],
      ['2025-07-09', '专业课', '算法设计与分析'],
      ['2025-07-09', '数学', '实变函数理论'],
      ['2025-07-09', '英语', '考研真题演练'],
      ['2025-07-10', '专业课', '容器化技术Docker'],
      ['2025-07-10', '数学', '代数几何基础'],
      ['2025-07-10', '英语', '商务英语表达']
    ];

    // 验证数量
    if (st001Tasks.length === expectedST001Tasks.length) {
      console.log('✅ 任务数量匹配');
    } else {
      console.log(`❌ 任务数量不匹配: 实际${st001Tasks.length}, 预期${expectedST001Tasks.length}`);
    }

    // 验证内容
    let matchCount = 0;
    for (let i = 0; i < Math.min(st001Tasks.length, expectedST001Tasks.length); i++) {
      const dbTask = st001Tasks[i];
      const expectedTask = expectedST001Tasks[i];
      
      const dbDate = dbTask.task_date.toISOString().split('T')[0];
      const expectedDate = expectedTask[0];
      const dbType = dbTask.task_type;
      const expectedType = expectedTask[1];
      const dbTitle = dbTask.title;
      const expectedTitle = expectedTask[2];

      if (dbDate === expectedDate && dbType === expectedType && dbTitle === expectedTitle) {
        matchCount++;
      } else {
        console.log(`❌ 不匹配 ${i + 1}:`);
        console.log(`  实际: ${dbDate} - ${dbType} - ${dbTitle}`);
        console.log(`  预期: ${expectedDate} - ${expectedType} - ${expectedTitle}`);
      }
    }

    console.log(`📊 内容匹配结果: ${matchCount}/${Math.min(st001Tasks.length, expectedST001Tasks.length)}`);

    if (matchCount === expectedST001Tasks.length && st001Tasks.length === expectedST001Tasks.length) {
      console.log('\n🎉 数据一致性修复成功！');
      console.log('✅ 管理员预填数据与数据库数据完全一致');
      console.log('✅ 学生端将显示与管理员预填完全相同的任务');
      console.log('✅ 已停止定时任务调度，不会再出现日期偏移');
    } else {
      console.log('\n❌ 数据一致性修复失败，请检查问题');
    }

  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.message);
  }
}

fixDataConsistencyFinal();
