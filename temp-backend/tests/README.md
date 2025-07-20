# 自动化测试文档

## 📋 测试概述

本项目包含全面的自动化测试套件，覆盖了系统的所有核心功能模块。测试使用Jest框架，包含单元测试、集成测试和API测试。

## 🗂️ 测试文件结构

```
tests/
├── setup.js              # 测试环境设置
├── auth.test.js          # 认证系统测试
├── tasks.test.js         # 任务管理测试
├── profiles.test.js      # 学生档案测试
├── admin.test.js         # 管理员功能测试
├── middleware.test.js    # 中间件测试
├── database.test.js      # 数据库连接测试
├── run-tests.js         # 测试运行脚本
└── README.md            # 测试文档
```

## 📊 测试统计

| 模块 | 测试场景数 | Happy Path | Edge Cases | Error Handling |
|------|-----------|------------|------------|----------------|
| 认证系统 | 13 | 4 | 3 | 6 |
| 任务管理 | 15 | 6 | 4 | 5 |
| 学生档案 | 12 | 5 | 4 | 3 |
| 管理员功能 | 14 | 6 | 3 | 5 |
| 中间件 | 18 | 6 | 4 | 8 |
| 数据库连接 | 12 | 8 | 2 | 2 |
| **总计** | **84** | **35** | **20** | **29** |

## 🚀 运行测试

### 安装依赖
```bash
npm install
```

### 运行所有测试
```bash
npm test
```

### 运行测试并生成覆盖率报告
```bash
npm run test:coverage
```

### 监视模式运行测试
```bash
npm run test:watch
```

### 使用自定义脚本运行
```bash
npm run test:run
```

## 🎯 测试覆盖率目标

- **分支覆盖率**: ≥ 70%
- **函数覆盖率**: ≥ 70%
- **行覆盖率**: ≥ 70%
- **语句覆盖率**: ≥ 70%

## 📝 测试类型说明

### 1. Happy Path 测试
验证功能在正常输入和预期条件下的正确行为。

**示例**:
- 正确凭据登录成功
- 有效数据更新档案
- 管理员获取学生列表

### 2. Edge Cases 测试
测试边界条件和特殊情况。

**示例**:
- 空输入字段
- 最大/最小值
- 特殊字符处理
- 并发请求

### 3. Error Handling 测试
验证错误情况下的处理机制。

**示例**:
- 无效凭据登录
- 权限不足访问
- 数据格式错误
- 网络异常

## 🔧 测试环境配置

### 环境变量
```bash
NODE_ENV=test
DB_NAME=task_manager_test_db
JWT_SECRET=test_jwt_secret
```

### 测试数据库
- 使用独立的测试数据库 `task_manager_test_db`
- 每次测试前自动重置数据
- 测试完成后清理数据

### 测试用户
```javascript
// 普通学生
ST001: { name: '测试学生1', password: 'TestPass123', forceChange: false }
ST002: { name: '测试学生2', password: 'TestPass123', forceChange: true }

// 管理员
ADMIN001: { name: '测试管理员', password: 'AdminPass123', forceChange: false }
```

## 📊 测试报告

测试完成后会生成以下报告：

1. **控制台输出**: 实时测试结果
2. **HTML报告**: `./coverage/index.html`
3. **JSON报告**: `./coverage/coverage-final.json`
4. **LCOV报告**: `./coverage/lcov.info`

## 🐛 常见问题

### 1. 数据库连接失败
```bash
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**解决方案**: 确保MySQL服务正在运行，并且测试数据库已创建。

### 2. JWT密钥错误
```bash
Error: secretOrPrivateKey has a minimum key size of 256 bits
```
**解决方案**: 检查环境变量中的JWT_SECRET是否设置正确。

### 3. 端口占用
```bash
Error: listen EADDRINUSE :::3001
```
**解决方案**: 测试环境不会启动服务器，如果出现此错误，检查是否有其他进程占用端口。

## 🔄 持续集成

测试可以集成到CI/CD流水线中：

```yaml
# GitHub Actions 示例
- name: Run Tests
  run: |
    npm install
    npm run test:coverage
    
- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

## 📈 测试最佳实践

1. **测试命名**: 使用描述性的测试名称
2. **数据隔离**: 每个测试使用独立的测试数据
3. **异步处理**: 正确处理异步操作和Promise
4. **错误验证**: 验证错误消息和状态码
5. **性能测试**: 包含响应时间和并发测试

## 🎯 未来改进

- [ ] 添加性能基准测试
- [ ] 集成端到端测试
- [ ] 添加负载测试
- [ ] 实现测试数据工厂
- [ ] 添加API文档测试
