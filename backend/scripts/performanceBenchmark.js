#!/usr/bin/env node

const { performance } = require('perf_hooks');
const { databaseManager } = require('../config/database');
const performanceOptimizer = require('../services/PerformanceOptimizer');
const { initializeDatabase } = require('./initDatabase');
const logger = require('../utils/Logger');

/**
 * 性能基准测试脚本
 * 测试数据库查询、缓存和连接池性能
 */

class PerformanceBenchmark {
  constructor() {
    this.results = {
      databaseQueries: {},
      cachePerformance: {},
      connectionPool: {},
      overallMetrics: {}
    };
  }

  /**
   * 运行所有基准测试
   */
  async runAllBenchmarks() {
    console.log('🚀 开始性能基准测试...\n');

    try {
      // 初始化测试环境
      await this.setupTestEnvironment();

      // 数据库查询性能测试
      await this.benchmarkDatabaseQueries();

      // 缓存性能测试
      await this.benchmarkCachePerformance();

      // 连接池性能测试
      await this.benchmarkConnectionPool();

      // 批量操作性能测试
      await this.benchmarkBatchOperations();

      // 并发性能测试
      await this.benchmarkConcurrentOperations();

      // 生成报告
      this.generateReport();

    } catch (error) {
      console.error('❌ 基准测试失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 设置测试环境
   */
  async setupTestEnvironment() {
    console.log('📋 设置测试环境...');
    
    // 设置测试环境变量
    process.env.NODE_ENV = 'benchmark';
    process.env.DB_NAME = 'benchmark_test.db';

    // 初始化数据库
    await initializeDatabase();

    // 插入测试数据
    await this.insertBenchmarkData();

    console.log('✅ 测试环境设置完成\n');
  }

  /**
   * 插入基准测试数据
   */
  async insertBenchmarkData() {
    const db = await databaseManager.getConnection();
    
    console.log('📊 插入基准测试数据...');

    // 插入大量学生数据
    const students = [];
    for (let i = 1; i <= 1000; i++) {
      students.push([
        `BENCH${i.toString().padStart(4, '0')}`,
        `测试学生${i}`,
        '$2a$10$example.hash.for.benchmark.testing',
        '男',
        20 + (i % 10),
        '大四',
        '计算机科学与技术',
        `测试学生${i}的简介`,
        null
      ]);
    }

    // 批量插入学生
    const insertStudentSql = `
      INSERT INTO students (id, name, password, gender, age, grade, major, bio, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const student of students) {
      await db.run(insertStudentSql, student);
    }

    // 插入大量任务数据
    const tasks = [];
    const taskTypes = ['数学', '英语', '政治', '专业课', '复习'];
    const today = new Date();

    for (let i = 1; i <= 5000; i++) {
      const studentId = `BENCH${Math.ceil(i / 5).toString().padStart(4, '0')}`;
      const taskDate = new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      tasks.push([
        `TASK_BENCH_${i}`,
        studentId,
        taskDate.toISOString().split('T')[0],
        taskTypes[i % taskTypes.length],
        `基准测试任务${i}`,
        Math.random() > 0.3 ? 1 : 0, // 70%完成率
        Math.floor(Math.random() * 3),
        Math.floor(Math.random() * 60),
        Math.random() > 0.8 ? '测试证明' : null
      ]);
    }

    // 批量插入任务
    const insertTaskSql = `
      INSERT INTO tasks (id, student_id, task_date, task_type, title, completed, duration_hour, duration_minute, proof_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const task of tasks) {
      await db.run(insertTaskSql, task);
    }

    console.log(`✅ 插入了 ${students.length} 个学生和 ${tasks.length} 个任务`);
  }

  /**
   * 数据库查询性能测试
   */
  async benchmarkDatabaseQueries() {
    console.log('🔍 数据库查询性能测试...');

    const queries = [
      {
        name: '简单查询 - 按ID查找学生',
        sql: 'SELECT * FROM students WHERE id = ?',
        params: ['BENCH0001']
      },
      {
        name: '复杂查询 - 学生任务统计',
        sql: `
          SELECT s.id, s.name, 
                 COUNT(t.id) as total_tasks,
                 SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completed_tasks
          FROM students s
          LEFT JOIN tasks t ON s.id = t.student_id
          WHERE s.id LIKE 'BENCH%'
          GROUP BY s.id, s.name
          LIMIT 100
        `,
        params: []
      },
      {
        name: '范围查询 - 按日期查找任务',
        sql: `
          SELECT * FROM tasks 
          WHERE task_date BETWEEN ? AND ?
          ORDER BY task_date DESC
          LIMIT 500
        `,
        params: ['2024-01-01', '2024-12-31']
      },
      {
        name: '聚合查询 - 任务完成率统计',
        sql: `
          SELECT task_type,
                 COUNT(*) as total,
                 SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                 ROUND(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as rate
          FROM tasks
          GROUP BY task_type
        `,
        params: []
      }
    ];

    for (const queryTest of queries) {
      const times = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await performanceOptimizer.optimizeQuery(queryTest.sql, queryTest.params);
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      this.results.databaseQueries[queryTest.name] = {
        iterations,
        averageTime: avgTime.toFixed(2),
        minTime: minTime.toFixed(2),
        maxTime: maxTime.toFixed(2),
        totalTime: times.reduce((a, b) => a + b, 0).toFixed(2)
      };

      console.log(`  ✅ ${queryTest.name}: 平均 ${avgTime.toFixed(2)}ms`);
    }

    console.log('');
  }

  /**
   * 缓存性能测试
   */
  async benchmarkCachePerformance() {
    console.log('💾 缓存性能测试...');

    const testQuery = 'SELECT * FROM students WHERE id LIKE ? LIMIT 50';
    const testParams = ['BENCH%'];

    // 测试缓存未命中
    const cacheMissTimes = [];
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      await performanceOptimizer.optimizeQuery(testQuery, testParams, { useCache: false });
      const end = performance.now();
      cacheMissTimes.push(end - start);
    }

    // 测试缓存命中
    const cacheHitTimes = [];
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      await performanceOptimizer.optimizeQuery(testQuery, testParams, { useCache: true });
      const end = performance.now();
      cacheHitTimes.push(end - start);
    }

    const avgMissTime = cacheMissTimes.reduce((a, b) => a + b, 0) / cacheMissTimes.length;
    const avgHitTime = cacheHitTimes.reduce((a, b) => a + b, 0) / cacheHitTimes.length;
    const speedup = avgMissTime / avgHitTime;

    this.results.cachePerformance = {
      cacheMissAverage: avgMissTime.toFixed(2),
      cacheHitAverage: avgHitTime.toFixed(2),
      speedupFactor: speedup.toFixed(2),
      cacheEfficiency: ((1 - avgHitTime / avgMissTime) * 100).toFixed(2)
    };

    console.log(`  ✅ 缓存未命中平均时间: ${avgMissTime.toFixed(2)}ms`);
    console.log(`  ✅ 缓存命中平均时间: ${avgHitTime.toFixed(2)}ms`);
    console.log(`  ✅ 性能提升: ${speedup.toFixed(2)}x\n`);
  }

  /**
   * 连接池性能测试
   */
  async benchmarkConnectionPool() {
    console.log('🔗 连接池性能测试...');

    const concurrentQueries = 20;
    const iterations = 10;
    const testQuery = 'SELECT COUNT(*) as count FROM tasks WHERE student_id LIKE ?';
    const testParams = ['BENCH%'];

    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      const promises = [];
      for (let j = 0; j < concurrentQueries; j++) {
        promises.push(performanceOptimizer.optimizeQuery(testQuery, testParams));
      }
      
      await Promise.all(promises);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const throughput = (concurrentQueries * iterations) / (times.reduce((a, b) => a + b, 0) / 1000);

    this.results.connectionPool = {
      concurrentQueries,
      iterations,
      averageTime: avgTime.toFixed(2),
      throughput: throughput.toFixed(2),
      queriesPerSecond: (concurrentQueries / (avgTime / 1000)).toFixed(2)
    };

    console.log(`  ✅ 并发查询数: ${concurrentQueries}`);
    console.log(`  ✅ 平均响应时间: ${avgTime.toFixed(2)}ms`);
    console.log(`  ✅ 吞吐量: ${throughput.toFixed(2)} 查询/秒\n`);
  }

  /**
   * 批量操作性能测试
   */
  async benchmarkBatchOperations() {
    console.log('📦 批量操作性能测试...');

    const batchSizes = [10, 50, 100, 500];
    const batchResults = {};

    for (const batchSize of batchSizes) {
      const queries = [];
      for (let i = 0; i < batchSize; i++) {
        queries.push({
          sql: 'SELECT * FROM students WHERE id = ?',
          params: [`BENCH${(i + 1).toString().padStart(4, '0')}`]
        });
      }

      const start = performance.now();
      await performanceOptimizer.batchOptimizedQuery(queries);
      const end = performance.now();

      const totalTime = end - start;
      const avgTimePerQuery = totalTime / batchSize;

      batchResults[`batch_${batchSize}`] = {
        batchSize,
        totalTime: totalTime.toFixed(2),
        averagePerQuery: avgTimePerQuery.toFixed(2),
        queriesPerSecond: (batchSize / (totalTime / 1000)).toFixed(2)
      };

      console.log(`  ✅ 批量大小 ${batchSize}: ${totalTime.toFixed(2)}ms (${avgTimePerQuery.toFixed(2)}ms/查询)`);
    }

    this.results.batchOperations = batchResults;
    console.log('');
  }

  /**
   * 并发操作性能测试
   */
  async benchmarkConcurrentOperations() {
    console.log('⚡ 并发操作性能测试...');

    const concurrencyLevels = [1, 5, 10, 20, 50];
    const concurrentResults = {};

    for (const concurrency of concurrencyLevels) {
      const start = performance.now();
      
      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        const studentId = `BENCH${(i % 100 + 1).toString().padStart(4, '0')}`;
        promises.push(
          performanceOptimizer.optimizeQuery(
            'SELECT COUNT(*) as task_count FROM tasks WHERE student_id = ?',
            [studentId]
          )
        );
      }
      
      await Promise.all(promises);
      const end = performance.now();

      const totalTime = end - start;
      const throughput = concurrency / (totalTime / 1000);

      concurrentResults[`concurrency_${concurrency}`] = {
        concurrency,
        totalTime: totalTime.toFixed(2),
        throughput: throughput.toFixed(2),
        averageLatency: (totalTime / concurrency).toFixed(2)
      };

      console.log(`  ✅ 并发级别 ${concurrency}: ${totalTime.toFixed(2)}ms (${throughput.toFixed(2)} 查询/秒)`);
    }

    this.results.concurrentOperations = concurrentResults;
    console.log('');
  }

  /**
   * 生成性能报告
   */
  generateReport() {
    console.log('📊 生成性能基准测试报告...\n');

    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      },
      results: this.results,
      summary: this.generateSummary()
    };

    // 保存报告到文件
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, '..', 'reports', `performance-benchmark-${Date.now()}.json`);
    
    // 确保reports目录存在
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // 打印摘要
    this.printSummary();

    console.log(`📄 详细报告已保存到: ${reportPath}`);
  }

  /**
   * 生成性能摘要
   */
  generateSummary() {
    const dbQueries = Object.values(this.results.databaseQueries);
    const avgQueryTime = dbQueries.reduce((sum, q) => sum + parseFloat(q.averageTime), 0) / dbQueries.length;

    return {
      averageQueryTime: avgQueryTime.toFixed(2),
      cacheSpeedup: this.results.cachePerformance.speedupFactor,
      maxThroughput: Math.max(
        ...Object.values(this.results.concurrentOperations).map(r => parseFloat(r.throughput))
      ).toFixed(2),
      recommendedConcurrency: this.findOptimalConcurrency()
    };
  }

  /**
   * 找到最优并发级别
   */
  findOptimalConcurrency() {
    const concurrentResults = this.results.concurrentOperations;
    let bestConcurrency = 1;
    let bestThroughput = 0;

    for (const [key, result] of Object.entries(concurrentResults)) {
      const throughput = parseFloat(result.throughput);
      if (throughput > bestThroughput) {
        bestThroughput = throughput;
        bestConcurrency = result.concurrency;
      }
    }

    return bestConcurrency;
  }

  /**
   * 打印性能摘要
   */
  printSummary() {
    console.log('📈 性能基准测试摘要');
    console.log('========================');
    console.log(`平均查询时间: ${this.generateSummary().averageQueryTime}ms`);
    console.log(`缓存性能提升: ${this.results.cachePerformance.speedupFactor}x`);
    console.log(`最大吞吐量: ${this.generateSummary().maxThroughput} 查询/秒`);
    console.log(`推荐并发级别: ${this.generateSummary().recommendedConcurrency}`);
    console.log(`缓存效率: ${this.results.cachePerformance.cacheEfficiency}%`);
    console.log('========================\n');
  }
}

// 运行基准测试
async function main() {
  const benchmark = new PerformanceBenchmark();
  await benchmark.runAllBenchmarks();
  process.exit(0);
}

// 检查是否直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 基准测试失败:', error);
    process.exit(1);
  });
}

module.exports = PerformanceBenchmark;
