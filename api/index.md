# API 概览

Coze Plus 提供完整的 RESTful API 和 WebSocket 接口，支持所有核心功能。

## API 基础信息

### Base URL

```
开发环境: http://localhost:8888
生产环境: https://your-domain.com
```

### 认证方式

使用 JWT Token 认证：

```http
Authorization: Bearer <your-jwt-token>
```

### 请求格式

所有 POST/PUT 请求使用 JSON 格式：

```http
Content-Type: application/json
```

### 响应格式

统一的响应格式：

```json
{
  "code": 0,          // 0=成功，其他=错误码
  "msg": "success",   // 响应消息
  "data": {}          // 响应数据
}
```

### 错误码

| 错误码范围 | 领域 | 说明 |
|-----------|------|------|
| 100000000-100999999 | Agent | 智能体相关 |
| 101000000-101999999 | App | 应用相关 |
| 102000000-102999999 | Connector | 连接器相关 |
| 103000000-103999999 | Conversation | 对话相关 |
| 104000000-104999999 | Upload | 文件上传相关 |
| 105000000-105999999 | Knowledge | 知识库相关 |
| 106000000-106999999 | Memory | 记忆/数据库相关 |
| 107000000-107999999 | Channel | 发布渠道相关 |
| 108000000-108999999 | Permission | 权限相关 |
| 109000000-109999999 | Plugin | 插件相关 |
| 110000000-110999999 | Prompt | 提示词相关 |
| 111000000-111999999 | Search | 搜索相关 |
| 112000000-112999999 | ShortcutCmd | 快捷命令相关 |
| 120000000-120999999 | Corporation | 企业相关 |
| 720xxxxxx | Workflow | 工作流相关（非标准格式）|

## 核心 API 模块

### 1. Agent API

智能体管理接口：
- 创建/更新/删除智能体
- 获取智能体列表
- 发布智能体
- 对话接口

详见 [Agent API 文档](/api/agent)

### 2. Workflow API

工作流管理接口：
- 创建/更新工作流
- 节点管理
- 执行工作流
- 查看执行历史

详见 [Workflow API 文档](/api/workflow)

### 3. Channel API

发布渠道接口：
- 绑定/解绑渠道
- 配置管理
- Webhook 处理

详见 [Channel API 文档](/api/channel)

### 4. Knowledge API

知识库管理接口：
- 创建/删除知识库
- 上传文档
- 检索测试

### 5. Plugin API

插件管理接口：
- 插件注册
- OAuth 授权
- 工具调用

### 6. Memory API

记忆和数据库接口：
- 创建数据库表
- CRUD 操作
- 变量管理

## WebSocket API

> 🚧 **计划中的功能** - WebSocket 实时对话功能正在开发中，当前版本暂不支持。
>
> 如需实时对话，请使用 HTTP SSE (Server-Sent Events) 方式，参考 [Agent API 文档](/api/agent) 中的流式对话接口。

## 快速开始

### 1. 获取 Token

```bash
curl -X POST http://localhost:8888/passport/web/email/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'
```

响应：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user_id": 1
  }
}
```

### 2. 创建智能体

```bash
curl -X POST http://localhost:8888/api/draftbot/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的智能体",
    "description": "测试智能体",
    "bot_mode": 0,
    "model_conf": {
      "model_id": "your-model-id"
    }
  }'
```

### 3. 发起对话

```bash
curl -X POST http://localhost:8888/api/conversation/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "你好",
    "conversation_id": "your-conversation-id",
    "bot_id": "123"
  }'
```

## SDK 和工具

### 🚧 计划中的 SDK

官方 SDK 正在开发中，敬请期待：
- **Go SDK**: 开发中
- **Python SDK**: 开发中
- **TypeScript SDK**: 开发中

当前可以直接使用 HTTP API 进行集成。

### API 测试工具

推荐使用：
- Postman
- Insomnia
- curl
- HTTPie

### OpenAPI 规范

> 🚧 **计划中的功能** - OpenAPI 3.0 规范文件正在整理中，将在后续版本提供。
>
> 当前可以参考各 API 模块的详细文档：
> - [Agent API](/api/agent)
> - [Workflow API](/api/workflow)
> - [Authentication](/api/authentication)

## 速率限制

> 🚧 **计划中的功能** - 全局 API 速率限制功能正在规划中。
>
> 当前系统不对 API 请求进行全局速率限制，建议合理控制请求频率，避免对系统造成过大压力。

## Webhook

> 🚧 **计划中的功能** - Webhook 事件通知功能正在规划中，当前版本暂不支持。
>
> 当前系统支持接收来自外部平台（如微信服务号）的 Webhook 回调，但尚未实现向外部 URL 发送事件通知的功能。如需接收系统事件，请使用流式对话接口或轮询相关 API。

### 计划支持的事件类型
- `agent.published` - 智能体发布
- `conversation.created` - 对话创建
- `message.received` - 消息接收
- `workflow.completed` - 工作流完成

### 计划的 Webhook 格式

```json
{
  "event": "message.received",
  "timestamp": 1234567890,
  "data": {
    "conversation_id": 123,
    "message": "你好"
  }
}
```

## 更多资源

- [API 参考文档](https://api.coze-plus.com)
- [Postman Collection](https://github.com/coze-plus-dev/coze-plus/tree/main/postman)
- [示例代码](https://github.com/coze-plus-dev/coze-plus/tree/main/examples)
