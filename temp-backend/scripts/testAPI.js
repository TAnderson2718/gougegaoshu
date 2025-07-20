const axios = require('axios');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;

// 测试配置
const testConfig = {
  studentId: 'ST001',
  password: 'Hello888',
  newPassword: 'NewPassword123'
};

let authToken = '';

// 工具函数：发送请求
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

// 测试健康检查
async function testHealth() {
  console.log('🔍 测试健康检查...');
  const result = await makeRequest('GET', '/health');
  
  if (result.success) {
    console.log('✅ 健康检查通过');
    console.log(`   数据库状态: ${result.data.database}`);
  } else {
    console.log('❌ 健康检查失败:', result.error);
  }
  
  return result.success;
}

// 测试数据库状态
async function testDatabaseStatus() {
  console.log('🔍 测试数据库状态...');
  const result = await makeRequest('GET', '/api/db-status');
  
  if (result.success) {
    console.log('✅ 数据库状态检查通过');
    console.log(`   数据库名: ${result.data.database.name}`);
    console.log(`   表数量: ${result.data.database.tables.length}`);
    console.log(`   学生数量: ${result.data.database.studentCount}`);
    console.log(`   表列表: ${result.data.database.tables.join(', ')}`);
  } else {
    console.log('❌ 数据库状态检查失败:', result.error);
  }
  
  return result.success;
}

// 测试用户登录
async function testLogin() {
  console.log('🔍 测试用户登录...');
  const result = await makeRequest('POST', '/api/auth/login', {
    studentId: testConfig.studentId,
    password: testConfig.password
  });
  
  if (result.success) {
    console.log('✅ 登录成功');
    authToken = result.data.data.token;
    console.log(`   学生姓名: ${result.data.data.student.name}`);
    console.log(`   需要修改密码: ${result.data.data.student.forcePasswordChange}`);
  } else {
    console.log('❌ 登录失败:', result.error);
  }
  
  return result.success;
}

// 测试强制修改密码
async function testForceChangePassword() {
  console.log('🔍 测试强制修改密码...');
  const result = await makeRequest('POST', '/api/auth/force-change-password', {
    newPassword: testConfig.newPassword
  }, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    console.log('✅ 强制修改密码成功');
  } else {
    console.log('❌ 强制修改密码失败:', result.error);
  }
  
  return result.success;
}

// 测试获取任务
async function testGetTasks() {
  console.log('🔍 测试获取任务...');
  const result = await makeRequest('GET', '/api/tasks', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    console.log('✅ 获取任务成功');
    const taskCount = Object.keys(result.data.data).length;
    console.log(`   任务日期数量: ${taskCount}`);
  } else {
    console.log('❌ 获取任务失败:', result.error);
  }
  
  return result.success;
}

// 测试获取档案
async function testGetProfile() {
  console.log('🔍 测试获取档案...');
  const result = await makeRequest('GET', '/api/profiles', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    console.log('✅ 获取档案成功');
    console.log(`   档案已提交: ${result.data.data.isProfileSubmitted}`);
  } else {
    console.log('❌ 获取档案失败:', result.error);
  }
  
  return result.success;
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始API功能测试...');
  console.log('================================');
  
  const tests = [
    { name: '健康检查', fn: testHealth },
    { name: '数据库状态', fn: testDatabaseStatus },
    { name: '用户登录', fn: testLogin },
    { name: '强制修改密码', fn: testForceChangePassword },
    { name: '获取任务', fn: testGetTasks },
    { name: '获取档案', fn: testGetProfile }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${test.name} 测试异常:`, error.message);
      console.log('');
    }
  }
  
  console.log('================================');
  console.log(`📊 测试结果: ${passedTests}/${tests.length} 通过`);
  
  if (passedTests === tests.length) {
    console.log('🎉 所有测试通过！API功能正常');
  } else {
    console.log('⚠️ 部分测试失败，请检查相关功能');
  }
  
  return passedTests === tests.length;
}

// 如果直接运行此脚本
if (require.main === module) {
  // 等待服务器启动
  setTimeout(() => {
    runTests()
      .then((success) => {
        process.exit(success ? 0 : 1);
      })
      .catch((error) => {
        console.error('❌ 测试执行失败:', error);
        process.exit(1);
      });
  }, 2000);
}

module.exports = {
  runTests,
  testHealth,
  testDatabaseStatus,
  testLogin
};
