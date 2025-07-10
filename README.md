# 考研任务管理系统

一个基于React + Node.js + MySQL的前后端分离考研学习任务管理系统。

## 🚀 项目特性

- **前后端分离架构**: React前端 + Express后端
- **用户认证系统**: JWT token认证，支持密码修改
- **任务管理**: 每日任务跟踪，完成状态记录，学习时长统计
- **档案管理**: 详细的学生信息档案系统
- **请假功能**: 支持请假申请和任务自动调度
- **管理员功能**: 学生管理、任务批量导入、完成情况报告
- **移动端适配**: 响应式设计，支持移动设备访问

## 📁 项目结构

```
exam-task-system/
├── backend/                 # 后端代码
│   ├── config/             # 数据库配置
│   ├── middleware/         # 中间件
│   ├── routes/            # API路由
│   ├── package.json       # 后端依赖
│   └── server.js          # 服务器入口
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── contexts/      # Context状态管理
│   │   ├── services/      # API服务
│   │   └── App.js         # 应用入口
│   └── package.json       # 前端依赖
├── database/              # 数据库相关
│   └── schema.sql         # 数据库表结构
└── docs/                  # 文档
    ├── frontend-backend-integration.md
    └── tencent-cloud-deployment.md
```

## 🛠️ 技术栈

### 前端
- **React 18**: 前端框架
- **React Router**: 路由管理
- **Axios**: HTTP请求
- **TailwindCSS**: 样式框架
- **Context API**: 状态管理

### 后端
- **Node.js**: 运行环境
- **Express**: Web框架
- **MySQL**: 数据库
- **JWT**: 身份认证
- **bcrypt**: 密码加密
- **Joi**: 数据验证

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- npm >= 8.0.0

### 1. 克隆项目
```bash
git clone <repository-url>
cd exam-task-system
```

### 2. 数据库设置
```bash
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE exam_task_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 导入表结构
mysql -u root -p exam_task_system < database/schema.sql
```

### 3. 后端设置
```bash
cd backend
npm install

# 复制环境变量文件
cp .env.example .env

# 编辑环境变量
nano .env
```

配置 `.env` 文件：
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=exam_task_system

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

PORT=3001
NODE_ENV=development
```

启动后端服务：
```bash
npm run dev
```

### 4. 前端设置
```bash
cd frontend
npm install

# 启动前端开发服务器
npm start
```

### 5. 访问应用
- 前端地址: http://localhost:3000
- 后端API: http://localhost:3001

## 📊 数据库设计

### 主要数据表
- **students**: 学生基本信息
- **student_profiles**: 学生详细档案
- **tasks**: 学习任务记录
- **leave_records**: 请假记录
- **system_config**: 系统配置

详细表结构请查看 `database/schema.sql`

## 🔐 API接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/change-password` - 修改密码
- `GET /api/auth/verify` - 验证token

### 任务接口
- `GET /api/tasks` - 获取任务列表
- `PUT /api/tasks/:id` - 更新任务状态
- `POST /api/tasks/leave` - 请假申请

### 档案接口
- `GET /api/profiles` - 获取学生档案
- `PUT /api/profiles` - 更新学生档案

### 管理员接口
- `GET /api/admin/students` - 获取学生列表
- `POST /api/admin/students` - 创建学生
- `POST /api/admin/tasks/bulk-import` - 批量导入任务

## 🎯 功能说明

### 学生端功能
1. **登录系统**: 支持记住密码，首次登录强制修改密码
2. **每日任务**: 查看和完成每日学习任务，记录学习时长
3. **月度视图**: 日历形式查看任务完成情况
4. **个人档案**: 填写和管理个人学习信息
5. **请假功能**: 申请请假，系统自动调度任务

### 管理员功能
1. **学生管理**: 创建学生账户，重置密码
2. **任务导入**: CSV格式批量导入学习任务
3. **进度报告**: 查看学生任务完成情况统计
4. **档案查看**: 查看和编辑学生详细档案

## 🚀 部署指南

### 本地开发
```bash
# 后端
cd backend && npm run dev

# 前端
cd frontend && npm start
```

### 生产部署
详细部署步骤请参考：
- [腾讯云部署指南](docs/tencent-cloud-deployment.md)
- [前后端对接方案](docs/frontend-backend-integration.md)

### Docker部署 (可选)
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

## 🔧 开发说明

### 代码规范
- 使用ESLint进行代码检查
- 遵循React Hooks最佳实践
- API接口遵循RESTful设计规范

### 测试
```bash
# 后端测试
cd backend && npm test

# 前端测试
cd frontend && npm test
```

## 📝 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 完成基础功能开发
- 支持前后端分离部署

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 邮箱: your-email@example.com
- 项目Issues: [GitHub Issues](https://github.com/your-repo/issues)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户！
