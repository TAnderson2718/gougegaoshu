const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

async function testTaskDisplay() {
  try {
    console.log('🔐 正在以学生身份登录...');

    // 1. 学生登录获取任务列表
    const studentLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      studentId: 'ST001',
      password: 'Hello888'
    });

    const studentToken = studentLoginResponse.data.data.token;
    console.log('✅ 学生登录成功');

    // 2. 先查看现有任务
    console.log('📋 获取现有任务列表...');
    const existingTasksResponse = await axios.get(`${API_BASE}/tasks?startDate=2025-07-01&endDate=2025-07-31`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });

    console.log('📊 现有任务数量:', existingTasksResponse.data.data?.length || 0);

    // 3. 手动添加一个测试任务到数据库（通过直接SQL）
    console.log('📝 准备添加测试任务...');

    // 我们先看看现有任务的结构
    if (existingTasksResponse.data.data && existingTasksResponse.data.data.length > 0) {
      console.log('📋 现有任务示例:', JSON.stringify(existingTasksResponse.data.data[0], null, 2));
    }

    // 4. 创建一个模拟的长任务内容来测试显示效果
    console.log('\n🎯 模拟任务显示效果测试：');
    const testTaskContent = '优先完成勾选题《1000》第3章多维随机变量及其分布 P59-60:8-14';

    console.log('📝 测试任务内容:', testTaskContent);
    console.log('📏 内容长度:', testTaskContent.length, '字符');

    // 5. 获取今天的任务列表
    console.log('\n📋 获取今天的任务列表...');
    const tasksResponse = await axios.get(`${API_BASE}/tasks?startDate=2025-07-19&endDate=2025-07-19`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });
    
    console.log('✅ 任务列表获取成功');
    console.log('\n📊 任务显示效果：');
    console.log('='.repeat(60));
    
    const tasks = tasksResponse.data.data;
    if (tasks && tasks.length > 0) {
      tasks.forEach((task, index) => {
        console.log(`\n任务 ${index + 1}:`);
        console.log(`📅 日期: ${task.task_date}`);
        console.log(`📚 科目: ${task.subject || '未指定'}`);
        console.log(`📝 内容: ${task.content || task.title}`);
        console.log(`🏷️  类型: ${task.task_type || task.type}`);
        console.log(`⭐ 优先级: ${task.priority || '普通'}`);
        console.log(`✅ 状态: ${task.status || task.task_status}`);
        console.log(`🔄 完成: ${task.completed ? '是' : '否'}`);
        console.log('-'.repeat(40));
      });
    } else {
      console.log('❌ 没有找到任务');
    }
    
    console.log('\n🎯 任务内容分析：');
    const testTask = tasks.find(t => t.content && t.content.includes('优先完成勾选题'));
    if (testTask) {
      console.log('✅ 找到测试任务');
      console.log('📝 完整内容:', testTask.content);
      console.log('📏 内容长度:', testTask.content.length, '字符');
      
      // 分析内容结构
      const content = testTask.content;
      console.log('\n📋 内容结构分析:');
      console.log('- 包含"优先完成":', content.includes('优先完成') ? '✅' : '❌');
      console.log('- 包含"勾选题":', content.includes('勾选题') ? '✅' : '❌');
      console.log('- 包含书籍信息:', content.includes('《1000》') ? '✅' : '❌');
      console.log('- 包含章节信息:', content.includes('第3章') ? '✅' : '❌');
      console.log('- 包含页码信息:', content.includes('P59-60') ? '✅' : '❌');
      console.log('- 包含题目范围:', content.includes('8-14') ? '✅' : '❌');
    } else {
      console.log('❌ 未找到测试任务');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testTaskDisplay();
