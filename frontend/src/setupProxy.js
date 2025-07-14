const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 只代理 /api 路径下的请求到后端
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api', // 保持 /api 前缀
      },
    })
  );
};