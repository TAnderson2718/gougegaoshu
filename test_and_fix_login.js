const http = require('http');

console.log('🔧 测试并修复登录问题...\n');

// 测试后端服务
function testBackend() {
  return new Promise((resolve) => {
    console.log('🧪 测试后端服务...');
    
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ 后端服务正常运行');
          resolve(true);
        } else {
          console.log(`❌ 后端服务异常 (状态码: ${res.statusCode})`);
          resolve(false);
        }
      });
    });
    
    req.on('error', () => {
      console.log('❌ 后端服务未运行');
      resolve(false);
    });
    
    req.end();
  });
}

// 测试前端服务
function testFrontend() {
  return new Promise((resolve) => {
    console.log('🧪 测试前端服务...');
    
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    }, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ 前端服务正常运行');
        resolve(true);
      } else {
        console.log(`❌ 前端服务异常 (状态码: ${res.statusCode})`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      console.log('❌ 前端服务未运行');
      resolve(false);
    });
    
    req.end();
  });
}

// 测试API代理
function testAPIProxy() {
  return new Promise((resolve) => {
    console.log('🧪 测试API代理...');
    
    const postData = JSON.stringify({
      studentId: 'ST001',
      password: 'Hello888'
    });
    
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`📊 API代理响应状态: ${res.statusCode}`);
        console.log(`📄 API代理响应内容: ${data}`);
        
        if (res.statusCode === 200 || res.statusCode === 401) {
          console.log('✅ API代理工作正常');
          resolve(true);
        } else {
          console.log('❌ API代理有问题');
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ API代理测试失败:', err.message);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始全面测试...\n');
  
  const backendOK = await testBackend();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const frontendOK = await testFrontend();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const proxyOK = await testAPIProxy();
  
  console.log('\n📊 测试结果总结:');
  console.log(`   后端服务: ${backendOK ? '✅ 正常' : '❌ 异常'}`);
  console.log(`   前端服务: ${frontendOK ? '✅ 正常' : '❌ 异常'}`);
  console.log(`   API代理: ${proxyOK ? '✅ 正常' : '❌ 异常'}`);
  
  if (backendOK && frontendOK && proxyOK) {
    console.log('\n🎉 所有服务正常！登录功能应该可以正常使用。');
    console.log('💡 如果仍有问题，请：');
    console.log('   1. 刷新浏览器页面');
    console.log('   2. 清除浏览器缓存');
    console.log('   3. 检查浏览器控制台错误');
  } else {
    console.log('\n⚠️ 发现问题，需要修复服务。');
    
    if (!backendOK) {
      console.log('🔧 启动后端服务: cd backend && npm start');
    }
    
    if (!frontendOK) {
      console.log('🔧 启动前端服务: cd frontend && npm start');
    }
    
    if (!proxyOK && backendOK && frontendOK) {
      console.log('🔧 重启前端服务以修复代理: cd frontend && npm start');
    }
  }
}

runTests().catch(console.error);
