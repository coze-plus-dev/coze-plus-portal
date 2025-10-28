# 智能体 API

本文档详细介绍 Coze Plus 智能体(Agent/Bot)相关的 API 接口,包括对话聊天、智能体管理、信息查询等功能。

## 概述

智能体 API 提供了完整的智能体交互和管理能力,主要包括:

- **对话聊天 API**: 与智能体进行对话交互,支持流式和非流式响应
- **智能体管理 API**: 创建、更新、发布、删除智能体
- **智能体信息 API**: 查询智能体详情和在线信息
- **运行管理 API**: 管理智能体的运行状态

## 认证方式

智能体 API 支持两种认证方式:

### 1. Session 认证 (WebAPI)

适用于 Web 应用的会话认证:

```http
Cookie: session_key=your_session_key
```

### 2. API Key 认证 (OpenAPI)

适用于服务端应用的 API Key 认证:

```http
Authorization: Bearer your_api_key
```

详细的认证方式说明请参考 [API 鉴权方式](./authentication.md)。

## 对话聊天 API

### Chat V3 - 智能体对话

与智能体进行对话交互,支持流式响应(SSE)。

**接口地址**

```
POST /v3/chat
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bot_id | string | 是 | 智能体 ID (JSON 中以字符串格式传输) |
| user_id | string | 是 | 用户标识,用于数据隔离,需保证唯一性 |
| stream | boolean | 否 | 是否使用流式响应,默认 false |
| ConversationID | string | 否 | 会话 ID,不传则创建新会话 (JSON 中以字符串格式传输) |
| additional_messages | array | 否 | 附加消息列表,传递用户输入内容 |
| custom_variables | object | 否 | 用户自定义变量 |
| meta_data | object | 否 | 元数据 |
| extra_params | object | 否 | 传递给插件/工作流的额外参数 |

**附加消息格式 (additional_messages)**

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| role | string | 是 | 角色: user 或 assistant |
| content | string | 是 | 消息内容 |
| content_type | string | 是 | 内容类型: text/image/object_string/card |

**请求示例**

```json
{
  "bot_id": "123456789",
  "user_id": "user_001",
  "stream": true,
  "ConversationID": "987654321",
  "additional_messages": [
    {
      "role": "user",
      "content": "你好,请介绍一下你自己",
      "content_type": "text"
    }
  ]
}
```

**响应格式**

#### 非流式响应

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "conversation_id": "conv_001",
    "id": "msg_001",
    "content": "你好!我是一个AI助手...",
    "role": "assistant",
    "type": "answer",
    "created_at": 1704067200
  }
}
```

#### 流式响应 (SSE)

流式响应使用 Server-Sent Events (SSE) 格式,通过事件流逐步返回智能体的回复。

**事件类型**

| 事件类型 | 说明 |
|---------|------|
| conversation.chat.created | 对话创建 |
| conversation.chat.in_progress | 对话进行中 |
| conversation.chat.completed | 对话完成 |
| conversation.chat.failed | 对话失败 |
| conversation.message.delta | 消息增量 (流式输出) |
| conversation.message.completed | 消息完成 |
| conversation.error | 错误事件 |
| conversation.stream.done | 流结束 |

**SSE 数据格式**

```
event: conversation.message.delta
data: {"event":"conversation.message.delta","message_item":{"id":"msg_001","content":"你好","role":"assistant"}}

event: conversation.message.delta
data: {"event":"conversation.message.delta","message_item":{"id":"msg_001","content":"!我是","role":"assistant"}}

event: conversation.message.delta
data: {"event":"conversation.message.delta","message_item":{"id":"msg_001","content":"一个AI助手","role":"assistant"}}

event: conversation.message.completed
data: {"event":"conversation.message.completed","message_item":{"id":"msg_001","content":"你好!我是一个AI助手","role":"assistant"}}

event: conversation.chat.completed
data: {"event":"conversation.chat.completed","run_record_item":{"conversation_id":"conv_001","usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}}

event: conversation.stream.done
data: {"event":"conversation.stream.done"}
```

**客户端示例 (JavaScript)**

```javascript
const chatWithBot = async (botId, message) => {
  const response = await fetch('/v3/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your_api_key'
    },
    body: JSON.stringify({
      bot_id: String(botId),
      user_id: 'user_001',
      stream: true,
      additional_messages: [
        {
          role: 'user',
          content: message,
          content_type: 'text'
        }
      ]
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const eventType = line.slice(7).trim();
        console.log('事件类型:', eventType);
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        // 处理不同事件类型
        switch(data.event) {
          case 'conversation.message.delta':
            // 消息增量
            process.stdout.write(data.message_item?.content || '');
            break;
          case 'conversation.message.completed':
            // 消息完成
            console.log('\n消息完成:', data.message_item?.content);
            break;
          case 'conversation.chat.completed':
            // 对话完成
            console.log('对话完成, Token 使用:', data.run_record_item?.usage);
            break;
          case 'conversation.error':
            // 错误
            console.error('错误:', data.error);
            break;
          case 'conversation.stream.done':
            // 流结束
            console.log('流结束');
            break;
        }
      }
    }
  }
};

// 使用示例
chatWithBot(123456789, '你好,请介绍一下你自己');
```

**客户端示例 (Python)**

```python
import requests
import json

def chat_with_bot(bot_id, message):
    url = 'https://your-domain.com/v3/chat'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your_api_key'
    }
    data = {
        'bot_id': str(bot_id),
        'user_id': 'user_001',
        'stream': True,
        'additional_messages': [
            {
                'role': 'user',
                'content': message,
                'content_type': 'text'
            }
        ]
    }

    response = requests.post(url, headers=headers, json=data, stream=True)

    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('event: '):
                event_type = line_str[7:].strip()
                print(f'事件类型: {event_type}')
            elif line_str.startswith('data: '):
                data = json.loads(line_str[6:])

                # 处理不同事件类型
                event = data.get('event')
                if event == 'conversation.message.delta':
                    # 消息增量
                    print(data.get('message_item', {}).get('content', ''), end='', flush=True)
                elif event == 'conversation.message.completed':
                    # 消息完成
                    print(f"\n消息完成: {data.get('message_item', {}).get('content')}")
                elif event == 'conversation.chat.completed':
                    # 对话完成
                    print(f"对话完成, Token 使用: {data.get('run_record_item', {}).get('usage')}")
                elif event == 'conversation.error':
                    # 错误
                    print(f"错误: {data.get('error')}")
                elif event == 'conversation.stream.done':
                    # 流结束
                    print('流结束')

# 使用示例
chat_with_bot(123456789, '你好,请介绍一下你自己')
```

### 取消对话

取消正在进行的对话。

**接口地址**

```
POST /v3/chat/cancel
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| conversation_id | string | 是 | 会话 ID |

**请求示例**

```json
{
  "conversation_id": "conv_001"
}
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success"
}
```

### 内部智能体运行

内部 API,用于执行智能体运行。

**接口地址**

```
POST /api/conversation/chat
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| agent_id | int64 | 是 | 智能体 ID |
| conversation_id | string | 否 | 会话 ID |
| query | string | 是 | 用户查询 |
| stream | boolean | 否 | 是否流式响应 |
| additional_messages | array | 否 | 附加消息 |

## 智能体管理 API

### 创建草稿智能体

创建一个草稿状态的智能体。

**接口地址**

```
POST /api/draftbot/create
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 智能体名称 |
| description | string | 否 | 智能体描述 |
| icon_url | string | 否 | 智能体图标 URL |
| prompt | string | 否 | 智能体提示词 |
| model | string | 否 | 使用的模型 |

**请求示例**

```json
{
  "name": "客服助手",
  "description": "专业的客服智能助手",
  "icon_url": "https://example.com/icon.png",
  "prompt": "你是一个专业的客服助手...",
  "model": "gpt-4"
}
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "bot_id": 123456789,
    "name": "客服助手",
    "description": "专业的客服智能助手",
    "icon_url": "https://example.com/icon.png",
    "status": "draft",
    "created_at": 1704067200,
    "updated_at": 1704067200
  }
}
```

### 更新智能体显示信息

更新智能体的基本显示信息。

**接口地址**

```
POST /api/draftbot/update_display_info
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bot_id | int64 | 是 | 智能体 ID |
| name | string | 否 | 智能体名称 |
| description | string | 否 | 智能体描述 |
| icon_url | string | 否 | 智能体图标 URL |

**请求示例**

```json
{
  "bot_id": 123456789,
  "name": "高级客服助手",
  "description": "更专业的客服智能助手"
}
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "bot_id": 123456789,
    "name": "高级客服助手",
    "description": "更专业的客服智能助手",
    "updated_at": 1704067300
  }
}
```

### 发布智能体

将草稿智能体发布为在线版本。

**接口地址**

```
POST /api/draftbot/publish
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bot_id | int64 | 是 | 智能体 ID |

**请求示例**

```json
{
  "bot_id": 123456789
}
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "bot_id": 123456789,
    "version": 1,
    "status": "online",
    "published_at": 1704067400
  }
}
```

## 智能体信息 API

### 获取智能体在线信息

获取智能体的在线版本信息。

**接口地址**

```
GET /v1/bot/get_online_info
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bot_id | int64 | 是 | 智能体 ID |

**请求示例**

```bash
curl -X GET "https://your-domain.com/v1/bot/get_online_info?bot_id=123456789" \
  -H "Authorization: Bearer your_api_key"
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "bot_id": 123456789,
    "name": "客服助手",
    "description": "专业的客服智能助手",
    "icon_url": "https://example.com/icon.png",
    "version": 1,
    "status": "online",
    "model": "gpt-4",
    "published_at": 1704067400
  }
}
```

### 获取智能体详细信息

获取智能体的详细信息,包括配置和能力。

**接口地址**

```
GET /v1/bots/:bot_id
```

**路径参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bot_id | int64 | 是 | 智能体 ID |

**请求示例**

```bash
curl -X GET "https://your-domain.com/v1/bots/123456789" \
  -H "Authorization: Bearer your_api_key"
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "bot_id": 123456789,
    "name": "客服助手",
    "description": "专业的客服智能助手",
    "icon_url": "https://example.com/icon.png",
    "version": 1,
    "status": "online",
    "model": "gpt-4",
    "prompt": "你是一个专业的客服助手...",
    "tools": [
      {
        "type": "knowledge_base",
        "knowledge_id": 987654321
      },
      {
        "type": "plugin",
        "plugin_id": 111222333
      }
    ],
    "created_at": 1704067200,
    "updated_at": 1704067400,
    "published_at": 1704067400
  }
}
```

## 消息内容类型

智能体支持多种消息内容类型:

| 类型 | 说明 |
|------|------|
| text | 文本消息 |
| image | 图片消息 |
| file | 文件消息 |
| object_string | JSON 对象字符串 |
| card | 卡片消息 |

**多模态消息示例**

```json
{
  "bot_id": 123456789,
  "query": "请分析这张图片",
  "additional_messages": [
    {
      "role": "user",
      "type": "image",
      "content": "https://example.com/image.jpg"
    }
  ]
}
```

## 错误处理

### 错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权,认证失败 |
| 403 | 禁止访问,权限不足 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "code": 400,
  "msg": "invalid bot_id",
  "data": null
}
```

### SSE 错误事件

流式响应中的错误通过 `error` 事件返回:

```
event: error
data: {"code":500,"msg":"internal server error"}
```

**客户端错误处理示例**

```javascript
const eventSource = new EventSource('/v3/chat');

eventSource.addEventListener('error', (event) => {
  const error = JSON.parse(event.data);
  console.error('错误:', error.msg);
  eventSource.close();
});

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('消息:', data);
});

eventSource.addEventListener('done', (event) => {
  console.log('完成');
  eventSource.close();
});
```

## 最佳实践

### 1. 使用流式响应

对于需要实时反馈的场景,建议使用流式响应:

```javascript
// 推荐:流式响应,用户体验更好
await chatWithBot(botId, query, { stream: true });

// 不推荐:非流式响应,等待时间长
await chatWithBot(botId, query, { stream: false });
```

### 2. 保持会话上下文

使用 `conversation_id` 保持对话上下文:

```javascript
let conversationId = null;

// 第一次对话
const response1 = await chat(botId, '你好');
conversationId = response1.conversation_id;

// 后续对话使用相同的 conversation_id
const response2 = await chat(botId, '请继续', {
  conversation_id: conversationId
});
```

### 3. 错误重试机制

实现指数退避的重试机制:

```javascript
async function chatWithRetry(botId, query, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await chat(botId, query);
    } catch (error) {
      if (error.code === 429) {
        // 请求过于频繁,等待后重试
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 4. 超时控制

设置合理的超时时间:

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

try {
  const response = await fetch('/v3/chat', {
    method: 'POST',
    signal: controller.signal,
    body: JSON.stringify({ bot_id: botId, query: query })
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('请求超时');
  }
} finally {
  clearTimeout(timeoutId);
}
```

### 5. 资源清理

及时关闭 SSE 连接:

```javascript
const eventSource = new EventSource('/v3/chat');

// 设置超时自动关闭
const timeout = setTimeout(() => {
  eventSource.close();
}, 60000);

eventSource.addEventListener('done', () => {
  clearTimeout(timeout);
  eventSource.close();
});

eventSource.addEventListener('error', () => {
  clearTimeout(timeout);
  eventSource.close();
});
```

## 速率限制

为保证服务稳定性,API 设有速率限制:

| API 类型 | 限制 |
|---------|------|
| Chat API | 60 次/分钟/用户 |
| Bot 管理 API | 30 次/分钟/用户 |
| Bot 信息 API | 100 次/分钟/用户 |

超过限制将返回 `429 Too Many Requests` 错误。

## SDK 示例

### Node.js SDK

```javascript
const CozeClient = require('@coze/api');

const client = new CozeClient({
  apiKey: 'your_api_key',
  baseURL: 'https://your-domain.com'
});

// 对话
const response = await client.chat({
  botId: 123456789,
  query: '你好',
  stream: true,
  onMessage: (data) => {
    console.log('收到消息:', data.delta);
  },
  onDone: (data) => {
    console.log('对话完成,用量:', data.usage);
  },
  onError: (error) => {
    console.error('错误:', error);
  }
});

// 获取智能体信息
const botInfo = await client.bots.get(123456789);
console.log('智能体信息:', botInfo);
```

### Python SDK

```python
from coze import CozeClient

client = CozeClient(
    api_key='your_api_key',
    base_url='https://your-domain.com'
)

# 对话
response = client.chat(
    bot_id=123456789,
    query='你好',
    stream=True
)

for event in response:
    if event.type == 'message':
        print('收到消息:', event.delta)
    elif event.type == 'done':
        print('对话完成,用量:', event.usage)
    elif event.type == 'error':
        print('错误:', event.msg)

# 获取智能体信息
bot_info = client.bots.get(123456789)
print('智能体信息:', bot_info)
```

## 相关文档

- [API 鉴权方式](./authentication.md) - 详细的认证和授权说明
- [工作流 API](./workflow.md) - 工作流相关 API
- [智能体开发指南](/guide/agent-development.md) - 智能体开发流程
- [智能体技术架构](/guide/agent-architecture.md) - 智能体架构设计

## 技术支持

如有问题或建议,请通过以下方式联系我们:

- GitHub Issues: [https://github.com/coze-plus-dev/coze-plus/issues](https://github.com/coze-plus-dev/coze-plus/issues)
- 技术文档: [https://docs.coze-plus.com](https://docs.coze-plus.com)
