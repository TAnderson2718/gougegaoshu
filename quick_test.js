const http = require('http');

console.log('🧪 快速测试服务状态...');

// 测试后端
const testBackend = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ 后端服务正常:', data.substring(0, 50) + '...');
        resolve(true);
      });
    });
    req.on('error', () => {
      console.log('❌ 后端服务无响应');
      resolve(false);
    });
    req.setTimeout(5000, () => {
      console.log('❌ 后端服务超时');
      resolve(false);
    });
  });
};

// 测试前端
const testFrontend = () => {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', (res) => {
      console.log('✅ 前端服务正常, 状态码:', res.statusCode);
      resolve(true);
    });
    req.on('error', () => {
      console.log('❌ 前端服务无响应');
      resolve(false);
    });
    req.setTimeout(5000, () => {
      console.log('❌ 前端服务超时');
      resolve(false);
    });
  });
};

// 执行测试
(async () => {
  console.log('=== 测试后端服务 ===');
  await testBackend();
  
  console.log('\n=== 测试前端服务 ===');
  await testFrontend();
  
  console.log('\n🎉 测试完成！');
})();
