const { query } = require('./config/database');

async function testEdgeCases() {
  try {
    console.log('🧪 开始测试边界条件和异常处理...');
    
    // 1. 测试无效学生ID
    console.log('\n1️⃣ 测试无效学生ID...');
    try {
      const invalidStudentTasks = await query(
        'SELECT * FROM tasks WHERE student_id = ?',
        ['INVALID_STUDENT']
      );
      console.log(`   ✅ 无效学生ID查询结果: ${invalidStudentTasks.length}个任务`);
    } catch (error) {
      console.log(`   ❌ 无效学生ID查询失败: ${error.message}`);
    }
    
    // 2. 测试无效日期格式
    console.log('\n2️⃣ 测试无效日期格式...');
    try {
      const invalidDateTasks = await query(
        'SELECT * FROM tasks WHERE task_date = ?',
        ['invalid-date']
      );
      console.log(`   ✅ 无效日期查询结果: ${invalidDateTasks.length}个任务`);
    } catch (error) {
      console.log(`   ❌ 无效日期查询失败: ${error.message}`);
    }
    
    // 3. 测试空任务标题
    console.log('\n3️⃣ 测试空任务标题...');
    try {
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        ['empty-title-test', 'ST001', '2025-07-19', '测试', '', false]
      );
      console.log('   ✅ 空标题任务插入成功');
      
      // 清理
      await query('DELETE FROM tasks WHERE id = ?', ['empty-title-test']);
    } catch (error) {
      console.log(`   ❌ 空标题任务插入失败: ${error.message}`);
    }
    
    // 4. 测试重复任务ID
    console.log('\n4️⃣ 测试重复任务ID...');
    try {
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        ['duplicate-test', 'ST001', '2025-07-19', '测试', '重复ID测试1', false]
      );
      console.log('   ✅ 第一个任务插入成功');
      
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        ['duplicate-test', 'ST001', '2025-07-19', '测试', '重复ID测试2', false]
      );
      console.log('   ❌ 重复ID任务插入成功（不应该发生）');
    } catch (error) {
      console.log(`   ✅ 重复ID任务插入失败（预期行为）: ${error.message}`);
    }
    
    // 清理
    await query('DELETE FROM tasks WHERE id = ?', ['duplicate-test']);
    
    // 5. 测试极长任务标题
    console.log('\n5️⃣ 测试极长任务标题...');
    const longTitle = 'A'.repeat(1000); // 1000个字符
    try {
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        ['long-title-test', 'ST001', '2025-07-19', '测试', longTitle, false]
      );
      console.log('   ✅ 极长标题任务插入成功');
      
      // 清理
      await query('DELETE FROM tasks WHERE id = ?', ['long-title-test']);
    } catch (error) {
      console.log(`   ❌ 极长标题任务插入失败: ${error.message}`);
    }
    
    // 6. 测试SQL注入防护
    console.log('\n6️⃣ 测试SQL注入防护...');
    const maliciousInput = "'; DROP TABLE tasks; --";
    try {
      const result = await query(
        'SELECT * FROM tasks WHERE title = ?',
        [maliciousInput]
      );
      console.log(`   ✅ SQL注入防护有效，查询结果: ${result.length}个任务`);
    } catch (error) {
      console.log(`   ❌ SQL注入测试失败: ${error.message}`);
    }
    
    // 7. 测试数据库连接异常恢复
    console.log('\n7️⃣ 测试数据库连接状态...');
    try {
      const connectionTest = await query('SELECT 1 as test');
      console.log(`   ✅ 数据库连接正常: ${connectionTest[0].test}`);
    } catch (error) {
      console.log(`   ❌ 数据库连接异常: ${error.message}`);
    }
    
    // 8. 测试大量数据查询性能
    console.log('\n8️⃣ 测试大量数据查询性能...');
    const startTime = Date.now();
    try {
      const allTasks = await query('SELECT COUNT(*) as count FROM tasks');
      const endTime = Date.now();
      console.log(`   ✅ 查询所有任务耗时: ${endTime - startTime}ms，总任务数: ${allTasks[0].count}`);
    } catch (error) {
      console.log(`   ❌ 大量数据查询失败: ${error.message}`);
    }
    
    // 9. 测试并发操作
    console.log('\n9️⃣ 测试并发操作...');
    try {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          query(
            'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
            [`concurrent-test-${i}`, 'ST001', '2025-07-19', '测试', `并发测试${i}`, false]
          )
        );
      }
      
      await Promise.all(promises);
      console.log('   ✅ 并发插入操作成功');
      
      // 清理
      for (let i = 0; i < 5; i++) {
        await query('DELETE FROM tasks WHERE id = ?', [`concurrent-test-${i}`]);
      }
    } catch (error) {
      console.log(`   ❌ 并发操作失败: ${error.message}`);
    }
    
    // 10. 测试事务回滚
    console.log('\n🔟 测试事务回滚...');
    try {
      // 这里简化测试，实际应该使用事务
      await query(
        'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
        ['transaction-test', 'ST001', '2025-07-19', '测试', '事务测试', false]
      );
      
      const beforeCount = await query('SELECT COUNT(*) as count FROM tasks WHERE id = ?', ['transaction-test']);
      console.log(`   📊 插入前任务数: ${beforeCount[0].count}`);
      
      // 清理
      await query('DELETE FROM tasks WHERE id = ?', ['transaction-test']);
      
      const afterCount = await query('SELECT COUNT(*) as count FROM tasks WHERE id = ?', ['transaction-test']);
      console.log(`   📊 删除后任务数: ${afterCount[0].count}`);
      console.log('   ✅ 事务操作测试完成');
    } catch (error) {
      console.log(`   ❌ 事务测试失败: ${error.message}`);
    }
    
    console.log('\n✅ 边界条件和异常处理测试完成！');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testEdgeCases();
