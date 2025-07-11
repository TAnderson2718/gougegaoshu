const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { initializeDatabase } = require('./scripts/initDatabase');

// 导入路由
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const profileRoutes = require('./routes/profiles');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use(limiter);

// 解析JSON
app.use(express.json({ limit: '10mb' })); // 支持大图片上传
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', async (req, res) => {
  try {
    // 测试数据库连接
    const dbTest = await testConnection();

    res.json({
      success: true,
      message: '服务运行正常',
      database: dbTest ? '连接正常' : '连接异常',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
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

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 全局错误处理
app.use((error, req, res, next) => {
  console.error('全局错误:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// 启动服务器
async function startServer() {
  try {
    console.log('🚀 正在启动任务管理系统后端服务...');

    // 初始化数据库（包含连接测试、建表、初始数据）
    console.log('📊 初始化数据库...');
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log('');
      console.log('🎉 任务管理系统后端启动成功！');
      console.log(`📍 服务器运行在端口: ${PORT}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
      console.log(`📚 API文档: http://localhost:${PORT}/api`);
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
