/**
 * Jest测试配置文件
 * 配置测试环境、覆盖率报告、测试文件匹配等
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // 忽略的文件和目录
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/'
  ],
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'config/**/*.js',
    'scripts/**/*.js',
    'server.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],
  
  // 覆盖率报告格式
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // 覆盖率输出目录
  coverageDirectory: 'coverage',
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // 测试超时时间（毫秒）
  testTimeout: 30000,
  
  // 详细输出
  verbose: true,
  
  // 强制退出
  forceExit: true,
  
  // 检测打开的句柄
  detectOpenHandles: true,
  
  // 全局变量
  globals: {
    'process.env.NODE_ENV': 'test'
  },
  

  
  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  
  // 错误处理
  errorOnDeprecated: true,
  
  // 报告器配置
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: '任务管理系统测试报告',
        logoImgPath: undefined,
        inlineSource: false
      }
    ]
  ],
  
  // 转换配置
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // 模块文件扩展名
  moduleFileExtensions: [
    'js',
    'json',
    'node'
  ]
};
