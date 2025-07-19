#!/usr/bin/env node

/**
 * Augment 智能浏览器管理器
 * 
 * 功能：
 * 1. 首次调用：创建专用的浏览器窗口
 * 2. 后续调用：在专用窗口中打开新标签页
 * 3. 会话管理：跟踪和复用浏览器实例
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class AugmentBrowserManager {
  constructor() {
    this.sessionDir = path.join(os.tmpdir(), 'augment-chrome-session');
    this.pidFile = path.join(os.tmpdir(), 'augment-chrome.pid');
    this.platform = os.platform();
  }

  // 检查是否已有 Augment 专用浏览器运行
  async checkExistingSession() {
    try {
      if (!fs.existsSync(this.pidFile)) {
        return false;
      }

      const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
      
      // 检查进程是否还在运行
      try {
        process.kill(parseInt(pid), 0); // 发送信号 0 只检查进程是否存在
        console.log(`✅ 发现现有 Augment 浏览器会话 (PID: ${pid})`);
        return true;
      } catch (error) {
        console.log('🧹 清理过期的 PID 文件');
        fs.unlinkSync(this.pidFile);
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // 在现有窗口中打开新标签页
  async openNewTab(url) {
    console.log('📑 在现有 Augment 窗口中打开新标签页...');

    if (this.platform === 'darwin') {
      // macOS - 使用更简单的方法：直接用 Chrome 打开新标签
      const args = [
        '--user-data-dir=' + this.sessionDir,
        url
      ];

      const chrome = spawn('open', ['-a', 'Google Chrome', '--args', ...args], {
        detached: true,
        stdio: 'ignore'
      });

      chrome.unref();
      console.log('✅ 新标签页已打开');
      return Promise.resolve();
    } else {
      // Linux/Windows - 直接使用 Chrome
      const args = [
        '--user-data-dir=' + this.sessionDir,
        url
      ];

      const chrome = spawn('google-chrome', args, {
        detached: true,
        stdio: 'ignore'
      });

      chrome.unref();
      console.log('✅ 新标签页已打开');
    }
  }

  // 创建新的专用浏览器窗口
  async createNewSession(url) {
    console.log('🆕 创建新的 Augment 专用浏览器窗口...');

    // 清理旧的会话数据
    if (fs.existsSync(this.sessionDir)) {
      fs.rmSync(this.sessionDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.sessionDir, { recursive: true });

    const args = [
      '--new-window',
      '--user-data-dir=' + this.sessionDir,
      '--window-position=200,100',
      '--window-size=1400,900',
      '--no-first-run',
      '--no-default-browser-check',
      url
    ];

    return new Promise((resolve, reject) => {
      let browser;

      if (this.platform === 'darwin') {
        // macOS - 使用 open 命令
        const openArgs = ['-n', '-a', 'Google Chrome', '--args', ...args];
        browser = spawn('open', openArgs, {
          detached: true,
          stdio: 'ignore'
        });
      } else if (this.platform === 'linux') {
        // Linux
        browser = spawn('google-chrome', args, {
          detached: true,
          stdio: 'ignore'
        });
      } else {
        // Windows
        browser = spawn('chrome', args, {
          detached: true,
          stdio: 'ignore'
        });
      }

      browser.unref();

      // 对于 macOS，我们需要等待一下然后找到实际的 Chrome 进程
      if (this.platform === 'darwin') {
        setTimeout(() => {
          exec('pgrep -f "Google Chrome.*augment-chrome-session"', (error, stdout) => {
            if (!error && stdout.trim()) {
              const pid = stdout.trim().split('\n')[0];
              fs.writeFileSync(this.pidFile, pid);
              console.log(`✅ Augment 浏览器会话已启动 (PID: ${pid})`);
            } else {
              // 如果找不到特定进程，使用 spawn 的 PID
              fs.writeFileSync(this.pidFile, browser.pid.toString());
              console.log(`✅ Augment 浏览器会话已启动 (PID: ${browser.pid})`);
            }
            resolve();
          });
        }, 2000);
      } else {
        // Linux/Windows
        fs.writeFileSync(this.pidFile, browser.pid.toString());
        console.log(`✅ Augment 浏览器会话已启动 (PID: ${browser.pid})`);
        setTimeout(resolve, 1000);
      }

      browser.on('error', (error) => {
        console.error('❌ 浏览器启动失败:', error);
        reject(error);
      });
    });
  }

  // 主要的打开方法
  async open(url) {
    if (!url) {
      throw new Error('URL 是必需的');
    }

    console.log(`🌐 Augment 浏览器管理: ${url}`);

    try {
      const hasExistingSession = await this.checkExistingSession();

      if (hasExistingSession) {
        await this.openNewTab(url);
      } else {
        await this.createNewSession(url);
      }

      console.log('🎯 浏览器操作完成');
    } catch (error) {
      console.error('❌ 浏览器操作失败:', error);
      throw error;
    }
  }

  // 清理会话
  async cleanup() {
    console.log('🧹 清理 Augment 浏览器会话...');

    try {
      if (fs.existsSync(this.pidFile)) {
        const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
        try {
          process.kill(pid, 'SIGTERM');
          console.log(`✅ 已终止浏览器进程 (PID: ${pid})`);
        } catch (error) {
          console.log('⚠️ 进程可能已经结束');
        }
        fs.unlinkSync(this.pidFile);
      }

      if (fs.existsSync(this.sessionDir)) {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
        console.log('✅ 已清理会话数据');
      }
    } catch (error) {
      console.error('❌ 清理失败:', error);
    }
  }
}

// 命令行接口
if (require.main === module) {
  const url = process.argv[2];
  const action = process.argv[3];

  const manager = new AugmentBrowserManager();

  if (action === 'cleanup' || url === 'cleanup') {
    manager.cleanup().then(() => {
      console.log('🎯 清理完成');
    }).catch((error) => {
      console.error('❌ 清理失败:', error);
      process.exit(1);
    });
  } else if (!url) {
    console.error('❌ 错误: 请提供要打开的URL');
    console.error('使用方法: node augment-browser.js <URL> [cleanup]');
    process.exit(1);
  } else {
    manager.open(url).then(() => {
      console.log('🎯 浏览器操作成功');
    }).catch((error) => {
      console.error('❌ 浏览器操作失败:', error);
      process.exit(1);
    });
  }
}

module.exports = AugmentBrowserManager;
