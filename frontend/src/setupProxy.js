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
      onError: (err, req, res) => {
        console.log('代理错误:', err.message);
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('代理请求:', req.method, req.url, '-> http://localhost:3001' + req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('代理响应:', proxyRes.statusCode, req.url);
      }
    })
  );
};