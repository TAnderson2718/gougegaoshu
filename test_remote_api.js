#!/usr/bin/env node

const https = require('https');
const http = require('http');

// 远程服务器配置
const SERVER_URL = 'http://124.221.113.102:3001';

// 测试用的管理员凭据
const ADMIN_CREDENTIALS = {
  studentId: 'ADMIN002',
  password: 'AdminPass123'
};

// HTTP请求函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// 测试函数
async function testAPI() {
  console.log('🚀 开始测试远程服务器API功能...\n');
  console.log(`📍 服务器地址: ${SERVER_URL}\n`);

  try {
    // 1. 健康检查
    console.log('1️⃣ 测试健康检查...');
    const healthResponse = await makeRequest(`${SERVER_URL}/health`);
    console.log(`   状态码: ${healthResponse.status}`);
    console.log(`   响应: ${JSON.stringify(healthResponse.data, null, 2)}`);
    console.log('');

    // 2. 管理员登录
    console.log('2️⃣ 测试管理员登录...');
    const loginResponse = await makeRequest(`${SERVER_URL}/api/auth/admin/login`, {
      method: 'POST',
      body: ADMIN_CREDENTIALS
    });
    console.log(`   状态码: ${loginResponse.status}`);
    console.log(`   响应: ${JSON.stringify(loginResponse.data, null, 2)}`);
    
    if (!loginResponse.data.success) {
      console.log('❌ 管理员登录失败，无法继续测试');
      return;
    }

    const token = loginResponse.data.data.token;
    console.log(`   🔑 获取到Token: ${token.substring(0, 50)}...`);
    console.log('');

    // 3. 获取学生列表
    console.log('3️⃣ 测试获取学生列表...');
    const studentsResponse = await makeRequest(`${SERVER_URL}/api/admin/students`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(`   状态码: ${studentsResponse.status}`);
    console.log(`   响应: ${JSON.stringify(studentsResponse.data, null, 2)}`);
    console.log('');

    // 4. 获取任务列表
    console.log('4️⃣ 测试获取任务列表...');
    const tasksResponse = await makeRequest(`${SERVER_URL}/api/admin/tasks`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(`   状态码: ${tasksResponse.status}`);
    console.log(`   响应: ${JSON.stringify(tasksResponse.data, null, 2)}`);
    console.log('');

    // 5. 测试学生登录
    console.log('5️⃣ 测试学生登录...');
    const studentLoginResponse = await makeRequest(`${SERVER_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        studentId: 'ST001',
        password: 'Hello888'
      }
    });
    console.log(`   状态码: ${studentLoginResponse.status}`);
    console.log(`   响应: ${JSON.stringify(studentLoginResponse.data, null, 2)}`);
    console.log('');

    // 6. 测试前端页面访问
    console.log('6️⃣ 测试前端页面访问...');
    const frontendResponse = await makeRequest('http://124.221.113.102:3000');
    console.log(`   状态码: ${frontendResponse.status}`);
    console.log(`   响应长度: ${typeof frontendResponse.data === 'string' ? frontendResponse.data.length : 'JSON数据'} 字符`);
    console.log('');

    console.log('✅ API测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testAPI();
