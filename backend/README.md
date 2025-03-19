# 物流园区碳排放预测和管理系统 - 后端
## 项目概述
本项目是物流园区碳排放预测和管理系统的后端服务，基于 NestJS 框架开发，提供 RESTful API 接口，支持用户管理、设备管理、数据采集、碳排放计算和预测等功能。
## 技术栈
- 框架: NestJS
- 语言: TypeScript
- 数据库: PostgreSQL
- ORM: TypeORM
- 认证: JWT, Passport
- API文档: Swagger
- 容器化: Docker, Docker Compose
## 开发环境设置
### 前置条件
- Node.js (v14+)
- Docker 和 Docker Compose
- Git
### 步骤
1. 克隆仓库
## 项目概述

本项目是物流园区碳排放预测和管理系统的后端服务，基于 NestJS 框架开发，提供 RESTful API 接口，支持用户管理、设备管理、数据采集、碳排放计算和预测等功能。

## 技术栈

- **框架**: NestJS
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **ORM**: TypeORM
- **认证**: JWT, Passport
- **API文档**: Swagger
- **容器化**: Docker, Docker Compose

## 开发环境设置

### 前置条件

- Node.js (v14+)
- Docker 和 Docker Compose
- Git

### 步骤

1. **克隆仓库**

```bash
git clone <repository-url>
cd <repository-name>/backend
```

2. **安装依赖**

```bash
npm install
```

3. **创建环境配置文件**

项目根目录已包含 `.env.dev` 开发环境配置文件。如需自定义配置，可复制并修改此文件。

4. **启动开发环境**

我们使用 Docker Compose 来管理开发环境的 PostgreSQL 数据库：

```bash
# 启动 Docker 容器（PostgreSQL 和 pgAdmin）
npm run docker:up

# 或使用一键启动脚本（启动容器并运行应用）
npm run dev
```

## 运行项目

### 开发模式

```bash
# 启动开发服务器（带热重载）
npm run start:dev
```

### 生产模式

```bash
# 构建项目
npm run build

# 运行生产版本
npm run start:prod
```

## 初始化测试数据

项目提供了便捷的数据初始化 API 端点，用于创建测试数据：

```bash
# 初始化所有测试数据（用户和设备）
curl -X POST http://localhost:3000/db-init/all

# 仅初始化用户数据
curl -X POST http://localhost:3000/db-init/users

# 仅初始化设备数据
curl -X POST http://localhost:3000/db-init/devices
```

### 测试用户

初始化后，系统将创建以下测试用户：

| 用户名   | 密码        | 角色     | 说明             |
|----------|-------------|----------|------------------|
| admin    | admin123    | admin    | 系统管理员       |
| manager  | manager123  | manager  | 管理人员         |
| operator | operator123 | operator | 操作员           |
| viewer   | viewer123   | viewer   | 查看者（只读权限）|
| user     | user123     | user     | 普通用户         |

## API 文档

API 文档使用 Swagger 生成，启动应用后访问：

```
http://localhost:3000/api-docs
```

## 项目结构

```
backend/
├── src/                   # 源代码
│   ├── auth/              # 认证模块
│   ├── users/             # 用户管理模块
│   ├── devices/           # 设备管理模块
│   ├── data-collection/   # 数据采集模块
│   ├── prediction/        # 碳排放预测模块
│   ├── emission/          # 碳排放管理模块
│   ├── health/            # 健康检查和测试模块
│   ├── app.module.ts      # 主模块
│   └── main.ts            # 应用入口
├── docker-compose.yml     # Docker 配置
├── .env.dev               # 开发环境配置
├── .env.example           # 环境配置示例
└── start-dev.sh           # 开发启动脚本
```

## 可用的端点

启动应用后，以下端点可用于测试：

### 健康检查

- `GET /health` - 检查系统状态
- `GET /health/config` - 查看当前配置

### 数据库测试

- `GET /db-test` - 测试数据库连接
- `GET /db-check/users` - 查看用户列表
- `GET /db-check/users-count` - 查看用户总数
- `GET /db-check/test-user` - 创建测试用户

### 认证

- `POST /auth/register` - 注册新用户
- `POST /auth/login` - 用户登录（支持用户名或邮箱）
- `GET /auth/profile` - 获取当前用户资料（需要JWT认证）

### 用户管理

- `GET /users` - 获取用户列表（需要管理员权限）
- `GET /users/:id` - 获取特定用户信息
- `PATCH /users/:id` - 更新用户信息
- `DELETE /users/:id` - 删除用户（需要管理员权限）

## 常见问题

### 数据库连接问题

确保 Docker 容器正在运行：

```bash
docker ps
```

如果看不到 PostgreSQL 容器，请重新启动：

```bash
npm run docker:up
```

### JWT 认证问题

如果遇到 JWT 认证问题，请检查：

1. `.env.dev` 文件中是否正确设置了 `JWT_SECRET`
2. 请求头是否包含正确的 `Authorization: Bearer <token>` 格式

## 贡献指南

1. 创建功能分支 (`git checkout -b feature/amazing-feature`)
2. 提交你的更改 (`git commit -m 'Add some amazing feature'`)
3. 推送到分支 (`git push origin feature/amazing-feature`)
4. 创建一个 Pull Request

## 日志和监控

开发模式下，日志将输出到控制台。如需持久化日志，请配置适当的日志服务。

## 安全注意事项

1. 开发环境中的健康检查和数据库测试端点不应在生产环境中启用
2. 生产环境应使用强密码和密钥
3. 所有的敏感配置应通过环境变量注入，而不是硬编码

---

如有任何问题，请联系项目维护者。

## 测试指南

项目使用Jest作为测试框架，已配置单元测试和端到端测试。

### 运行测试

```bash
# 运行所有测试
npm test

# 仅运行特定文件的测试
npm test -- users.service

# 监视模式（在修改代码时自动重新运行测试）
npm run test:watch

# 生成测试覆盖率报告
npm run test:cov

# 调试测试
npm run test:debug

# 运行端到端测试
npm run test:e2e

# 运行角色管理相关测试
npm test -- roles
```

### 测试文件位置

- 单元测试文件位于各模块的源代码目录中，文件名格式为`*.spec.ts`
- 端到端测试文件位于`test`目录中

### 角色管理模块测试

角色管理模块的测试覆盖以下方面：

1. **角色服务测试** (`roles.service.spec.ts`):
   - 获取所有角色和角色描述
   - 获取角色详情和权限列表
   - 权限检查功能
   - 角色层级关系和管理权限控制

2. **角色控制器测试** (`roles.controller.spec.ts`):
   - API端点的正确响应
   - 角色详情获取
   - 角色权限列表获取

3. **用户角色管理测试** (`users.controller.roles.spec.ts`):
   - 角色更新功能
   - 权限检查和验证
   - 角色管理权限控制
   - 按角色筛选用户

4. **权限控制器测试** (`permissions.controller.spec.ts`):
   - 权限定义获取
   - 角色-权限映射获取
   - 权限描述获取

要运行特定的角色测试，可以使用：

```bash
# 运行角色服务测试
npm test -- roles.service

# 运行角色控制器测试  
npm test -- roles.controller

# 运行用户角色管理测试
npm test -- users.controller.roles

# 运行权限控制器测试
npm test -- permissions.controller
```

这些测试确保角色管理系统正确实现，特别是：
- 正确定义和分配权限
- 角色层级关系正确
- 只有高权限角色可以管理低权限角色
- 角色变更时的权限验证有效

### 用户模块测试覆盖的内容

用户模块的测试主要覆盖以下功能：

1. 用户创建（包括用户名/邮箱重复检查）
2. 用户查询（按ID、用户名、邮箱等）
3. 用户信息更新（包括角色和权限验证）
4. 密码更改和重置
5. 用户删除

所有测试用例都遵循"准备-执行-断言"模式，确保各个功能按预期工作。如果需要添加新功能，请确保同时添加相应的测试用例。

