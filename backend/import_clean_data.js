const { query } = require('./config/database');

async function importCleanData() {
  try {
    console.log('🧹 开始导入干净的测试数据...');
    
    // 清理现有任务数据
    await query('DELETE FROM tasks WHERE student_id IN (?, ?)', ['ST001', 'ST002']);
    console.log('✅ 已清理现有任务数据');
    
    // 准备任务数据 - 7月份
    const tasks = [
      // 7月1日 - 周二 - 正常任务
      { studentId: 'ST001', date: '2025-07-01', type: '数学', title: '高等数学第一章' },
      { studentId: 'ST001', date: '2025-07-01', type: '英语', title: '英语阅读理解练习' },
      { studentId: 'ST001', date: '2025-07-01', type: '专业课', title: '计算机网络基础' },
      
      // 7月2日 - 周三 - 正常任务
      { studentId: 'ST001', date: '2025-07-02', type: '数学', title: '高等数学第二章' },
      { studentId: 'ST001', date: '2025-07-02', type: '英语', title: '英语写作练习' },
      { studentId: 'ST001', date: '2025-07-02', type: '专业课', title: '数据结构与算法' },
      
      // 7月3日 - 周四 - 正常任务
      { studentId: 'ST001', date: '2025-07-03', type: '数学', title: '高等数学第三章' },
      { studentId: 'ST001', date: '2025-07-03', type: '英语', title: '英语听力练习' },
      { studentId: 'ST001', date: '2025-07-03', type: '专业课', title: '操作系统原理' },
      
      // 7月4日 - 周五 - 正常任务
      { studentId: 'ST001', date: '2025-07-04', type: '数学', title: '高等数学第四章' },
      { studentId: 'ST001', date: '2025-07-04', type: '英语', title: '英语口语练习' },
      { studentId: 'ST001', date: '2025-07-04', type: '专业课', title: '数据库系统概论' },
      
      // 7月5日 - 周六 - 正常任务
      { studentId: 'ST001', date: '2025-07-05', type: '数学', title: '高等数学第五章' },
      { studentId: 'ST001', date: '2025-07-05', type: '英语', title: '英语语法练习' },
      { studentId: 'ST001', date: '2025-07-05', type: '专业课', title: '软件工程基础' },
      
      // 7月6日 - 周日 - 休息日
      { studentId: 'ST001', date: '2025-07-06', type: '休息', title: '休息日' },
      
      // 7月7日 - 周一 - 正常任务
      { studentId: 'ST001', date: '2025-07-07', type: '数学', title: '高等数学第六章' },
      { studentId: 'ST001', date: '2025-07-07', type: '英语', title: '英语词汇练习' },
      { studentId: 'ST001', date: '2025-07-07', type: '专业课', title: '计算机组成原理' },
      
      // 7月8日 - 周二 - 正常任务
      { studentId: 'ST001', date: '2025-07-08', type: '数学', title: '高等数学第七章' },
      { studentId: 'ST001', date: '2025-07-08', type: '英语', title: '英语翻译练习' },
      { studentId: 'ST001', date: '2025-07-08', type: '专业课', title: '编译原理基础' },
      
      // 7月9日 - 周三 - 正常任务
      { studentId: 'ST001', date: '2025-07-09', type: '数学', title: '高等数学第八章' },
      { studentId: 'ST001', date: '2025-07-09', type: '英语', title: '英语阅读理解' },
      { studentId: 'ST001', date: '2025-07-09', type: '专业课', title: '人工智能导论' },
      
      // 7月10日 - 周四 - 正常任务
      { studentId: 'ST001', date: '2025-07-10', type: '数学', title: '高等数学第九章' },
      { studentId: 'ST001', date: '2025-07-10', type: '英语', title: '英语写作练习' },
      { studentId: 'ST001', date: '2025-07-10', type: '专业课', title: '机器学习基础' },
      
      // 7月11日 - 周五 - 正常任务
      { studentId: 'ST001', date: '2025-07-11', type: '数学', title: '高等数学第十章' },
      { studentId: 'ST001', date: '2025-07-11', type: '英语', title: '英语听力练习' },
      { studentId: 'ST001', date: '2025-07-11', type: '专业课', title: '深度学习入门' },
      
      // 7月12日 - 周六 - 正常任务
      { studentId: 'ST001', date: '2025-07-12', type: '数学', title: '线性代数第一章' },
      { studentId: 'ST001', date: '2025-07-12', type: '英语', title: '英语口语练习' },
      { studentId: 'ST001', date: '2025-07-12', type: '专业课', title: '自然语言处理' },
      
      // 7月13日 - 周日 - 休息日
      { studentId: 'ST001', date: '2025-07-13', type: '休息', title: '休息日' },
      
      // 7月14日 - 周一 - 正常任务
      { studentId: 'ST001', date: '2025-07-14', type: '数学', title: '线性代数第二章' },
      { studentId: 'ST001', date: '2025-07-14', type: '英语', title: '英语语法练习' },
      { studentId: 'ST001', date: '2025-07-14', type: '专业课', title: '计算机视觉基础' },
      
      // 7月15日 - 周二 - 正常任务
      { studentId: 'ST001', date: '2025-07-15', type: '数学', title: '线性代数第三章' },
      { studentId: 'ST001', date: '2025-07-15', type: '英语', title: '英语词汇练习' },
      { studentId: 'ST001', date: '2025-07-15', type: '专业课', title: '图像处理技术' }
    ];
    
    // 插入任务数据
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskId = `TASK_${Date.now()}_${i}`;
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        [taskId, task.studentId, task.date, task.type, task.title, false]
      );
    }
    
    console.log(`✅ 成功导入 ${tasks.length} 个任务`);
    
    // 验证数据
    const result = await query(`
      SELECT 
        task_date,
        COUNT(*) as task_count,
        GROUP_CONCAT(DISTINCT task_type) as task_types
      FROM tasks 
      WHERE student_id = 'ST001' 
        AND task_date BETWEEN '2025-07-01' AND '2025-07-15'
      GROUP BY task_date
      ORDER BY task_date
    `);
    
    console.log('\n📊 导入结果验证:');
    result.forEach(row => {
      const date = new Date(row.task_date);
      const dayName = date.toLocaleDateString('zh-CN', { weekday: 'long' });
      console.log(`  ${row.task_date} (${dayName}): ${row.task_count}个任务 - ${row.task_types}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 导入失败:', error);
    process.exit(1);
  }
}

importCleanData();
