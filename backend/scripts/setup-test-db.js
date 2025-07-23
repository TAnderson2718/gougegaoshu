/**
 * 测试数据库设置脚本
 * 创建测试数据库并设置权限
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupTestDatabase() {
  let connection = null;
  
  try {
    // 使用root权限连接MySQL
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: 'root', // 使用root用户
      password: process.env.DB_ROOT_PASSWORD || '', // root密码
      multipleStatements: true
    });

    console.log('✅ 连接到MySQL服务器成功');

    // 创建测试数据库
    await connection.execute('CREATE DATABASE IF NOT EXISTS task_manager_test_db');
    console.log('✅ 测试数据库创建成功');

    // 确保taskapp用户存在并有权限
    try {
      // 创建用户（如果不存在）
      await connection.execute(`
        CREATE USER IF NOT EXISTS 'taskapp'@'localhost' IDENTIFIED BY 'password'
      `);
      console.log('✅ taskapp用户创建/确认成功');
    } catch (error) {
      console.log('ℹ️ taskapp用户可能已存在');
    }

    // 授予权限
    await connection.execute(`
      GRANT ALL PRIVILEGES ON task_manager_test_db.* TO 'taskapp'@'localhost'
    `);
    
    await connection.execute(`
      GRANT ALL PRIVILEGES ON task_manager_db.* TO 'taskapp'@'localhost'
    `);

    await connection.execute('FLUSH PRIVILEGES');
    console.log('✅ 权限设置成功');

    console.log('🎉 测试数据库设置完成！');

  } catch (error) {
    console.error('❌ 设置测试数据库失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  setupTestDatabase()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { setupTestDatabase };
