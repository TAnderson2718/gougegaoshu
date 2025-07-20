const fetch = require('node-fetch');

async function testFrontendDateFix() {
  try {
    console.log('🧪 测试前端日期修复...');
    
    // 登录获取token
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
    
    // 测试前端显示的日期 2025-07-29
    const testDate = '2025-07-29';
    console.log(`📅 测试前端显示日期: ${testDate}`);
    
    const tasksResponse = await fetch(`http://localhost:3001/api/tasks?startDate=${testDate}&endDate=${testDate}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const tasksData = await tasksResponse.json();
    
    console.log('📊 API响应状态:', tasksResponse.status);
    
    if (tasksResponse.ok && tasksData.success) {
      console.log('✅ 任务API测试成功！');
      
      const todayTasks = tasksData.data[testDate] || [];
      console.log(`📋 ${testDate} 任务数量: ${todayTasks.length}`);
      
      if (todayTasks.length > 0) {
        console.log('📝 今日任务详情:');
        todayTasks.forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.type} - ${task.title} (${task.completed ? '已完成' : '未完成'})`);
        });
        
        console.log('\n🎉 前端应该能正常显示任务了！');
        console.log('💡 建议操作:');
        console.log('   1. 刷新浏览器页面 (Ctrl+F5 或 Cmd+Shift+R)');
        console.log('   2. 或者点击页面上的"🔄 刷新"按钮');
        console.log('   3. 如果还是不行，请清除浏览器缓存');
      } else {
        console.log('⚠️ 该日期没有任务数据');
      }
    } else {
      console.log('❌ 任务API测试失败');
      console.log('错误信息:', tasksData.message);
    }
    
    // 额外测试：检查数据库中的任务总数
    console.log('\n📊 数据库任务统计:');
    const { query } = require('./config/database');
    
    const allTasks = await query('SELECT student_id, COUNT(*) as count FROM tasks GROUP BY student_id');
    allTasks.forEach(row => {
      console.log(`   ${row.student_id}: ${row.count} 个任务`);
    });
    
    const todayTasksDB = await query('SELECT * FROM tasks WHERE student_id = ? AND task_date = ?', ['ST001', testDate]);
    console.log(`   ST001在${testDate}的任务: ${todayTasksDB.length} 个`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testFrontendDateFix();
