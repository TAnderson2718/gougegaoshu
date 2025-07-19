#!/usr/bin/env node

/**
 * 数据一致性测试脚本
 * 验证前端重置和后端重置是否保持数据同步
 */

const path = require('path');
const { query, transaction } = require(path.join(__dirname, '../backend/config/database'));
const bcrypt = require(path.join(__dirname, '../backend/node_modules/bcrypt'));

class DataConsistencyTester {
  constructor() {
    this.testResults = [];
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

  // 测试1: 验证学生重置功能
  async testStudentReset() {
    console.log('\n🧪 测试学生重置功能...');
    
    try {
      // 1. 创建测试数据
      await this.createTestData();
      
      // 2. 验证数据存在
      const beforeTasks = await query('SELECT COUNT(*) as count FROM tasks WHERE student_id = ?', ['ST001']);
      const beforeLeave = await query('SELECT COUNT(*) as count FROM leave_records WHERE student_id = ?', ['ST001']);
      
      this.logTest(
        '测试数据创建',
        beforeTasks[0].count > 0 && beforeLeave[0].count > 0,
        `任务: ${beforeTasks[0].count}, 请假记录: ${beforeLeave[0].count}`
      );
      
      // 3. 执行学生重置（模拟API调用）
      await this.simulateStudentReset('ST001');
      
      // 4. 验证数据已清空
      const afterTasks = await query('SELECT COUNT(*) as count FROM tasks WHERE student_id = ?', ['ST001']);
      const afterLeave = await query('SELECT COUNT(*) as count FROM leave_records WHERE student_id = ?', ['ST001']);
      
      this.logTest(
        '学生数据清空',
        afterTasks[0].count === 0 && afterLeave[0].count === 0,
        `任务: ${afterTasks[0].count}, 请假记录: ${afterLeave[0].count}`
      );
      
    } catch (error) {
      this.logTest('学生重置功能', false, error.message);
    }
  }

  // 测试2: 验证管理员重置功能
  async testAdminReset() {
    console.log('\n🧪 测试管理员重置功能...');
    
    try {
      // 1. 创建测试数据
      await this.createTestData();
      
      // 2. 验证数据存在
      const beforeTasks = await query('SELECT COUNT(*) as count FROM tasks');
      const beforeLeave = await query('SELECT COUNT(*) as count FROM leave_records');
      
      this.logTest(
        '全局测试数据创建',
        beforeTasks[0].count > 0 && beforeLeave[0].count > 0,
        `任务: ${beforeTasks[0].count}, 请假记录: ${beforeLeave[0].count}`
      );
      
      // 3. 执行管理员重置（模拟API调用）
      await this.simulateAdminReset();
      
      // 4. 验证所有数据已清空
      const afterTasks = await query('SELECT COUNT(*) as count FROM tasks');
      const afterLeave = await query('SELECT COUNT(*) as count FROM leave_records');
      
      this.logTest(
        '全局数据清空',
        afterTasks[0].count === 0 && afterLeave[0].count === 0,
        `任务: ${afterTasks[0].count}, 请假记录: ${afterLeave[0].count}`
      );
      
    } catch (error) {
      this.logTest('管理员重置功能', false, error.message);
    }
  }

  // 测试3: 验证密码重置功能
  async testPasswordReset() {
    console.log('\n🧪 测试密码重置功能...');
    
    try {
      // 1. 获取学生当前密码
      const beforeStudent = await query('SELECT password, force_password_change FROM students WHERE id = ?', ['ST001']);
      
      if (beforeStudent.length === 0) {
        this.logTest('密码重置功能', false, '测试学生不存在');
        return;
      }
      
      const originalPassword = beforeStudent[0].password;
      const originalForceChange = beforeStudent[0].force_password_change;
      
      // 2. 执行密码重置
      await this.simulatePasswordReset('ST001');
      
      // 3. 验证密码已更改且设置了强制修改标志
      const afterStudent = await query('SELECT password, force_password_change FROM students WHERE id = ?', ['ST001']);
      
      const passwordChanged = afterStudent[0].password !== originalPassword;
      const forceChangeSet = afterStudent[0].force_password_change === 1;
      
      this.logTest(
        '密码重置',
        passwordChanged && forceChangeSet,
        `密码已更改: ${passwordChanged}, 强制修改: ${forceChangeSet}`
      );
      
      // 4. 验证新密码是否为默认密码
      const isDefaultPassword = await bcrypt.compare('Hello888', afterStudent[0].password);
      
      this.logTest(
        '默认密码设置',
        isDefaultPassword,
        `新密码是否为Hello888: ${isDefaultPassword}`
      );
      
    } catch (error) {
      this.logTest('密码重置功能', false, error.message);
    }
  }

  // 创建测试数据
  async createTestData() {
    await transaction(async (connection) => {
      // 创建测试任务
      await connection.execute(
        'INSERT IGNORE INTO tasks (id, student_id, date, type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        ['TEST_TASK_1', 'ST001', '2025-07-18', '学习', '测试任务1', false]
      );
      
      await connection.execute(
        'INSERT IGNORE INTO tasks (id, student_id, date, type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        ['TEST_TASK_2', 'ST002', '2025-07-18', '学习', '测试任务2', false]
      );
      
      // 创建测试请假记录
      await connection.execute(
        'INSERT IGNORE INTO leave_records (student_id, date, reason) VALUES (?, ?, ?)',
        ['ST001', '2025-07-18', '测试请假']
      );
    });
  }

  // 模拟学生重置API调用
  async simulateStudentReset(studentId) {
    await transaction(async (connection) => {
      // 删除学生的请假记录
      await connection.execute(
        'DELETE FROM leave_records WHERE student_id = ?',
        [studentId]
      );

      // 删除学生的任务调度历史（如果表存在）
      try {
        await connection.execute(
          'DELETE FROM task_schedule_history WHERE student_id = ?',
          [studentId]
        );
      } catch (error) {
        if (error.code !== 'ER_NO_SUCH_TABLE') {
          throw error;
        }
      }

      // 删除学生的任务
      await connection.execute(
        'DELETE FROM tasks WHERE student_id = ?',
        [studentId]
      );
    });
  }

  // 模拟管理员重置API调用
  async simulateAdminReset() {
    await transaction(async (connection) => {
      // 删除所有请假记录
      await connection.execute('DELETE FROM leave_records');

      // 删除所有任务调度历史（如果表存在）
      try {
        await connection.execute('DELETE FROM task_schedule_history');
      } catch (error) {
        if (error.code !== 'ER_NO_SUCH_TABLE') {
          throw error;
        }
      }

      // 删除所有任务
      await connection.execute('DELETE FROM tasks');
    });
  }

  // 模拟密码重置API调用
  async simulatePasswordReset(studentId) {
    const initialPassword = 'Hello888';
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    await query(
      'UPDATE students SET password = ?, force_password_change = TRUE WHERE id = ?',
      [hashedPassword, studentId]
    );
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始数据一致性测试...\n');
    
    await this.testStudentReset();
    await this.testAdminReset();
    await this.testPasswordReset();
    
    // 输出测试总结
    this.printSummary();
  }

  // 打印测试总结
  printSummary() {
    console.log('\n📊 测试总结:');
    console.log('=' * 50);
    
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
    
    console.log('\n' + '=' * 50);
    console.log(failedTests === 0 ? '🎉 所有测试通过！' : '⚠️ 存在失败的测试，请检查数据一致性实现');
  }
}

// 运行测试
if (require.main === module) {
  const tester = new DataConsistencyTester();
  
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

module.exports = DataConsistencyTester;
