const bcrypt = require('bcrypt');
const { query } = require('./config/database');

async function testAdminLogin() {
  try {
    console.log('🔍 测试管理员登录...');
    
    const adminId = 'ADMIN001';
    const password = 'Hello888';
    
    // 查询管理员信息
    const admins = await query(
      'SELECT id, name, password, role FROM admins WHERE id = ?',
      [adminId.toUpperCase()]
    );
    
    console.log('📋 查询结果:', {
      found: admins.length > 0,
      adminId: adminId.toUpperCase(),
      count: admins.length
    });
    
    if (admins.length === 0) {
      console.log('❌ 管理员不存在');
      return;
    }
    
    const admin = admins[0];
    console.log('👤 管理员信息:', {
      id: admin.id,
      name: admin.name,
      role: admin.role,
      passwordStart: admin.password.substring(0, 20) + '...'
    });
    
    // 验证密码
    console.log('🔐 验证密码:', password);
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    console.log('✅ 密码验证结果:', isPasswordValid);
    
    if (isPasswordValid) {
      console.log('🎉 登录测试成功！');
    } else {
      console.log('❌ 密码验证失败');
      
      // 测试其他可能的密码
      const testPasswords = ['AdminPass123', 'admin', 'password', '123456'];
      for (const testPwd of testPasswords) {
        const testResult = await bcrypt.compare(testPwd, admin.password);
        console.log(`🔍 测试密码 "${testPwd}":`, testResult);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testAdminLogin();
