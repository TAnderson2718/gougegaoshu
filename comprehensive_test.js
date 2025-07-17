#!/usr/bin/env node

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP请求封装
function makeRequest(options, postData = null) {
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout'
      });
    });

    req.setTimeout(5000);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 检查端口状态
function checkPortStatus() {
  return new Promise((resolve) => {
    exec('lsof -i :3000 && echo "---" && lsof -i :3001', (error, stdout, stderr) => {
      resolve(stdout);
    });
  });
}

// 测试后端健康检查
async function testBackendHealth() {
  log('📡 测试后端健康检查 (http://localhost:3001/health)...', 'blue');
  
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET'
  });

  if (result.success && result.status === 200) {
    try {
      const healthData = JSON.parse(result.data);
      log('✅ 后端健康检查通过', 'green');
      log(`📄 响应: ${JSON.stringify(healthData, null, 2)}`, 'cyan');
      return { success: true, data: healthData };
    } catch (e) {
      log('⚠️  后端响应格式异常', 'yellow');
      log(`📄 原始响应: ${result.data}`, 'cyan');
      return { success: false, error: 'Invalid JSON response' };
    }
  } else {
    log('❌ 后端健康检查失败', 'red');
    log(`📄 错误: ${result.error || `HTTP ${result.status}`}`, 'red');
    return { success: false, error: result.error };
  }
}

// 测试前端页面
async function testFrontendPage() {
  log('🌐 测试前端页面 (http://localhost:3000)...', 'blue');
  
  const result = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  });

  if (result.success && result.status === 200) {
    const isHtml = result.data.includes('<!DOCTYPE html>') || result.data.includes('<html');
    const hasReact = result.data.includes('react') || result.data.includes('React');
    
    log('✅ 前端页面响应正常', 'green');
    log(`📄 内容类型: ${isHtml ? 'HTML页面' : '非HTML内容'}`, 'cyan');
    log(`📄 React应用: ${hasReact ? '检测到React' : '未检测到React'}`, 'cyan');
    log(`📄 内容长度: ${result.data.length} 字符`, 'cyan');
    
    return { 
      success: true, 
      isHtml, 
      hasReact, 
      contentLength: result.data.length,
      preview: result.data.substring(0, 200) + '...'
    };
  } else {
    log('❌ 前端页面无响应', 'red');
    log(`📄 错误: ${result.error || `HTTP ${result.status}`}`, 'red');
    return { success: false, error: result.error };
  }
}

// 测试学生登录API
async function testStudentLogin() {
  log('🔐 测试学生登录API...', 'blue');
  
  const postData = JSON.stringify({
    studentId: 'ST001',
    password: 'Hello888'
  });

  const result = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  if (result.success && result.status === 200) {
    try {
      const loginData = JSON.parse(result.data);
      if (loginData.success) {
        log('✅ 学生登录API正常', 'green');
        log(`📄 学生信息: ${loginData.data.student.name} (${loginData.data.student.id})`, 'cyan');
        return { success: true, data: loginData };
      } else {
        log('❌ 学生登录失败', 'red');
        log(`📄 错误信息: ${loginData.message}`, 'red');
        return { success: false, error: loginData.message };
      }
    } catch (e) {
      log('⚠️  登录响应格式异常', 'yellow');
      return { success: false, error: 'Invalid JSON response' };
    }
  } else {
    log('❌ 学生登录API请求失败', 'red');
    log(`📄 错误: ${result.error || `HTTP ${result.status}`}`, 'red');
    return { success: false, error: result.error };
  }
}

// 测试管理员登录API
async function testAdminLogin() {
  log('👨‍💼 测试管理员登录API...', 'blue');
  
  const postData = JSON.stringify({
    studentId: 'ADMIN001',
    password: 'AdminPass123'
  });

  const result = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  if (result.success && result.status === 200) {
    try {
      const loginData = JSON.parse(result.data);
      if (loginData.success) {
        log('✅ 管理员登录API正常', 'green');
        log(`📄 管理员信息: ${loginData.data.admin.name} (${loginData.data.admin.role})`, 'cyan');
        return { success: true, data: loginData };
      } else {
        log('❌ 管理员登录失败', 'red');
        log(`📄 错误信息: ${loginData.message}`, 'red');
        return { success: false, error: loginData.message };
      }
    } catch (e) {
      log('⚠️  管理员登录响应格式异常', 'yellow');
      return { success: false, error: 'Invalid JSON response' };
    }
  } else {
    log('❌ 管理员登录API请求失败', 'red');
    log(`📄 错误: ${result.error || `HTTP ${result.status}`}`, 'red');
    return { success: false, error: result.error };
  }
}

// 测试CORS配置
async function testCORS() {
  log('🌍 测试CORS配置...', 'blue');
  
  const postData = JSON.stringify({
    studentId: 'ST001',
    password: 'Hello888'
  });

  const result = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  if (result.success) {
    const corsHeaders = {
      'access-control-allow-origin': result.headers['access-control-allow-origin'],
      'access-control-allow-credentials': result.headers['access-control-allow-credentials']
    };
    
    log('✅ CORS配置正常', 'green');
    log(`📄 允许的源: ${corsHeaders['access-control-allow-origin']}`, 'cyan');
    log(`📄 允许凭据: ${corsHeaders['access-control-allow-credentials']}`, 'cyan');
    return { success: true, corsHeaders };
  } else {
    log('❌ CORS测试失败', 'red');
    return { success: false, error: result.error };
  }
}

// 主测试函数
async function runComprehensiveTest() {
  log('🚀 开始综合服务测试...', 'blue');
  log('='.repeat(60), 'blue');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // 1. 检查端口状态
  log('\n📊 检查端口状态...', 'yellow');
  const portStatus = await checkPortStatus();
  log(portStatus || '无端口信息', 'cyan');

  // 2. 测试后端健康检查
  log('\n' + '='.repeat(60), 'blue');
  testResults.tests.backendHealth = await testBackendHealth();

  // 3. 测试前端页面
  log('\n' + '='.repeat(60), 'blue');
  testResults.tests.frontendPage = await testFrontendPage();

  // 4. 测试学生登录API
  log('\n' + '='.repeat(60), 'blue');
  testResults.tests.studentLogin = await testStudentLogin();

  // 5. 测试管理员登录API
  log('\n' + '='.repeat(60), 'blue');
  testResults.tests.adminLogin = await testAdminLogin();

  // 6. 测试CORS配置
  log('\n' + '='.repeat(60), 'blue');
  testResults.tests.cors = await testCORS();

  // 生成测试报告
  log('\n' + '='.repeat(60), 'blue');
  log('📋 测试结果总结:', 'blue');
  log('='.repeat(60), 'blue');

  const results = [
    { name: '后端健康检查', result: testResults.tests.backendHealth.success },
    { name: '前端页面', result: testResults.tests.frontendPage.success },
    { name: '学生登录API', result: testResults.tests.studentLogin.success },
    { name: '管理员登录API', result: testResults.tests.adminLogin.success },
    { name: 'CORS配置', result: testResults.tests.cors.success }
  ];

  results.forEach(test => {
    const status = test.result ? '✅ 通过' : '❌ 失败';
    const color = test.result ? 'green' : 'red';
    log(`${test.name}: ${status}`, color);
  });

  const passedTests = results.filter(test => test.result).length;
  const totalTests = results.length;

  log('\n' + '='.repeat(60), 'blue');
  log(`🎯 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`, 
      passedTests === totalTests ? 'green' : 'yellow');

  if (passedTests === totalTests) {
    log('\n🎉 所有测试都通过！服务运行正常！', 'green');
    log('📱 您可以在浏览器中访问:', 'blue');
    log('   前端应用: http://localhost:3000', 'cyan');
    log('   后端API: http://localhost:3001', 'cyan');
    log('\n🔐 测试账号:', 'blue');
    log('   学生: ST001 / Hello888', 'cyan');
    log('   管理员: ADMIN001 / AdminPass123', 'cyan');
  } else {
    log('\n⚠️  部分测试失败，请检查服务状态', 'yellow');
  }

  // 保存详细报告
  fs.writeFileSync('test_report.json', JSON.stringify(testResults, null, 2));
  log('\n📄 详细测试报告已保存到: test_report.json', 'blue');

  return testResults;
}

// 运行测试
runComprehensiveTest().catch(console.error);
