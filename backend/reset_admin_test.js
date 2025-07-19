const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function resetAdminPassword() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'taskapp',
      password: 'Hello888',
      database: 'task_manager_db'
    });

    // 生成新的密码哈希
    const newPassword = 'AdminPass123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('🔐 重置管理员密码...');
    console.log('新密码:', newPassword);
    console.log('哈希值:', hashedPassword);

    // 更新管理员密码
    const [result] = await connection.execute(
      'UPDATE admins SET password = ? WHERE id = ?',
      [hashedPassword, 'ADMIN001']
    );

    console.log('✅ 密码重置成功，影响行数:', result.affectedRows);

    // 验证更新
    const [rows] = await connection.execute(
      'SELECT id, name, role FROM admins WHERE id = ?',
      ['ADMIN001']
    );

    console.log('📋 管理员信息:', rows[0]);

    await connection.end();
  } catch (error) {
    console.error('❌ 重置失败:', error);
  }
}

resetAdminPassword();
