const { query } = require('./config/database');
const bcrypt = require('bcrypt');

async function debugAdminLogin() {
  try {
    console.log('🔍 调试管理员登录问题...');
    
    // 查看所有管理员数据
    const admins = await query('SELECT id, name, password, role FROM admins');
    console.log('📊 数据库中的管理员数据:');
    admins.forEach(admin => {
      console.log(`  ID: ${admin.id}, Name: ${admin.name}, Role: ${admin.role}`);
      console.log(`  Password Hash: ${admin.password.substring(0, 20)}...`);
    });
    
    // 测试ADMIN001的密码
    const admin001 = admins.find(a => a.id === 'ADMIN001');
    if (admin001) {
      console.log('\n🔐 测试ADMIN001密码验证:');
      
      // 测试初始密码
      const testPasswords = ['AdminPass123', 'Hello888', 'admin123'];
      
      for (const testPassword of testPasswords) {
        try {
          const isValid = await bcrypt.compare(testPassword, admin001.password);
          console.log(`  密码 "${testPassword}": ${isValid ? '✅ 正确' : '❌ 错误'}`);
        } catch (error) {
          console.log(`  密码 "${testPassword}": ❌ 验证出错 - ${error.message}`);
        }
      }
    } else {
      console.log('❌ 未找到ADMIN001管理员');
    }
    
    // 测试ADMIN002的密码
    const admin002 = admins.find(a => a.id === 'ADMIN002');
    if (admin002) {
      console.log('\n🔐 测试ADMIN002密码验证:');
      
      const testPasswords = ['AdminPass123', 'Hello888', 'admin123'];
      
      for (const testPassword of testPasswords) {
        try {
          const isValid = await bcrypt.compare(testPassword, admin002.password);
          console.log(`  密码 "${testPassword}": ${isValid ? '✅ 正确' : '❌ 错误'}`);
        } catch (error) {
          console.log(`  密码 "${testPassword}": ❌ 验证出错 - ${error.message}`);
        }
      }
    } else {
      console.log('❌ 未找到ADMIN002管理员');
    }
    
    // 检查JWT_SECRET
    console.log('\n🔑 JWT配置检查:');
    console.log(`  JWT_SECRET存在: ${!!process.env.JWT_SECRET}`);
    if (process.env.JWT_SECRET) {
      console.log(`  JWT_SECRET长度: ${process.env.JWT_SECRET.length}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 调试失败:', error);
    process.exit(1);
  }
}

debugAdminLogin();
