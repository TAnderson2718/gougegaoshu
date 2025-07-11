/**
 * 测试运行脚本
 * 设置测试环境并运行所有测试
 */

const { spawn } = require('child_process');
const path = require('path');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'task_manager_test_db';

console.log('🚀 开始运行自动化测试...');
console.log('📊 测试环境: test');
console.log('🗄️ 测试数据库: task_manager_test_db');
console.log('=' .repeat(50));

// 运行Jest测试
const jest = spawn('npx', ['jest', '--config=jest.config.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    DB_NAME: 'task_manager_test_db'
  }
});

jest.on('close', (code) => {
  console.log('=' .repeat(50));
  if (code === 0) {
    console.log('✅ 所有测试通过！');
    console.log('📊 查看详细报告: ./coverage/index.html');
  } else {
    console.log('❌ 测试失败，退出码:', code);
    console.log('📋 请查看上方错误信息进行修复');
  }
  process.exit(code);
});

jest.on('error', (error) => {
  console.error('❌ 运行测试时发生错误:', error);
  process.exit(1);
});
