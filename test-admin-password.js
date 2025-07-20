const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAdminPassword() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'taskapp',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'task_manager_db'
  };

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 获取管理员信息
    const [admins] = await connection.execute(
      'SELECT id, name, password FROM admins WHERE id = ?',
      ['ADMIN001']
    );

    if (admins.length === 0) {
      console.log('❌ 管理员ADMIN001不存在');
      return;
    }

    const admin = admins[0];
    console.log('✅ 找到管理员:', admin.id, admin.name);
    console.log('🔑 密码哈希:', admin.password.substring(0, 20) + '...');

    // 测试密码
    const testPasswords = ['Hello888', 'ADMIN001-Hello888', 'AdminPass123'];
    
    for (const testPassword of testPasswords) {
      console.log(`\n🧪 测试密码: "${testPassword}"`);
      const isValid = await bcrypt.compare(testPassword, admin.password);
      console.log(`结果: ${isValid ? '✅ 正确' : '❌ 错误'}`);
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

testAdminPassword();
