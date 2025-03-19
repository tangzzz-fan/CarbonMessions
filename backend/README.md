# 后端服务

## 简介

本项目是物流园区碳排放管理系统的后端服务，基于NestJS框架开发，提供RESTful API接口。

## 技术栈

- **框架**: NestJS
- **语言**: TypeScript
- **数据库**: PostgreSQL
- **ORM**: TypeORM
- **认证**: JWT (JSON Web Token)
- **API文档**: Swagger

## 快速开始

### 前置条件

- Node.js (v14+)
- PostgreSQL
- Docker & Docker Compose (可选)

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制环境变量示例文件并根据需要修改：

```bash
cp .env.example .env.dev
```

### 启动开发服务器

```bash
# 方式1：手动启动
npm run start:dev

# 方式2：使用开发脚本（包含 Docker PostgreSQL）
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 数据库初始化和测试数据

系统提供了一组API用于初始化数据库和插入测试数据。

### 初始化测试数据

```bash
# 初始化所有测试数据（用户和设备）
curl -X POST http://localhost:3000/db-init/all

# 或单独初始化
# 仅初始化用户数据
curl -X POST http://localhost:3000/db-init/users

# 仅初始化设备数据
curl -X POST http://localhost:3000/db-init/devices
```

初始化的用户数据包括：
- 管理员: admin/admin123
- 经理: manager/manager123
- 操作员: operator/operator123
- 普通用户: user/user123

初始化的设备数据包括不同类型的设备（卡车、叉车、包装设备等），不同的能源类型（电力、柴油、压缩天然气等）和不同的状态（活跃、待机、维护中等）。

### 检查测试数据

```bash
# 检查用户数据
curl http://localhost:3000/db-check/users

# 检查设备数据
curl http://localhost:3000/db-check/devices

# 查看数据计数
curl http://localhost:3000/db-check/users-count
curl http://localhost:3000/db-check/devices-count

# 按类型查询设备
curl http://localhost:3000/db-check/devices?type=truck
```

## 运行测试

项目使用Jest作为测试框架，已配置单元测试、集成测试和端到端测试。测试覆盖了所有核心模块，包括用户管理、设备管理、数据采集、认证授权等。

### 测试类型

- **单元测试**: 测试独立的组件和服务
- **集成测试**: 测试组件间的交互
- **端到端测试**: 测试完整的业务流程

### 测试覆盖模块

- 用户管理模块 (users)
- 设备管理模块 (devices)
- 数据采集模块 (data-collection)
- 认证模块 (auth)
- 角色管理模块 (roles)
- 权限管理模块 (permissions)

### 本地环境运行测试

```bash
# 运行所有测试
npm test

# 运行特定模块测试
npm test -- users        # 用户模块测试
npm test -- devices      # 设备模块测试
npm test -- auth         # 认证模块测试
npm test -- roles        # 角色管理测试
npm test -- permissions  # 权限管理测试
npm test -- data-collection  # 数据采集模块测试

# 生成测试覆盖率报告
npm run test:cov

# 以监视模式运行测试（代码修改时自动重新运行）
npm run test:watch

# 运行端到端测试
npm run test:e2e

# 运行特定端到端测试
npm run test:e2e -- device-permissions  # 设备权限测试
npm run test:e2e -- auth               # 认证流程测试
npm run test:e2e -- data-collection    # 数据采集测试
```

### Docker环境
```bash
# 运行所有测试
docker-compose -f docker-compose.test.yml exec nestjs-app npm run test
# 运行特定模块测试
docker-compose -f docker-compose.test.yml exec nestjs-app npm run test -- users
# 生成测试覆盖率报告
docker-compose -f docker-compose.test.yml exec nestjs-app npm run test:cov
# 以监视模式运行测试（代码修改时自动重新运行）
docker-compose -f docker-compose.test.yml exec nestjs-app npm run test:watch
# 运行端到端测试
docker-compose -f docker-compose.test.yml exec nestjs-app npm run test:e2e
# 运行设备权限端到端测试
docker-compose -f docker-compose.test.yml exec nestjs-app npm run test:e2e -- device-permissions
```

## API文档

项目集成了Swagger文档，启动服务后访问：

```
http://localhost:3000/api/docs
```

## Docker环境配置

本项目提供了完整的Docker配置，支持开发环境和生产环境的快速搭建。

### 开发环境配置

开发环境使用`docker-compose.dev.yml`配置文件，包含NestJS应用和PostgreSQL数据库服务。

#### 方式一：使用开发脚本

最简单的方式是使用项目提供的开发脚本：

```bash
# 一键启动开发环境（包含数据库和应用）
npm run dev
```

该脚本会：
1. 设置NODE_ENV=dev环境变量
2. 启动PostgreSQL容器
3. 等待数据库就绪
4. 启动NestJS应用（热重载模式）

#### 方式二：分步启动

如果需要更精细的控制，可以分步启动：

```bash
# 仅启动数据库容器
docker-compose -f docker-compose.dev.yml up -d postgres

# 启动NestJS应用（本地开发模式）
npm run start:dev

# 或启动完整开发环境（包含NestJS容器）
docker-compose -f docker-compose.dev.yml up -d
```

#### 开发环境特性

- 代码热重载：修改代码后自动重启应用
- 卷挂载：本地代码变更实时同步到容器
- 独立的开发数据库：使用`carbon_emission_dev`数据库
- 预配置的环境变量：JWT密钥、数据库连接等

### 生产环境配置

生产环境使用`docker-compose.yml`配置文件，专注于提供稳定的数据库服务。

```bash
# 启动生产环境数据库
docker-compose up -d

# 停止生产环境服务
docker-compose down
```

生产环境配置包含：

- PostgreSQL数据库服务
- pgAdmin管理工具（可选，访问地址：http://localhost:5050）
- 持久化数据卷
- 自定义网络隔离

### 常用Docker操作

```bash
# 查看运行中的容器
docker ps

# 查看容器日志
docker logs carbon-emission-postgres

# 进入容器内部
docker exec -it carbon-emission-postgres bash

# 重启特定容器
docker restart carbon-emission-postgres
```

### 环境变量配置

开发环境的环境变量在`docker-compose.dev.yml`中预配置，包括：

- 数据库连接信息
- JWT密钥和过期时间
- 应用环境设置

生产环境应修改这些默认值，特别是密码和密钥。

### 常见问题

#### 端口冲突

如果5432端口被占用，可以修改docker-compose文件中的端口映射：

```yaml
ports:
  - "5433:5432"  # 将主机5433端口映射到容器5432端口
```

#### 数据库连接问题

确保在`.env.dev`文件中的数据库连接信息与Docker配置一致：

```
DB_HOST=localhost  # 本地开发时使用localhost
DB_HOST=postgres   # Docker环境中使用服务名
```

## 常见问题

### JWT认证问题

如果遇到JWT认证问题，请检查：

1. `.env.dev`文件中是否正确设置了`JWT_SECRET`
2. 请求头是否包含正确的`Authorization: Bearer <token>`格式

## 目录结构

```
src/
├── auth/              # 认证模块
├── users/             # 用户模块
├── devices/           # 设备模块
├── data-collection/   # 数据采集模块（待实现）
├── prediction/        # 预测模块（待实现）
├── emission/          # 排放管理模块（待实现）
├── health/            # 健康检查和数据库初始化
├── app.module.ts      # 应用主模块
└── main.ts            # 应用入口
test/                  # 测试目录
├── jest-e2e.json      # 端到端测试配置
├── device-permissions.e2e-spec.ts  # 设备权限测试
└── ...                # 其他测试文件
```

## 安全注意事项

1. 开发环境中的健康检查和数据库测试端点不应在生产环境中启用
2. 生产环境应使用强密码和密钥
3. 所有的敏感配置应通过环境变量注入，而不是硬编码

---

如有任何问题，请联系项目维护者。