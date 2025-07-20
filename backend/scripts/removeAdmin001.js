const { query } = require('../config/database');
require('dotenv').config();

async function removeAdmin001() {
  try {
    console.log('🗑️ 开始删除ADMIN001管理员账号...');
    
    // 检查ADMIN001是否存在
    const existingAdmin = await query('SELECT * FROM admins WHERE id = ?', ['ADMIN001']);
    if (existingAdmin.length === 0) {
      console.log('ℹ️ ADMIN001账号不存在，无需删除');
      return;
    }
    
    console.log('📋 找到ADMIN001账号:', existingAdmin[0]);
    
    // 删除ADMIN001
    const result = await query('DELETE FROM admins WHERE id = ?', ['ADMIN001']);
    
    if (result.affectedRows > 0) {
      console.log('✅ ADMIN001账号已成功删除');
      console.log(`🔢 删除了 ${result.affectedRows} 条记录`);
    } else {
      console.log('⚠️ 没有删除任何记录');
    }
    
    // 确保ADMIN002存在且角色正确
    const admin002 = await query('SELECT * FROM admins WHERE id = ?', ['ADMIN002']);
    if (admin002.length === 0) {
      console.log('❌ 警告：ADMIN002账号不存在！');
    } else {
      console.log('✅ ADMIN002账号存在:', admin002[0]);
      
      // 将ADMIN002设置为super_admin角色
      await query('UPDATE admins SET role = ?, name = ? WHERE id = ?', 
        ['super_admin', '系统管理员', 'ADMIN002']);
      console.log('✅ ADMIN002已设置为系统管理员(super_admin)');
    }
    
    // 验证最终结果
    const remainingAdmins = await query('SELECT id, name, role FROM admins ORDER BY id');
    console.log('📋 当前管理员列表:', remainingAdmins);
    
  } catch (error) {
    console.error('❌ 删除ADMIN001失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  removeAdmin001()
    .then(() => {
      console.log('🎉 ADMIN001删除操作完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { removeAdmin001 };
