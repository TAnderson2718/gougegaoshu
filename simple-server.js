const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// JWT密钥
const JWT_SECRET = 'your-secret-key-here';

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'task_management',
  charset: 'utf8mb4'
};

let db;

// 初始化数据库连接
async function initDatabase() {
  try {
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

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '访问令牌无效' });
    }
    req.user = user;
    next();
  });
}

// 健康检查
app.get('/health', async (req, res) => {
  try {
    if (db) {
      await db.execute('SELECT 1');
      res.json({
        success: true,
        message: '服务器运行正常',
        database: '数据库连接正常',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: '数据库连接失败'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '健康检查失败',
      error: error.message
    });
  }
});

// 学生登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    console.log('🔐 学生登录请求:', { studentId, password: '***' });

    const [students] = await db.execute(
      'SELECT * FROM students WHERE student_id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(401).json({ success: false, message: '学号不存在' });
    }

    const student = students[0];
    const isValidPassword = await bcrypt.compare(password, student.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: '密码错误' });
    }

    const token = jwt.sign(
      { 
        studentId: student.student_id,
        name: student.name,
        role: 'student'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        studentId: student.student_id,
        name: student.name,
        role: 'student'
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
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

async function startServer() {
  const dbConnected = await initDatabase();
  if (!dbConnected) {
    console.error('❌ 无法启动服务器：数据库连接失败');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 简化服务器启动成功！`);
    console.log(`📍 服务器运行在端口: ${PORT}`);
    console.log(`🔗 健康检查: http://localhost:${PORT}/health`);
  });
}

startServer();
