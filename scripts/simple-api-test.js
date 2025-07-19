#!/usr/bin/env node

/**
 * 简化的API数据一致性测试
 * 使用Node.js内置模块进行HTTP请求
 */

const http = require('http');

class SimpleAPITester {
  constructor() {
    this.testResults = [];
    this.studentToken = null;
    this.adminToken = null;
    this.baseUrl = 'localhost';
    this.port = 3001;
  }

  // HTTP请求封装
  async makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: this.port,
        path: `/api${path}`,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({
              statusCode: res.statusCode,
              data: parsed
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              data: { success: false, message: 'Invalid JSON response' }
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  // 记录测试结果
  logTest(testName, passed, details = '') {
    const result = { test: testName, passed, details, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }

  // 登录学生
  async loginStudent() {
    try {
      const response = await this.makeRequest('POST', '/auth/login', {
        studentId: 'ST001',
        password: 'Hello888'
      });

      if (response.data.success) {
        this.studentToken = response.data.data.token;
        this.logTest('学生登录', true, 'ST001登录成功');
        return true;
      } else {
        this.logTest('学生登录', false, response.data.message);
        return false;
      }
    } catch (error) {
      this.logTest('学生登录', false, error.message);
      return false;
    }
  }

  // 登录管理员
  async loginAdmin() {
    try {
      const response = await this.makeRequest('POST', '/auth/admin/login', {
        studentId: 'ADMIN001',
        password: 'Hello888'
      });

      if (response.data.success) {
        this.adminToken = response.data.data.token;
        this.logTest('管理员登录', true, 'ADMIN001登录成功');
        return true;
      } else {
        this.logTest('管理员登录', false, response.data.message);
        return false;
      }
    } catch (error) {
      this.logTest('管理员登录', false, error.message);
      return false;
    }
  }

  // 创建测试任务
  async createTestTasks() {
    try {
      const csvData = `学生ID,日期,任务类型,任务标题
ST001,2025-07-18,学习,测试任务1
ST001,2025-07-19,学习,测试任务2
ST002,2025-07-18,学习,测试任务3`;

      const response = await this.makeRequest('POST', '/admin/tasks/bulk-import', 
        { csvData }, this.adminToken);

      if (response.data.success) {
        this.logTest('创建测试任务', true, `创建了${response.data.data.created}个任务`);
        return true;
      } else {
        this.logTest('创建测试任务', false, response.data.message);
        return false;
      }
    } catch (error) {
      this.logTest('创建测试任务', false, error.message);
      return false;
    }
  }

  // 获取学生任务数量
  async getStudentTaskCount() {
    try {
      const response = await this.makeRequest('GET', 
        '/tasks?startDate=2025-07-01&endDate=2025-07-31', null, this.studentToken);

      if (response.data.success) {
        const taskCount = Object.values(response.data.data).flat().length;
        return taskCount;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  // 测试学生重置功能
  async testStudentReset() {
    console.log('\n🧪 测试学生重置功能...');
    
    try {
      // 1. 获取重置前的数据
      const beforeTasks = await this.getStudentTaskCount();
      
      this.logTest(
        '重置前数据检查',
        beforeTasks > 0,
        `任务数量: ${beforeTasks}`
      );

      // 2. 执行学生重置
      const response = await this.makeRequest('POST', '/tasks/reset-to-initial', 
        {}, this.studentToken);

      if (response.data.success) {
        this.logTest('学生重置API调用', true, response.data.message);
        
        // 3. 验证数据已清空
        const afterTasks = await this.getStudentTaskCount();
        
        this.logTest(
          '学生数据清空验证',
          afterTasks === 0,
          `重置后任务数量: ${afterTasks}`
        );
      } else {
        this.logTest('学生重置API调用', false, response.data.message);
      }
      
    } catch (error) {
      this.logTest('学生重置功能', false, error.message);
    }
  }

  // 测试管理员重置功能
  async testAdminReset() {
    console.log('\n🧪 测试管理员重置功能...');
    
    try {
      // 1. 重新创建测试数据
      await this.createTestTasks();
      
      // 2. 执行管理员重置
      const response = await this.makeRequest('POST', '/admin/reset-all-tasks', 
        {}, this.adminToken);

      if (response.data.success) {
        this.logTest('管理员重置API调用', true, response.data.message);
        
        // 3. 验证所有数据已清空
        const afterTasks = await this.getStudentTaskCount();
        
        this.logTest(
          '全局数据清空验证',
          afterTasks === 0,
          `重置后任务数量: ${afterTasks}`
        );
      } else {
        this.logTest('管理员重置API调用', false, response.data.message);
      }
      
    } catch (error) {
      this.logTest('管理员重置功能', false, error.message);
    }
  }

  // 测试密码重置功能
  async testPasswordReset() {
    console.log('\n🧪 测试密码重置功能...');
    
    try {
      const response = await this.makeRequest('POST', '/admin/students/ST001/reset-password', 
        {}, this.adminToken);

      if (response.data.success) {
        this.logTest('密码重置API调用', true, `新密码: ${response.data.data.initialPassword}`);
        
        const isDefaultPassword = response.data.data.initialPassword === 'Hello888';
        this.logTest(
          '默认密码验证',
          isDefaultPassword,
          `新密码是否为Hello888: ${isDefaultPassword}`
        );
      } else {
        this.logTest('密码重置API调用', false, response.data.message);
      }
      
    } catch (error) {
      this.logTest('密码重置功能', false, error.message);
    }
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始简化API数据一致性测试...\n');
    
    // 登录
    const studentLogin = await this.loginStudent();
    const adminLogin = await this.loginAdmin();
    
    if (!studentLogin || !adminLogin) {
      console.log('❌ 登录失败，无法继续测试');
      return;
    }
    
    // 创建测试数据
    await this.createTestTasks();
    
    // 执行测试
    await this.testStudentReset();
    await this.testAdminReset();
    await this.testPasswordReset();
    
    // 输出测试总结
    this.printSummary();
  }

  // 打印测试总结
  printSummary() {
    console.log('\n📊 测试总结:');
    console.log('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过: ${passedTests} ✅`);
    console.log(`失败: ${failedTests} ❌`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   - ${r.test}: ${r.details}`);
        });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(failedTests === 0 ? '🎉 所有测试通过！数据一致性功能正常' : '⚠️ 存在失败的测试，请检查数据一致性实现');
  }
}

// 运行测试
if (require.main === module) {
  const tester = new SimpleAPITester();
  
  tester.runAllTests()
    .then(() => {
      console.log('\n✅ 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = SimpleAPITester;
