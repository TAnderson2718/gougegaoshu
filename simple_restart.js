const { spawn, exec } = require('child_process');

console.log('🔄 开始重启服务...\n');

// 1. 清理进程
console.log('🧹 清理所有相关进程...');
exec('pkill -f "react-scripts" && pkill -f "node.*server" && pkill -f "npm.*start" && lsof -ti:3000 | xargs kill -9 2>/dev/null || true && lsof -ti:3001 | xargs kill -9 2>/dev/null || true', 
  (error, stdout, stderr) => {
    console.log('✅ 进程清理完成');
    
    setTimeout(() => {
      // 2. 启动后端
      console.log('🚀 启动后端服务...');
      const backend = spawn('npm', ['start'], {
        cwd: '/Users/daniel/Documents/GitHub/gougegaoshu/backend',
        stdio: 'inherit',
        detached: true
      });
      
      backend.unref();
      console.log(`✅ 后端服务已启动 (PID: ${backend.pid})`);
      
      setTimeout(() => {
        // 3. 启动前端
        console.log('🌐 启动前端服务...');
        const frontend = spawn('npm', ['start'], {
          cwd: '/Users/daniel/Documents/GitHub/gougegaoshu/frontend',
          stdio: 'inherit',
          detached: true,
          env: { ...process.env, BROWSER: 'none' }
        });
        
        frontend.unref();
        console.log(`✅ 前端服务已启动 (PID: ${frontend.pid})`);
        
        setTimeout(() => {
          console.log('\n🎉 服务启动完成！');
          console.log('📱 请在浏览器中访问:');
          console.log('   前端: http://localhost:3000');
          console.log('   后端: http://localhost:3001');
          console.log('\n⏳ 请等待30秒让服务完全启动，然后刷新浏览器页面');
          
          process.exit(0);
        }, 5000);
        
      }, 10000);
      
    }, 5000);
  }
);
