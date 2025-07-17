#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs');

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
    exec('pkill -f "react-scripts" && pkill -f "node.*server" && pkill -f "npm.*start" && lsof -ti:3000 | xargs kill -9 2>/dev/null || true && lsof -ti:3001 | xargs kill -9 2>/dev/null || true', 
      (error, stdout, stderr) => {
        setTimeout(resolve, 3000); // 等待3秒确保进程完全清理
      });
  });
}

// 检查端口是否可用
function checkPort(port, path = '/') {
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
          data: data
        });
      });
    });

    req.on('error', () => {
      resolve({ success: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false });
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
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let output = '';
    let resolved = false;

    backend.stdout.on('data', (data) => {
      output += data.toString();
      if (!resolved && (output.includes('Server running on port 3001') || output.includes('listening on port 3001'))) {
        resolved = true;
        log('✅ 后端服务启动成功', 'green');
        resolve(backend);
      }
    });

    backend.stderr.on('data', (data) => {
      const errorMsg = data.toString();
      if (errorMsg.includes('EADDRINUSE')) {
        log('⚠️  端口3001已被占用，尝试使用现有服务', 'yellow');
        if (!resolved) {
          resolved = true;
          resolve(backend);
        }
      }
    });

    // 超时处理
    setTimeout(async () => {
      if (!resolved) {
        const result = await checkPort(3001, '/health');
        if (result.success) {
          log('✅ 后端服务启动成功 (通过端口检查)', 'green');
          resolved = true;
          resolve(backend);
        } else {
          log('❌ 后端服务启动超时', 'red');
          reject(new Error('Backend startup timeout'));
        }
      }
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
      env: { ...process.env, BROWSER: 'none' },
      detached: false
    });

    let output = '';
    let resolved = false;

    frontend.stdout.on('data', (data) => {
      output += data.toString();
      if (!resolved && (output.includes('webpack compiled') || output.includes('Local:') || output.includes('compiled successfully'))) {
        resolved = true;
        log('✅ 前端服务启动成功', 'green');
        resolve(frontend);
      }
    });

    frontend.stderr.on('data', (data) => {
      const errorMsg = data.toString();
      if (errorMsg.includes('EADDRINUSE')) {
        log('⚠️  端口3000已被占用，尝试使用现有服务', 'yellow');
        if (!resolved) {
          resolved = true;
          resolve(frontend);
        }
      }
    });

    // 超时处理
    setTimeout(async () => {
      if (!resolved) {
        const result = await checkPort(3000);
        if (result.success) {
          log('✅ 前端服务启动成功 (通过端口检查)', 'green');
          resolved = true;
          resolve(frontend);
        } else {
          log('❌ 前端服务启动超时', 'red');
          reject(new Error('Frontend startup timeout'));
        }
      }
    }, 30000);
  });
}

// 测试服务并生成报告
async function testAndReport() {
  log('🧪 开始测试服务...', 'yellow');
  
  const report = {
    timestamp: new Date().toISOString(),
    backend: {},
    frontend: {},
    apis: {}
  };

  // 测试后端健康检查
  log('📡 测试后端健康检查...', 'blue');
  const backendHealth = await checkPort(3001, '/health');
  report.backend = {
    running: backendHealth.success,
    status: backendHealth.status,
    response: backendHealth.success ? JSON.parse(backendHealth.data) : null
  };

  if (backendHealth.success) {
    log('✅ 后端健康检查通过', 'green');
    log(`📄 响应: ${backendHealth.data}`, 'blue');
  } else {
    log('❌ 后端健康检查失败', 'red');
  }

  // 测试前端页面
  log('🌐 测试前端页面...', 'blue');
  const frontendTest = await checkPort(3000);
  report.frontend = {
    running: frontendTest.success,
    status: frontendTest.status,
    isHtml: frontendTest.success ? frontendTest.data.includes('<!DOCTYPE html>') : false
  };

  if (frontendTest.success) {
    log('✅ 前端页面响应正常', 'green');
    log(`📄 内容类型: ${frontendTest.data.includes('<!DOCTYPE html>') ? 'HTML页面' : '非HTML响应'}`, 'blue');
  } else {
    log('❌ 前端页面无响应', 'red');
  }

  // 测试登录API
  log('🔐 测试登录API...', 'blue');
  const loginTest = await testLoginAPI();
  report.apis.studentLogin = {
    success: loginTest.success,
    status: loginTest.status,
    response: loginTest.success ? JSON.parse(loginTest.data) : null
  };

  if (loginTest.success) {
    log('✅ 学生登录API正常', 'green');
    log(`📄 响应: ${loginTest.data.substring(0, 100)}...`, 'blue');
  } else {
    log('❌ 学生登录API失败', 'red');
  }

  // 保存报告
  fs.writeFileSync('service_test_report.json', JSON.stringify(report, null, 2));
  log('📊 测试报告已保存到 service_test_report.json', 'green');

  // 输出总结
  log('\n' + '='.repeat(60), 'blue');
  log('📋 测试总结:', 'blue');
  log(`后端服务: ${report.backend.running ? '✅ 正常' : '❌ 异常'}`, report.backend.running ? 'green' : 'red');
  log(`前端服务: ${report.frontend.running ? '✅ 正常' : '❌ 异常'}`, report.frontend.running ? 'green' : 'red');
  log(`登录API: ${report.apis.studentLogin.success ? '✅ 正常' : '❌ 异常'}`, report.apis.studentLogin.success ? 'green' : 'red');
  
  if (report.backend.running && report.frontend.running) {
    log('\n🎉 所有服务都正常运行！', 'green');
    log('📱 您可以在浏览器中访问:', 'blue');
    log('   前端: http://localhost:3000', 'blue');
    log('   后端: http://localhost:3001', 'blue');
  } else {
    log('\n⚠️  部分服务异常，请检查错误信息', 'yellow');
  }

  return report;
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
          data: data
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

// 主函数
async function main() {
  try {
    log('🔄 开始自动测试流程...', 'blue');
    
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
    
    // 6. 测试并生成报告
    const report = await testAndReport();
    
    // 保持进程运行一段时间以便查看
    log('\n⏳ 服务将保持运行状态，按 Ctrl+C 停止...', 'yellow');
    
    process.on('SIGINT', () => {
      log('🛑 正在关闭服务...', 'yellow');
      backendProcess.kill();
      frontendProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    log(`❌ 测试过程中出错: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 运行主函数
main();
