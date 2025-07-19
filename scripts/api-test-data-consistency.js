#!/usr/bin/env node

/**
 * API数据一致性测试脚本
 * 通过HTTP API测试前端和后端的数据一致性
 */

const axios = require('./node_modules/axios');

const API_BASE = 'http://localhost:3001/api';

class APIDataConsistencyTester {
  constructor() {
    this.testResults = [];
    this.studentToken = null;
    this.adminToken = null;
  }

  // 记录测试结果
  logTest(testName, passed, details = '') {
    const result = {
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    this.testResults.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testName}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }

  // 登录学生账户
  async loginStudent() {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        id: 'ST001',
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

  // 登录管理员账户
  async loginAdmin() {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        id: 'ADMIN001',
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

      const response = await axios.post(`${API_BASE}/admin/tasks/bulk-import`, 
        { csvData },
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

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

  // 创建测试请假记录
  async createTestLeaveRecord() {
    try {
      const response = await axios.post(`${API_BASE}/tasks/leave`, 
        { date: '2025-07-20' },
        { headers: { Authorization: `Bearer ${this.studentToken}` } }
      );

      if (response.data.success) {
        this.logTest('创建测试请假记录', true, '请假记录创建成功');
        return true;
      } else {
        this.logTest('创建测试请假记录', false, response.data.message);
        return false;
      }
    } catch (error) {
      this.logTest('创建测试请假记录', false, error.message);
      return false;
    }
  }

  // 获取学生任务数量
  async getStudentTaskCount() {
    try {
      const response = await axios.get(`${API_BASE}/tasks?startDate=2025-07-01&endDate=2025-07-31`, 
        { headers: { Authorization: `Bearer ${this.studentToken}` } }
      );

      if (response.data.success) {
        const taskCount = Object.values(response.data.data).flat().length;
        return taskCount;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  // 获取学生请假记录数量
  async getStudentLeaveCount() {
    try {
      const response = await axios.get(`${API_BASE}/tasks/leave-records`, 
        { headers: { Authorization: `Bearer ${this.studentToken}` } }
      );

      if (response.data.success) {
        return response.data.data.length;
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
      const beforeLeave = await this.getStudentLeaveCount();
      
      this.logTest(
        '重置前数据检查',
        beforeTasks > 0 || beforeLeave > 0,
        `任务: ${beforeTasks}, 请假记录: ${beforeLeave}`
      );

      // 2. 执行学生重置
      const response = await axios.post(`${API_BASE}/tasks/reset-to-initial`, {},
        { headers: { Authorization: `Bearer ${this.studentToken}` } }
      );

      if (response.data.success) {
        this.logTest('学生重置API调用', true, response.data.message);
        
        // 3. 验证数据已清空
        const afterTasks = await this.getStudentTaskCount();
        const afterLeave = await this.getStudentLeaveCount();
        
        this.logTest(
          '学生数据清空验证',
          afterTasks === 0 && afterLeave === 0,
          `任务: ${afterTasks}, 请假记录: ${afterLeave}`
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
      const response = await axios.post(`${API_BASE}/admin/reset-all-tasks`, {},
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        this.logTest('管理员重置API调用', true, response.data.message);
        
        // 3. 验证所有数据已清空
        const afterTasks = await this.getStudentTaskCount();
        
        this.logTest(
          '全局数据清空验证',
          afterTasks === 0,
          `剩余任务: ${afterTasks}`
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
      // 执行密码重置
      const response = await axios.post(`${API_BASE}/admin/students/ST001/reset-password`, {},
        { headers: { Authorization: `Bearer ${this.adminToken}` } }
      );

      if (response.data.success) {
        this.logTest('密码重置API调用', true, `新密码: ${response.data.data.initialPassword}`);
        
        // 验证新密码是否为默认密码
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
    console.log('🚀 开始API数据一致性测试...\n');
    
    // 登录
    const studentLogin = await this.loginStudent();
    const adminLogin = await this.loginAdmin();
    
    if (!studentLogin || !adminLogin) {
      console.log('❌ 登录失败，无法继续测试');
      return;
    }
    
    // 创建测试数据
    await this.createTestTasks();
    await this.createTestLeaveRecord();
    
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
    console.log(failedTests === 0 ? '🎉 所有测试通过！' : '⚠️ 存在失败的测试，请检查数据一致性实现');
  }
}

// 运行测试
if (require.main === module) {
  const tester = new APIDataConsistencyTester();
  
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

module.exports = APIDataConsistencyTester;
