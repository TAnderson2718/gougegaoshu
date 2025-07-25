#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * 测试运行脚本
 * 提供不同类型的测试运行选项
 */

const testTypes = {
  unit: {
    name: '单元测试',
    pattern: 'tests/**/*.test.js',
    exclude: ['tests/integration/**', 'tests/e2e/**']
  },
  integration: {
    name: '集成测试',
    pattern: 'tests/integration/**/*.test.js',
    exclude: []
  },
  e2e: {
    name: '端到端测试',
    pattern: 'tests/e2e/**/*.test.js',
    exclude: []
  },
  all: {
    name: '所有测试',
    pattern: 'tests/**/*.test.js',
    exclude: []
  }
};

const coverageTypes = {
  text: '文本格式',
  html: 'HTML报告',
  lcov: 'LCOV格式',
  json: 'JSON格式'
};

function printUsage() {
  console.log(`
🧪 任务管理系统测试运行器

用法: node scripts/runTests.js [选项]

选项:
  --type <type>        测试类型 (unit|integration|e2e|all) [默认: unit]
  --coverage           生成覆盖率报告
  --coverage-type      覆盖率报告类型 (text|html|lcov|json) [默认: text]
  --watch              监视模式
  --verbose            详细输出
  --bail               遇到错误时停止
  --parallel           并行运行测试
  --max-workers <n>    最大工作进程数 [默认: 4]
  --timeout <ms>       测试超时时间 [默认: 10000]
  --help               显示帮助信息

示例:
  node scripts/runTests.js --type unit --coverage
  node scripts/runTests.js --type integration --verbose
  node scripts/runTests.js --type e2e --bail
  node scripts/runTests.js --type all --coverage --coverage-type html
  node scripts/runTests.js --watch
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: 'unit',
    coverage: false,
    coverageType: 'text',
    watch: false,
    verbose: false,
    bail: false,
    parallel: false,
    maxWorkers: 4,
    timeout: 10000
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
        printUsage();
        process.exit(0);
        break;
      case '--type':
        options.type = args[++i];
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--coverage-type':
        options.coverageType = args[++i];
        break;
      case '--watch':
        options.watch = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--bail':
        options.bail = true;
        break;
      case '--parallel':
        options.parallel = true;
        break;
      case '--max-workers':
        options.maxWorkers = parseInt(args[++i]);
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`❌ 未知选项: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function validateOptions(options) {
  if (!testTypes[options.type]) {
    console.error(`❌ 无效的测试类型: ${options.type}`);
    console.error(`可用类型: ${Object.keys(testTypes).join(', ')}`);
    process.exit(1);
  }

  if (!coverageTypes[options.coverageType]) {
    console.error(`❌ 无效的覆盖率类型: ${options.coverageType}`);
    console.error(`可用类型: ${Object.keys(coverageTypes).join(', ')}`);
    process.exit(1);
  }

  if (options.maxWorkers < 1) {
    console.error(`❌ 最大工作进程数必须大于0`);
    process.exit(1);
  }

  if (options.timeout < 1000) {
    console.error(`❌ 超时时间必须至少1000毫秒`);
    process.exit(1);
  }
}

function buildJestArgs(options) {
  const testConfig = testTypes[options.type];
  const args = [];

  // 测试模式
  args.push('--testPathPattern', testConfig.pattern);

  // 排除模式
  if (testConfig.exclude.length > 0) {
    args.push('--testPathIgnorePatterns', testConfig.exclude.join('|'));
  }

  // 覆盖率
  if (options.coverage) {
    args.push('--coverage');
    args.push('--coverageReporters', options.coverageType);
  }

  // 监视模式
  if (options.watch) {
    args.push('--watch');
  }

  // 详细输出
  if (options.verbose) {
    args.push('--verbose');
  }

  // 遇到错误时停止
  if (options.bail) {
    args.push('--bail');
  }

  // 并行运行
  if (options.parallel) {
    args.push('--maxWorkers', options.maxWorkers.toString());
  } else {
    args.push('--runInBand');
  }

  // 超时时间
  args.push('--testTimeout', options.timeout.toString());

  // 强制退出
  args.push('--forceExit');

  // 检测打开的句柄
  args.push('--detectOpenHandles');

  return args;
}

function cleanupTestFiles() {
  const testDbFiles = [
    'test_task_manager.db',
    'integration_test.db',
    'e2e_test.db'
  ];

  testDbFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🧹 清理测试文件: ${file}`);
      } catch (error) {
        console.warn(`⚠️  无法清理测试文件 ${file}: ${error.message}`);
      }
    }
  });
}

function runTests(options) {
  const testConfig = testTypes[options.type];
  
  console.log(`🧪 开始运行${testConfig.name}...`);
  console.log(`📁 测试模式: ${testConfig.pattern}`);
  
  if (options.coverage) {
    console.log(`📊 覆盖率报告: ${coverageTypes[options.coverageType]}`);
  }
  
  if (options.watch) {
    console.log(`👀 监视模式已启用`);
  }
  
  console.log('');

  // 清理旧的测试文件
  cleanupTestFiles();

  // 构建Jest参数
  const jestArgs = buildJestArgs(options);
  
  // 运行Jest
  const jestPath = path.join(__dirname, '..', 'node_modules', '.bin', 'jest');
  const jest = spawn('node', [jestPath, ...jestArgs], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });

  jest.on('close', (code) => {
    console.log('');
    
    if (code === 0) {
      console.log('✅ 所有测试通过！');
      
      if (options.coverage && options.coverageType === 'html') {
        console.log('📊 HTML覆盖率报告已生成: coverage/index.html');
      }
    } else {
      console.log(`❌ 测试失败，退出码: ${code}`);
    }

    // 清理测试文件
    cleanupTestFiles();
    
    process.exit(code);
  });

  jest.on('error', (error) => {
    console.error(`❌ 运行测试时出错: ${error.message}`);
    cleanupTestFiles();
    process.exit(1);
  });

  // 处理中断信号
  process.on('SIGINT', () => {
    console.log('\n🛑 测试被中断');
    jest.kill('SIGINT');
    cleanupTestFiles();
    process.exit(1);
  });
}

function main() {
  const options = parseArgs();
  validateOptions(options);
  
  console.log('🚀 任务管理系统测试运行器');
  console.log('================================');
  
  runTests(options);
}

// 检查是否直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  runTests,
  testTypes,
  coverageTypes
};
