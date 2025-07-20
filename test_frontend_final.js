const fetch = require('node-fetch');

async function testFrontendAPI() {
  try {
    console.log('🧪 测试前端API完整流程...');
    
    // 1. 测试学生登录
    console.log('\n1. 测试学生登录...');
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'ST001', password: 'Hello888' })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      throw new Error('学生登录失败: ' + loginData.message);
    }
    
    const token = loginData.data.token;
    console.log('✅ 学生登录成功');
    
    // 2. 测试获取今日任务 (2025-07-20)
    console.log('\n2. 测试获取今日任务 (2025-07-20)...');
    const tasksResponse = await fetch('http://localhost:3001/api/tasks?startDate=2025-07-20&endDate=2025-07-20', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const tasksData = await tasksResponse.json();
    if (!tasksData.success) {
      throw new Error('获取任务失败: ' + tasksData.message);
    }
    
    const todayTasks = tasksData.data['2025-07-20'];
    if (!todayTasks || todayTasks.length === 0) {
      throw new Error('今日任务为空');
    }
    
    console.log('✅ 今日任务获取成功:');
    todayTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.type} - ${task.title}`);
    });
    
    // 3. 测试完成任务
    console.log('\n3. 测试完成任务...');
    const firstTask = todayTasks[0];
    const completeResponse = await fetch(`http://localhost:3001/api/tasks/${firstTask.id}/complete`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        duration: 30,
        proof: '已完成测试任务'
      })
    });
    
    const completeData = await completeResponse.json();
    if (!completeData.success) {
      throw new Error('完成任务失败: ' + completeData.message);
    }
    
    console.log('✅ 任务完成成功');
    
    // 4. 测试管理员登录
    console.log('\n4. 测试管理员登录...');
    const adminLoginResponse = await fetch('http://localhost:3001/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'ADMIN', password: 'AdminPass123' })
    });
    
    const adminLoginData = await adminLoginResponse.json();
    if (!adminLoginData.success) {
      throw new Error('管理员登录失败: ' + adminLoginData.message);
    }
    
    console.log('✅ 管理员登录成功');
    
    // 5. 测试获取学生列表
    console.log('\n5. 测试获取学生列表...');
    const adminToken = adminLoginData.data.token;
    const studentsResponse = await fetch('http://localhost:3001/api/admin/students', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const studentsData = await studentsResponse.json();
    if (!studentsData.success) {
      throw new Error('获取学生列表失败: ' + studentsData.message);
    }
    
    console.log('✅ 学生列表获取成功:', studentsData.data.length, '个学生');
    
    console.log('\n🎉 所有测试通过！前端应该能正常工作了。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testFrontendAPI();
