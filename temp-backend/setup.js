const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 任务管理系统后端快速设置');
console.log('================================');

// 检查Node.js版本
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    console.log('❌ Node.js版本过低，需要 >= 16.0.0，当前版本:', nodeVersion);
    process.exit(1);
  }
  
  console.log('✅ Node.js版本检查通过:', nodeVersion);
}

// 检查MySQL连接
function checkMySQLConnection() {
  try {
    // 尝试连接MySQL
    execSync('mysql --version', { stdio: 'pipe' });
    console.log('✅ MySQL已安装');
    
    // 检查是否可以连接
    const password = process.env.DB_PASSWORD || '123456';
    try {
      execSync(`mysql -u root -p${password} -e "SELECT 1;"`, { stdio: 'pipe' });
      console.log('✅ MySQL连接测试成功');
      return true;
    } catch (error) {
      console.log('⚠️  MySQL连接失败，请检查密码配置');
      console.log('   请确保MySQL root密码为:', password);
      console.log('   或修改 .env 文件中的 DB_PASSWORD');
      return false;
    }
  } catch (error) {
    console.log('❌ MySQL未安装或未在PATH中');
    console.log('   请安装MySQL并确保可以在命令行中使用');
    return false;
  }
}

// 安装依赖
function installDependencies() {
  console.log('📦 安装项目依赖...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ 依赖安装完成');
    return true;
  } catch (error) {
    console.log('❌ 依赖安装失败:', error.message);
    return false;
  }
}

// 检查环境变量文件
function checkEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('📝 创建环境变量文件...');
    const envExamplePath = path.join(__dirname, '.env.example');
    
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ .env文件已创建');
    } else {
      // 创建基本的.env文件
      const envContent = `# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=task_manager_db

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random_for_security_2024
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development

# 初始密码配置
INITIAL_PASSWORD=Hello888`;
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env文件已创建');
    }
  } else {
    console.log('✅ .env文件已存在');
  }
  
  return true;
}

// 初始化数据库
async function initializeDatabase() {
  console.log('🗄️  初始化数据库...');
  try {
    const { initializeDatabase } = require('./scripts/initDatabase');
    await initializeDatabase();
    console.log('✅ 数据库初始化完成');
    return true;
  } catch (error) {
    console.log('❌ 数据库初始化失败:', error.message);
    return false;
  }
}

// 主设置函数
async function setup() {
  try {
    // 1. 检查Node.js版本
    checkNodeVersion();
    
    // 2. 检查环境变量文件
    checkEnvFile();
    
    // 3. 安装依赖
    if (!installDependencies()) {
      process.exit(1);
    }
    
    // 4. 检查MySQL连接
    const mysqlOk = checkMySQLConnection();
    
    // 5. 初始化数据库
    if (mysqlOk) {
      const dbOk = await initializeDatabase();
      if (!dbOk) {
        console.log('⚠️  数据库初始化失败，但可以尝试手动启动服务器');
      }
    }
    
    console.log('');
    console.log('🎉 后端设置完成！');
    console.log('');
    console.log('📋 下一步操作:');
    console.log('   1. 启动开发服务器: npm run dev');
    console.log('   2. 或启动并测试: node start-and-test.js');
    console.log('   3. 运行API测试: npm run test:api');
    console.log('');
    console.log('🔧 如果遇到问题:');
    console.log('   - 检查MySQL是否运行: sudo systemctl status mysql');
    console.log('   - 检查MySQL密码: 修改.env文件中的DB_PASSWORD');
    console.log('   - 手动初始化数据库: npm run db:init');
    
  } catch (error) {
    console.error('❌ 设置过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  setup();
}

module.exports = { setup };
