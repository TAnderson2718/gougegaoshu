const bcrypt = require('bcrypt');
const { query } = require('../config/database');
require('dotenv').config();

async function insertAdmins() {
  try {
    console.log('🔐 开始插入管理员数据...');
    
    // 检查是否已有管理员数据
    const existingAdmins = await query('SELECT COUNT(*) as count FROM admins');
    if (existingAdmins[0].count > 0) {
      console.log('✅ 管理员数据已存在，跳过插入');
      return;
    }

    // 加密管理员密码
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123';
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

    // 插入管理员数据
    await query(`
      INSERT INTO admins (id, name, password, role, force_password_change) VALUES 
      ('ADMIN001', '系统管理员', ?, 'super_admin', FALSE),
      ('ADMIN002', '普通管理员', ?, 'admin', FALSE)
    `, [hashedAdminPassword, hashedAdminPassword]);

    console.log('✅ 管理员数据插入成功');
    console.log(`👨‍💼 默认管理员账户: ADMIN001, ADMIN002`);
    console.log(`🔐 管理员密码: ${adminPassword}`);

    // 验证插入结果
    const admins = await query('SELECT id, name, role FROM admins');
    console.log('📋 当前管理员列表:', admins);

  } catch (error) {
    console.error('❌ 插入管理员数据失败:', error.message);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  insertAdmins()
    .then(() => {
      console.log('🎉 管理员数据插入完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { insertAdmins };
