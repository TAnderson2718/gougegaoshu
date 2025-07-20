const fetch = require('node-fetch');

async function testAdminLogin() {
  try {
    console.log('🧪 测试ADMIN登录功能...');
    
    const response = await fetch('http://localhost:3001/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: 'ADMIN',
        password: 'AdminPass123'
      })
    });

    const data = await response.json();
    
    console.log('📊 响应状态:', response.status);
    console.log('📋 响应数据:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.success) {
      console.log('✅ ADMIN登录测试成功！');
      console.log(`👤 管理员: ${data.data.admin.name}`);
      console.log(`🔑 角色: ${data.data.admin.role}`);
      console.log(`🆔 ID: ${data.data.admin.id}`);
      console.log(`🎫 Token: ${data.data.token.substring(0, 50)}...`);
    } else {
      console.log('❌ ADMIN登录测试失败');
      console.log('错误信息:', data.message);
    }
    
    // 测试错误的密码
    console.log('\n🧪 测试错误密码...');
    const wrongResponse = await fetch('http://localhost:3001/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: 'ADMIN',
        password: 'WrongPassword'
      })
    });

    const wrongData = await wrongResponse.json();
    
    if (!wrongResponse.ok || !wrongData.success) {
      console.log('✅ 错误密码测试通过 - 正确拒绝了错误密码');
    } else {
      console.log('❌ 错误密码测试失败 - 不应该允许错误密码登录');
    }
    
    // 测试ADMIN002（应该失败）
    console.log('\n🧪 测试ADMIN002（应该失败）...');
    const admin002Response = await fetch('http://localhost:3001/api/auth/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: 'ADMIN002',
        password: 'AdminPass123'
      })
    });

    const admin002Data = await admin002Response.json();
    
    if (!admin002Response.ok || !admin002Data.success) {
      console.log('✅ ADMIN002测试通过 - 正确拒绝了旧账号名');
    } else {
      console.log('❌ ADMIN002测试失败 - 不应该允许旧账号名登录');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testAdminLogin();
