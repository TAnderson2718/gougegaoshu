// 使用内置的fetch

async function testAdminLoginAPI() {
  try {
    console.log('🔍 测试管理员登录API...');
    
    // 测试ADMIN001登录
    console.log('\n🔐 测试ADMIN001登录 (Hello888):');
    try {
      const response1 = await fetch('http://localhost:3001/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: 'ADMIN001',
          password: 'Hello888'
        })
      });

      const data1 = await response1.json();

      if (response1.ok) {
        console.log('✅ ADMIN001登录成功:', {
          success: data1.success,
          message: data1.message,
          adminId: data1.data?.admin?.id,
          adminName: data1.data?.admin?.name,
          role: data1.data?.admin?.role,
          hasToken: !!data1.data?.token
        });
      } else {
        console.log('❌ ADMIN001登录失败:', {
          status: response1.status,
          message: data1.message
        });
      }
    } catch (error) {
      console.log('❌ ADMIN001登录异常:', error.message);
    }
    
    // 测试ADMIN002登录
    console.log('\n🔐 测试ADMIN002登录 (AdminPass123):');
    try {
      const response2 = await fetch('http://localhost:3001/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: 'ADMIN002',
          password: 'AdminPass123'
        })
      });

      const data2 = await response2.json();

      if (response2.ok) {
        console.log('✅ ADMIN002登录成功:', {
          success: data2.success,
          message: data2.message,
          adminId: data2.data?.admin?.id,
          adminName: data2.data?.admin?.name,
          role: data2.data?.admin?.role,
          hasToken: !!data2.data?.token
        });
      } else {
        console.log('❌ ADMIN002登录失败:', {
          status: response2.status,
          message: data2.message
        });
      }
    } catch (error) {
      console.log('❌ ADMIN002登录异常:', error.message);
    }
    
    // 测试错误密码
    console.log('\n🔐 测试ADMIN001错误密码 (AdminPass123):');
    try {
      const response3 = await fetch('http://localhost:3001/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: 'ADMIN001',
          password: 'AdminPass123'
        })
      });

      const data3 = await response3.json();

      if (response3.ok) {
        console.log('⚠️ 意外成功:', data3);
      } else {
        console.log('✅ 正确拒绝错误密码:', {
          status: response3.status,
          message: data3.message
        });
      }
    } catch (error) {
      console.log('❌ 测试异常:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

testAdminLoginAPI();
