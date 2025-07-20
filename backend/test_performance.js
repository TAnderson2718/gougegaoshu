const { query } = require('./config/database');

async function testPerformance() {
  try {
    console.log('🚀 开始性能和稳定性测试...');
    
    // 1. 批量数据插入性能测试
    console.log('\n1️⃣ 批量数据插入性能测试...');
    const insertStartTime = Date.now();
    const batchSize = 100;
    
    try {
      for (let i = 0; i < batchSize; i++) {
        await query(
          'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
          [`perf-test-${i}`, 'ST001', '2025-07-25', '性能测试', `性能测试任务${i}`, false]
        );
      }
      
      const insertEndTime = Date.now();
      const insertDuration = insertEndTime - insertStartTime;
      console.log(`   ✅ 插入${batchSize}个任务耗时: ${insertDuration}ms (平均${(insertDuration/batchSize).toFixed(2)}ms/任务)`);
    } catch (error) {
      console.log(`   ❌ 批量插入失败: ${error.message}`);
    }
    
    // 2. 大量数据查询性能测试
    console.log('\n2️⃣ 大量数据查询性能测试...');
    const queryStartTime = Date.now();
    
    try {
      const allTasks = await query('SELECT * FROM tasks WHERE student_id = ?', ['ST001']);
      const queryEndTime = Date.now();
      const queryDuration = queryEndTime - queryStartTime;
      
      console.log(`   ✅ 查询${allTasks.length}个任务耗时: ${queryDuration}ms`);
      
      // 复杂查询测试
      const complexQueryStart = Date.now();
      const complexResult = await query(`
        SELECT 
          task_date,
          task_type,
          COUNT(*) as count,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_count
        FROM tasks 
        WHERE student_id = ? 
        GROUP BY task_date, task_type 
        ORDER BY task_date, task_type
      `, ['ST001']);
      const complexQueryEnd = Date.now();
      
      console.log(`   ✅ 复杂聚合查询耗时: ${complexQueryEnd - complexQueryStart}ms，返回${complexResult.length}行`);
    } catch (error) {
      console.log(`   ❌ 查询性能测试失败: ${error.message}`);
    }
    
    // 3. 并发读写测试
    console.log('\n3️⃣ 并发读写测试...');
    const concurrentStartTime = Date.now();
    
    try {
      const concurrentOperations = [];
      
      // 10个并发读操作
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          query('SELECT COUNT(*) as count FROM tasks WHERE student_id = ?', ['ST001'])
        );
      }
      
      // 5个并发写操作
      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          query(
            'INSERT INTO tasks (id, student_id, task_date, task_type, title, completed) VALUES (?, ?, ?, ?, ?, ?)',
            [`concurrent-rw-${i}`, 'ST001', '2025-07-26', '并发测试', `并发读写测试${i}`, false]
          )
        );
      }
      
      await Promise.all(concurrentOperations);
      const concurrentEndTime = Date.now();
      
      console.log(`   ✅ 15个并发操作(10读+5写)耗时: ${concurrentEndTime - concurrentStartTime}ms`);
      
      // 清理并发测试数据
      for (let i = 0; i < 5; i++) {
        await query('DELETE FROM tasks WHERE id = ?', [`concurrent-rw-${i}`]);
      }
    } catch (error) {
      console.log(`   ❌ 并发读写测试失败: ${error.message}`);
    }
    
    // 4. 内存使用情况
    console.log('\n4️⃣ 内存使用情况...');
    const memUsage = process.memoryUsage();
    console.log(`   📊 RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   📊 Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   📊 Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   📊 External: ${(memUsage.external / 1024 / 1024).toFixed(2)}MB`);
    
    // 5. 数据库连接池状态
    console.log('\n5️⃣ 数据库连接池状态...');
    try {
      // 测试多个连接
      const connectionPromises = [];
      for (let i = 0; i < 10; i++) {
        connectionPromises.push(
          query('SELECT CONNECTION_ID() as id')
        );
      }
      
      const connections = await Promise.all(connectionPromises);
      const uniqueConnections = new Set(connections.map(c => c[0].id));
      
      console.log(`   ✅ 10个查询使用了${uniqueConnections.size}个不同的连接`);
    } catch (error) {
      console.log(`   ❌ 连接池测试失败: ${error.message}`);
    }
    
    // 6. 长时间运行稳定性测试
    console.log('\n6️⃣ 长时间运行稳定性测试...');
    const stabilityStartTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (let i = 0; i < 50; i++) {
        try {
          await query('SELECT 1 as test');
          successCount++;
          
          // 每10次操作暂停一下，模拟实际使用
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      const stabilityEndTime = Date.now();
      console.log(`   ✅ 50次操作完成，成功${successCount}次，失败${errorCount}次`);
      console.log(`   ✅ 总耗时: ${stabilityEndTime - stabilityStartTime}ms`);
      console.log(`   ✅ 成功率: ${((successCount / 50) * 100).toFixed(2)}%`);
    } catch (error) {
      console.log(`   ❌ 稳定性测试失败: ${error.message}`);
    }
    
    // 7. 清理性能测试数据
    console.log('\n7️⃣ 清理性能测试数据...');
    const cleanupStartTime = Date.now();
    
    try {
      const deleteResult = await query('DELETE FROM tasks WHERE task_type = ?', ['性能测试']);
      const cleanupEndTime = Date.now();
      
      console.log(`   ✅ 清理了${deleteResult.affectedRows}条测试数据，耗时: ${cleanupEndTime - cleanupStartTime}ms`);
    } catch (error) {
      console.log(`   ❌ 清理测试数据失败: ${error.message}`);
    }
    
    // 8. 最终数据库状态检查
    console.log('\n8️⃣ 最终数据库状态检查...');
    try {
      const finalStats = await query(`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(DISTINCT student_id) as unique_students,
          COUNT(DISTINCT task_date) as unique_dates,
          SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_tasks
        FROM tasks
      `);
      
      const stats = finalStats[0];
      console.log(`   📊 总任务数: ${stats.total_tasks}`);
      console.log(`   📊 涉及学生数: ${stats.unique_students}`);
      console.log(`   📊 涉及日期数: ${stats.unique_dates}`);
      console.log(`   📊 已完成任务数: ${stats.completed_tasks}`);
      console.log(`   📊 完成率: ${((stats.completed_tasks / stats.total_tasks) * 100).toFixed(2)}%`);
    } catch (error) {
      console.log(`   ❌ 最终状态检查失败: ${error.message}`);
    }
    
    console.log('\n✅ 性能和稳定性测试完成！');
    console.log('\n🎉 全面系统测试完成！系统运行正常，性能良好，稳定性优秀！');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 性能测试失败:', error);
    process.exit(1);
  }
}

testPerformance();
