const { query } = require('../config/database');
require('dotenv').config();

async function renameAdminAccount() {
  try {
    console.log('🔄 开始将ADMIN002改名为ADMIN...');
    
    // 首先获取ADMIN002的完整信息
    const admin002 = await query('SELECT * FROM admins WHERE id = ?', ['ADMIN002']);
    if (admin002.length === 0) {
      console.log('❌ 未找到ADMIN002账号');
      return;
    }
    
    console.log('📋 找到ADMIN002账号:', admin002[0]);
    
    // 检查ADMIN是否已存在
    const existingAdmin = await query('SELECT * FROM admins WHERE id = ?', ['ADMIN']);
    if (existingAdmin.length > 0) {
      console.log('⚠️ ADMIN账号已存在，先删除...');
      await query('DELETE FROM admins WHERE id = ?', ['ADMIN']);
    }
    
    // 保存ADMIN002的信息
    const adminData = admin002[0];
    
    // 插入新的ADMIN记录
    await query(`
      INSERT INTO admins (id, name, password, role, force_password_change, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'ADMIN',
      adminData.name,
      adminData.password,
      adminData.role,
      adminData.force_password_change,
      adminData.created_at,
      new Date()
    ]);
    
    console.log('✅ 新的ADMIN账号已创建');
    
    // 删除原来的ADMIN002记录
    await query('DELETE FROM admins WHERE id = ?', ['ADMIN002']);
    console.log('✅ 原ADMIN002账号已删除');
    
    // 验证结果
    const newAdmin = await query('SELECT id, name, role FROM admins WHERE id = ?', ['ADMIN']);
    if (newAdmin.length > 0) {
      console.log('✅ 验证成功 - 新ADMIN账号:', newAdmin[0]);
    } else {
      console.log('❌ 验证失败 - 未找到新ADMIN账号');
    }
    
    // 显示所有管理员账号
    const allAdmins = await query('SELECT id, name, role FROM admins ORDER BY id');
    console.log('📋 当前所有管理员账号:', allAdmins);
    
  } catch (error) {
    console.error('❌ 重命名管理员账号失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  renameAdminAccount()
    .then(() => {
      console.log('🎉 管理员账号重命名完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { renameAdminAccount };
