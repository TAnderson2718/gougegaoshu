const http = require('http');

console.log('🔍 直接测试服务状态...\n');

// 测试后端
console.log('📡 测试后端 localhost:3001/health');
const req1 = http.get('http://localhost:3001/health', { timeout: 2000 }, (res) => {
  console.log('✅ 后端响应 - 状态码:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('📄 后端内容:', data);
    
    // 测试前端
    console.log('\n🌐 测试前端 localhost:3000');
    const req2 = http.get('http://localhost:3000/', { timeout: 2000 }, (res2) => {
      console.log('✅ 前端响应 - 状态码:', res2.statusCode);
      console.log('📄 内容类型:', res2.headers['content-type']);
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log('📄 前端内容长度:', data2.length);
        console.log('📄 是否HTML:', data2.includes('<!DOCTYPE html>'));
        console.log('\n🎉 测试完成');
      });
    });
    
    req2.on('error', err => console.log('❌ 前端错误:', err.message));
    req2.on('timeout', () => {
      console.log('❌ 前端超时');
      req2.destroy();
    });
  });
});

req1.on('error', err => console.log('❌ 后端错误:', err.message));
req1.on('timeout', () => {
  console.log('❌ 后端超时');
  req1.destroy();
});
