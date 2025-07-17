const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 代理所有 /api 路径下的请求到后端
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
    })
  );
};