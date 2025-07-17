#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const http = require('http');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 清理所有相关进程
function killAllProcesses() {
  return new Promise((resolve) => {
    log('🧹 清理所有相关进程...', 'yellow');
    exec('pkill -f "react-scripts" && pkill -f "node.*server" && pkill -f "npm.*start" && lsof -ti:3000 | xargs kill -9 2>/dev/null || true && lsof -ti:3001 | xargs kill -9 2>/dev/null || true && lsof -ti:3002 | xargs kill -9 2>/dev/null || true', 
      (error, stdout, stderr) => {
        setTimeout(resolve, 3000); // 等待3秒确保进程完全清理
      });
  });
}

// 检查端口是否可用
function checkPort(port) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: port === 3001 ? '/health' : '/',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// 启动后端服务
function startBackend() {
  return new Promise((resolve, reject) => {
    log('🚀 启动后端服务...', 'blue');
    
    const backend = spawn('npm', ['start'], {
      cwd: '/Users/daniel/Documents/GitHub/gougegaoshu/backend',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    backend.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Server running on port 3001') || output.includes('listening on port 3001')) {
        log('✅ 后端服务启动成功', 'green');
        resolve(backend);
      }
    });

    backend.stderr.on('data', (data) => {
      console.error('Backend stderr:', data.toString());
    });

    // 超时处理
    setTimeout(() => {
      checkPort(3001).then(isRunning => {
        if (isRunning) {
          log('✅ 后端服务启动成功 (通过端口检查)', 'green');
          resolve(backend);
        } else {
          log('❌ 后端服务启动超时', 'red');
          reject(new Error('Backend startup timeout'));
        }
      });
    }, 15000);
  });
}

// 启动前端服务
function startFrontend() {
  return new Promise((resolve, reject) => {
    log('🚀 启动前端服务...', 'blue');
    
    const frontend = spawn('npm', ['start'], {
      cwd: '/Users/daniel/Documents/GitHub/gougegaoshu/frontend',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER: 'none' }
    });

    let output = '';
    frontend.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('webpack compiled') || output.includes('Local:') || output.includes('compiled successfully')) {
        log('✅ 前端服务启动成功', 'green');
        resolve(frontend);
      }
    });

    frontend.stderr.on('data', (data) => {
      console.error('Frontend stderr:', data.toString());
    });

    // 超时处理
    setTimeout(() => {
      checkPort(3000).then(isRunning => {
        if (isRunning) {
          log('✅ 前端服务启动成功 (通过端口检查)', 'green');
          resolve(frontend);
        } else {
          log('❌ 前端服务启动超时', 'red');
          reject(new Error('Frontend startup timeout'));
        }
      });
    }, 30000);
  });
}

// 测试服务
async function testServices() {
  log('🧪 测试服务状态...', 'yellow');
  
  const backendRunning = await checkPort(3001);
  const frontendRunning = await checkPort(3000);
  
  log(`后端服务 (3001): ${backendRunning ? '✅ 运行中' : '❌ 未运行'}`, backendRunning ? 'green' : 'red');
  log(`前端服务 (3000): ${frontendRunning ? '✅ 运行中' : '❌ 未运行'}`, frontendRunning ? 'green' : 'red');
  
  if (backendRunning && frontendRunning) {
    log('🎉 所有服务都已正常启动！', 'green');
    log('📱 请在浏览器中访问:', 'blue');
    log('   前端: http://localhost:3000', 'blue');
    log('   后端健康检查: http://localhost:3001/health', 'blue');
    return true;
  }
  
  return false;
}

// 主函数
async function main() {
  try {
    log('🔄 开始自动启动服务...', 'blue');
    
    // 1. 清理进程
    await killAllProcesses();
    
    // 2. 启动后端
    const backendProcess = await startBackend();
    
    // 3. 等待后端稳定
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. 启动前端
    const frontendProcess = await startFrontend();
    
    // 5. 等待前端稳定
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 6. 测试服务
    const success = await testServices();
    
    if (success) {
      log('✅ 服务启动完成！可以开始使用了。', 'green');
      
      // 保持进程运行
      process.on('SIGINT', () => {
        log('🛑 正在关闭服务...', 'yellow');
        backendProcess.kill();
        frontendProcess.kill();
        process.exit(0);
      });
      
      // 定期检查服务状态
      setInterval(async () => {
        const backendOk = await checkPort(3001);
        const frontendOk = await checkPort(3000);
        if (!backendOk || !frontendOk) {
          log('⚠️  检测到服务异常，请检查！', 'red');
        }
      }, 30000);
      
    } else {
      log('❌ 服务启动失败，请检查错误信息', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log(`❌ 启动过程中出错: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 运行主函数
main();
