const path = require('path');
const fs = require('fs');

/**
 * 统一配置管理系统
 * 支持多环境配置、配置验证和动态配置更新
 */
class ConfigManager {
  constructor() {
    this.config = {};
    this.environment = process.env.NODE_ENV || 'development';
    this.configPath = path.join(__dirname, '..', 'config');
    this.watchers = new Map();
    
    this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * 加载配置文件
   */
  loadConfiguration() {
    try {
      // 加载基础配置
      const baseConfigPath = path.join(this.configPath, 'config.base.json');
      if (fs.existsSync(baseConfigPath)) {
        const baseConfig = JSON.parse(fs.readFileSync(baseConfigPath, 'utf8'));
        this.config = { ...baseConfig };
      }

      // 加载环境特定配置
      const envConfigPath = path.join(this.configPath, `config.${this.environment}.json`);
      if (fs.existsSync(envConfigPath)) {
        const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf8'));
        this.config = this.deepMerge(this.config, envConfig);
      }

      // 环境变量覆盖
      this.applyEnvironmentVariables();

      console.log(`📋 配置管理器初始化完成 (环境: ${this.environment})`);
    } catch (error) {
      console.error('❌ 配置加载失败:', error.message);
      throw error;
    }
  }

  /**
   * 应用环境变量覆盖
   */
  applyEnvironmentVariables() {
    // 服务器配置
    if (process.env.PORT) {
      this.config.server = this.config.server || {};
      this.config.server.port = parseInt(process.env.PORT);
    }

    if (process.env.HOST) {
      this.config.server = this.config.server || {};
      this.config.server.host = process.env.HOST;
    }

    // 数据库配置
    if (process.env.DB_NAME) {
      this.config.database = this.config.database || {};
      this.config.database.name = process.env.DB_NAME;
    }

    // JWT配置
    if (process.env.JWT_SECRET) {
      this.config.jwt = this.config.jwt || {};
      this.config.jwt.secret = process.env.JWT_SECRET;
    }

    if (process.env.JWT_EXPIRES_IN) {
      this.config.jwt = this.config.jwt || {};
      this.config.jwt.expiresIn = process.env.JWT_EXPIRES_IN;
    }

    // 日志配置
    if (process.env.LOG_LEVEL) {
      this.config.logging = this.config.logging || {};
      this.config.logging.level = process.env.LOG_LEVEL;
    }

    // 缓存配置
    if (process.env.CACHE_TTL) {
      this.config.cache = this.config.cache || {};
      this.config.cache.defaultTTL = parseInt(process.env.CACHE_TTL);
    }

    // 安全配置
    if (process.env.RATE_LIMIT_MAX) {
      this.config.security = this.config.security || {};
      this.config.security.rateLimit = this.config.security.rateLimit || {};
      this.config.security.rateLimit.max = parseInt(process.env.RATE_LIMIT_MAX);
    }

    // CORS配置
    if (process.env.CORS_ORIGIN) {
      this.config.cors = this.config.cors || {};
      this.config.cors.origin = process.env.CORS_ORIGIN.split(',');
    }
  }

  /**
   * 验证配置
   */
  validateConfiguration() {
    const requiredConfigs = [
      'jwt.secret',
      'server.port'
    ];

    const missingConfigs = [];

    requiredConfigs.forEach(configPath => {
      if (!this.get(configPath)) {
        missingConfigs.push(configPath);
      }
    });

    if (missingConfigs.length > 0) {
      throw new Error(`缺少必需的配置项: ${missingConfigs.join(', ')}`);
    }

    // 验证JWT密钥强度
    const jwtSecret = this.get('jwt.secret');
    if (jwtSecret && jwtSecret.length < 32) {
      throw new Error('JWT_SECRET 长度必须至少32个字符');
    }

    // 验证端口范围
    const port = this.get('server.port');
    if (port && (port < 1 || port > 65535)) {
      throw new Error('服务器端口必须在1-65535范围内');
    }

    console.log('✅ 配置验证通过');
  }

  /**
   * 获取配置值
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let current = this.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * 设置配置值
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 获取所有配置
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * 获取环境特定配置
   */
  getEnvironmentConfig() {
    return {
      environment: this.environment,
      isProduction: this.environment === 'production',
      isDevelopment: this.environment === 'development',
      isTest: this.environment === 'test'
    };
  }

  /**
   * 深度合并对象
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof target[key] === 'object' &&
          target[key] !== null &&
          !Array.isArray(target[key])
        ) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 监听配置文件变化
   */
  watchConfigFile(callback) {
    const configFiles = [
      path.join(this.configPath, 'config.base.json'),
      path.join(this.configPath, `config.${this.environment}.json`)
    ];

    configFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const watcher = fs.watchFile(filePath, (curr, prev) => {
          console.log(`📋 配置文件变化: ${filePath}`);
          try {
            this.loadConfiguration();
            this.validateConfiguration();
            callback(this.config);
          } catch (error) {
            console.error('❌ 重新加载配置失败:', error.message);
          }
        });

        this.watchers.set(filePath, watcher);
      }
    });
  }

  /**
   * 停止监听配置文件
   */
  stopWatching() {
    this.watchers.forEach((watcher, filePath) => {
      fs.unwatchFile(filePath);
    });
    this.watchers.clear();
  }

  /**
   * 获取配置摘要（用于健康检查）
   */
  getConfigSummary() {
    return {
      environment: this.environment,
      server: {
        port: this.get('server.port'),
        host: this.get('server.host', 'localhost')
      },
      database: {
        name: this.get('database.name', 'task_manager.db')
      },
      jwt: {
        expiresIn: this.get('jwt.expiresIn', '15m'),
        hasSecret: !!this.get('jwt.secret')
      },
      logging: {
        level: this.get('logging.level', 'info')
      },
      cache: {
        defaultTTL: this.get('cache.defaultTTL', 300)
      },
      security: {
        rateLimitMax: this.get('security.rateLimit.max', 1000)
      }
    };
  }

  /**
   * 导出配置到文件
   */
  exportConfig(filePath) {
    try {
      const configToExport = {
        environment: this.environment,
        timestamp: new Date().toISOString(),
        config: this.getAll()
      };

      fs.writeFileSync(filePath, JSON.stringify(configToExport, null, 2));
      console.log(`📋 配置已导出到: ${filePath}`);
    } catch (error) {
      console.error('❌ 导出配置失败:', error.message);
      throw error;
    }
  }

  /**
   * 重新加载配置
   */
  reload() {
    try {
      this.loadConfiguration();
      this.validateConfiguration();
      console.log('📋 配置重新加载成功');
      return true;
    } catch (error) {
      console.error('❌ 重新加载配置失败:', error.message);
      return false;
    }
  }
}

// 创建单例实例
const configManager = new ConfigManager();

module.exports = configManager;
