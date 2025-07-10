# 前后端对接方案

## 1. 技术架构

### 前端技术栈
- **React 18**: 使用函数组件和Hooks
- **React Router**: 路由管理
- **Axios**: HTTP请求库
- **Context API**: 全局状态管理
- **TailwindCSS**: 样式框架

### 后端技术栈
- **Node.js + Express**: 服务器框架
- **MySQL**: 数据库
- **JWT**: 身份认证
- **bcrypt**: 密码加密
- **Joi**: 数据验证

## 2. API设计规范

### 请求格式
```javascript
// 请求头
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <jwt_token>"
}

// 请求体
{
  "data": "request_data"
}
```

### 响应格式
```javascript
// 成功响应
{
  "success": true,
  "message": "操作成功",
  "data": { /* 响应数据 */ }
}

// 错误响应
{
  "success": false,
  "message": "错误信息",
  "code": "ERROR_CODE" // 可选
}
```

## 3. 认证流程

### 登录流程
1. 前端发送登录请求 `POST /api/auth/login`
2. 后端验证用户名密码
3. 生成JWT token并返回
4. 前端保存token到localStorage
5. 后续请求在header中携带token

### Token管理
```javascript
// axios请求拦截器
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// axios响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // token过期，跳转登录页
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data);
  }
);
```

## 4. 状态管理

### Context结构
```javascript
const AppContext = {
  // 用户状态
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  
  // 系统状态
  systemDate: new Date(),
  
  // 方法
  login: (studentId, password) => {},
  logout: () => {},
  forceChangePassword: (newPassword) => {},
  changePassword: (oldPassword, newPassword) => {}
};
```

### 数据流
1. 组件通过useApp Hook获取状态和方法
2. 调用API方法更新远程数据
3. 更新本地Context状态
4. 组件重新渲染

## 5. 错误处理

### 网络错误处理
```javascript
try {
  const response = await api.get('/api/tasks');
  // 处理成功响应
} catch (error) {
  if (error.message === '网络错误，请检查网络连接') {
    // 显示网络错误提示
  } else {
    // 显示服务器错误信息
    setError(error.message);
  }
}
```

### 表单验证
- 前端：实时验证用户输入
- 后端：使用Joi进行数据验证
- 双重验证确保数据安全

## 6. 数据同步策略

### 任务数据
- 获取任务：按日期范围查询
- 更新任务：实时更新到服务器
- 本地缓存：使用React状态缓存当前数据

### 档案数据
- 懒加载：首次访问时获取
- 提交后锁定：防止重复修改
- 管理员可编辑：特殊权限处理

## 7. 性能优化

### 前端优化
- 组件懒加载
- 图片压缩上传
- 防抖处理用户输入
- 虚拟滚动（如需要）

### 后端优化
- 数据库索引优化
- 分页查询
- 缓存常用数据
- 连接池管理

## 8. 安全措施

### 前端安全
- XSS防护：转义用户输入
- CSRF防护：使用token验证
- 敏感信息不存储在前端

### 后端安全
- SQL注入防护：使用参数化查询
- 密码加密：bcrypt加密存储
- 请求限制：防止暴力攻击
- CORS配置：限制跨域访问

## 9. 开发调试

### 本地开发
```bash
# 后端
cd backend
npm install
npm run dev  # 端口3001

# 前端
cd frontend
npm install
npm start    # 端口3000
```

### 环境变量
```bash
# 后端 .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_secret

# 前端 .env
REACT_APP_API_URL=http://localhost:3001/api
```

## 10. 部署对接

### 生产环境配置
- 前端：构建静态文件，部署到CDN
- 后端：PM2进程管理，Nginx反向代理
- 数据库：云数据库，定期备份
- HTTPS：SSL证书配置

### 跨域处理
```javascript
// 后端CORS配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));
```
