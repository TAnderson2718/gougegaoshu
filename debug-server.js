const express = require('express');
const cors = require('cors');

console.log('🚀 开始启动调试服务器...');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('✅ Express 应用创建成功');

// CORS配置
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://localhost:3002', 
    'http://127.0.0.1:3002', 
    'http://localhost:3003', 
    'http://127.0.0.1:3003',
    'http://124.221.113.102:3000',
    'http://124.221.113.102:3002',
    'http://124.221.113.102:3003'
  ],
  credentials: true
}));

console.log('✅ CORS 配置完成');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

console.log('✅ 中间件配置完成');

// 健康检查
app.get('/health', async (req, res) => {
  res.json({
    success: true,
    message: '调试服务运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

console.log('✅ 健康检查路由配置完成');

// 尝试加载数据库配置
try {
  console.log('🔍 尝试加载数据库配置...');
  const { testConnection } = require('./config/database');
  console.log('✅ 数据库配置加载成功');
  
  // 测试数据库连接
  app.get('/test-db', async (req, res) => {
    try {
      const dbTest = await testConnection();
      res.json({
        success: true,
        message: '数据库连接测试',
        database: dbTest ? '连接正常' : '连接异常'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '数据库连接失败',
        error: error.message
      });
    }
  });
  
  console.log('✅ 数据库测试路由配置完成');
} catch (error) {
  console.error('❌ 数据库配置加载失败:', error.message);
}

// 尝试加载认证路由
try {
  console.log('🔍 尝试加载认证路由...');
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ 认证路由加载成功');
} catch (error) {
  console.error('❌ 认证路由加载失败:', error.message);
}

// 尝试加载任务路由
try {
  console.log('🔍 尝试加载任务路由...');
  const taskRoutes = require('./routes/tasks');
  app.use('/api/tasks', taskRoutes);
  console.log('✅ 任务路由加载成功');
} catch (error) {
  console.error('❌ 任务路由加载失败:', error.message);
}

// 尝试加载档案路由
try {
  console.log('🔍 尝试加载档案路由...');
  const profileRoutes = require('./routes/profiles');
  app.use('/api/profiles', profileRoutes);
  console.log('✅ 档案路由加载成功');
} catch (error) {
  console.error('❌ 档案路由加载失败:', error.message);
}

// 尝试加载管理员路由
try {
  console.log('🔍 尝试加载管理员路由...');
  const adminRoutes = require('./routes/admin');
  app.use('/api/admin', adminRoutes);
  console.log('✅ 管理员路由加载成功');
} catch (error) {
  console.error('❌ 管理员路由加载失败:', error.message);
}

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

console.log('✅ 错误处理配置完成');

// 启动服务器
app.listen(PORT, () => {
  console.log('');
  console.log('🎉 调试服务器启动成功！');
  console.log(`📍 服务器运行在端口: ${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
  console.log(`🔗 数据库测试: http://localhost:${PORT}/test-db`);
  console.log('');
});

console.log('✅ 服务器启动配置完成');
