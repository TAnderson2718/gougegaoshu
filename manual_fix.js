const { spawn, exec } = require('child_process');
const http = require('http');

console.log('🔧 手动修复登录问题...\n');

// 清理进程
function cleanup() {
  return new Promise((resolve) => {
    console.log('🧹 清理现有进程...');
    
    const commands = [
      'pkill -9 -f "react-scripts" 2>/dev/null || true',
      'pkill -9 -f "node.*server" 2>/dev/null || true', 
      'pkill -9 -f "npm.*start" 2>/dev/null || true',
      'lsof -ti:3000 | xargs kill -9 2>/dev/null || true',
      'lsof -ti:3001 | xargs kill -9 2>/dev/null || true'
    ];
    
    let completed = 0;
    commands.forEach(cmd => {
      exec(cmd, () => {
        completed++;
        if (completed === commands.length) {
          console.log('✅ 进程清理完成');
          setTimeout(resolve, 3000);
        }
      });
    });
  });
}

// 启动后端
function startBackend() {
  return new Promise((resolve) => {
    console.log('🚀 启动后端服务...');
    
    const backend = spawn('node', ['server.js'], {
      cwd: '/Users/daniel/Documents/GitHub/gougegaoshu/backend',
      stdio: 'pipe'
    });
    
    backend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('后端输出:', output.trim());
      
      if (output.includes('服务器运行在端口') || output.includes('Server running')) {
        console.log('✅ 后端服务启动成功');
        resolve(backend);
      }
    });
    
    backend.stderr.on('data', (data) => {
      console.log('后端错误:', data.toString().trim());
    });
    
    // 10秒后强制resolve
    setTimeout(() => {
      console.log('⏰ 后端启动超时，继续下一步');
      resolve(backend);
    }, 10000);
  });
}

// 测试后端
function testBackend() {
  return new Promise((resolve) => {
    console.log('🧪 测试后端连接...');
    
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    }, (res) => {
      if (res.statusCode === 200) {
        console.log('✅ 后端连接正常');
        resolve(true);
      } else {
        console.log(`❌ 后端连接异常 (${res.statusCode})`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      console.log('❌ 后端连接失败');
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ 后端连接超时');
      resolve(false);
    });
    
    req.end();
  });
}

// 启动前端
function startFrontend() {
  return new Promise((resolve) => {
    console.log('🌐 启动前端服务...');
    
    const frontend = spawn('npm', ['start'], {
      cwd: '/Users/daniel/Documents/GitHub/gougegaoshu/frontend',
      stdio: 'pipe',
      env: { ...process.env, BROWSER: 'none' }
    });
    
    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('前端输出:', output.trim());
      
      if (output.includes('webpack compiled') || output.includes('Local:')) {
        console.log('✅ 前端服务启动成功');
        resolve(frontend);
      }
    });
    
    frontend.stderr.on('data', (data) => {
      console.log('前端错误:', data.toString().trim());
    });
    
    // 30秒后强制resolve
    setTimeout(() => {
      console.log('⏰ 前端启动超时，继续下一步');
      resolve(frontend);
    }, 30000);
  });
}

// 测试API代理
function testAPIProxy() {
  return new Promise((resolve) => {
    console.log('🔗 测试API代理...');
    
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
      console.log(`📊 API代理状态: ${res.statusCode}`);
      
      if (res.statusCode === 200 || res.statusCode === 401) {
        console.log('✅ API代理工作正常');
        resolve(true);
      } else {
        console.log('❌ API代理有问题');
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      console.log('❌ API代理测试失败:', err.message);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ API代理测试超时');
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// 主函数
async function main() {
  try {
    await cleanup();
    
    const backendProcess = await startBackend();
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const backendOK = await testBackend();
    if (!backendOK) {
      console.log('❌ 后端服务异常，请手动检查');
      return;
    }
    
    const frontendProcess = await startFrontend();
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const proxyOK = await testAPIProxy();
    
    console.log('\n🎉 修复完成！');
    console.log(`📊 后端状态: ${backendOK ? '✅ 正常' : '❌ 异常'}`);
    console.log(`📊 API代理: ${proxyOK ? '✅ 正常' : '❌ 异常'}`);
    console.log('\n💡 请刷新浏览器页面并测试快速登录功能');
    
    // 保持进程运行
    console.log('\n⚠️ 请不要关闭此窗口，服务正在运行中...');
    
  } catch (error) {
    console.error('❌ 修复过程中出错:', error);
  }
}

main();
