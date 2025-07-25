const NodeCache = require('node-cache');
const logger = require('../utils/Logger');

/**
 * 多层缓存服务
 * 提供内存缓存、分层缓存和智能缓存策略
 */
class CacheService {
  constructor() {
    // 主缓存 - 用于频繁访问的数据
    this.mainCache = new NodeCache({
      stdTTL: 300, // 5分钟默认TTL
      checkperiod: 60, // 每60秒检查过期
      useClones: false, // 提升性能
      deleteOnExpire: true,
      maxKeys: 1000 // 最大缓存键数量
    });

    // 长期缓存 - 用于不经常变化的数据
    this.longTermCache = new NodeCache({
      stdTTL: 3600, // 1小时默认TTL
      checkperiod: 300, // 每5分钟检查过期
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 500
    });

    // 会话缓存 - 用于用户会话相关数据
    this.sessionCache = new NodeCache({
      stdTTL: 1800, // 30分钟默认TTL
      checkperiod: 120, // 每2分钟检查过期
      useClones: false,
      deleteOnExpire: true,
      maxKeys: 2000
    });

    // 统计信息
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    this.setupEventHandlers();
    logger.info('Cache service initialized', {
      mainCacheTTL: 300,
      longTermCacheTTL: 3600,
      sessionCacheTTL: 1800
    });
  }

  /**
   * 设置事件处理器
   */
  setupEventHandlers() {
    // 主缓存事件
    this.mainCache.on('set', (key, value) => {
      this.stats.sets++;
      logger.debug('Cache set', { cache: 'main', key, size: this.getValueSize(value) });
    });

    this.mainCache.on('del', (key, value) => {
      this.stats.deletes++;
      logger.debug('Cache delete', { cache: 'main', key });
    });

    this.mainCache.on('expired', (key, value) => {
      logger.debug('Cache expired', { cache: 'main', key });
    });

    // 长期缓存事件
    this.longTermCache.on('set', (key, value) => {
      logger.debug('Cache set', { cache: 'longTerm', key, size: this.getValueSize(value) });
    });

    // 会话缓存事件
    this.sessionCache.on('set', (key, value) => {
      logger.debug('Cache set', { cache: 'session', key, size: this.getValueSize(value) });
    });
  }

  /**
   * 获取缓存值的大小估算
   */
  getValueSize(value) {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  /**
   * 获取缓存数据
   */
  async get(key, cacheType = 'main') {
    try {
      const cache = this.getCache(cacheType);
      const value = cache.get(key);
      
      if (value !== undefined) {
        this.stats.hits++;
        logger.debug('Cache hit', { cache: cacheType, key });
        return value;
      } else {
        this.stats.misses++;
        logger.debug('Cache miss', { cache: cacheType, key });
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache get error', { cache: cacheType, key, error: error.message });
      return null;
    }
  }

  /**
   * 设置缓存数据
   */
  async set(key, value, ttl = null, cacheType = 'main') {
    try {
      const cache = this.getCache(cacheType);
      const success = cache.set(key, value, ttl);
      
      if (success) {
        this.stats.sets++;
        logger.debug('Cache set success', { 
          cache: cacheType, 
          key, 
          ttl, 
          size: this.getValueSize(value) 
        });
      }
      
      return success;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache set error', { cache: cacheType, key, error: error.message });
      return false;
    }
  }

  /**
   * 删除缓存数据
   */
  async del(key, cacheType = 'main') {
    try {
      const cache = this.getCache(cacheType);
      const deleted = cache.del(key);
      
      if (deleted > 0) {
        this.stats.deletes++;
        logger.debug('Cache delete success', { cache: cacheType, key, count: deleted });
      }
      
      return deleted;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache delete error', { cache: cacheType, key, error: error.message });
      return 0;
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  async getOrSet(key, fetchFunction, ttl = null, cacheType = 'main') {
    try {
      // 先尝试从缓存获取
      let value = await this.get(key, cacheType);
      
      if (value !== null) {
        return value;
      }

      // 缓存未命中，执行获取函数
      logger.debug('Cache miss, fetching data', { cache: cacheType, key });
      value = await fetchFunction();
      
      // 将结果存入缓存
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl, cacheType);
      }
      
      return value;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache getOrSet error', { cache: cacheType, key, error: error.message });
      
      // 发生错误时，尝试直接执行获取函数
      try {
        return await fetchFunction();
      } catch (fetchError) {
        logger.error('Fetch function error', { key, error: fetchError.message });
        throw fetchError;
      }
    }
  }

  /**
   * 批量获取缓存
   */
  async mget(keys, cacheType = 'main') {
    try {
      const cache = this.getCache(cacheType);
      const result = cache.mget(keys);
      
      const hits = Object.keys(result).length;
      const misses = keys.length - hits;
      
      this.stats.hits += hits;
      this.stats.misses += misses;
      
      logger.debug('Cache mget', { cache: cacheType, keys: keys.length, hits, misses });
      
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache mget error', { cache: cacheType, keys, error: error.message });
      return {};
    }
  }

  /**
   * 批量设置缓存
   */
  async mset(keyValuePairs, ttl = null, cacheType = 'main') {
    try {
      const cache = this.getCache(cacheType);
      const success = cache.mset(keyValuePairs, ttl);
      
      if (success) {
        this.stats.sets += Object.keys(keyValuePairs).length;
        logger.debug('Cache mset success', { 
          cache: cacheType, 
          count: Object.keys(keyValuePairs).length,
          ttl 
        });
      }
      
      return success;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache mset error', { cache: cacheType, error: error.message });
      return false;
    }
  }

  /**
   * 清空指定缓存
   */
  async flush(cacheType = 'main') {
    try {
      const cache = this.getCache(cacheType);
      cache.flushAll();
      
      logger.info('Cache flushed', { cache: cacheType });
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache flush error', { cache: cacheType, error: error.message });
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  async flushAll() {
    try {
      this.mainCache.flushAll();
      this.longTermCache.flushAll();
      this.sessionCache.flushAll();
      
      logger.info('All caches flushed');
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Flush all caches error', { error: error.message });
      return false;
    }
  }

  /**
   * 根据模式删除缓存键
   */
  async delByPattern(pattern, cacheType = 'main') {
    try {
      const cache = this.getCache(cacheType);
      const keys = cache.keys();
      const regex = new RegExp(pattern);
      const matchingKeys = keys.filter(key => regex.test(key));
      
      if (matchingKeys.length > 0) {
        const deleted = cache.del(matchingKeys);
        this.stats.deletes += deleted;
        
        logger.debug('Cache pattern delete', { 
          cache: cacheType, 
          pattern, 
          deleted,
          keys: matchingKeys 
        });
        
        return deleted;
      }
      
      return 0;
    } catch (error) {
      this.stats.errors++;
      logger.error('Cache pattern delete error', { cache: cacheType, pattern, error: error.message });
      return 0;
    }
  }

  /**
   * 获取指定缓存实例
   */
  getCache(cacheType) {
    switch (cacheType) {
      case 'longTerm':
        return this.longTermCache;
      case 'session':
        return this.sessionCache;
      case 'main':
      default:
        return this.mainCache;
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const mainStats = this.mainCache.getStats();
    const longTermStats = this.longTermCache.getStats();
    const sessionStats = this.sessionCache.getStats();

    return {
      global: this.stats,
      main: {
        keys: mainStats.keys,
        hits: mainStats.hits,
        misses: mainStats.misses,
        ksize: mainStats.ksize,
        vsize: mainStats.vsize
      },
      longTerm: {
        keys: longTermStats.keys,
        hits: longTermStats.hits,
        misses: longTermStats.misses,
        ksize: longTermStats.ksize,
        vsize: longTermStats.vsize
      },
      session: {
        keys: sessionStats.keys,
        hits: sessionStats.hits,
        misses: sessionStats.misses,
        ksize: sessionStats.ksize,
        vsize: sessionStats.vsize
      },
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * 获取所有缓存键
   */
  getAllKeys() {
    return {
      main: this.mainCache.keys(),
      longTerm: this.longTermCache.keys(),
      session: this.sessionCache.keys()
    };
  }
}

/**
 * 缓存中间件工厂
 */
const createCacheMiddleware = (options = {}) => {
  const {
    ttl = 300,
    cacheType = 'main',
    keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
    condition = () => true,
    skipCache = (req) => false
  } = options;

  return async (req, res, next) => {
    // 检查是否跳过缓存
    if (skipCache(req) || req.method !== 'GET') {
      return next();
    }

    // 检查缓存条件
    if (!condition(req)) {
      return next();
    }

    const cacheKey = keyGenerator(req);

    try {
      // 尝试从缓存获取数据
      const cachedData = await cacheService.get(cacheKey, cacheType);

      if (cachedData) {
        logger.debug('Cache middleware hit', {
          key: cacheKey,
          cache: cacheType,
          requestId: req.requestId
        });

        // 设置缓存头
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);

        return res.json(cachedData);
      }

      // 缓存未命中，继续处理请求
      logger.debug('Cache middleware miss', {
        key: cacheKey,
        cache: cacheType,
        requestId: req.requestId
      });

      // 拦截响应以缓存结果
      const originalJson = res.json;
      res.json = function(data) {
        // 只缓存成功的响应
        if (res.statusCode === 200 && data && data.success !== false) {
          cacheService.set(cacheKey, data, ttl, cacheType).catch(error => {
            logger.error('Cache middleware set error', {
              key: cacheKey,
              error: error.message
            });
          });
        }

        // 设置缓存头
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);

        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', {
        key: cacheKey,
        error: error.message
      });
      next();
    }
  };
};

// 创建单例实例
const cacheService = new CacheService();

module.exports = {
  cacheService,
  createCacheMiddleware
};
