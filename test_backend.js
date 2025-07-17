const http = require('http');

console.log('🧪 测试后端API连接...\n');

// 测试健康检查
const healthOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/health',
  method: 'GET'
};

const healthReq = http.request(healthOptions, (res) => {
  console.log(`✅ 健康检查状态: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 健康检查响应:', data);
    
    // 测试管理员登录API
    testAdminLogin();
  });
});

healthReq.on('error', (err) => {
  console.log('❌ 健康检查失败:', err.message);
  console.log('💡 后端服务可能未启动，请运行: cd backend && npm start');
});

healthReq.end();

function testAdminLogin() {
  console.log('\n🔐 测试管理员登录API...');
  
  const loginData = JSON.stringify({
    username: 'ADMIN001',
    password: 'Hello888'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/admin/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };
  
  const loginReq = http.request(loginOptions, (res) => {
    console.log(`📊 登录API状态: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📄 登录API响应:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ 后端API工作正常！');
      } else {
        console.log('⚠️  登录失败，但API可访问');
      }
    });
  });
  
  loginReq.on('error', (err) => {
    console.log('❌ 登录API失败:', err.message);
  });
  
  loginReq.write(loginData);
  loginReq.end();
}
