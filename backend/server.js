const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 导入配置管理器
const config = require('./config/ConfigManager');

const { testConnection } = require('./config/database');
const { initializeDatabase } = require('./scripts/initDatabase');
const { startCronJobs, start: startCron } = require('./services/cronService');

// 导入错误处理系统
const { createResponseHandler } = require('./utils/ResponseHandler');
const {
  requestLogger,
  notFoundHandler,
  globalErrorHandler,
  validationErrorHandler,
  databaseErrorHandler,
  jwtErrorHandler,
  multerErrorHandler,
  setupProcessHandlers
} = require('./middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const {
  createMonitoringMiddleware,
  createPerformanceMonitoringMiddleware,
  createUserActivityMonitoringMiddleware,
  createSecurityMonitoringMiddleware
} = require('./middleware/monitoring');

// 导入路由 - 使用新的分层架构路由
const authRoutes = require('./routes/auth_new');
const taskRoutes = require('./routes/tasks_new');
const profileRoutes = require('./routes/profiles');
const adminRoutes = require('./routes/admin');
const monitoringRoutes = require('./routes/monitoring');

const app = express();
const PORT = config.get('server.port', 3001);

// 安全中间件 - 使用配置管理器
app.use(helmet(config.get('security.helmet', {})));

// CORS配置 - 使用配置管理器
const corsConfig = {
  origin: config.get('security.cors.origin', [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]),
  credentials: config.get('security.cors.credentials', false),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: config.get('security.cors.optionsSuccessStatus', 200)
};

app.use(cors(corsConfig));

// 额外的CORS头部设置 - 确保所有响应都包含正确的CORS头部
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'false');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
});

// 请求限制 - 使用配置管理器
const limiter = rateLimit({
  windowMs: config.get('security.rateLimit.windowMs', 900000),
  max: config.get('security.rateLimit.max', 1000),
  message: {
    success: false,
    message: config.get('security.rateLimit.message', '请求过于频繁，请稍后再试')
  }
});
app.use(limiter);

// 解析JSON - 使用配置管理器
app.use(express.json({
  limit: config.get('upload.maxFileSize', '10mb')
}));
app.use(express.urlencoded({ extended: true }));

// 设置进程异常处理器
setupProcessHandlers();

// 监控中间件
app.use(createMonitoringMiddleware());
app.use(createPerformanceMonitoringMiddleware(1000)); // 1秒慢请求阈值
app.use(createUserActivityMonitoringMiddleware());
app.use(createSecurityMonitoringMiddleware());

// 请求日志中间件
app.use(requestLogger);

// 响应处理器中间件
app.use(createResponseHandler());

// 健康检查 - 使用配置管理器
app.get('/health', async (req, res) => {
  try {
    const envConfig = config.getEnvironmentConfig();
    const configSummary = config.getConfigSummary();

    res.json({
      success: true,
      message: '服务运行正常',
      timestamp: new Date().toISOString(),
      environment: envConfig.environment,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: {
        server: configSummary.server,
        database: configSummary.database,
        jwt: configSummary.jwt,
        logging: configSummary.logging,
        cache: configSummary.cache
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '服务异常',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 配置管理端点
app.get('/api/config', authenticateToken, requireAdmin, (req, res) => {
  try {
    const configSummary = config.getConfigSummary();
    res.json({
      success: true,
      data: configSummary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取配置失败',
      error: error.message
    });
  }
});

// 数据库状态检查
app.get('/api/db-status', async (req, res) => {
  try {
    const { query } = require('./config/database');

    // 检查表是否存在
    const tables = await query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'task_manager_db']);

    // 检查学生数量
    const studentCount = await query('SELECT COUNT(*) as count FROM students');

    res.json({
      success: true,
      database: {
        name: process.env.DB_NAME || 'task_manager_db',
        tables: tables.map(t => t.TABLE_NAME),
        studentCount: studentCount[0].count
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '数据库状态检查失败',
      error: error.message
    });
  }
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/monitoring', monitoringRoutes);

// 错误处理中间件（按顺序执行）
app.use(validationErrorHandler);
app.use(databaseErrorHandler);
app.use(jwtErrorHandler);
app.use(multerErrorHandler);

// 404处理
app.use(notFoundHandler);

// 全局错误处理（必须放在最后）
app.use(globalErrorHandler);

// 启动服务器
async function startServer() {
  try {
    console.log('🚀 正在启动任务管理系统后端服务...');

    // 初始化数据库（包含连接测试、建表、初始数据）
    console.log('📊 初始化数据库...');
    await initializeDatabase();

    // 初始化并启动定时任务
    console.log('⏰ 初始化定时任务...');
    startCronJobs();
    startCron();

    const host = config.get('server.host', 'localhost');

    app.listen(PORT, host, () => {
      console.log('');
      console.log('🎉 任务管理系统后端启动成功！');
      console.log(`📍 服务器运行在: http://${host}:${PORT}`);
      console.log(`🌍 环境: ${config.getEnvironmentConfig().environment}`);
      console.log(`🔗 健康检查: http://${host}:${PORT}/health`);
      console.log(`📚 API文档: http://${host}:${PORT}/api`);
      console.log('');
      console.log('⚙️  配置摘要:');
      const configSummary = config.getConfigSummary();
      console.log(`   数据库: ${configSummary.database.name}`);
      console.log(`   JWT过期时间: ${configSummary.jwt.expiresIn}`);
      console.log(`   日志级别: ${configSummary.logging.level}`);
      console.log(`   缓存TTL: ${configSummary.cache.defaultTTL}s`);
      console.log(`   速率限制: ${configSummary.security.rateLimitMax}/15min`);
      console.log('');
      console.log('🔑 默认登录信息:');
      console.log('   学生ID: ST001 或 ST002');
      console.log('   密码: Hello888');
      console.log('');
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

// 只在非测试环境下启动服务器
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// 导出app供测试使用
module.exports = app;
