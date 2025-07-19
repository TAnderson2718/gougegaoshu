#!/usr/bin/env node

const axios = require('axios');

async function testTaskReport() {
  try {
    console.log('🔍 测试任务报告功能...');
    
    // 1. 管理员登录
    console.log('1. 管理员登录...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/admin/login', {
      studentId: 'ADMIN001',
      password: 'AdminPass123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('管理员登录失败: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ 管理员登录成功');
    
    // 2. 测试任务报告API
    console.log('2. 获取任务报告...');
    const today = new Date().toISOString().split('T')[0];
    
    const reportResponse = await axios.get(`http://localhost:3001/api/admin/reports/tasks?date=${today}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!reportResponse.data.success) {
      throw new Error('获取任务报告失败: ' + reportResponse.data.message);
    }
    
    const reportData = reportResponse.data.data;
    console.log('✅ 任务报告获取成功');
    console.log('📊 报告数据:', {
      totalTasks: reportData.totalTasks,
      completedTasks: reportData.completedTasks,
      completionRate: reportData.completionRate,
      activeStudents: reportData.activeStudents,
      studentStatsCount: reportData.studentStats ? reportData.studentStats.length : 0,
      tasksCount: reportData.tasks ? reportData.tasks.length : 0
    });
    
    // 3. 测试其他日期
    console.log('3. 测试其他日期...');
    const testDate = '2025-07-15'; // 测试一个可能有数据的日期
    
    const reportResponse2 = await axios.get(`http://localhost:3001/api/admin/reports/tasks?date=${testDate}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (reportResponse2.data.success) {
      const reportData2 = reportResponse2.data.data;
      console.log(`📊 ${testDate} 报告数据:`, {
        totalTasks: reportData2.totalTasks,
        completedTasks: reportData2.completedTasks,
        completionRate: reportData2.completionRate,
        activeStudents: reportData2.activeStudents
      });
      
      if (reportData2.studentStats && reportData2.studentStats.length > 0) {
        console.log('👥 学生统计:');
        reportData2.studentStats.forEach(student => {
          console.log(`  ${student.studentName}: ${student.completedTasks}/${student.totalTasks} (${student.completionRate}%)`);
        });
      }
    }
    
    console.log('✅ 任务报告功能测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testTaskReport();
