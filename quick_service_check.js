const http = require('http');

async function quickCheck() {
  console.log('🔍 快速检查服务状态...\n');
  
  // 检查后端
  try {
    const backendResult = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3001/health', { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ success: true, data }));
      });
      req.on('error', err => resolve({ success: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'timeout' });
      });
    });
    
    if (backendResult.success) {
      console.log('✅ 后端服务 (3001) 正常运行');
      console.log('📄 响应内容:', backendResult.data);
    } else {
      console.log('❌ 后端服务 (3001) 无响应:', backendResult.error);
    }
  } catch (error) {
    console.log('❌ 后端测试出错:', error.message);
  }
  
  console.log('\n' + '-'.repeat(50) + '\n');
  
  // 检查前端
  try {
    const frontendResult = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3000/', { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ success: true, data: data.substring(0, 200) }));
      });
      req.on('error', err => resolve({ success: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'timeout' });
      });
    });
    
    if (frontendResult.success) {
      console.log('✅ 前端服务 (3000) 正常运行');
      console.log('📄 页面类型:', frontendResult.data.includes('<!DOCTYPE html>') ? 'HTML页面' : '其他内容');
      console.log('📄 内容预览:', frontendResult.data.substring(0, 100) + '...');
    } else {
      console.log('❌ 前端服务 (3000) 无响应:', frontendResult.error);
    }
  } catch (error) {
    console.log('❌ 前端测试出错:', error.message);
  }
  
  console.log('\n🏁 检查完成');
}

quickCheck().catch(console.error);
