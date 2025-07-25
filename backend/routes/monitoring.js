const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const metricsService = require('../services/MetricsService');
const healthCheckService = require('../services/HealthCheckService');
const performanceOptimizer = require('../services/PerformanceOptimizer');
const { asyncHandler } = require('../utils/ResponseHandler');

const router = express.Router();

// 健康检查端点（公开访问）
router.get('/health', asyncHandler(async (req, res) => {
  const healthStatus = await healthCheckService.getHealthSummary();
  
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                    healthStatus.status === 'warning' ? 200 : 503;
  
  res.status(statusCode).json({
    success: healthStatus.status !== 'unhealthy',
    ...healthStatus
  });
}));

// 详细健康检查（管理员访问）
router.get('/health/detailed', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const healthStatus = await healthCheckService.getHealthStatus();
  
  res.json({
    success: true,
    data: healthStatus
  });
}));

// 指标摘要（管理员访问）
router.get('/metrics', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const metrics = metricsService.getMetricsSummary();
  
  res.json({
    success: true,
    data: metrics
  });
}));

// 详细指标（管理员访问）
router.get('/metrics/detailed', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const metrics = metricsService.getAllMetrics();
  
  res.json({
    success: true,
    data: metrics
  });
}));

// 系统指标
router.get('/metrics/system', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const metrics = metricsService.getAllMetrics();
  
  res.json({
    success: true,
    data: {
      system: metrics.system,
      timestamp: metrics.timestamp
    }
  });
}));

// HTTP指标
router.get('/metrics/http', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const metrics = metricsService.getAllMetrics();
  
  res.json({
    success: true,
    data: {
      http: metrics.http,
      timestamp: metrics.timestamp
    }
  });
}));

// 数据库指标
router.get('/metrics/database', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const metrics = metricsService.getAllMetrics();
  
  res.json({
    success: true,
    data: {
      database: metrics.database,
      timestamp: metrics.timestamp
    }
  });
}));

// 缓存指标
router.get('/metrics/cache', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const metrics = metricsService.getAllMetrics();
  
  res.json({
    success: true,
    data: {
      cache: metrics.cache,
      timestamp: metrics.timestamp
    }
  });
}));

// 业务指标
router.get('/metrics/business', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const metrics = metricsService.getAllMetrics();
  
  res.json({
    success: true,
    data: {
      business: metrics.business,
      timestamp: metrics.timestamp
    }
  });
}));

// 错误指标
router.get('/metrics/errors', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const metrics = metricsService.getAllMetrics();
  
  res.json({
    success: true,
    data: {
      errors: metrics.errors,
      timestamp: metrics.timestamp
    }
  });
}));

// 重置指标（管理员访问）
router.post('/metrics/reset', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  metricsService.resetMetrics();
  
  res.json({
    success: true,
    message: '指标已重置'
  });
}));

// 更新健康检查阈值（管理员访问）
router.put('/health/thresholds', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { thresholds } = req.body;
  
  if (!thresholds || typeof thresholds !== 'object') {
    return res.status(400).json({
      success: false,
      message: '无效的阈值配置'
    });
  }
  
  healthCheckService.updateThresholds(thresholds);
  
  res.json({
    success: true,
    message: '健康检查阈值已更新'
  });
}));

// 添加自定义健康检查（管理员访问）
router.post('/health/checks', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { key, name, critical, timeout } = req.body;
  
  if (!key || !name) {
    return res.status(400).json({
      success: false,
      message: '缺少必需的参数: key, name'
    });
  }
  
  // 这里应该有一个自定义检查函数，暂时返回成功
  const checkConfig = {
    name,
    check: async () => ({ status: 'healthy', message: '自定义检查正常' }),
    critical: critical || false,
    timeout: timeout || 5000
  };
  
  healthCheckService.addCustomCheck(key, checkConfig);
  
  res.json({
    success: true,
    message: '自定义健康检查已添加'
  });
}));

// 移除健康检查（管理员访问）
router.delete('/health/checks/:key', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { key } = req.params;
  
  const removed = healthCheckService.removeCheck(key);
  
  if (removed) {
    res.json({
      success: true,
      message: '健康检查已移除'
    });
  } else {
    res.status(404).json({
      success: false,
      message: '健康检查不存在'
    });
  }
}));

// 获取监控仪表板数据（管理员访问）
router.get('/dashboard', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const [healthStatus, metrics] = await Promise.all([
    healthCheckService.getHealthSummary(),
    metricsService.getMetricsSummary()
  ]);
  
  const dashboardData = {
    health: healthStatus,
    metrics,
    alerts: [],
    timestamp: new Date().toISOString()
  };
  
  // 生成告警
  if (healthStatus.status !== 'healthy') {
    dashboardData.alerts.push({
      type: 'health',
      severity: healthStatus.status === 'unhealthy' ? 'critical' : 'warning',
      message: `系统健康状态: ${healthStatus.status}`,
      timestamp: healthStatus.timestamp
    });
  }
  
  if (metrics.http.errorRate > 5) {
    dashboardData.alerts.push({
      type: 'http',
      severity: 'warning',
      message: `HTTP错误率过高: ${metrics.http.errorRate}%`,
      timestamp: new Date().toISOString()
    });
  }
  
  if (metrics.http.averageResponseTime > 1000) {
    dashboardData.alerts.push({
      type: 'performance',
      severity: 'warning',
      message: `平均响应时间过长: ${metrics.http.averageResponseTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({
    success: true,
    data: dashboardData
  });
}));

// 获取实时指标（WebSocket或SSE可以用这个端点）
router.get('/metrics/realtime', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const metrics = metricsService.getMetricsSummary();
  const health = await healthCheckService.getHealthSummary();
  
  const realtimeData = {
    timestamp: new Date().toISOString(),
    system: {
      uptime: metrics.system.uptime,
      memory: metrics.system.memoryUsage,
      cpu: metrics.system.cpuUsage
    },
    http: {
      requestsPerMinute: metrics.http.totalRequests, // 这里应该计算每分钟请求数
      errorRate: metrics.http.errorRate,
      responseTime: metrics.http.averageResponseTime
    },
    database: {
      queriesPerMinute: metrics.database.totalQueries, // 这里应该计算每分钟查询数
      responseTime: metrics.database.averageResponseTime
    },
    cache: {
      hitRate: metrics.cache.hitRate
    },
    health: {
      status: health.status,
      issues: health.criticalIssues.length
    }
  };
  
  res.json({
    success: true,
    data: realtimeData
  });
}));

// 导出指标数据（管理员访问）
router.get('/metrics/export', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { format = 'json' } = req.query;
  const metrics = metricsService.getAllMetrics();
  
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.json"`);
    res.json(metrics);
  } else if (format === 'csv') {
    // 简化的CSV导出
    const csvData = [
      'Metric,Value,Timestamp',
      `Total Requests,${metrics.http.requests.total},${metrics.timestamp}`,
      `Error Rate,${metrics.http.errorRate || 0},${metrics.timestamp}`,
      `Average Response Time,${metrics.http.responseTime.average || 0},${metrics.timestamp}`,
      `Database Queries,${metrics.database.queries.total},${metrics.timestamp}`,
      `Cache Hit Rate,${metrics.cache.hitRate || 0},${metrics.timestamp}`
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.csv"`);
    res.send(csvData);
  } else {
    res.status(400).json({
      success: false,
      message: '不支持的导出格式'
    });
  }
}));

// 性能优化端点
router.get('/performance/stats', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const stats = performanceOptimizer.getPerformanceStats();

  res.json({
    success: true,
    data: stats
  });
}));

// 查询计划分析
router.post('/performance/analyze-query', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { sql, params = [] } = req.body;

  if (!sql) {
    return res.status(400).json({
      success: false,
      message: 'SQL查询是必需的'
    });
  }

  const plan = await performanceOptimizer.analyzeQueryPlan(sql, params);

  res.json({
    success: true,
    data: {
      sql,
      params,
      plan
    }
  });
}));

// 索引使用分析
router.get('/performance/index-analysis', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const analysis = await performanceOptimizer.analyzeIndexUsage();

  res.json({
    success: true,
    data: analysis
  });
}));

// 重置性能统计
router.post('/performance/reset-stats', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  performanceOptimizer.resetPerformanceStats();

  res.json({
    success: true,
    message: '性能统计已重置'
  });
}));

module.exports = router;
