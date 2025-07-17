#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// 测试配置
const testCases = [
  {
    name: '学生ST001登录',
    endpoint: '/auth/login',
    data: { studentId: 'ST001', password: 'Hello888' },
    expectedSuccess: true
  },
  {
    name: '学生ST002登录',
    endpoint: '/auth/login',
    data: { studentId: 'ST002', password: 'Hello888' },
    expectedSuccess: true
  },
  {
    name: '管理员ADMIN001登录',
    endpoint: '/auth/admin/login',
    data: { studentId: 'ADMIN001', password: 'Hello888' },
    expectedSuccess: true
  },
  {
    name: '管理员ADMIN002登录',
    endpoint: '/auth/admin/login',
    data: { studentId: 'ADMIN002', password: 'Hello888' },
    expectedSuccess: true
  },
  {
    name: '错误密码测试',
    endpoint: '/auth/login',
    data: { studentId: 'ST001', password: 'WrongPassword' },
    expectedSuccess: false
  },
  {
    name: '不存在的用户',
    endpoint: '/auth/login',
    data: { studentId: 'ST999', password: 'Hello888' },
    expectedSuccess: false
  }
];

async function testLogin(testCase) {
  try {
    console.log(`\n🧪 测试: ${testCase.name}`);
    console.log(`📍 端点: ${testCase.endpoint}`);
    console.log(`📝 数据: ${JSON.stringify(testCase.data)}`);
    
    const response = await axios.post(`${BASE_URL}${testCase.endpoint}`, testCase.data);
    
    if (testCase.expectedSuccess) {
      if (response.data.success) {
        console.log(`✅ 测试通过 - 登录成功`);
        console.log(`👤 用户信息: ${JSON.stringify(response.data.data.student || response.data.data.admin)}`);
        return true;
      } else {
        console.log(`❌ 测试失败 - 期望成功但实际失败: ${response.data.message}`);
        return false;
      }
    } else {
      console.log(`❌ 测试失败 - 期望失败但实际成功`);
      return false;
    }
  } catch (error) {
    if (!testCase.expectedSuccess) {
      console.log(`✅ 测试通过 - 期望失败且实际失败: ${error.response?.data?.message || error.message}`);
      return true;
    } else {
      console.log(`❌ 测试失败 - 期望成功但实际失败: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }
}

async function runAllTests() {
  console.log('🚀 开始登录功能测试...\n');
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const testCase of testCases) {
    const result = await testLogin(testCase);
    if (result) {
      passedTests++;
    }
    
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 测试结果汇总:');
  console.log(`✅ 通过: ${passedTests}/${totalTests}`);
  console.log(`❌ 失败: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！登录功能正常工作。');
    process.exit(0);
  } else {
    console.log('\n⚠️ 部分测试失败，请检查问题。');
    process.exit(1);
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    if (response.data.success) {
      console.log('✅ 后端服务运行正常');
      return true;
    }
  } catch (error) {
    console.log('❌ 后端服务未运行或无法访问');
    console.log('请确保后端服务在 http://localhost:3001 运行');
    return false;
  }
}

async function main() {
  console.log('🔍 检查服务器状态...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    process.exit(1);
  }
  
  await runAllTests();
}

main().catch(error => {
  console.error('❌ 测试执行失败:', error.message);
  process.exit(1);
});
