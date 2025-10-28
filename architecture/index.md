# 总体架构

Coze Plus 是一个采用现代化技术栈构建的 AI Agent 开发平台，采用前后端分离架构。

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                      前端层 (Frontend)                   │
│  React 18 + TypeScript + Rsbuild + Rush Monorepo       │
│  240 个包管理, 4-layer dependency structure              │
└─────────────────────────────────────────────────────────┘
                           ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│                    API 网关 (API Layer)                  │
│             Hertz HTTP Framework + Thrift IDL            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   应用层 (Application)                   │
│          Use Cases, DTOs, Cross-Domain Logic            │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                    领域层 (Domain)                       │
│  DDD Design: Entities, Repositories, Services           │
│  Agent | Workflow | Knowledge | Plugin | Channel        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  基础设施层 (Infrastructure)              │
│  MySQL | Redis | Elasticsearch | Milvus | NSQ          │
└─────────────────────────────────────────────────────────┘
```

## 核心领域模块

### 1. Agent (智能体)
- 智能体创建和管理
- 对话流引擎
- 单智能体和多智能体编排

### 2. Workflow (工作流)
- 可视化工作流编排
- 节点类型：LLM、知识库检索、工具调用、条件判断等
- 执行引擎和状态管理

### 3. Knowledge (知识库)
- 文档管理（支持多种格式）
- 向量化和检索
- 分片和索引管理

### 4. Plugin (插件)
- 插件注册和发现
- OAuth 认证流程
- API 调用和工具执行

### 5. Channel (发布渠道)
- 多渠道发布：微信、企业微信、钉钉、飞书
- Webhook 处理
- 渠道配置管理

### 6. Memory (记忆/数据库)
- 结构化数据存储
- 变量管理
- 对话上下文

## 技术选型

### 前端技术栈

| 类型 | 技术 | 说明 |
|------|------|------|
| 框架 | React 18 | 组件化开发 |
| 语言 | TypeScript | 类型安全 |
| 构建工具 | Rsbuild (Rspack) | 极速构建 |
| UI 组件 | Semi Design | 企业级组件库 |
| 样式 | Tailwind CSS | 原子化 CSS |
| 状态管理 | Zustand | 轻量级状态管理 |
| Monorepo | Rush.js | 240 包管理 |

### 后端技术栈

| 类型 | 技术 | 说明 |
|------|------|------|
| 语言 | Go 1.24.0 | 高性能、并发 |
| HTTP 框架 | Hertz | CloudWeGo 高性能框架 |
| IDL | Thrift | 接口定义语言 |
| 数据库 | MySQL 8.4 | 主数据库 |
| 缓存 | Redis 8.0 | 缓存和会话 |
| 搜索引擎 | Elasticsearch 8.18 | 全文搜索 |
| 向量数据库 | Milvus v2.5 | 向量检索 |
| 对象存储 | MinIO | 文件存储 |
| 消息队列 | NSQ | 异步任务 |
| 配置中心 | etcd 3.5 | 配置管理 |

## 架构特点

### 1. 领域驱动设计 (DDD)

采用 DDD 架构模式，实现：
- **清晰的领域边界**: 每个领域独立开发和部署
- **统一语言**: 代码与业务概念一致
- **聚合根**: 保证领域对象的一致性
- **仓储模式**: 抽象数据访问层

### 2. 分层架构

```
API Layer (Handler)
    ↓
Application Layer (Use Cases)
    ↓
Domain Layer (Business Logic)
    ↓
Infrastructure Layer (Data Access)
```

每层职责明确：
- **API Layer**: 路由、参数验证、响应格式化
- **Application Layer**: 用例编排、跨领域协调
- **Domain Layer**: 核心业务逻辑、领域规则
- **Infrastructure Layer**: 数据持久化、外部服务调用

### 3. Monorepo 前端架构

4 层依赖结构：

```
Level 4: apps/coze-studio (应用入口)
    ↓
Level 3: agent-ide/, workflow/, studio/ (业务领域)
    ↓
Level 2: common/ (通用组件和工具)
    ↓
Level 1: arch/ (核心基础设施)
```

### 4. 微服务化设计

虽然目前是单体应用，但架构支持轻松拆分为微服务：
- 每个领域模块高内聚、低耦合
- 通过接口而非直接依赖通信
- 使用消息队列解耦

### 5. 事件驱动架构

使用 NSQ 消息队列实现：
- 异步任务处理
- 领域事件发布/订阅
- 跨领域通信

## 数据流

### 请求处理流程

```
1. 用户请求 → Hertz Router
2. Handler 参数验证 → Application Service
3. Application Service 业务编排 → Domain Service
4. Domain Service 领域逻辑 → Repository
5. Repository 数据访问 → Database
6. 响应原路返回
```

### AI 对话流程

```
1. 用户消息 → Conversation Service
2. 获取 Agent 配置 → Agent Domain
3. 构建对话上下文 → Memory Domain
4. 知识库检索 → Knowledge Domain
5. 工具调用 → Plugin Domain
6. LLM 调用 → Model Provider
7. 流式响应 → WebSocket
```

## 扩展性设计

### 水平扩展
- 无状态服务设计
- Session 存储在 Redis
- 文件存储使用 MinIO 集群

### 垂直扩展
- 插件化架构
- 策略模式
- 工厂模式
- 适配器模式

## 下一步

- [前端架构](/architecture/frontend) - 详细了解前端 Monorepo 架构
- [后端架构](/architecture/backend) - 深入理解后端 DDD 设计
- [DDD 设计](/architecture/ddd) - 领域驱动设计实践
