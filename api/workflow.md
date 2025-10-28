# 工作流 API

本文档详细介绍 Coze Plus 工作流(Workflow)相关的 OpenAPI 接口,包括工作流运行、ChatFlow 对话、运行历史查询等功能。

## 概述

工作流 API 提供了完整的工作流执行和管理能力,主要包括:

- **工作流运行 API**: 执行工作流,支持同步和流式响应
- **ChatFlow API**: 执行对话式工作流,支持多轮对话
- **工作流信息 API**: 查询工作流详情和运行历史
- **会话管理 API**: 管理 ChatFlow 会话

## 工作流类型

Coze Plus 支持多种工作流类型:

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| Workflow | 标准工作流 | 单次执行的任务流程 |
| ChatFlow | 对话式工作流 | 需要多轮交互的对话场景 |
| ImageFlow | 图像处理工作流 | 图像生成和处理任务 |
| SceneFlow | 场景工作流 | 特定业务场景的流程编排 |

## 认证方式

工作流 API 支持两种认证方式:

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

## 工作流运行 API

### 运行工作流 - 非流式

执行工作流并等待完整结果返回。

**接口地址**

```
POST /v1/workflow/run
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| workflow_id | string | 是 | 工作流 ID |
| parameters | string | 否 | 输入参数,JSON 字符串格式 |
| bot_id | string | 否 | 关联的智能体 ID |
| is_async | boolean | 否 | 是否异步执行,默认 false |
| execute_mode | string | 否 | 执行模式:"RELEASE"(正式)或"DEBUG"(调试),默认 RELEASE |
| version | string | 否 | 工作流版本号 |
| connector_id | string | 否 | 连接器 ID |
| app_id | string | 否 | 应用 ID |
| ext | object | 否 | 扩展参数 |

**请求示例**

```json
{
  "workflow_id": "wf_123456789",
  "parameters": "{\"user_input\":\"你好,请处理这个任务\",\"option\":\"A\"}",
  "execute_mode": "RELEASE",
  "bot_id": "bot_001"
}
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "execute_id": "exec_987654321",
    "output": "{\"result\":\"任务处理完成\",\"status\":\"success\"}",
    "error_code": 0,
    "error_message": "",
    "debug_url": ""
  }
}
```

**字段说明**

- `execute_id`: 执行 ID,用于查询运行历史
- `output`: 工作流输出结果,JSON 字符串格式
- `error_code`: 错误码,0 表示成功
- `error_message`: 错误信息
- `debug_url`: 调试链接,execute_mode 为 DEBUG 时返回

**cURL 示例**

```bash
curl -X POST "https://your-domain.com/v1/workflow/run" \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "wf_123456789",
    "parameters": "{\"user_input\":\"你好\"}"
  }'
```

### 运行工作流 - 流式

以流式方式执行工作流,实时返回执行过程中的节点输出。

**接口地址**

```
POST /v1/workflow/stream_run
```

**请求参数**

与非流式接口参数相同。

**请求示例**

```json
{
  "workflow_id": "wf_123456789",
  "parameters": "{\"query\":\"帮我生成一篇文章\"}"
}
```

**响应格式 (SSE)**

流式响应使用 Server-Sent Events (SSE) 格式,实时返回工作流执行过程。

**事件类型**

- `message` - 节点执行消息事件
- `done` - 工作流执行完成事件
- `error` - 错误事件

**SSE 数据格式**

```
event: message
data: {"id":"1","event":"message","node_seq_id":"node_1","node_title":"LLM节点","content":"正在","content_type":"text","node_is_finish":false}

event: message
data: {"id":"2","event":"message","node_seq_id":"node_1","node_title":"LLM节点","content":"生成文章","content_type":"text","node_is_finish":false}

event: message
data: {"id":"3","event":"message","node_seq_id":"node_1","node_title":"LLM节点","content":"...","content_type":"text","node_is_finish":true,"token":150}

event: done
data: {"id":"4","event":"done"}
```

**消息字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 消息序列号 |
| event | string | 事件类型 |
| node_seq_id | string | 节点序列 ID |
| node_id | string | 节点 ID |
| node_title | string | 节点名称 |
| node_type | string | 节点类型 |
| content | string | 节点输出内容 |
| content_type | string | 内容类型:text/image/object_string/card |
| node_is_finish | boolean | 节点是否执行完成 |
| token | integer | Token 使用量 |
| error_code | integer | 错误码 |
| error_message | string | 错误信息 |
| debug_url | string | 调试链接 |
| interrupt_data | object | 中断数据(需要用户输入时) |

**客户端示例 (JavaScript)**

```javascript
const runWorkflowStream = async (workflowId, parameters) => {
  const response = await fetch('/v1/workflow/stream_run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your_api_key'
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      parameters: JSON.stringify(parameters)
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
        const eventType = line.slice(7);
        console.log('事件类型:', eventType);
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        if (data.event === 'message') {
          console.log(`节点 ${data.node_title}: ${data.content}`);
        } else if (data.event === 'done') {
          console.log('工作流执行完成');
        } else if (data.event === 'error') {
          console.error('执行错误:', data.error_message);
        }
      }
    }
  }
};

// 使用示例
runWorkflowStream('wf_123456789', {
  query: '帮我生成一篇关于 AI 的文章'
});
```

**客户端示例 (Python)**

```python
import requests
import json

def run_workflow_stream(workflow_id, parameters):
    url = 'https://your-domain.com/v1/workflow/stream_run'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your_api_key'
    }
    data = {
        'workflow_id': workflow_id,
        'parameters': json.dumps(parameters)
    }

    response = requests.post(url, headers=headers, json=data, stream=True)

    current_event = None
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')

            if line_str.startswith('event: '):
                current_event = line_str[7:]
            elif line_str.startswith('data: '):
                data = json.loads(line_str[6:])

                if data.get('event') == 'message':
                    print(f"节点 {data.get('node_title')}: {data.get('content')}")
                elif data.get('event') == 'done':
                    print('工作流执行完成')
                elif data.get('event') == 'error':
                    print(f"执行错误: {data.get('error_message')}")

# 使用示例
run_workflow_stream('wf_123456789', {
    'query': '帮我生成一篇关于 AI 的文章'
})
```

### 恢复工作流执行

当工作流因需要用户输入而中断时,使用此接口恢复执行。

**接口地址**

```
POST /v1/workflow/stream_resume
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| event_id | string | 是 | 中断事件 ID |
| resume_data | string | 是 | 恢复数据,JSON 字符串格式 |
| interrupt_type | integer | 是 | 中断类型 |

**请求示例**

```json
{
  "event_id": "interrupt_001",
  "resume_data": "{\"user_choice\":\"option_A\"}",
  "interrupt_type": 1
}
```

**响应格式**

与流式运行接口相同,使用 SSE 格式返回后续执行过程。

## ChatFlow API

### ChatFlow 对话

执行对话式工作流,支持多轮对话和会话管理。

**接口地址**

```
POST /v1/workflows/chat
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| workflow_id | string | 是 | 工作流 ID |
| parameters | string | 否 | 输入参数,JSON 字符串格式 |
| conversation_id | string | 否 | 会话 ID,不传则创建新会话 |
| additional_messages | array | 否 | 附加消息列表 |
| bot_id | string | 否 | 智能体 ID |
| execute_mode | string | 否 | 执行模式 |
| version | string | 否 | 版本号 |
| connector_id | string | 否 | 连接器 ID |
| app_id | string | 否 | 应用 ID |

**附加消息格式**

```json
{
  "role": "user",
  "content": "你好",
  "content_type": "text"
}
```

**请求示例**

```json
{
  "workflow_id": "wf_chat_001",
  "conversation_id": "conv_123",
  "additional_messages": [
    {
      "role": "user",
      "content": "你好,我想了解工作流",
      "content_type": "text"
    }
  ]
}
```

**响应格式 (SSE)**

ChatFlow 使用 SSE 流式返回对话内容。

**事件类型**

- `conversation.message.delta` - 消息增量事件
- `conversation.message.completed` - 消息完成事件
- `conversation.chat.completed` - 对话完成事件
- `conversation.chat.failed` - 对话失败事件

**SSE 数据示例**

```
event: conversation.message.delta
data: {"delta":"你好","index":0}

event: conversation.message.delta
data: {"delta":"!工作流是","index":0}

event: conversation.message.delta
data: {"delta":"一种流程编排工具","index":0}

event: conversation.message.completed
data: {"content":"你好!工作流是一种流程编排工具","index":0}

event: conversation.chat.completed
data: {"conversation_id":"conv_123"}
```

**客户端示例 (JavaScript)**

```javascript
const chatWithWorkflow = async (workflowId, conversationId, message) => {
  const response = await fetch('/v1/workflows/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer your_api_key'
    },
    body: JSON.stringify({
      workflow_id: workflowId,
      conversation_id: conversationId,
      additional_messages: [{
        role: 'user',
        content: message,
        content_type: 'text'
      }]
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let conversationId = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const eventType = line.slice(7);
        console.log('事件:', eventType);
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        if (data.delta) {
          process.stdout.write(data.delta);
        } else if (data.conversation_id) {
          conversationId = data.conversation_id;
        }
      }
    }
  }

  return conversationId;
};

// 使用示例 - 多轮对话
(async () => {
  let convId = null;

  // 第一轮对话
  convId = await chatWithWorkflow('wf_chat_001', null, '你好');
  console.log('会话 ID:', convId);

  // 第二轮对话,使用相同会话 ID
  await chatWithWorkflow('wf_chat_001', convId, '请继续');
})();
```

## 工作流信息 API

### 获取工作流详情

获取工作流的详细信息,包括输入输出参数定义。

**接口地址**

```
GET /v1/workflows/:workflow_id
```

**路径参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| workflow_id | string | 是 | 工作流 ID |

**查询参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| connector_id | string | 是 | 连接器 ID |
| is_debug | boolean | 否 | 是否调试模式,默认 false |

**请求示例**

```bash
curl -X GET "https://your-domain.com/v1/workflows/wf_123456789?connector_id=conn_001&is_debug=false" \
  -H "Authorization: Bearer your_api_key"
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "workflow_id": "wf_123456789",
    "name": "文章生成工作流",
    "description": "自动生成高质量文章的工作流",
    "mode": 0,
    "input_schema": {
      "type": "object",
      "properties": {
        "topic": {
          "type": "string",
          "description": "文章主题"
        },
        "length": {
          "type": "integer",
          "description": "文章字数"
        }
      },
      "required": ["topic"]
    },
    "output_schema": {
      "type": "object",
      "properties": {
        "article": {
          "type": "string",
          "description": "生成的文章内容"
        },
        "word_count": {
          "type": "integer",
          "description": "实际字数"
        }
      }
    },
    "created_at": 1704067200,
    "updated_at": 1704153600
  }
}
```

### 获取运行历史

查询工作流的执行历史记录。

**接口地址**

```
GET /v1/workflow/get_run_history
```

**查询参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| execute_id | string | 否 | 执行 ID |
| workflow_id | string | 否 | 工作流 ID |
| page_size | integer | 否 | 每页数量,默认 20 |
| page_token | string | 否 | 分页标记 |

**请求示例**

```bash
curl -X GET "https://your-domain.com/v1/workflow/get_run_history?workflow_id=wf_123456789&page_size=10" \
  -H "Authorization: Bearer your_api_key"
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "histories": [
      {
        "execute_id": "exec_001",
        "workflow_id": "wf_123456789",
        "status": "success",
        "input": "{\"topic\":\"AI 技术\"}",
        "output": "{\"article\":\"...\"}",
        "started_at": 1704067200,
        "finished_at": 1704067250,
        "duration": 50,
        "error_message": ""
      }
    ],
    "page_token": "next_page_token",
    "has_more": true
  }
}
```

## 会话管理 API

### 创建会话

为 ChatFlow 创建新的会话。

**接口地址**

```
POST /v1/workflow/conversation/create
```

**请求参数**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| workflow_id | string | 是 | 工作流 ID |
| metadata | object | 否 | 会话元数据 |

**请求示例**

```json
{
  "workflow_id": "wf_chat_001",
  "metadata": {
    "user_id": "user_123",
    "source": "web"
  }
}
```

**响应示例**

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "conversation_id": "conv_987654321",
    "workflow_id": "wf_chat_001",
    "created_at": 1704067200
  }
}
```

## 参数说明

### 执行模式 (execute_mode)

| 值 | 说明 |
|------|------|
| RELEASE | 正式运行模式,使用发布版本 |
| DEBUG | 调试模式,使用草稿版本,返回调试信息 |

### 内容类型 (content_type)

| 值 | 说明 |
|------|------|
| text | 文本内容 |
| image | 图片 URL |
| object_string | JSON 对象字符串 |
| card | 卡片消息 |
| interrupt | 中断数据,需要用户输入 |

### 工作流模式 (mode)

| 值 | 说明 |
|------|------|
| 0 | Workflow - 标准工作流 |
| 1 | ImageFlow - 图像工作流 |
| 2 | SceneFlow - 场景工作流 |
| 3 | ChatFlow - 对话工作流 |

## 错误处理

### 错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权,认证失败 |
| 403 | 禁止访问,权限不足 |
| 404 | 工作流不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 4001 | 工作流执行失败 |
| 4002 | 节点执行超时 |
| 4003 | 参数验证失败 |

### 错误响应格式

```json
{
  "code": 4001,
  "msg": "workflow execution failed",
  "debug_url": "https://your-domain.com/debug/exec_001"
}
```

### SSE 错误事件

流式响应中的错误通过 `error` 事件返回:

```
event: error
data: {"error_code":4001,"error_message":"node execution timeout"}
```

**错误处理示例**

```javascript
const eventSource = new EventSource('/v1/workflow/stream_run');

eventSource.addEventListener('error', (event) => {
  const error = JSON.parse(event.data);
  console.error('工作流执行错误:', error.error_message);

  // 记录错误日志
  logError({
    code: error.error_code,
    message: error.error_message,
    workflow_id: workflowId
  });

  eventSource.close();
});

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('节点输出:', data.content);
});
```

## 最佳实践

### 1. 使用流式响应获取实时反馈

对于长时间运行的工作流,建议使用流式接口:

```javascript
// 推荐:流式响应,实时反馈
await runWorkflowStream(workflowId, params);

// 不推荐:非流式,长时间等待
await runWorkflow(workflowId, params);
```

### 2. 处理工作流中断

某些工作流可能需要用户输入,需要正确处理中断事件:

```javascript
eventSource.addEventListener('message', async (event) => {
  const data = JSON.parse(event.data);

  // 检查是否为中断事件
  if (data.content_type === 'interrupt' && data.interrupt_data) {
    const userInput = await promptUser(data.interrupt_data);

    // 恢复工作流执行
    await resumeWorkflow(data.interrupt_data.event_id, userInput);
  }
});
```

### 3. 参数验证

在调用 API 前验证参数格式:

```javascript
function validateParameters(params) {
  // 确保参数是有效的 JSON
  try {
    JSON.parse(params);
  } catch (e) {
    throw new Error('Invalid parameters JSON format');
  }

  // 验证必填字段
  const parsedParams = JSON.parse(params);
  if (!parsedParams.required_field) {
    throw new Error('Missing required field');
  }

  return true;
}
```

### 4. 超时控制

设置合理的超时时间:

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

try {
  const response = await fetch('/v1/workflow/run', {
    method: 'POST',
    signal: controller.signal,
    body: JSON.stringify(request)
  });
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('工作流执行超时');
  }
} finally {
  clearTimeout(timeoutId);
}
```

### 5. 错误重试机制

实现指数退避的重试:

```javascript
async function runWorkflowWithRetry(workflowId, params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await runWorkflow(workflowId, params);
    } catch (error) {
      if (error.code === 429) {
        // 请求过于频繁,等待后重试
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // 其他错误不重试
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 6. 保持会话上下文

ChatFlow 使用 conversation_id 保持对话上下文:

```javascript
class WorkflowChat {
  constructor(workflowId) {
    this.workflowId = workflowId;
    this.conversationId = null;
  }

  async chat(message) {
    const response = await fetch('/v1/workflows/chat', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: this.workflowId,
        conversation_id: this.conversationId,
        additional_messages: [{
          role: 'user',
          content: message,
          content_type: 'text'
        }]
      })
    });

    // 保存会话 ID
    const data = await response.json();
    if (!this.conversationId) {
      this.conversationId = data.conversation_id;
    }

    return data;
  }

  async reset() {
    // 创建新会话
    const response = await fetch('/v1/workflow/conversation/create', {
      method: 'POST',
      body: JSON.stringify({
        workflow_id: this.workflowId
      })
    });

    const data = await response.json();
    this.conversationId = data.conversation_id;
  }
}

// 使用示例
const chat = new WorkflowChat('wf_chat_001');
await chat.chat('你好');
await chat.chat('请继续'); // 保持上下文
await chat.reset(); // 重置会话
await chat.chat('新的对话'); // 新的上下文
```

### 7. 调试模式使用

开发阶段使用调试模式获取详细信息:

```javascript
// 开发环境
const response = await runWorkflow(workflowId, params, {
  execute_mode: 'DEBUG'
});

if (response.debug_url) {
  console.log('调试链接:', response.debug_url);
}

// 生产环境
const response = await runWorkflow(workflowId, params, {
  execute_mode: 'RELEASE'
});
```

## 速率限制

为保证服务稳定性,API 设有速率限制:

| API 类型 | 限制 |
|---------|------|
| 工作流运行 API | 30 次/分钟/用户 |
| ChatFlow API | 60 次/分钟/用户 |
| 工作流信息 API | 100 次/分钟/用户 |

超过限制将返回 `429 Too Many Requests` 错误。

## SDK 示例

### Node.js SDK

```javascript
const CozeWorkflow = require('@coze/workflow');

const client = new CozeWorkflow({
  apiKey: 'your_api_key',
  baseURL: 'https://your-domain.com'
});

// 运行工作流 - 流式
const stream = await client.workflows.run({
  workflowId: 'wf_123456789',
  parameters: {
    topic: 'AI 技术发展',
    length: 1000
  },
  stream: true
});

stream.on('message', (data) => {
  console.log(`节点 ${data.node_title}: ${data.content}`);
});

stream.on('done', () => {
  console.log('工作流执行完成');
});

stream.on('error', (error) => {
  console.error('执行错误:', error);
});

// ChatFlow 对话
const chat = await client.chatflow.chat({
  workflowId: 'wf_chat_001',
  message: '你好',
  onMessage: (delta) => {
    process.stdout.write(delta);
  }
});

console.log('会话 ID:', chat.conversationId);

// 获取工作流信息
const info = await client.workflows.get('wf_123456789', {
  connectorId: 'conn_001'
});

console.log('工作流名称:', info.name);
console.log('输入参数:', info.input_schema);
```

### Python SDK

```python
from coze import CozeWorkflow

client = CozeWorkflow(
    api_key='your_api_key',
    base_url='https://your-domain.com'
)

# 运行工作流 - 流式
stream = client.workflows.run(
    workflow_id='wf_123456789',
    parameters={
        'topic': 'AI 技术发展',
        'length': 1000
    },
    stream=True
)

for event in stream:
    if event.type == 'message':
        print(f"节点 {event.node_title}: {event.content}")
    elif event.type == 'done':
        print('工作流执行完成')
    elif event.type == 'error':
        print(f"执行错误: {event.error_message}")

# ChatFlow 对话
chat = client.chatflow.chat(
    workflow_id='wf_chat_001',
    message='你好'
)

for delta in chat:
    print(delta, end='', flush=True)

print(f"\n会话 ID: {chat.conversation_id}")

# 获取工作流信息
info = client.workflows.get(
    workflow_id='wf_123456789',
    connector_id='conn_001'
)

print(f"工作流名称: {info.name}")
print(f"输入参数: {info.input_schema}")
```

## 相关文档

- [API 鉴权方式](./authentication.md) - 详细的认证和授权说明
- [智能体 API](./agent.md) - 智能体相关 API
- [工作流开发指南](/guide/workflow-development.md) - 工作流开发流程
- [节点开发教程](/guide/workflow-node-development.md) - 自定义节点开发

## 技术支持

如有问题或建议,请通过以下方式联系我们:

- GitHub Issues: [https://github.com/coze-plus-dev/coze-plus/issues](https://github.com/coze-plus-dev/coze-plus/issues)
- 技术文档: [https://docs.coze-plus.com](https://docs.coze-plus.com)
