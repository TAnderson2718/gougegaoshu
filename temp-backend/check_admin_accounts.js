const bcrypt = require('bcrypt');
const { query } = require('./config/database');

async function checkAdminAccounts() {
  try {
    console.log('🔍 检查管理员账户信息...');
    
    // 查询所有管理员
    const admins = await query('SELECT id, name, role, created_at FROM admins');
    
    console.log('📋 数据库中的管理员账户:');
    if (admins.length === 0) {
      console.log('❌ 没有找到任何管理员账户');
      
      // 创建默认管理员
      console.log('🔧 创建默认管理员账户...');
      const adminPassword = 'AdminPass123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      await query(`
        INSERT INTO admins (id, name, password, role, force_password_change) VALUES
        ('ADMIN', '系统管理员', ?, 'super_admin', FALSE)
      `, [hashedPassword]);
      
      console.log('✅ 默认管理员账户已创建');
      console.log('📝 管理员ID: ADMIN');
      console.log('🔑 管理员密码: AdminPass123');
    } else {
      admins.forEach((admin, index) => {
        console.log(`  ${index + 1}. ID: ${admin.id}, 姓名: ${admin.name}, 角色: ${admin.role}`);
      });
      
      // 重置所有管理员密码为统一密码
      console.log('\n🔄 重置管理员密码...');
      const adminPassword = 'AdminPass123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      
      for (const admin of admins) {
        await query('UPDATE admins SET password = ? WHERE id = ?', [hashedPassword, admin.id]);
        console.log(`✅ ${admin.id} 密码已重置`);
      }
      
      console.log('\n📝 所有管理员账户信息:');
      admins.forEach((admin) => {
        console.log(`  ID: ${admin.id}, 密码: AdminPass123`);
      });
    }
    
    // 测试登录
    console.log('\n🧪 测试管理员登录...');
    const testAdmins = await query('SELECT id, name, password FROM admins');
    
    for (const admin of testAdmins) {
      const isValid = await bcrypt.compare('AdminPass123', admin.password);
      console.log(`  ${admin.id}: ${isValid ? '✅ 密码正确' : '❌ 密码错误'}`);
    }
    
  } catch (error) {
    console.error('❌ 检查管理员账户失败:', error);
  }
}

checkAdminAccounts();
