const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://124.221.113.102:3000'],
  credentials: true
}));
app.use(express.json());

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'taskapp',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'task_manager_db'
};

let db;

// 初始化数据库连接
async function initDatabase() {
  try {
    console.log('🔗 连接数据库...');
    db = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// JWT验证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: '未提供访问令牌' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    req.user = decoded;
    next();
  } catch (error) {
    console.log('Token验证失败:', error);
    return res.status(403).json({ success: false, message: '无效的访问令牌' });
  }
}

// 管理员权限验证中间件
function requireAdmin(req, res, next) {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ success: false, message: '需要管理员权限' });
  }
  next();
}

// 健康检查
app.get('/health', async (req, res) => {
  try {
    if (db) {
      await db.execute('SELECT 1');
      res.json({
        success: true,
        message: '服务运行正常',
        database: '连接正常',
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: false,
        message: '数据库未连接',
        timestamp: new Date().toISOString()
      });
    }
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
    console.log('🔐 学生登录请求:', { studentId, password: '***' });

    const [students] = await db.execute(
      'SELECT * FROM students WHERE id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(401).json({ success: false, message: '学生ID或密码错误' });
    }

    const student = students[0];
    const isValidPassword = await bcrypt.compare(password, student.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '学生ID或密码错误' });
    }

    const token = jwt.sign(
      {
        studentId: student.id,
        name: student.name,
        userType: 'student'
      },
      process.env.JWT_SECRET || 'default-secret',
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
    console.error('学生登录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 管理员登录
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    console.log('🔐 管理员登录请求:', { studentId, password: '***' });

    const [admins] = await db.execute(
      'SELECT * FROM admins WHERE id = ?',
      [studentId]
    );

    if (admins.length === 0) {
      return res.status(401).json({ success: false, message: '管理员ID或密码错误' });
    }

    const admin = admins[0];
    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '管理员ID或密码错误' });
    }

    const token = jwt.sign(
      {
        userId: admin.id,
        name: admin.name,
        role: admin.role,
        userType: 'admin'
      },
      process.env.JWT_SECRET || 'default-secret',
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
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取学生档案
app.get('/api/profiles', authenticateToken, async (req, res) => {
  try {
    const [profiles] = await db.execute(
      'SELECT * FROM student_profiles WHERE student_id = ?',
      [req.user.studentId]
    );

    if (profiles.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: '档案不存在'
      });
    }

    res.json({
      success: true,
      data: profiles[0]
    });
  } catch (error) {
    console.error('获取档案错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 学生 - 获取任务列表
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    console.log('📋 学生获取任务列表:', req.user.studentId);
    const [tasks] = await db.execute(`
      SELECT
        id,
        student_id,
        task_date,
        subject,
        content,
        status,
        completed_at,
        created_at
      FROM tasks
      WHERE student_id = ?
      ORDER BY task_date DESC, created_at DESC
    `, [req.user.studentId]);

    res.json({
      success: true,
      data: tasks,
      total: tasks.length
    });
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 学生 - 更新任务状态
app.put('/api/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    console.log('📝 更新任务状态:', { taskId, status, studentId: req.user.studentId });

    // 验证任务属于当前学生
    const [tasks] = await db.execute(
      'SELECT * FROM tasks WHERE id = ? AND student_id = ?',
      [taskId, req.user.studentId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }

    // 更新任务状态
    const completedAt = status === 'completed' ? new Date() : null;
    await db.execute(
      'UPDATE tasks SET status = ?, completed_at = ? WHERE id = ? AND student_id = ?',
      [status, completedAt, taskId, req.user.studentId]
    );

    res.json({
      success: true,
      message: '任务状态更新成功'
    });
  } catch (error) {
    console.error('更新任务状态错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 学生 - 获取请假记录
app.get('/api/tasks/leave-records', authenticateToken, async (req, res) => {
  try {
    console.log('📋 学生获取请假记录:', req.user.studentId);
    const [records] = await db.execute(`
      SELECT
        id,
        student_id,
        leave_date,
        reason,
        status,
        created_at
      FROM leave_records
      WHERE student_id = ?
      ORDER BY leave_date DESC
    `, [req.user.studentId]);

    res.json({
      success: true,
      data: records,
      total: records.length
    });
  } catch (error) {
    console.error('获取请假记录错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 管理员 - 获取学生列表
app.get('/api/admin/students', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📋 管理员获取学生列表');
    const [students] = await db.execute(`
      SELECT 
        s.id,
        s.name,
        s.created_at,
        sp.gender,
        sp.age,
        sp.study_status,
        sp.math_type,
        sp.target_score,
        sp.daily_hours
      FROM students s
      LEFT JOIN student_profiles sp ON s.id = sp.student_id
      ORDER BY s.created_at DESC
    `);

    res.json({
      success: true,
      data: students,
      total: students.length
    });
  } catch (error) {
    console.error('获取学生列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 管理员 - 获取任务列表
app.get('/api/admin/tasks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📋 管理员获取任务列表');
    const [tasks] = await db.execute(`
      SELECT 
        t.*,
        s.name as student_name
      FROM tasks t
      LEFT JOIN students s ON t.student_id = s.id
      ORDER BY t.task_date DESC, t.created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: tasks,
      total: tasks.length
    });
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 启动服务器
async function startServer() {
  const dbConnected = await initDatabase();
  if (!dbConnected) {
    console.error('❌ 无法启动服务器：数据库连接失败');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 完整服务器启动成功！`);
    console.log(`📍 服务器运行在端口: ${PORT}`);
    console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
    console.log(`📚 管理员API: http://localhost:${PORT}/api/admin/*`);
  });
}

startServer();
