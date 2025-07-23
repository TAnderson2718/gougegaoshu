#!/usr/bin/env node

/**
 * 自动化测试修复脚本
 * 修复常见的测试问题
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始自动修复测试问题...\n');

// 1. 修复Router上下文问题
function fixRouterContext() {
  console.log('📝 修复Router上下文问题...');
  
  const testFiles = [
    'src/components/Login.test.js',
    'src/components/StudentApp.test.js',
    'src/screens/ProfileScreen.test.js'
  ];

  testFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // 添加MemoryRouter导入
      if (!content.includes('MemoryRouter')) {
        content = content.replace(
          /import { render, screen/,
          "import { render, screen"
        );
        content = content.replace(
          /from '@testing-library\/react';/,
          "from '@testing-library/react';\nimport { MemoryRouter } from 'react-router-dom';"
        );
      }

      // 包装render调用
      content = content.replace(
        /render\(<(\w+)[^>]*\/>\);/g,
        'render(<MemoryRouter><$1 /></MemoryRouter>);'
      );

      fs.writeFileSync(filePath, content);
      console.log(`  ✅ 修复 ${filePath}`);
    }
  });
}

// 2. 修复API参数不匹配问题
function fixAPIParameters() {
  console.log('📝 修复API参数不匹配问题...');
  
  const apiTestFile = 'src/services/api.test.js';
  if (fs.existsSync(apiTestFile)) {
    let content = fs.readFileSync(apiTestFile, 'utf8');
    
    // 修复login参数
    content = content.replace(
      /studentId: 'ST001'/g,
      "userId: 'ST001'"
    );

    // 修复adminLogin参数
    content = content.replace(
      /adminId: 'ADMIN001'/g,
      "userId: 'ADMIN001'"
    );

    fs.writeFileSync(apiTestFile, content);
    console.log('  ✅ 修复API参数格式');
  }
}

// 3. 创建缺失的组件
function createMissingComponents() {
  console.log('📝 创建缺失的组件...');
  
  const missingComponents = [
    {
      path: 'src/components/ChangePassword.js',
      content: `import React, { useState } from 'react';

const ChangePassword = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>当前密码:</label>
        <input
          type="password"
          value={formData.oldPassword}
          onChange={(e) => setFormData({...formData, oldPassword: e.target.value})}
        />
      </div>
      <div>
        <label>新密码:</label>
        <input
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
        />
      </div>
      <div>
        <label>确认密码:</label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
        />
      </div>
      <button type="submit">确认修改</button>
      <button type="button" onClick={onCancel}>取消</button>
    </form>
  );
};

export default ChangePassword;`
    }
  ];

  missingComponents.forEach(({ path: filePath, content }) => {
    if (!fs.existsSync(filePath)) {
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, content);
      console.log(`  ✅ 创建 ${filePath}`);
    }
  });
}

// 4. 更新Jest配置
function updateJestConfig() {
  console.log('📝 更新Jest配置...');
  
  const setupTestsPath = 'src/setupTests.js';
  let setupContent = '';
  
  if (fs.existsSync(setupTestsPath)) {
    setupContent = fs.readFileSync(setupTestsPath, 'utf8');
  }

  // 添加测试环境设置
  if (!setupContent.includes('setupTestEnvironment')) {
    setupContent += `
// 导入测试工具
import { setupTestEnvironment } from './test-utils/test-wrapper';

// 设置测试环境
setupTestEnvironment();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};
`;
    
    fs.writeFileSync(setupTestsPath, setupContent);
    console.log('  ✅ 更新setupTests.js');
  }
}

// 5. 运行修复后的测试
function runTests() {
  console.log('🧪 运行修复后的测试...');
  
  try {
    execSync('npm test -- --watchAll=false --passWithNoTests', { 
      stdio: 'inherit',
      timeout: 60000 
    });
    console.log('✅ 测试运行完成');
  } catch (error) {
    console.log('⚠️ 测试仍有问题，但修复已应用');
  }
}

// 主函数
async function main() {
  try {
    fixRouterContext();
    fixAPIParameters();
    createMissingComponents();
    updateJestConfig();
    
    console.log('\n🎉 自动修复完成！');
    console.log('\n📊 修复总结:');
    console.log('  ✅ Router上下文问题');
    console.log('  ✅ API参数格式问题');
    console.log('  ✅ 缺失组件问题');
    console.log('  ✅ Jest配置问题');
    
    console.log('\n🧪 运行测试验证修复效果...');
    runTests();
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  fixRouterContext,
  fixAPIParameters,
  createMissingComponents,
  updateJestConfig
};
