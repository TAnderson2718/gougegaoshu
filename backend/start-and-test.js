const { spawn } = require('child_process');
const { testHealth, testDatabaseStatus } = require('./scripts/testAPI');

// 启动服务器并测试
async function startAndTest() {
  console.log('🚀 启动任务管理系统后端并进行测试...');
  console.log('================================================');
  
  // 启动服务器
  console.log('📡 启动后端服务器...');
  const serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  // 等待服务器启动
  console.log('⏳ 等待服务器启动...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // 测试健康检查
    console.log('\n🔍 测试服务器健康状态...');
    const healthResult = await testHealth();
    
    if (healthResult) {
      // 测试数据库状态
      console.log('\n🔍 测试数据库连接状态...');
      const dbResult = await testDatabaseStatus();
      
      if (dbResult) {
        console.log('\n🎉 后端服务启动成功！');
        console.log('📋 可用的API端点:');
        console.log('   GET  /health - 健康检查');
        console.log('   GET  /api/db-status - 数据库状态');
        console.log('   POST /api/auth/login - 用户登录');
        console.log('   GET  /api/tasks - 获取任务');
        console.log('   GET  /api/profiles - 获取档案');
        console.log('');
        console.log('🔑 测试登录信息:');
        console.log('   学生ID: ST001 或 ST002');
        console.log('   密码: Hello888');
        console.log('');
        console.log('💡 运行完整API测试: npm run test:api');
        console.log('');
        console.log('✨ 服务器正在运行，按 Ctrl+C 停止');
      } else {
        console.log('\n❌ 数据库连接测试失败');
        serverProcess.kill();
        process.exit(1);
      }
    } else {
      console.log('\n❌ 服务器健康检查失败');
      serverProcess.kill();
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    serverProcess.kill();
    process.exit(1);
  }
  
  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('\n🛑 正在停止服务器...');
    serverProcess.kill();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 正在停止服务器...');
    serverProcess.kill();
    process.exit(0);
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  startAndTest().catch(error => {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  });
}

module.exports = { startAndTest };
