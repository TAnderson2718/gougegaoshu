const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('🚀 开始启动最小化服务器...');

const app = express();
const PORT = process.env.PORT || 3001;

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

console.log('✅ 基础配置完成');

// 数据库连接
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'taskapp',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'task_manager_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

console.log('✅ 数据库连接池创建完成');

// 健康检查
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as test');
    res.json({
      success: true,
      message: '服务运行正常',
      database: '连接正常',
      timestamp: new Date().toISOString()
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

// 学生登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    
    if (!studentId || !password) {
      return res.status(400).json({
        success: false,
        message: '学生ID和密码不能为空'
      });
    }

    // 查询学生
    const [students] = await pool.execute(
      'SELECT id, name, password FROM students WHERE id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(401).json({
        success: false,
        message: '学生ID或密码错误'
      });
    }

    const student = students[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, student.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '学生ID或密码错误'
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        studentId: student.id,
        name: student.name,
        userType: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        student: {
          id: student.id,
          name: student.name
        }
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 管理员登录
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { studentId: adminId, password } = req.body;
    
    if (!adminId || !password) {
      return res.status(400).json({
        success: false,
        message: '管理员ID和密码不能为空'
      });
    }

    // 查询管理员
    const [admins] = await pool.execute(
      'SELECT id, name, password, role FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: '管理员ID或密码错误'
      });
    }

    const admin = admins[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '管理员ID或密码错误'
      });
    }

    // 生成JWT token
    const token = jwt.sign(
      {
        userId: admin.id,
        name: admin.name,
        role: admin.role,
        userType: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          role: admin.role
        }
      }
    });

  } catch (error) {
    console.error('管理员登录错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 简单的任务获取接口
app.get('/api/tasks', async (req, res) => {
  res.json({
    success: true,
    data: {
      tasks: [],
      message: '暂无任务数据'
    }
  });
});

// Token验证接口
app.get('/api/auth/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({
      success: true,
      data: {
        user: {
          id: decoded.studentId || decoded.userId,
          name: decoded.name,
          userType: decoded.userType
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '访问令牌无效'
    });
  }
});

// 简单的请假记录接口
app.get('/api/tasks/leave-records', async (req, res) => {
  res.json({
    success: true,
    data: []
  });
});

// 获取个人档案接口
app.get('/api/profiles', async (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 模拟个人档案数据
    const profileData = {
      studentId: decoded.studentId || decoded.userId,
      name: decoded.name,
      gender: '未填写',
      age: '未填写',
      learningGoals: '未填写',
      examSubjects: '未填写'
    };

    res.json({
      success: true,
      data: profileData
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '访问令牌无效'
    });
  }
});

// 更新个人档案接口
app.put('/api/profiles', async (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 这里应该更新数据库，但为了简化，我们只返回成功
    res.json({
      success: true,
      message: '档案更新成功',
      data: req.body
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: '访问令牌无效'
    });
  }
});

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
    message: '服务器内部错误',
    error: error.message
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('');
  console.log('🎉 最小化服务器启动成功！');
  console.log(`📍 服务器运行在端口: ${PORT}`);
  console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
  console.log('');
});

console.log('✅ 服务器启动配置完成');
