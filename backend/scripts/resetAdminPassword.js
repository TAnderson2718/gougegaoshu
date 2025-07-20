const bcrypt = require('bcrypt');
const { query } = require('../config/database');
require('dotenv').config();

async function resetAdminPassword() {
  try {
    console.log('🔐 开始重置管理员密码...');
    
    // 获取管理员密码
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123';
    console.log('📝 使用密码:', adminPassword);
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    console.log('🔒 密码已加密');
    
    // 更新所有管理员的密码
    const result = await query(
      'UPDATE admins SET password = ? WHERE id IN (?, ?)',
      [hashedPassword, 'ADMIN001', 'ADMIN002']
    );
    
    console.log('✅ 管理员密码重置成功');
    console.log('📊 更新记录数:', result.affectedRows);
    
    // 验证更新结果
    const admins = await query('SELECT id, name, role FROM admins');
    console.log('📋 当前管理员列表:', admins);
    
    // 测试密码验证
    console.log('🧪 测试密码验证...');
    const testAdmin = await query('SELECT password FROM admins WHERE id = ?', ['ADMIN001']);
    if (testAdmin.length > 0) {
      const isValid = await bcrypt.compare(adminPassword, testAdmin[0].password);
      console.log('✅ 密码验证测试:', isValid ? '成功' : '失败');
    }
    
  } catch (error) {
    console.error('❌ 重置管理员密码失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  resetAdminPassword()
    .then(() => {
      console.log('🎉 管理员密码重置完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { resetAdminPassword };
