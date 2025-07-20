const fetch = require('node-fetch');

async function testTasksAPI() {
  try {
    console.log('🧪 测试任务API...');
    
    // 首先登录获取token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: 'ST001',
        password: 'Hello888'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok || !loginData.success) {
      console.error('❌ 登录失败:', loginData.message);
      return;
    }
    
    console.log('✅ ST001登录成功');
    const token = loginData.data.token;
    
    // 测试获取任务 - 使用前端显示的日期
    const today = '2025-07-29';
    const tomorrow = '2025-07-30';
    
    console.log(`📅 测试日期范围: ${today} 到 ${tomorrow}`);
    
    const tasksResponse = await fetch(`http://localhost:3001/api/tasks?startDate=${today}&endDate=${tomorrow}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const tasksData = await tasksResponse.json();
    
    console.log('📊 任务API响应状态:', tasksResponse.status);
    console.log('📋 任务API响应数据:', JSON.stringify(tasksData, null, 2));
    
    if (tasksResponse.ok && tasksData.success) {
      console.log('✅ 任务API测试成功！');
      
      const tasksByDate = tasksData.data;
      Object.keys(tasksByDate).forEach(date => {
        console.log(`📅 ${date}: ${tasksByDate[date].length} 个任务`);
        tasksByDate[date].forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.type} - ${task.title}`);
        });
      });
    } else {
      console.log('❌ 任务API测试失败');
      console.log('错误信息:', tasksData.message);
    }
    
    // 测试月度视图
    console.log('\n🧪 测试月度视图...');
    const monthResponse = await fetch(`http://localhost:3001/api/tasks?startDate=${today}&endDate=${tomorrow}&view=month`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const monthData = await monthResponse.json();
    
    if (monthResponse.ok && monthData.success) {
      console.log('✅ 月度视图API测试成功！');
      console.log('📊 月度数据键数量:', Object.keys(monthData.data).length);
    } else {
      console.log('❌ 月度视图API测试失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testTasksAPI();
