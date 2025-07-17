const http = require('http');

function testService(port, path = '/') {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          data: data.substring(0, 200) // 只显示前200个字符
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

    req.end();
  });
}

async function main() {
  console.log('🧪 测试服务状态...\n');
  
  // 测试后端健康检查
  console.log('📡 测试后端服务 (http://localhost:3001/health):');
  const backendHealth = await testService(3001, '/health');
  if (backendHealth.success) {
    console.log(`✅ 后端健康检查成功 (状态码: ${backendHealth.status})`);
    console.log(`📄 响应内容: ${backendHealth.data}`);
  } else {
    console.log(`❌ 后端健康检查失败: ${backendHealth.error}`);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 测试前端服务
  console.log('🌐 测试前端服务 (http://localhost:3000):');
  const frontendTest = await testService(3000, '/');
  if (frontendTest.success) {
    console.log(`✅ 前端服务响应成功 (状态码: ${frontendTest.status})`);
    console.log(`📄 响应内容: ${frontendTest.data.includes('<!DOCTYPE html>') ? 'HTML页面正常' : '非HTML响应'}`);
  } else {
    console.log(`❌ 前端服务失败: ${frontendTest.error}`);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 测试学生登录API
  console.log('🔐 测试学生登录API:');
  const loginTest = await testLoginAPI();
  if (loginTest.success) {
    console.log('✅ 学生登录API正常工作');
    console.log(`📄 响应: ${loginTest.data}`);
  } else {
    console.log(`❌ 学生登录API失败: ${loginTest.error}`);
  }
  
  console.log('\n🎉 测试完成！');
  console.log('\n📱 如果所有测试都通过，您可以在浏览器中访问:');
  console.log('   前端应用: http://localhost:3000');
  console.log('   后端API: http://localhost:3001');
}

function testLoginAPI() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      studentId: 'ST001',
      password: 'Hello888'
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          success: res.statusCode === 200,
          status: res.statusCode,
          data: data.substring(0, 200)
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

    req.write(postData);
    req.end();
  });
}

main().catch(console.error);
