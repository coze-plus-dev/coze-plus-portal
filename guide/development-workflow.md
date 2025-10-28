# 开发流程

本文档介绍 Coze Plus 项目的完整开发工作流程，包括环境搭建、代码生成、开发调试和数据库迁移等内容。

## 开发环境准备

### 前置要求

- **Go**: 1.24.0 或更高版本
- **Node.js**: 20.x LTS (Iron) 或更高版本
- **Docker**: 用于运行中间件服务
- **Make**: 构建工具
- **Rush.js**: 前端 monorepo 管理工具

### 安装依赖

```bash
# 安装 Go 依赖
cd backend
go mod download

# 安装前端依赖（使用 Rush）
rush update

# 或者在特定包中安装
cd frontend/apps/coze-studio
npm install
```

## 完整开发流程

### 方式一：使用 make debug（推荐）

`make debug` 命令会自动启动完整的开发环境，包括中间件、后端服务和 Python 环境。

```bash
# 一键启动完整开发环境
make debug
```

**执行流程**：
1. 检查并创建环境变量文件（`.env.debug`）
2. 启动中间件服务（MySQL、Redis、Elasticsearch、MinIO 等）
3. 设置 Python 环境（用于代码运行器）
4. 构建并启动后端服务

**等效命令**：
```bash
make debug
# 等同于
make env && make middleware && make python && make server
```

然后在新终端启动前端：

```bash
# 进入前端应用目录
cd frontend/apps/coze-studio

# 启动前端开发服务器
npm run dev
```

访问 http://localhost:3000 即可开始开发。

### 方式二：分步启动（灵活控制）

#### 1. 启动中间件服务

```bash
# 启动所有中间件（MySQL, Redis, Elasticsearch, MinIO, Milvus, etcd, NSQ）
make middleware
```

中间件服务包括：
- **MySQL 8.4.5**: 主数据库
- **Redis 8.0**: 缓存服务
- **Elasticsearch 8.18.0**: 搜索引擎
- **MinIO**: 对象存储
- **Milvus v2.5.10**: 向量数据库
- **etcd 3.5**: 配置中心
- **NSQ**: 消息队列（nsqlookupd, nsqd, nsqadmin）

**查看服务状态**：
```bash
docker compose -f docker/docker-compose-debug.yml --env-file docker/.env.debug ps
```

**查看服务日志**：
```bash
docker compose -f docker/docker-compose-debug.yml --env-file docker/.env.debug logs -f
```

#### 2. 启动后端服务

```bash
# 构建并启动 Go 后端服务
make server
```

**make server 执行流程**：
1. 检查 `bin/resources/static` 目录是否存在
2. 如果不存在，自动执行 `make fe` 构建前端
3. 运行 `scripts/setup/server.sh -start`，编译并启动 Go 服务

**服务端口**：
- API 服务: http://localhost:8888
- 管理接口: http://localhost:8889

**查看后端日志**：
```bash
# 日志输出在终端
tail -f logs/app.log
```

**手动构建后端**（不启动）：
```bash
make build_server
```

#### 3. 启动前端服务

```bash
# 进入前端应用目录
cd frontend/apps/coze-studio

# 启动开发服务器（带热重载）
npm run dev
```

**前端开发服务器**：
- 地址: http://localhost:3000
- 热重载: 代码修改后自动刷新
- 代理配置: 自动代理 `/api/*` 请求到后端 8888 端口

**其他前端命令**：
```bash
# 构建生产版本
npm run build

# 运行测试
npm run test

# 代码检查
npm run lint

# 预览构建结果
npm run preview
```

## 代码生成

### 1. IDL 代码生成（API Handler 层）

Coze Plus 使用 Thrift IDL 定义 API 接口，通过 Hertz 框架自动生成 Handler 代码。

#### IDL 文件结构

```
idl/
├── api.thrift                    # 主 API 定义
├── base.thrift                   # 基础类型定义
├── corporation/                  # 组织管理 API
│   ├── corporation.thrift
│   └── department.thrift
├── app/                          # 应用管理 API
├── workflow/                     # 工作流 API
├── plugin/                       # 插件 API
└── ...
```

#### 生成 API Handler 代码

```bash
# 安装 Hertz 代码生成工具
go install github.com/cloudwego/hertz/cmd/hz@latest

# 生成指定 IDL 文件的 Handler 代码（需要 --enable-extends 参数）
hz update -idl idl/corporation/corporation.thrift --enable-extends

# 或者批量生成所有 IDL
hz update -idl idl/api.thrift --enable-extends
```

**重要参数说明**：
- `--enable-extends`: 启用 Thrift 继承支持，允许 IDL 文件中的 service 继承
- `-idl`: 指定 IDL 文件路径
- `update`: 更新已存在的代码（保留手写的业务逻辑）

**其他常用参数**：
```bash
# 指定模块名
hz update -idl idl/api.thrift --enable-extends -mod github.com/coze-dev/coze-studio

# 自定义输出路径
hz update -idl idl/api.thrift --enable-extends --handler_dir=backend/api/handler

# 查看帮助信息
hz update --help
```

**生成的代码**：
```
backend/
├── api/
│   ├── handler/              # HTTP Handler 层
│   │   └── coze/
│   │       └── corporation_service.go
│   ├── model/                # 请求/响应模型
│   │   └── corporation/
│   │       └── corporation.go
│   └── router/               # 路由注册
│       └── coze/
│           └── corporation.go
```

#### IDL 开发流程

1. **定义 IDL 接口**

编辑 `idl/corporation/corporation.thrift`:
```thrift
namespace go corporation

struct CreateCorporationRequest {
    1: required string name
    2: optional string description
}

struct CreateCorporationResponse {
    1: i64 corporation_id
    2: i32 code
    3: string msg
}

service CorporationService {
    CreateCorporationResponse CreateCorporation(1: CreateCorporationRequest req)
}
```

2. **生成 Handler 代码**

```bash
hz update -idl idl/corporation/corporation.thrift --enable-extends
```

3. **实现业务逻辑**

生成的 Handler 代码在 `backend/api/handler/coze/corporation_service.go`:

```go
// CreateCorporation implements the CorporationServiceImpl interface.
func (s *CorporationServiceImpl) CreateCorporation(ctx context.Context, req *corporation.CreateCorporationRequest) (resp *corporation.CreateCorporationResponse, err error) {
    // TODO: 实现业务逻辑
    // 1. 参数验证
    // 2. 调用 Application 层服务
    // 3. 返回响应
    return
}
```

4. **注册路由**

路由会自动在 `backend/api/router/coze/corporation.go` 中注册。

### 2. DAL 层代码生成（GORM Gen）

Coze Plus 使用 GORM Gen 工具从数据库表自动生成数据访问层（DAL）代码。

#### DAL 代码结构

```
backend/domain/corporation/internal/dal/
├── model/                        # 数据模型（自动生成）
│   ├── corporation.gen.go
│   ├── corporation_department.gen.go
│   ├── corporation_employee.gen.go
│   └── corporation_employee_department.gen.go
└── query/                        # 查询构建器（自动生成）
    ├── gen.go                    # 查询入口
    ├── corporation.gen.go
    ├── corporation_department.gen.go
    ├── corporation_employee.gen.go
    └── corporation_employee_department.gen.go
```

#### 配置代码生成

编辑 `backend/types/ddl/gen_orm_query.go`，添加需要生成的表：

```go
var path2Table2Columns2Model = map[string]map[string]map[string]any{
    // ... 其他配置

    "domain/corporation/internal/dal/query": {
        "corporation":                     {},
        "corporation_department":          {},
        "corporation_employee":            {},
        "corporation_employee_department": {},
    },

    // ... 其他配置
}

// 配置字段是否可空
var fieldNullablePath = map[string]bool{
    "domain/corporation/internal/dal/query": true,
}
```

#### 生成 DAL 代码

```bash
# 确保数据库服务运行
make middleware

# 设置数据库连接（如果未设置）
export MYSQL_DSN="root:root@tcp(localhost:3306)/opencoze?charset=utf8mb4&parseTime=True"

# 运行代码生成工具
cd backend
go run types/ddl/gen_orm_query.go
```

**生成的代码特点**：
- **Model**: 与数据库表一一对应的结构体
- **Query**: 类型安全的查询构建器
- **JSON 序列化**: 自动处理 JSON 字段
- **软删除**: 自动处理 `deleted_at` 字段
- **时间戳**: 自动处理 `created_at` 和 `updated_at`

#### 使用生成的 DAL 代码

```go
package repository

import (
    "context"
    "github.com/coze-dev/coze-studio/backend/domain/corporation/internal/dal/query"
    "gorm.io/gorm"
)

type CorporationRepository struct {
    db *gorm.DB
}

func NewCorporationRepository(db *gorm.DB) *CorporationRepository {
    // 初始化 Query
    query.SetDefault(db)

    return &CorporationRepository{db: db}
}

func (r *CorporationRepository) Create(ctx context.Context, corp *model.Corporation) error {
    // 使用生成的 Query API
    return query.Corporation.WithContext(ctx).Create(corp)
}

func (r *CorporationRepository) GetByID(ctx context.Context, id int64) (*model.Corporation, error) {
    return query.Corporation.WithContext(ctx).
        Where(query.Corporation.ID.Eq(id)).
        First()
}

func (r *CorporationRepository) List(ctx context.Context, offset, limit int) ([]*model.Corporation, error) {
    return query.Corporation.WithContext(ctx).
        Offset(offset).
        Limit(limit).
        Find()
}
```

#### 自定义字段类型

对于 JSON 字段或复杂类型，在配置中指定类型映射：

```go
"domain/corporation/internal/dal/query": {
    "corporation": {
        "extra_info": map[string]any{},  // JSON 字段
        "config":     &CorporationConfig{}, // 自定义结构体
    },
},
```

### 3. 前端 API Client 生成

前端使用 IDL 生成类型安全的 API Client。

```bash
# 在前端项目根目录
cd frontend

# 生成 API Client 代码
rush idl2ts

# 或在特定包中生成
cd packages/api-schema
npm run gen
```

生成的代码位于：
```
frontend/packages/api-schema/src/
├── corporation/
│   ├── types.ts              # 类型定义
│   └── services.ts           # API 服务
```

## 数据库迁移（Atlas Migrations）

Coze Plus 使用 Atlas 进行数据库 schema 管理和迁移。

### Atlas 工作流程

```mermaid
graph LR
    A[修改数据库结构] --> B[生成迁移文件]
    B --> C[审查迁移文件]
    C --> D[应用迁移]
    D --> E[更新 Schema]
```

### 1. 同步 Schema 到数据库

将 `opencoze_latest_schema.hcl` 同步到数据库：

```bash
# 应用 schema 到数据库
make sync_db
```

### 2. 从数据库导出 Schema

修改数据库后，导出最新 schema：

```bash
# 导出数据库 schema 到 opencoze_latest_schema.hcl 和 migrations 文件
make dump_db
```

**生成的文件**：
```
docker/
├── atlas/
│   ├── migrations/              # 迁移文件目录
│   │   ├── 20250910100000_update.sql
│   │   ├── 20251023172400_update.sql
│   │   └── atlas.sum
│   └── opencoze_latest_schema.hcl  # 最新 schema
└── volumes/
    └── mysql/
        └── schema.sql           # SQL 格式 schema
```

### 3. 创建迁移文件

**方式一：手动创建**

```bash
# 进入 atlas 目录
cd docker/atlas

# 创建新的迁移文件
atlas migrate new add_corporation_extra_field
```

编辑生成的迁移文件：
```sql
-- docker/atlas/migrations/20250126000001_add_corporation_extra_field.sql

-- 添加字段
ALTER TABLE corporation ADD COLUMN extra_info JSON;

-- 创建索引
CREATE INDEX idx_corporation_extra_info ON corporation((CAST(extra_info->>'$.status' AS CHAR(50))));
```

**方式二：自动生成（推荐）**

1. 修改 `opencoze_latest_schema.hcl`：

```hcl
table "corporation" {
  schema = schema.opencoze
  column "id" {
    type = bigint
    auto_increment = true
  }
  column "name" {
    type = varchar(255)
  }
  column "extra_info" {
    type = json
    null = true
  }
  # ... 其他字段
}
```

2. 生成迁移文件：

```bash
cd docker/atlas

# Atlas 会对比当前数据库和 schema 文件，自动生成迁移
atlas migrate diff add_corporation_extra_field \
  --to file://opencoze_latest_schema.hcl \
  --dev-url "mysql://root:root@localhost:3306/test"
```

### 4. 应用迁移

```bash
# 应用所有待执行的迁移
make sync_db

# 或手动应用
cd docker/atlas
atlas migrate apply \
  --url "mysql://coze:coze123@localhost:3306/opencoze" \
  --dir "file://migrations"
```

### 5. 重新计算迁移文件哈希

当手动修改迁移文件后：

```bash
# 重新生成 atlas.sum 文件
make atlas-hash
```

### 6. 导出 SQL Schema

将 HCL schema 转换为 SQL 格式：

```bash
# 导出为 SQL 文件
make dump_sql_schema
```

生成的 SQL 文件：
- `docker/volumes/mysql/schema.sql`
- `helm/charts/opencoze/files/mysql/schema.sql`

### Atlas 迁移最佳实践

1. **始终使用迁移文件**
   - 不要直接修改数据库
   - 所有 schema 变更通过迁移文件

2. **迁移文件命名规范**
   ```
   20250126000001_add_feature.sql
   ├── 时间戳（精确到秒）
   └── 描述性名称
   ```

3. **审查迁移文件**
   - 检查 SQL 语法
   - 确认索引和约束
   - 验证数据迁移逻辑

4. **可回滚性**
   - 考虑迁移的回滚方案
   - 数据迁移要可逆
   - 避免删除列（使用软删除）

5. **测试迁移**
   ```bash
   # 在测试环境先执行
   make sync_db

   # 验证数据完整性
   # 确认应用功能正常

   # 再应用到生产
   ```

## 开发调试技巧

### 1. 后端调试

#### 使用 Delve 调试器

```bash
# 安装 Delve
go install github.com/go-delve/delve/cmd/dlv@latest

# 以调试模式启动
cd backend
dlv debug ./main.go
```

#### VS Code 调试配置

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "go",
      "request": "launch",
      "mode": "debug",
      "program": "${workspaceFolder}/backend/main.go",
      "env": {
        "APP_ENV": "debug"
      },
      "args": []
    }
  ]
}
```

#### 日志调试

```bash
# 设置日志级别
export LOG_LEVEL=debug

# 启动服务
make server
```

### 2. 前端调试

#### Chrome DevTools

1. 打开开发者工具：F12
2. 设置断点
3. 查看网络请求
4. 检查 Redux/Zustand 状态

#### React DevTools

```bash
# 安装 React DevTools 浏览器扩展
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
```

#### VS Code 调试

```json
{
  "name": "Debug Frontend",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3000",
  "webRoot": "${workspaceFolder}/frontend/apps/coze-studio"
}
```

### 3. 数据库调试

```bash
# 连接到 MySQL
docker exec -it coze-mysql mysql -u coze -pcoze123 opencoze

# 查看表结构
DESCRIBE corporation;

# 查看数据
SELECT * FROM corporation LIMIT 10;

# 查看执行计划
EXPLAIN SELECT * FROM corporation WHERE name = 'test';
```

### 4. API 调试

#### 使用 curl

```bash
# 测试 API 接口
curl -X POST http://localhost:8888/api/corporation/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Corporation",
    "description": "Test"
  }'
```

#### 使用 Postman

1. 导入 API 集合
2. 设置环境变量
3. 发送请求并调试

## 常用开发命令

### Make 命令总览

```bash
make help              # 显示所有可用命令

# 环境管理
make env               # 创建环境变量文件
make middleware        # 启动中间件服务
make python            # 设置 Python 环境

# 开发流程
make debug             # 启动完整开发环境
make server            # 启动后端服务
make fe                # 构建前端

# 构建
make build_server      # 仅构建后端
make build_docker      # 构建 Docker 镜像

# 数据库
make sync_db           # 同步 schema 到数据库
make dump_db           # 导出 schema 和迁移
make dump_sql_schema   # 导出 SQL schema
make sql_init          # 初始化 SQL 数据
make atlas-hash        # 重新计算迁移哈希

# Docker 管理
make web               # 启动生产环境
make down              # 停止所有容器
make down_web          # 停止生产环境
make clean             # 清理容器和数据

# Elasticsearch
make setup_es_index    # 设置 ES 索引

# OceanBase（可选）
make oceanbase_env     # 设置 OceanBase 环境
make oceanbase_debug   # 启动 OceanBase 调试环境
```

### Rush 命令总览

```bash
# 依赖管理
rush update            # 更新所有包依赖
rush update --full     # 完全重新安装
rush add -p <package>  # 添加依赖到当前包

# 构建
rush build             # 构建所有包
rush rebuild           # 清理后重新构建
rush rebuild -o @coze-studio/app  # 仅构建特定包

# 测试
rush test              # 运行所有测试
rush test -o @coze-studio/app     # 测试特定包

# 代码检查
rush lint              # 运行所有 lint 检查
rush lint-staged       # 仅检查暂存文件

# 发布
rush version           # 更新版本号
rush publish           # 发布包
```

## 故障排查

### 后端服务启动失败

**问题**: 后端服务无法启动

**检查步骤**:
```bash
# 1. 检查中间件服务
docker compose -f docker/docker-compose-debug.yml ps

# 2. 检查数据库连接
mysql -h localhost -u coze -pcoze123 -e "SELECT 1"

# 3. 检查端口占用
lsof -i :8888

# 4. 查看详细日志
make server
```

### 前端无法启动

**问题**: `npm run dev` 报错

**解决方法**:
```bash
# 清理依赖
rush purge

# 重新安装
rush update

# 清理构建缓存
rush rebuild
```

### 代码生成失败

**问题**: DAL 代码生成报错

**解决方法**:
```bash
# 检查数据库连接
export MYSQL_DSN="root:root@tcp(localhost:3306)/opencoze?charset=utf8mb4&parseTime=True"
mysql -h localhost -u root -proot opencoze -e "SHOW TABLES"

# 确保表存在
make sync_db

# 重新生成
cd backend
go run types/ddl/gen_orm_query.go
```

### Atlas 迁移失败

**问题**: `make sync_db` 失败

**解决方法**:
```bash
# 检查迁移文件
cd docker/atlas
atlas migrate status --url "mysql://coze:coze123@localhost:3306/opencoze"

# 重新计算哈希
make atlas-hash

# 手动应用迁移
atlas migrate apply --url "mysql://coze:coze123@localhost:3306/opencoze"
```

## 下一步

- [环境配置](./environment-setup.md) - 详细的 Docker 环境配置
- [权限系统指南](./permission-guide.md) - 权限管理开发
- [架构设计](../architecture/) - 深入了解系统架构
- [API 参考](../api/) - API 文档和使用示例
