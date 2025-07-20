const bcrypt = require('bcrypt');
const { query } = require('./config/database');

async function resetAdminPassword() {
  try {
    console.log('🔄 开始重置管理员密码...');
    
    const newPassword = 'Hello888';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log('🔐 新密码哈希:', hashedPassword.substring(0, 20) + '...');
    
    const result = await query(
      'UPDATE admins SET password = ? WHERE id = ?',
      [hashedPassword, 'ADMIN001']
    );
    
    console.log('✅ 管理员密码已重置为: Hello888');
    console.log('影响行数:', result.affectedRows);
    
    // 验证更新
    const admin = await query('SELECT id, name FROM admins WHERE id = ?', ['ADMIN001']);
    console.log('📋 管理员信息:', admin[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
    process.exit(1);
  }
}

resetAdminPassword();
