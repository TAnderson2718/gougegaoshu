const axios = require('axios');

async function checkStudentAPI() {
  try {
    console.log('🔍 检查学生端API返回的任务数据\n');

    // 先进行学生登录获取token
    console.log('🔐 学生登录...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      studentId: 'ST001',
      password: 'Hello888'
    });

    if (!loginResponse.data.success) {
      console.error('❌ 学生登录失败:', loginResponse.data.message);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ 学生登录成功');

    // 获取7月1-10日的任务数据
    console.log('\n📊 获取学生端7月1-10日任务数据...');
    const tasksResponse = await axios.get('http://localhost:3001/api/tasks', {
      params: {
        startDate: '2025-07-01',
        endDate: '2025-07-10'
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!tasksResponse.data.success) {
      console.error('❌ 获取任务失败:', tasksResponse.data.message);
      return;
    }

    const tasksData = tasksResponse.data.data;
    console.log('✅ 任务数据获取成功');

    // 分析任务数据
    console.log('\n📋 学生端API返回的任务数据分析:');
    
    let totalTasks = 0;
    const dateTaskCounts = {};
    const allTasks = [];

    // 遍历每个日期的任务
    for (const [date, tasks] of Object.entries(tasksData)) {
      if (Array.isArray(tasks)) {
        dateTaskCounts[date] = tasks.length;
        totalTasks += tasks.length;
        
        // 收集所有任务详情
        tasks.forEach(task => {
          allTasks.push({
            date: date,
            type: task.type,
            title: task.title,
            completed: task.completed
          });
        });
      }
    }

    console.log(`总任务数: ${totalTasks}`);
    console.log('\n各日期任务数量:');
    Object.entries(dateTaskCounts).forEach(([date, count]) => {
      console.log(`  ${date}: ${count} 个任务`);
    });

    console.log('\n详细任务列表:');
    allTasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.date} - ${task.type} - ${task.title} ${task.completed ? '✅' : '⭕'}`);
    });

    // 对比管理员预填数据
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

    console.log('\n🔍 学生端API与管理员预填数据对比:');
    console.log(`学生端API任务数: ${totalTasks}`);
    console.log(`管理员预填任务数: ${csvPrefilledData.length}`);

    if (totalTasks === csvPrefilledData.length) {
      console.log('✅ 任务数量一致');
    } else {
      console.log('❌ 任务数量不一致');
    }

    // 检查具体匹配情况
    let matchCount = 0;
    const sortedApiTasks = allTasks.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.type.localeCompare(b.type);
    });

    console.log('\n内容匹配检查:');
    for (let i = 0; i < Math.min(sortedApiTasks.length, csvPrefilledData.length); i++) {
      const apiTask = sortedApiTasks[i];
      const csvTask = csvPrefilledData[i];
      
      if (apiTask.date === csvTask[1] && apiTask.type === csvTask[2] && apiTask.title === csvTask[3]) {
        matchCount++;
      } else {
        console.log(`不匹配 ${i + 1}:`);
        console.log(`  API: ${apiTask.date} - ${apiTask.type} - ${apiTask.title}`);
        console.log(`  CSV: ${csvTask[1]} - ${csvTask[2]} - ${csvTask[3]}`);
      }
    }

    console.log(`\n📊 匹配结果: ${matchCount}/${Math.min(sortedApiTasks.length, csvPrefilledData.length)} 个任务匹配`);

  } catch (error) {
    console.error('❌ 检查过程中出现错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

checkStudentAPI();
