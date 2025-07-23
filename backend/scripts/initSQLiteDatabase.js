const { query, testConnection, initializeTables } = require('../config/database');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  console.log('🗄️ 初始化SQLite数据库...');
  
  try {
    // 1. 测试数据库连接并创建表
    console.log('📋 步骤1: 测试数据库连接...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }

    // 2. 初始化表结构
    console.log('📋 步骤2: 初始化表结构...');
    await initializeTables();

    // 3. 创建默认管理员账户
    console.log('📋 步骤3: 创建默认管理员账户...');
    await createDefaultAdmin();

    // 4. 创建测试学生账户
    console.log('📋 步骤4: 创建测试学生账户...');
    await createTestStudents();

    console.log('✅ 数据库初始化完成！');
    console.log('\n🔑 默认账户信息:');
    console.log('管理员: admin / AdminPass123');
    console.log('学生: ST001 / Hello888');
    console.log('学生: ST002 / Hello888');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    throw error;
  }
}

async function createDefaultAdmin() {
  try {
    // 检查管理员是否已存在
    const existingAdmin = await query('SELECT id FROM admins WHERE id = ?', ['admin']);
    
    if (existingAdmin.length > 0) {
      console.log('   管理员账户已存在，跳过创建');
      return;
    }

    // 创建管理员账户
    const hashedPassword = await bcrypt.hash('AdminPass123', 10);
    await query(
      'INSERT INTO admins (id, name, password, role) VALUES (?, ?, ?, ?)',
      ['admin', '系统管理员', hashedPassword, 'admin']
    );
    
    console.log('   ✅ 创建管理员账户成功');
  } catch (error) {
    console.error('   ❌ 创建管理员账户失败:', error.message);
    throw error;
  }
}

async function createTestStudents() {
  const students = [
    { id: 'ST001', name: '张三', password: 'Hello888' },
    { id: 'ST002', name: '李四', password: 'Hello888' }
  ];

  for (const student of students) {
    try {
      // 检查学生是否已存在
      const existing = await query('SELECT id FROM students WHERE id = ?', [student.id]);
      
      if (existing.length > 0) {
        console.log(`   学生 ${student.id} 已存在，跳过创建`);
        continue;
      }

      // 创建学生账户
      const hashedPassword = await bcrypt.hash(student.password, 10);
      await query(
        `INSERT INTO students (id, name, password, gender, age, grade, major, bio) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student.id,
          student.name,
          hashedPassword,
          '男',
          22,
          '大四',
          '计算机科学与技术',
          '热爱学习的考研学生'
        ]
      );
      
      console.log(`   ✅ 创建学生账户 ${student.id} 成功`);
    } catch (error) {
      console.error(`   ❌ 创建学生账户 ${student.id} 失败:`, error.message);
      throw error;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 数据库初始化完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 初始化失败:', error);
      process.exit(1);
    });
}

module.exports = {
  initializeDatabase,
  createDefaultAdmin,
  createTestStudents
};
