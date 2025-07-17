const http = require('http');

console.log('🔍 开始简单服务测试...\n');

// 测试后端
console.log('📡 测试后端服务 (localhost:3001/health)...');
const backendReq = http.get('http://localhost:3001/health', { timeout: 3000 }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('✅ 后端响应成功');
    console.log('📄 状态码:', res.statusCode);
    console.log('📄 响应内容:', data);
    
    // 测试前端
    console.log('\n🌐 测试前端服务 (localhost:3000)...');
    const frontendReq = http.get('http://localhost:3000/', { timeout: 3000 }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log('✅ 前端响应成功');
        console.log('📄 状态码:', res2.statusCode);
        console.log('📄 内容类型:', res2.headers['content-type']);
        console.log('📄 内容长度:', data2.length);
        console.log('📄 是否为HTML:', data2.includes('<!DOCTYPE html>') ? '是' : '否');
        
        // 测试登录API
        console.log('\n🔐 测试学生登录API...');
        const postData = JSON.stringify({
          studentId: 'ST001',
          password: 'Hello888'
        });
        
        const loginReq = http.request({
          hostname: 'localhost',
          port: 3001,
          path: '/api/auth/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 3000
        }, (res3) => {
          let data3 = '';
          res3.on('data', chunk => data3 += chunk);
          res3.on('end', () => {
            console.log('✅ 登录API响应成功');
            console.log('📄 状态码:', res3.statusCode);
            console.log('📄 响应内容:', data3);
            
            console.log('\n🎉 所有测试完成！');
          });
        });
        
        loginReq.on('error', err => {
          console.log('❌ 登录API测试失败:', err.message);
        });
        
        loginReq.on('timeout', () => {
          console.log('❌ 登录API超时');
          loginReq.destroy();
        });
        
        loginReq.write(postData);
        loginReq.end();
      });
    });
    
    frontendReq.on('error', err => {
      console.log('❌ 前端测试失败:', err.message);
    });
    
    frontendReq.on('timeout', () => {
      console.log('❌ 前端请求超时');
      frontendReq.destroy();
    });
  });
});

backendReq.on('error', err => {
  console.log('❌ 后端测试失败:', err.message);
});

backendReq.on('timeout', () => {
  console.log('❌ 后端请求超时');
  backendReq.destroy();
});
