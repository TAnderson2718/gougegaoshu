# 任务管理系统后端

基于Node.js + Express + MySQL的任务管理系统后端API。

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- npm >= 8.0.0

### 1. 自动设置（推荐）
```bash
# 运行自动设置脚本
npm run setup
```

自动设置脚本会：
- ✅ 检查Node.js版本
- ✅ 创建环境变量文件
- ✅ 安装项目依赖
- ✅ 检查MySQL连接
- ✅ 自动创建数据库和表结构
- ✅ 插入初始测试数据

### 2. 手动设置
```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库密码等

# 3. 初始化数据库
npm run db:init

# 4. 启动服务器
npm run dev
```

## 📊 数据库配置

### 默认配置
- **数据库名**: `task_manager_db`
- **用户名**: `root`
- **密码**: `123456` (可在.env中修改)
- **端口**: `3306`

### 数据库表结构
- `students` - 学生基本信息
- `student_profiles` - 学生详细档案
- `tasks` - 学习任务记录
- `leave_records` - 请假记录
- `system_config` - 系统配置

## 🔧 启动方式

### 开发模式
```bash
npm run dev          # 使用nodemon自动重启
```

### 生产模式
```bash
npm start           # 直接启动
```

### 启动并测试
```bash
npm run start:test  # 启动服务器并运行基础测试
```

## 🧪 测试

### API功能测试
```bash
npm run test:api    # 测试所有API接口
```

### 数据库初始化测试
```bash
npm run db:init     # 重新初始化数据库
```

## 📡 API端点

### 健康检查
- `GET /health` - 服务器健康状态
- `GET /api/db-status` - 数据库连接状态

### 认证相关
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/force-change-password` - 强制修改密码
- `POST /api/auth/change-password` - 修改密码
- `GET /api/auth/verify` - 验证token

### 任务管理
- `GET /api/tasks` - 获取任务列表
- `PUT /api/tasks/:id` - 更新任务状态
- `POST /api/tasks/leave` - 请假申请
- `GET /api/tasks/leave-records` - 获取请假记录

### 档案管理
- `GET /api/profiles` - 获取学生档案
- `PUT /api/profiles` - 更新学生档案

### 管理员功能
- `GET /api/admin/students` - 获取学生列表
- `POST /api/admin/students` - 创建学生
- `POST /api/admin/students/:id/reset-password` - 重置密码
- `GET /api/admin/students/:id/profile` - 获取学生档案
- `POST /api/admin/tasks/bulk-import` - 批量导入任务
- `GET /api/admin/reports/tasks` - 获取任务报告

## 🔑 默认登录信息

- **学生ID**: `ST001` 或 `ST002`
- **密码**: `Hello888`
- **首次登录**: 需要强制修改密码

## 🛠️ 开发说明

### 项目结构
```
backend/
├── config/          # 配置文件
│   └── database.js  # 数据库配置
├── middleware/      # 中间件
│   └── auth.js      # 认证中间件
├── routes/          # API路由
│   ├── auth.js      # 认证相关
│   ├── tasks.js     # 任务管理
│   ├── profiles.js  # 档案管理
│   └── admin.js     # 管理员功能
├── scripts/         # 脚本文件
│   ├── initDatabase.js  # 数据库初始化
│   └── testAPI.js       # API测试
├── server.js        # 服务器入口
├── setup.js         # 自动设置脚本
└── start-and-test.js # 启动并测试
```

### 环境变量
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=task_manager_db

# JWT配置
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# 服务器配置
PORT=3001
NODE_ENV=development

# 初始密码
INITIAL_PASSWORD=Hello888
```

## 🔍 故障排查

### 常见问题

1. **数据库连接失败**
   ```bash
   # 检查MySQL服务状态
   sudo systemctl status mysql
   
   # 启动MySQL服务
   sudo systemctl start mysql
   
   # 检查密码是否正确
   mysql -u root -p
   ```

2. **端口被占用**
   ```bash
   # 查看端口占用
   lsof -i :3001
   
   # 修改端口（在.env文件中）
   PORT=3002
   ```

3. **权限问题**
   ```bash
   # 给MySQL用户授权
   mysql -u root -p
   GRANT ALL PRIVILEGES ON task_manager_db.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 重置数据库
```bash
# 删除数据库并重新创建
mysql -u root -p -e "DROP DATABASE IF EXISTS task_manager_db;"
npm run db:init
```

## 📝 更新日志

### v1.0.0
- ✅ 完整的MySQL数据库集成
- ✅ 自动建表和初始化
- ✅ JWT认证系统
- ✅ 完整的CRUD API
- ✅ 自动化测试脚本
- ✅ 一键设置功能

## 📞 技术支持

如遇问题，请检查：
1. Node.js和MySQL版本是否符合要求
2. 环境变量配置是否正确
3. 数据库服务是否正常运行
4. 端口是否被占用

更多帮助请查看项目文档或提交Issue。
