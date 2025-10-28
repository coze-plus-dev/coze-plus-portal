# 后端架构

本文档详细介绍 Coze Plus 后端服务的技术架构、DDD 设计、技术栈和开发规范。

## 技术栈概览

### 核心技术

| 技术 | 版本 | 说明 |
|------|------|------|
| **Go** | 1.24.0 | 编程语言 |
| **Hertz** | 0.10.2 | HTTP 框架（CloudWeGo） |
| **GORM** | 1.25.7 | ORM 框架 |
| **CloudWeGo Eino** | 0.4.8 | AI 大模型编排框架 |
| **NSQ** | 1.1.0 | 消息队列 |
| **godotenv** | 1.5.1 | 环境变量管理 |

### 数据存储

| 组件 | 版本 | 说明 |
|------|------|------|
| **MySQL** | 8.4.5 | 主数据库 |
| **Redis** | 8.0 | 缓存和会话存储 |
| **Milvus** | v2.5.10 | 向量数据库 |
| **Elasticsearch** | 8.18.0 | 全文搜索引擎 |
| **MinIO** | RELEASE.2025-06-13 | 对象存储（S3 兼容） |
| **etcd** | 3.5 | 分布式配置中心 |

### AI 模型支持

- **OpenAI**: GPT-3.5, GPT-4, GPT-4o
- **Claude**: Claude 3 系列
- **Gemini**: Gemini Pro/Ultra
- **Qwen**: 通义千问系列
- **DeepSeek**: DeepSeek Chat/Coder
- **Volcengine Ark**: 字节跳动豆包大模型
- **Ollama**: 本地部署模型

### 第三方集成

- **AWS S3**: 对象存储
- **Volcengine TOS**: 火山引擎对象存储
- **Apache Kafka/Pulsar**: 可选消息队列
- **RocketMQ**: 可选消息队列

## DDD 架构设计

### 分层架构概览

```mermaid
graph TB
    subgraph "API Layer 接口层"
        A1[Handler] --> A2[Router]
        A2 --> A3[Middleware]
    end

    subgraph "Application Layer 应用层"
        B1[Application Service] --> B2[DTO]
        B2 --> B3[Assembler]
    end

    subgraph "Domain Layer 领域层"
        C1[Entity] --> C2[Domain Service]
        C2 --> C3[Repository Interface]
        C3 --> C4[Value Object]
    end

    subgraph "Infrastructure Layer 基础设施层"
        D1[Repository Implementation] --> D2[Cache]
        D2 --> D3[Message Queue]
        D3 --> D4[External Service]
    end

    subgraph "Cross-Domain Layer 跨域层"
        E1[Cross-Domain Service]
    end

    A1 --> B1
    B1 --> C2
    C3 --> D1
    B1 --> E1

    style A1 fill:#e1f5ff
    style B1 fill:#fff4e1
    style C1 fill:#ffe1f5
    style D1 fill:#e1ffe1
    style E1 fill:#ffe1e1
```

### 目录结构

```
backend/
├── api/                          # API 层
│   ├── handler/                  # HTTP 处理器
│   │   └── coze/                 # Coze 相关 Handler
│   ├── middleware/               # 中间件
│   │   ├── ctx_cache.go          # 上下文缓存中间件
│   │   ├── host.go               # 主机信息中间件
│   │   ├── i18n.go               # 国际化中间件
│   │   ├── log.go                # 日志中间件
│   │   ├── openapi_auth.go       # OpenAPI 认证中间件
│   │   ├── permission.go         # 权限中间件
│   │   ├── request_inspector.go  # 请求检查中间件
│   │   └── session.go            # Session 认证中间件
│   ├── model/                    # API 模型（IDL 生成）
│   │   ├── app/                  # 应用相关模型
│   │   ├── conversation/         # 对话相关模型
│   │   ├── workflow/             # 工作流相关模型
│   │   ├── plugin/               # 插件相关模型
│   │   └── channel/              # 渠道相关模型
│   └── router/                   # 路由配置
│       └── coze/
│
├── application/                  # 应用层
│   ├── app/                      # 应用管理服务
│   ├── base/                     # 基础应用服务
│   ├── channel/                  # 发布渠道应用服务
│   ├── connector/                # 连接器应用服务
│   ├── conversation/             # 对话应用服务
│   ├── corporation/              # 企业/组织应用服务
│   ├── knowledge/                # 知识库应用服务
│   ├── memory/                   # 记忆/数据库应用服务
│   ├── modelmgr/                 # 模型管理应用服务
│   ├── openauth/                 # 开放认证应用服务
│   ├── permission/               # 权限应用服务
│   ├── plugin/                   # 插件应用服务
│   ├── prompt/                   # 提示词应用服务
│   ├── search/                   # 搜索应用服务
│   ├── shortcutcmd/              # 快捷命令应用服务
│   ├── singleagent/              # 单智能体应用服务
│   ├── template/                 # 模板应用服务
│   ├── upload/                   # 上传应用服务
│   ├── user/                     # 用户应用服务
│   └── workflow/                 # 工作流应用服务
│
├── domain/                       # 领域层
│   ├── agent/                    # Agent 领域
│   │   └── singleagent/
│   │       ├── entity/           # 实体
│   │       ├── service/          # 领域服务
│   │       ├── repository/       # 仓储接口
│   │       └── internal/         # 内部实现
│   │           ├── dal/          # DAL 数据访问层
│   │           └── agentflow/    # Agent 流程引擎
│   ├── workflow/                 # Workflow 领域
│   │   ├── entity/
│   │   ├── service/
│   │   ├── repository/
│   │   └── internal/
│   │       ├── compose/          # 工作流编排
│   │       ├── execute/          # 执行引擎
│   │       └── nodes/            # 节点实现
│   ├── knowledge/                # 知识库领域
│   │   ├── entity/
│   │   ├── service/
│   │   ├── repository/
│   │   └── processor/            # 文档处理器
│   ├── plugin/                   # 插件领域
│   ├── channel/                  # 渠道领域
│   ├── corporation/              # 企业/组织领域
│   ├── permission/               # 权限领域
│   └── conversation/             # 对话领域
│
├── infra/                        # 基础设施层
│   ├── cache/                    # 缓存服务
│   ├── checkpoint/               # 检查点服务
│   ├── coderunner/               # 代码运行器
│   ├── document/                 # 文档处理
│   ├── dynconf/                  # 动态配置
│   ├── embedding/                # 向量嵌入服务
│   ├── es/                       # Elasticsearch
│   ├── eventbus/                 # 事件总线
│   ├── idgen/                    # ID 生成器
│   ├── imagex/                   # 图片处理
│   ├── oceanbase/                # OceanBase 数据库
│   ├── orm/                      # ORM 封装
│   ├── permission/               # 权限基础设施
│   ├── rdb/                      # 关系数据库（MySQL）
│   ├── sqlparser/                # SQL 解析器
│   ├── sse/                      # Server-Sent Events
│   └── storage/                  # 对象存储（MinIO）
│
├── crossdomain/                  # 跨域服务层
│   ├── agent/                    # Agent 跨域服务
│   ├── agentrun/                 # Agent 运行跨域服务
│   ├── connector/                # 连接器跨域服务
│   ├── conversation/             # 对话跨域服务
│   ├── database/                 # 数据库跨域服务
│   ├── datacopy/                 # 数据复制跨域服务
│   ├── knowledge/                # 知识库跨域服务
│   ├── message/                  # 消息跨域服务
│   ├── plugin/                   # 插件跨域服务
│   ├── search/                   # 搜索跨域服务
│   ├── upload/                   # 上传跨域服务
│   ├── user/                     # 用户跨域服务
│   ├── variables/                # 变量跨域服务
│   └── workflow/                 # 工作流跨域服务
│
├── bizpkg/                       # 业务公共包
│   ├── config/                   # 配置管理
│   ├── fileutil/                 # 文件工具
│   └── llm/                      # LLM 模型构建器
│
├── pkg/                          # 工具包
│   ├── logs/                     # 日志工具
│   ├── channel/                  # 渠道工具
│   ├── urltobase64url/           # URL 编码工具
│   └── lang/                     # 语言工具
│
├── types/                        # 类型定义
│   ├── consts/                   # 常量
│   └── ddl/                      # DDL 和代码生成配置
│
├── conf/                         # 配置文件
│   ├── model/                    # AI 模型配置
│   └── plugin/                   # 插件配置
│
├── main.go                       # 应用入口
└── go.mod                        # Go 模块定义
```

## API 层设计

### Hertz 框架

Coze Plus 使用 CloudWeGo Hertz 作为 HTTP 框架，提供高性能的 HTTP 服务。

**main.go 关键代码**:

```go
func startHttpServer() {
    addr := getEnv("LISTEN_ADDR", ":8888")

    opts := []config.Option{
        server.WithHostPorts(addr),
        server.WithMaxRequestBodySize(int(maxSize)),
    }

    s := server.Default(opts...)

    // CORS 配置
    config := cors.DefaultConfig()
    config.AllowAllOrigins = true
    config.AllowHeaders = []string{"*"}
    corsHandler := cors.New(config)

    // 中间件顺序很重要
    s.Use(middleware.ContextCacheMW())     // 必须第一个
    s.Use(middleware.RequestInspectorMW()) // 必须第二个
    s.Use(middleware.SetHostMW())
    s.Use(middleware.SetLogIDMW())
    s.Use(corsHandler)
    s.Use(middleware.AccessLogMW())
    s.Use(middleware.OpenapiAuthMW())
    s.Use(middleware.SessionAuthMW())
    s.Use(permissionMW.GlobalPermissionMW())
    s.Use(middleware.I18nMW())             // 必须在 SessionAuthMW 之后

    router.GeneratedRegister(s)
    s.Spin()
}
```

### IDL 驱动开发

使用 Thrift IDL 定义 API 接口，通过 `hz` 工具生成代码。

**IDL 代码生成**:

```bash
# 生成单个领域的 Handler
hz update -idl idl/agent/agent_service.thrift --enable-extends

# 批量生成所有 IDL
hz update -idl idl/api.thrift --enable-extends
```

**IDL 文件结构**:

```
idl/
├── api.thrift                    # 主 IDL（包含所有子 IDL）
├── base.thrift                   # 公共基础类型定义
├── admin/                        # 管理相关
│   └── config.thrift
├── app/                          # 应用相关（Bot/Agent）
│   ├── bot_common.thrift
│   ├── bot_open_api.thrift
│   ├── developer_api.thrift
│   ├── intelligence.thrift
│   ├── project.thrift
│   ├── publish.thrift
│   ├── search.thrift
│   ├── task.thrift
│   └── common_struct/            # 通用结构定义
│       ├── common_struct.thrift
│       ├── intelligence_common_struct.thrift
│       └── task_struct.thrift
├── channel/                      # 渠道相关
│   └── channel_service.thrift
├── conversation/                 # 对话相关
│   ├── conversation.thrift
│   ├── message.thrift
│   └── run.thrift
├── corporation/                  # 企业/组织相关
│   ├── corporation.thrift
│   ├── permission.thrift
│   └── user.thrift
├── data/                         # 数据相关
│   ├── database.thrift
│   ├── knowledge.thrift
│   └── variables.thrift
├── marketplace/                  # 市场相关
│   ├── marketplace_common.thrift
│   ├── product_common.thrift
│   └── public_api.thrift
├── passport/                     # 认证相关
│   └── passport.thrift
├── permission/                   # 权限相关
│   └── permission.thrift
├── playground/                   # Playground 相关
│   ├── playground.thrift
│   ├── prompt_resource.thrift
│   └── shortcut_command.thrift
├── plugin/                       # 插件相关
│   ├── plugin_develop.thrift
│   └── plugin_develop_common.thrift
├── resource/                     # 资源相关
│   └── resource.thrift
├── upload/                       # 上传相关
│   └── upload.thrift
└── workflow/                     # 工作流相关
    ├── workflow.thrift
    └── workflow_common.thrift
```

### 中间件链

中间件按特定顺序执行，确保功能正确：

1. **ContextCacheMW**: 上下文缓存（必须第一个）
2. **RequestInspectorMW**: 请求检查（必须第二个）
3. **SetHostMW**: 设置主机信息
4. **SetLogIDMW**: 设置日志 ID
5. **CORS**: 跨域资源共享
6. **AccessLogMW**: 访问日志
7. **OpenapiAuthMW**: OpenAPI 认证
8. **SessionAuthMW**: 会话认证
9. **GlobalPermissionMW**: 全局权限检查
10. **I18nMW**: 国际化（必须在认证之后）

### Handler 设计模式

```go
// Handler 标准结构
type AgentHandler struct {
    agentApp *application.AgentApp
}

// Handler 方法示例
func (h *AgentHandler) CreateAgent(
    ctx context.Context,
    c *app.RequestContext,
) (*agent.CreateAgentResponse, error) {
    // 1. 参数绑定和验证
    var req agent.CreateAgentRequest
    if err := c.BindAndValidate(&req); err != nil {
        return nil, err
    }

    // 2. 调用应用层服务
    result, err := h.agentApp.CreateAgent(ctx, &req)
    if err != nil {
        return nil, err
    }

    // 3. 返回响应
    return &agent.CreateAgentResponse{
        Code: 0,
        Msg:  "success",
        Data: result,
    }, nil
}
```

## 应用层设计

### 应用服务职责

- **编排领域服务**: 组合多个领域服务完成业务用例
- **事务管理**: 管理跨领域的事务边界
- **DTO 转换**: 处理外部数据和领域对象的转换
- **权限检查**: 业务级权限验证
- **日志记录**: 业务操作审计

### 应用服务示例

```go
type AgentApp struct {
    agentService      domain.AgentService
    pluginService     domain.PluginService
    permissionService crossdomain.PermissionService
    db                *gorm.DB
}

// 创建 Agent（编排多个领域服务）
func (a *AgentApp) CreateAgent(
    ctx context.Context,
    req *CreateAgentRequest,
) (*AgentDTO, error) {
    // 1. 权限检查
    if err := a.permissionService.CheckPermission(
        ctx, req.UserID, "agent:create",
    ); err != nil {
        return nil, err
    }

    // 2. 开启事务
    tx := a.db.Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()

    // 3. 调用领域服务创建 Agent
    agent, err := a.agentService.CreateAgent(ctx, tx, req.ToEntity())
    if err != nil {
        tx.Rollback()
        return nil, err
    }

    // 4. 绑定插件
    if len(req.PluginIDs) > 0 {
        if err := a.pluginService.BindPlugins(
            ctx, tx, agent.ID, req.PluginIDs,
        ); err != nil {
            tx.Rollback()
            return nil, err
        }
    }

    // 5. 提交事务
    if err := tx.Commit().Error; err != nil {
        return nil, err
    }

    // 6. 返回 DTO
    return ToAgentDTO(agent), nil
}
```

## 领域层设计

### 实体（Entity）

领域对象的核心，包含业务逻辑和不变性约束。

```go
// Agent 实体
type Agent struct {
    ID          string
    Name        string
    Description string
    Prompt      string
    Model       string
    Tools       []Tool
    Status      AgentStatus
    CreatedAt   time.Time
    UpdatedAt   time.Time
    DeletedAt   *time.Time
}

// 实体方法（业务逻辑）
func (a *Agent) Validate() error {
    if a.Name == "" {
        return errors.New("agent name cannot be empty")
    }
    if len(a.Name) > 100 {
        return errors.New("agent name too long")
    }
    return nil
}

// 实体方法
func (a *Agent) Publish() error {
    if a.Status == AgentStatusPublished {
        return errors.New("agent already published")
    }
    a.Status = AgentStatusPublished
    return nil
}
```

### 领域服务（Domain Service）

处理跨实体的业务逻辑或无法归属到单个实体的逻辑。

```go
type AgentService interface {
    CreateAgent(ctx context.Context, tx *gorm.DB, agent *Agent) (*Agent, error)
    UpdateAgent(ctx context.Context, tx *gorm.DB, agent *Agent) error
    PublishAgent(ctx context.Context, tx *gorm.DB, agentID string) error
    DeleteAgent(ctx context.Context, tx *gorm.DB, agentID string) error
}

type agentServiceImpl struct {
    agentRepo     AgentRepository
    versionRepo   AgentVersionRepository
}

func (s *agentServiceImpl) PublishAgent(
    ctx context.Context,
    tx *gorm.DB,
    agentID string,
) error {
    // 1. 获取草稿
    draft, err := s.agentRepo.GetDraft(ctx, tx, agentID)
    if err != nil {
        return err
    }

    // 2. 验证
    if err := draft.Validate(); err != nil {
        return err
    }

    // 3. 创建版本
    version := draft.ToVersion()
    if err := s.versionRepo.Create(ctx, tx, version); err != nil {
        return err
    }

    // 4. 发布
    if err := draft.Publish(); err != nil {
        return err
    }

    // 5. 保存状态
    return s.agentRepo.Update(ctx, tx, draft)
}
```

### 仓储接口（Repository）

定义数据访问接口，由基础设施层实现。

```go
type AgentRepository interface {
    Create(ctx context.Context, tx *gorm.DB, agent *Agent) error
    Update(ctx context.Context, tx *gorm.DB, agent *Agent) error
    Delete(ctx context.Context, tx *gorm.DB, agentID string) error
    GetByID(ctx context.Context, tx *gorm.DB, agentID string) (*Agent, error)
    GetDraft(ctx context.Context, tx *gorm.DB, agentID string) (*Agent, error)
    List(ctx context.Context, tx *gorm.DB, query *AgentQuery) ([]*Agent, error)
}
```

### DAL 数据访问层

使用 GORM Gen 自动生成数据访问代码。

**配置 DAL 生成**:

```go
// backend/types/ddl/gen_orm_query.go
var path2Table2Columns2Model = map[string]map[string]map[string]any{
    "domain/agent/singleagent/internal/dal/query": {
        "single_agent_draft":   {},
        "single_agent_version": {},
    },
    "domain/workflow/internal/dal/query": {
        "workflow_draft":   {},
        "workflow_version": {},
    },
}

var fieldNullablePath = map[string]bool{
    "domain/agent/singleagent/internal/dal/query": true,
    "domain/workflow/internal/dal/query":          true,
}
```

**生成 DAL 代码**:

```bash
# 生成所有 DAL
cd backend && go run types/ddl/gen_orm_query.go
```

**使用生成的 DAL**:

```go
import "backend/domain/agent/singleagent/internal/dal/query"

func (r *agentRepoImpl) GetByID(
    ctx context.Context,
    tx *gorm.DB,
    agentID string,
) (*Agent, error) {
    q := query.Use(tx)

    model, err := q.SingleAgentDraft.
        WithContext(ctx).
        Where(q.SingleAgentDraft.ID.Eq(agentID)).
        First()

    if err != nil {
        return nil, err
    }

    return ToEntity(model), nil
}
```

## 基础设施层

### 仓储实现

```go
type agentRepositoryImpl struct {
    db *gorm.DB
}

func NewAgentRepository(db *gorm.DB) AgentRepository {
    return &agentRepositoryImpl{db: db}
}

func (r *agentRepositoryImpl) Create(
    ctx context.Context,
    tx *gorm.DB,
    agent *Agent,
) error {
    q := query.Use(r.getDB(tx))
    model := ToModel(agent)
    return q.SingleAgentDraft.WithContext(ctx).Create(model)
}

func (r *agentRepositoryImpl) getDB(tx *gorm.DB) *gorm.DB {
    if tx != nil {
        return tx
    }
    return r.db
}
```

### 缓存实现

```go
type CacheService struct {
    redis *redis.Client
}

func (c *CacheService) Get(ctx context.Context, key string) (string, error) {
    return c.redis.Get(ctx, key).Result()
}

func (c *CacheService) Set(
    ctx context.Context,
    key string,
    value interface{},
    expiration time.Duration,
) error {
    return c.redis.Set(ctx, key, value, expiration).Err()
}

// 使用装饰器模式添加缓存
func WithCache(repo AgentRepository, cache CacheService) AgentRepository {
    return &cachedAgentRepo{
        repo:  repo,
        cache: cache,
    }
}
```

### 消息队列

```go
type NSQProducer struct {
    producer *nsq.Producer
}

func (p *NSQProducer) Publish(topic string, message []byte) error {
    return p.producer.Publish(topic, message)
}

type NSQConsumer struct {
    consumer *nsq.Consumer
}

func (c *NSQConsumer) Subscribe(
    topic string,
    channel string,
    handler nsq.HandlerFunc,
) error {
    c.consumer.AddHandler(handler)
    return c.consumer.ConnectToNSQD(nsqdAddr)
}
```

### 向量数据库

```go
type MilvusClient struct {
    client milvus.Client
}

func (m *MilvusClient) Insert(
    ctx context.Context,
    collectionName string,
    vectors [][]float32,
    metadata []map[string]interface{},
) error {
    // 插入向量数据
    _, err := m.client.Insert(
        ctx,
        collectionName,
        "",
        vectors,
        metadata,
    )
    return err
}

func (m *MilvusClient) Search(
    ctx context.Context,
    collectionName string,
    vector []float32,
    topK int,
) ([]SearchResult, error) {
    // 向量相似度搜索
    results, err := m.client.Search(
        ctx,
        collectionName,
        []string{},
        "",
        []string{"id", "content"},
        []milvus.Vector{vector},
        "embedding",
        milvus.MetricType_L2,
        topK,
        milvus.NewSearchParam(),
    )

    return convertResults(results), err
}
```

## 数据库迁移

### Atlas 迁移工具

使用 Atlas 管理数据库 schema 迁移。

**Schema 定义**:

```hcl
// docker/atlas/opencoze_latest_schema.hcl
schema "opencoze" {
  charset = "utf8mb4"
  collate = "utf8mb4_unicode_ci"
}

table "single_agent_draft" {
  schema = schema.opencoze

  column "id" {
    type = varchar(64)
    null = false
  }

  column "name" {
    type = varchar(100)
    null = false
  }

  column "description" {
    type = text
    null = true
  }

  column "prompt" {
    type = text
    null = true
  }

  column "model" {
    type = varchar(50)
    null = false
  }

  column "created_at" {
    type = datetime
    null = false
  }

  column "updated_at" {
    type = datetime
    null = false
  }

  column "deleted_at" {
    type = datetime
    null = true
  }

  primary_key {
    columns = [column.id]
  }

  index "idx_name" {
    columns = [column.name]
  }
}
```

**迁移命令**:

```bash
# 同步 schema 到数据库（开发环境）
make sync_db

# 从数据库导出 schema
make dump_db

# 创建迁移文件
cd docker/atlas
atlas migrate diff add_agent_status \
  --to file://opencoze_latest_schema.hcl \
  --dev-url "mysql://root:root@localhost:3306/test"

# 应用迁移
atlas migrate apply \
  --url "mysql://root:root@localhost:3306/opencoze" \
  --dir "file://migrations"

# 重新计算 hash
make atlas-hash

# 导出 SQL schema
make dump_sql_schema
```

## AI 模型集成

### Eino 框架

使用 CloudWeGo Eino 框架统一管理 AI 模型。

**模型配置**:

```go
// backend/bizpkg/llm/modelbuilder/
type ModelBuilder interface {
    Build(config *ModelConfig) (eino.ChatModel, error)
}

// OpenAI 模型构建器
type OpenAIBuilder struct{}

func (b *OpenAIBuilder) Build(config *ModelConfig) (eino.ChatModel, error) {
    return openai.NewChatModel(ctx, &openai.ChatModelConfig{
        APIKey: config.APIKey,
        Model:  config.Model,
    })
}

// Claude 模型构建器
type ClaudeBuilder struct{}

func (b *ClaudeBuilder) Build(config *ModelConfig) (eino.ChatModel, error) {
    return claude.NewChatModel(ctx, &claude.ChatModelConfig{
        APIKey: config.APIKey,
        Model:  config.Model,
    })
}
```

**模型调用**:

```go
// 使用 Eino 调用 LLM
func (s *agentService) Chat(
    ctx context.Context,
    agentID string,
    messages []Message,
) (*ChatResponse, error) {
    // 1. 获取 Agent 配置
    agent, err := s.agentRepo.GetByID(ctx, nil, agentID)
    if err != nil {
        return nil, err
    }

    // 2. 构建模型
    model, err := s.modelBuilder.Build(agent.ModelConfig)
    if err != nil {
        return nil, err
    }

    // 3. 调用模型
    response, err := model.Generate(ctx, &eino.ChatRequest{
        Messages: convertMessages(messages),
        Tools:    agent.Tools,
    })

    return convertResponse(response), err
}
```

## 测试策略

### 单元测试

```go
// 使用 testify 和 gomock
func TestAgentService_CreateAgent(t *testing.T) {
    // 准备
    ctrl := gomock.NewController(t)
    defer ctrl.Finish()

    mockRepo := mock.NewMockAgentRepository(ctrl)
    service := NewAgentService(mockRepo)

    agent := &Agent{
        Name:  "Test Agent",
        Model: "gpt-4",
    }

    // 设置期望
    mockRepo.EXPECT().
        Create(gomock.Any(), gomock.Any(), agent).
        Return(nil)

    // 执行
    err := service.CreateAgent(context.Background(), nil, agent)

    // 断言
    assert.NoError(t, err)
}
```

### 集成测试

```go
func TestAgentRepository_Integration(t *testing.T) {
    // 使用 testcontainers 启动 MySQL
    ctx := context.Background()

    mysqlContainer, err := mysql.RunContainer(ctx)
    require.NoError(t, err)
    defer mysqlContainer.Terminate(ctx)

    // 连接数据库
    db, err := gorm.Open(mysql.Open(mysqlContainer.ConnectionString()))
    require.NoError(t, err)

    // 迁移 schema
    err = db.AutoMigrate(&AgentModel{})
    require.NoError(t, err)

    // 创建仓储
    repo := NewAgentRepository(db)

    // 测试创建
    agent := &Agent{ID: "test-1", Name: "Test"}
    err = repo.Create(ctx, nil, agent)
    assert.NoError(t, err)

    // 测试查询
    found, err := repo.GetByID(ctx, nil, "test-1")
    assert.NoError(t, err)
    assert.Equal(t, "Test", found.Name)
}
```

### 性能测试

```go
func BenchmarkAgentService_Chat(b *testing.B) {
    service := setupService()
    ctx := context.Background()
    messages := []Message{{Role: "user", Content: "Hello"}}

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        service.Chat(ctx, "agent-1", messages)
    }
}
```

## 性能优化

### 数据库优化

```go
// 1. 批量插入
func (r *agentRepo) BatchCreate(
    ctx context.Context,
    tx *gorm.DB,
    agents []*Agent,
) error {
    return tx.WithContext(ctx).CreateInBatches(agents, 100).Error
}

// 2. 预加载关联
func (r *agentRepo) GetWithTools(
    ctx context.Context,
    agentID string,
) (*Agent, error) {
    var agent AgentModel
    err := r.db.WithContext(ctx).
        Preload("Tools").
        Where("id = ?", agentID).
        First(&agent).Error

    return ToEntity(&agent), err
}

// 3. 使用索引
// 在 struct tag 中定义索引
type AgentModel struct {
    ID        string `gorm:"primaryKey;size:64"`
    Name      string `gorm:"index;size:100"`
    Status    int    `gorm:"index"`
    CreatedAt time.Time `gorm:"index"`
}
```

### 缓存策略

```go
// 多级缓存
type CacheStrategy struct {
    l1Cache *freecache.Cache // 本地缓存
    l2Cache *redis.Client    // Redis 缓存
}

func (c *CacheStrategy) Get(ctx context.Context, key string) (interface{}, error) {
    // 1. 尝试本地缓存
    if val, err := c.l1Cache.Get([]byte(key)); err == nil {
        return val, nil
    }

    // 2. 尝试 Redis
    val, err := c.l2Cache.Get(ctx, key).Result()
    if err == nil {
        // 回写本地缓存
        c.l1Cache.Set([]byte(key), []byte(val), 60)
        return val, nil
    }

    return nil, err
}
```

### 并发优化

```go
// 使用 errgroup 并发处理
func (s *agentService) BatchProcess(
    ctx context.Context,
    agentIDs []string,
) error {
    g, ctx := errgroup.WithContext(ctx)

    for _, id := range agentIDs {
        agentID := id // 避免闭包问题
        g.Go(func() error {
            return s.ProcessAgent(ctx, agentID)
        })
    }

    return g.Wait()
}

// 使用 sync.Pool 复用对象
var bufferPool = sync.Pool{
    New: func() interface{} {
        return new(bytes.Buffer)
    },
}

func processData(data []byte) []byte {
    buf := bufferPool.Get().(*bytes.Buffer)
    defer bufferPool.Put(buf)

    buf.Reset()
    buf.Write(data)
    // 处理...

    return buf.Bytes()
}
```

## 日志和监控

### 日志规范

```go
import "backend/pkg/logs"

// 结构化日志
logs.CtxInfof(ctx, "agent created, id=%s, name=%s", agent.ID, agent.Name)
logs.CtxWarnf(ctx, "agent validation failed, id=%s, error=%v", agent.ID, err)
logs.CtxErrorf(ctx, "failed to create agent, error=%v", err)

// 带字段的日志
logs.WithFields(map[string]interface{}{
    "agent_id": agent.ID,
    "user_id":  userID,
    "duration": time.Since(start).Milliseconds(),
}).Info("agent created successfully")
```

### 性能指标

```go
// 记录执行时间
func (s *agentService) CreateAgent(
    ctx context.Context,
    agent *Agent,
) (*Agent, error) {
    start := time.Now()
    defer func() {
        duration := time.Since(start)
        metrics.RecordDuration("agent.create", duration)
    }()

    // 业务逻辑...
}

// 记录错误率
func (s *agentService) processRequest(ctx context.Context) error {
    err := s.doProcess(ctx)
    if err != nil {
        metrics.IncrementCounter("agent.error")
        return err
    }
    metrics.IncrementCounter("agent.success")
    return nil
}
```

## 配置管理

### 环境变量

```bash
# .env.debug
APP_ENV=debug
LOG_LEVEL=debug

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=opencoze
DB_USER=root
DB_PASSWORD=root

# Redis 配置
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Elasticsearch 配置
ES_ADDR=http://localhost:9200

# Milvus 配置
MILVUS_ADDR=localhost:19530

# MinIO 配置
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# NSQ 配置
NSQ_LOOKUPD_ADDR=localhost:4161
NSQ_NSQD_ADDR=localhost:4150
```

### 模型配置

```json
// backend/conf/model/openai_gpt4.json
{
  "id": "openai_gpt4",
  "provider": "openai",
  "meta": {
    "conn_config": {
      "api_key": "sk-xxx",
      "base_url": "https://api.openai.com/v1",
      "model": "gpt-4o"
    },
    "default_chat_config": {
      "temperature": 0.7,
      "max_tokens": 4096,
      "top_p": 1.0
    }
  }
}
```

## 最佳实践

### 1. 错误处理

✅ **推荐**:
```go
// 定义领域错误
var (
    ErrAgentNotFound = errors.New("agent not found")
    ErrAgentAlreadyExists = errors.New("agent already exists")
    ErrInvalidAgentStatus = errors.New("invalid agent status")
)

// 使用 errors.Is 检查错误
if errors.Is(err, ErrAgentNotFound) {
    return &Response{Code: 404, Msg: "Agent not found"}
}

// 包装错误添加上下文
return fmt.Errorf("failed to create agent %s: %w", agentID, err)
```

### 2. 事务管理

✅ **推荐**:
```go
func (s *agentService) PublishAgent(ctx context.Context, agentID string) error {
    return s.db.Transaction(func(tx *gorm.DB) error {
        // 1. 更新草稿
        if err := s.updateDraft(ctx, tx, agentID); err != nil {
            return err
        }

        // 2. 创建版本
        if err := s.createVersion(ctx, tx, agentID); err != nil {
            return err
        }

        // 事务自动提交
        return nil
    })
}
```

### 3. 接口设计

✅ **推荐**:
```go
// 使用接口而非具体类型
type AgentService interface {
    CreateAgent(context.Context, *Agent) error
    GetAgent(context.Context, string) (*Agent, error)
}

// 依赖注入
type AgentApp struct {
    agentService AgentService // 依赖接口
}

func NewAgentApp(agentService AgentService) *AgentApp {
    return &AgentApp{agentService: agentService}
}
```

### 4. 上下文传递

✅ **推荐**:
```go
// 始终传递 context
func (s *service) DoSomething(ctx context.Context, id string) error {
    // 检查 context 取消
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
    }

    // 传递 context 给下游
    return s.repo.Update(ctx, id)
}
```

### 5. 常量管理

✅ **推荐**:
```go
// backend/types/consts/consts.go
const (
    AgentStatusDraft     = 1
    AgentStatusPublished = 2
    AgentStatusArchived  = 3
)

// 使用常量而非硬编码
if agent.Status == consts.AgentStatusPublished {
    // ...
}
```

## 常见问题

### 开发相关

**问题**: DAL 代码生成失败

**解决**:
```bash
# 确保配置正确
vi backend/types/ddl/gen_orm_query.go

# 检查数据库连接
mysql -h localhost -u root -p

# 重新生成
cd backend && go run types/ddl/gen_orm_query.go
```

**问题**: IDL 生成 Handler 失败

**解决**:
```bash
# 检查 IDL 语法
hz check -idl idl/agent/agent_service.thrift

# 重新生成（注意添加 --enable-extends）
hz update -idl idl/agent/agent_service.thrift --enable-extends
```

### 数据库相关

**问题**: 迁移失败

**解决**:
```bash
# 检查 Atlas schema
atlas schema inspect -u "mysql://root:root@localhost:3306/opencoze"

# 清理并重新同步
make clean
make middleware
make sync_db
```

### 性能相关

**问题**: 数据库查询慢

**解决**:
```sql
-- 查看慢查询
SHOW FULL PROCESSLIST;

-- 分析查询计划
EXPLAIN SELECT * FROM single_agent_draft WHERE name = 'test';

-- 添加索引
ALTER TABLE single_agent_draft ADD INDEX idx_name (name);
```

## 下一步

- [DDD 设计](./ddd.md) - 深入了解 DDD 设计模式
- [开发流程](../guide/development-workflow.md) - 开发工作流程
- [前端架构](./frontend.md) - 前端架构设计
- [API 参考](../api/) - API 接口文档
