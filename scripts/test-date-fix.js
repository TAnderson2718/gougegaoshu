#!/usr/bin/env node

/**
 * 测试日期修复效果的脚本
 */

const http = require('http');

class DateFixTester {
  constructor() {
    this.baseUrl = 'localhost';
    this.port = 3001;
    this.studentToken = null;
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

  // 登录学生
  async loginStudent() {
    try {
      const response = await this.makeRequest('POST', '/auth/login', {
        studentId: 'ST001',
        password: 'Hello888'
      });

      if (response.data.success) {
        this.studentToken = response.data.data.token;
        console.log('✅ 学生登录成功');
        return true;
      } else {
        console.log('❌ 学生登录失败:', response.data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ 学生登录错误:', error.message);
      return false;
    }
  }

  // 测试日期修复效果
  async testDateFix() {
    console.log('🔍 测试日期修复效果...\n');

    try {
      // 获取7月13-14日的任务数据
      const response = await this.makeRequest('GET', 
        '/tasks?startDate=2025-07-13&endDate=2025-07-14', null, this.studentToken);

      if (response.data.success) {
        const tasksByDate = response.data.data;
        
        console.log('📊 API返回的任务数据:');
        Object.keys(tasksByDate).sort().forEach(date => {
          const tasks = tasksByDate[date];
          const restTasks = tasks.filter(t => t.type === '休息');
          const emoji = restTasks.length > 0 ? '😴' : '📚';
          
          console.log(`\n${date}: ${emoji} (${tasks.length}个任务)`);
          tasks.forEach(task => {
            const icon = task.type === '休息' ? '😴' : '📚';
            console.log(`  ${icon} ${task.type}: ${task.title}`);
          });
        });

        // 验证13号是否有休息任务
        const july13Tasks = tasksByDate['2025-07-13'] || [];
        const july13RestTasks = july13Tasks.filter(t => t.type === '休息');
        
        console.log('\n🎯 验证结果:');
        console.log(`7月13日任务总数: ${july13Tasks.length}`);
        console.log(`7月13日休息任务: ${july13RestTasks.length}`);
        
        if (july13RestTasks.length > 0) {
          console.log('✅ 修复成功！7月13日正确显示为休息日');
          july13RestTasks.forEach(task => {
            console.log(`   - ${task.title}`);
          });
        } else {
          console.log('❌ 修复失败！7月13日没有休息任务');
        }

        // 检查14号是否是正常学习日
        const july14Tasks = tasksByDate['2025-07-14'] || [];
        const july14RestTasks = july14Tasks.filter(t => t.type === '休息');
        
        console.log(`\n7月14日任务总数: ${july14Tasks.length}`);
        console.log(`7月14日休息任务: ${july14RestTasks.length}`);
        
        if (july14RestTasks.length === 0 && july14Tasks.length > 0) {
          console.log('✅ 7月14日正确显示为学习日');
        } else if (july14RestTasks.length > 0) {
          console.log('⚠️ 7月14日显示为休息日');
        } else {
          console.log('ℹ️ 7月14日没有任务');
        }

      } else {
        console.log('❌ 获取任务失败:', response.data.message);
      }

    } catch (error) {
      console.log('❌ 测试失败:', error.message);
    }
  }

  // 运行测试
  async runTest() {
    console.log('🚀 开始测试日期修复效果...\n');
    
    const loginSuccess = await this.loginStudent();
    if (!loginSuccess) {
      console.log('❌ 登录失败，无法继续测试');
      return;
    }
    
    await this.testDateFix();
    
    console.log('\n✅ 测试完成');
  }
}

// 运行测试
if (require.main === module) {
  const tester = new DateFixTester();
  
  tester.runTest()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = DateFixTester;
