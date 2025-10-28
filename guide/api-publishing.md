# 发布智能体为 API 服务

本指南详细介绍如何将 Coze Plus 中的智能体（Bot）发布为 API 服务，供第三方应用调用。内容基于项目实际代码实现。

## 概述

Coze Plus 支持将已发布的智能体通过 RESTful API 的方式对外提供服务。通过 API Key 鉴权机制，第三方应用可以安全地调用智能体的能力。

### 核心特性

- **API Key 鉴权**：基于 Personal Access Token (PAT) 的鉴权机制
- **多种 API 类型**：支持聊天、会话管理、文件上传、工作流执行等
- **流式响应**：支持 SSE (Server-Sent Events) 流式返回
- **安全性**：API Key 使用 MD5 哈希存储，支持过期时间设置

## 鉴权机制

### API Key 数据模型

根据 `backend/domain/openauth/openapiauth/entity/api_auth.go`，API Key 的数据结构如下：

```go
type ApiKey struct {
    ID          int64  `json:"id"`           // API Key ID
    Name        string `json:"name"`         // API Key 名称
    ApiKey      string `json:"api_key"`      // API Key（MD5哈希值）
    ConnectorID int64  `json:"connector"`    // 连接器 ID
    UserID      int64  `json:"user_id"`      // 所属用户 ID
    LastUsedAt  int64  `json:"last_used_at"` // 最后使用时间
    ExpiredAt   int64  `json:"expired_at"`   // 过期时间
    CreatedAt   int64  `json:"created_at"`   // 创建时间
    UpdatedAt   int64  `json:"updated_at"`   // 更新时间
}
```

**数据库表结构** (`docker/volumes/mysql/schema.sql`)：

```sql
CREATE TABLE IF NOT EXISTS `api_key` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primary Key ID',
  `api_key` varchar(255) NOT NULL DEFAULT '' COMMENT 'API Key hash',
  `name` varchar(255) NOT NULL DEFAULT '' COMMENT 'API Key Name',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '0 normal, 1 deleted',
  `user_id` bigint NOT NULL DEFAULT 0 COMMENT 'API Key Owner',
  `expired_at` bigint NOT NULL DEFAULT 0 COMMENT 'API Key Expired Time',
  `created_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Create Time in Milliseconds',
  `updated_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Update Time in Milliseconds',
  `last_used_at` bigint NOT NULL DEFAULT 0 COMMENT 'Used Time in Milliseconds',
  `ak_type` tinyint NOT NULL DEFAULT 0 COMMENT 'api key type',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_key` (`api_key`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 鉴权流程

基于 `backend/api/middleware/openapi_auth.go` 的实现，鉴权流程如下：

```
1. 客户端发送请求
   └─> Header: Authorization: Bearer <api_key>

2. OpenapiAuthMW 中间件拦截
   └─> 检查 Authorization Header

3. 提取并验证 API Key
   ├─> 解析 Bearer Token
   ├─> 对 API Key 进行 MD5 哈希
   └─> 在数据库中查找匹配记录

4. 权限校验
   ├─> 检查 API Key 是否存在
   ├─> 检查 API Key 是否过期
   └─> 检查 API Key 状态

5. 更新使用记录
   └─> 更新 last_used_at 字段

6. 放行请求
   └─> 将 API Key 信息存入 Context
```

**关键代码片段** (`backend/api/middleware/openapi_auth.go:101-149`)：

```go
func OpenapiAuthMW() app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        // 检查请求类型
        requestAuthType := c.GetInt32(RequestAuthTypeStr)
        if requestAuthType != int32(RequestAuthTypeOpenAPI) {
            c.Next(ctx)
            return
        }

        // 检查 Authorization Header
        if len(c.Request.Header.Get(HeaderAuthorizationKey)) == 0 {
            httputil.InternalError(ctx, c,
                errorx.New(errno.ErrUserAuthenticationFailed,
                    errorx.KV("reason", "missing authorization in header")))
            return
        }

        // 解析 Bearer Token
        apiKey := parseBearerAuthToken(c.Request.Header.Get(HeaderAuthorizationKey))
        if len(apiKey) == 0 {
            httputil.InternalError(ctx, c,
                errorx.New(errno.ErrUserAuthenticationFailed,
                    errorx.KV("reason", "missing api_key in request")))
            return
        }

        // MD5 哈希
        md5Hash := md5.Sum([]byte(apiKey))
        md5Key := hex.EncodeToString(md5Hash[:])

        // 查询数据库验证
        apiKeyInfo, err := openauth.OpenAuthApplication.CheckPermission(ctx, md5Key)
        if err != nil || apiKeyInfo == nil {
            httputil.InternalError(ctx, c,
                errorx.New(errno.ErrUserAuthenticationFailed,
                    errorx.KV("reason", "api key invalid")))
            return
        }

        // 存入 Context
        ctxcache.Store(ctx, consts.OpenapiAuthKeyInCtx, apiKeyInfo)

        // 更新最后使用时间
        openauth.OpenAuthApplication.UpdateLastUsedAt(ctx, apiKeyInfo.ID, apiKeyInfo.UserID)

        c.Next(ctx)
    }
}
```

### 需要鉴权的 API 路径

根据 `backend/api/middleware/openapi_auth.go:40-63`，以下路径需要 API Key 鉴权：

```go
var needAuthPath = map[string]bool{
    "/v3/chat":                         true,  // 聊天接口
    "/v1/conversations":                true,  // 会话列表
    "/v1/conversation/create":          true,  // 创建会话
    "/v1/conversation/message/list":    true,  // 消息列表
    "/v1/files/upload":                 true,  // 文件上传
    "/v1/workflow/run":                 true,  // 工作流运行
    "/v1/workflow/stream_run":          true,  // 工作流流式运行
    "/v1/workflow/stream_resume":       true,  // 工作流恢复
    "/v1/workflow/get_run_history":     true,  // 工作流历史
    "/v1/bot/get_online_info":          true,  // Bot 信息
    "/v1/workflows/chat":               true,  // 工作流聊天
    "/v1/workflow/conversation/create": true,  // 工作流会话
    "/v3/chat/cancel":                  true,  // 取消聊天
}

// 正则匹配路径
var needAuthFunc = map[string]bool{
    "^/v1/conversations/[0-9]+/clear$": true, // 清空会话
    "^/v1/bots/[0-9]+$":                true, // Bot 详情
    "^/v1/conversations/[0-9]+$":       true, // 会话详情
    "^/v1/workflows/[0-9]+$":           true, // 工作流详情
    "^/v1/apps/[0-9]+$":                true, // 应用详情
}
```

## API Key 管理

### 1. 创建 API Key

**接口定义** (`backend/api/handler/coze/open_apiauth_service.go:116-139`)：

```
POST /api/permission_api/pat/create_personal_access_token_and_permission
Content-Type: application/json

{
  "name": "My API Key",
  "expire": 7776000000  // 过期时间（毫秒），0 表示永不过期
}
```

**请求参数**：

| 参数名 | 类型   | 必填 | 说明                              |
|--------|--------|------|-----------------------------------|
| name   | string | 是   | API Key 名称，用于标识用途        |
| expire | int64  | 否   | 过期时间（毫秒时间戳），0 表示永不过期 |

**响应示例**：

```json
{
  "id": 123456,
  "name": "My API Key",
  "api_key": "pat_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz",
  "user_id": 1001,
  "expired_at": 1735689600000,
  "created_at": 1704153600000,
  "last_used_at": 0
}
```

**重要提示**：
- API Key 明文仅在创建时返回一次，**请妥善保存**
- 后续无法再次查看明文，数据库中仅存储 MD5 哈希值
- 建议为不同的应用场景创建不同的 API Key，便于管理和吊销

### 2. 列出 API Keys

**接口定义** (`backend/api/handler/coze/open_apiauth_service.go:88-113`)：

```
GET /api/permission_api/pat/list_personal_access_tokens?page=1&size=10
```

**请求参数**：

| 参数名 | 类型  | 必填 | 说明           |
|--------|-------|------|----------------|
| page   | int64 | 否   | 页码，默认 1   |
| size   | int64 | 否   | 每页数量，默认 10 |

**响应示例**：

```json
{
  "api_keys": [
    {
      "id": 123456,
      "name": "My API Key",
      "api_key": "pat_***********************************",  // 已脱敏
      "user_id": 1001,
      "expired_at": 1735689600000,
      "created_at": 1704153600000,
      "last_used_at": 1704240000000
    }
  ],
  "has_more": false,
  "total": 1
}
```

### 3. 获取 API Key 详情

**接口定义** (`backend/api/handler/coze/open_apiauth_service.go:36-59`)：

```
GET /api/permission_api/pat/get_personal_access_token_and_permission?id=123456
```

**请求参数**：

| 参数名 | 类型  | 必填 | 说明      |
|--------|-------|------|-----------|
| id     | int64 | 是   | API Key ID |

### 4. 更新 API Key

**接口定义** (`backend/api/handler/coze/open_apiauth_service.go:151-169`)：

```
POST /api/permission_api/pat/update_personal_access_token_and_permission
Content-Type: application/json

{
  "id": 123456,
  "name": "Updated API Key Name"
}
```

**请求参数**：

| 参数名 | 类型   | 必填 | 说明          |
|--------|--------|------|---------------|
| id     | int64  | 是   | API Key ID    |
| name   | string | 否   | 新的 API Key 名称 |

### 5. 删除 API Key

**接口定义** (`backend/api/handler/coze/open_apiauth_service.go:62-85`)：

```
POST /api/permission_api/pat/delete_personal_access_token_and_permission
Content-Type: application/json

{
  "id": 123456
}
```

**请求参数**：

| 参数名 | 类型  | 必填 | 说明      |
|--------|-------|------|-----------|
| id     | int64 | 是   | API Key ID |

**删除说明**：
- 删除操作为软删除，将 `status` 字段设置为 1
- 删除后该 API Key 立即失效，无法再用于鉴权
- 已删除的 API Key 无法恢复

## 主要 API 接口

### 1. 聊天接口 (Chat API)

**接口定义** (`backend/api/handler/coze/agent_run_service.go:89-132`)：

```
POST /v3/chat
Authorization: Bearer <your_api_key>
Content-Type: application/json

{
  "bot_id": 123456,
  "user_id": "user_001",
  "stream": true,
  "conversation_id": "conv_789",
  "query": "你好，请介绍一下你的功能",
  "chat_history": [],
  "parameters": {}
}
```

**请求参数**：

| 参数名           | 类型    | 必填 | 说明                                  |
|------------------|---------|------|---------------------------------------|
| bot_id           | int64   | 是   | 智能体 ID                             |
| user_id          | string  | 否   | 用户标识（用于会话隔离）               |
| stream           | boolean | 否   | 是否流式返回，默认 false               |
| conversation_id  | string  | 否   | 会话 ID，不传则创建新会话              |
| query            | string  | 是   | 用户输入的问题                         |
| chat_history     | array   | 否   | 历史对话记录                           |
| parameters       | object  | 否   | 自定义参数，可传递给智能体             |

**流式响应示例** (SSE 格式)：

```
event: conversation.message.delta
data: {"type":"answer","content":"你好","role":"assistant"}

event: conversation.message.delta
data: {"type":"answer","content":"！我是","role":"assistant"}

event: conversation.message.delta
data: {"type":"answer","content":"一个","role":"assistant"}

event: conversation.message.completed
data: {"id":"msg_123","conversation_id":"conv_789","role":"assistant","content":"你好！我是一个智能助手...","created_at":1704153600}

event: done
data: [DONE]
```

**非流式响应示例**：

```json
{
  "conversation_id": "conv_789",
  "message": {
    "id": "msg_123",
    "role": "assistant",
    "content": "你好！我是一个智能助手，可以帮助你解答问题...",
    "created_at": 1704153600
  }
}
```

### 2. 获取 Bot 信息

**接口定义** (`backend/api/handler/coze/bot_open_api_service.go:95-113`)：

```
GET /v1/bot/get_online_info?bot_id=123456
Authorization: Bearer <your_api_key>
```

**请求参数**：

| 参数名 | 类型  | 必填 | 说明      |
|--------|-------|------|-----------|
| bot_id | int64 | 是   | Bot ID    |

**响应示例**：

```json
{
  "bot_id": 123456,
  "name": "客服助手",
  "description": "智能客服机器人，可以回答常见问题",
  "icon_url": "https://example.com/icon.png",
  "prompt": "你是一个专业的客服助手...",
  "version": "1.0.0",
  "created_at": 1704153600,
  "updated_at": 1704240000
}
```

### 3. 获取指定 Bot 详情

**接口定义** (`backend/api/handler/coze/bot_open_api_service.go:137-153`)：

```
GET /v1/bots/:bot_id
Authorization: Bearer <your_api_key>
```

**路径参数**：

| 参数名 | 类型  | 必填 | 说明   |
|--------|-------|------|--------|
| bot_id | int64 | 是   | Bot ID |

### 4. 文件上传

**接口定义** (`backend/api/handler/coze/bot_open_api_service.go:75-93`)：

```
POST /v1/files/upload
Authorization: Bearer <your_api_key>
Content-Type: multipart/form-data

file: <binary_data>
```

**响应示例**：

```json
{
  "file_id": "file_abc123",
  "file_name": "document.pdf",
  "file_size": 1048576,
  "file_type": "application/pdf",
  "upload_url": "https://example.com/files/file_abc123",
  "created_at": 1704153600
}
```

### 5. 会话管理

#### 5.1 创建会话

```
POST /v1/conversation/create
Authorization: Bearer <your_api_key>
Content-Type: application/json

{
  "bot_id": 123456,
  "user_id": "user_001"
}
```

#### 5.2 获取会话列表

```
GET /v1/conversations?bot_id=123456&user_id=user_001
Authorization: Bearer <your_api_key>
```

#### 5.3 获取会话详情

```
GET /v1/conversations/:conversation_id
Authorization: Bearer <your_api_key>
```

#### 5.4 清空会话历史

```
POST /v1/conversations/:conversation_id/clear
Authorization: Bearer <your_api_key>
```

#### 5.5 删除会话

```
DELETE /v1/conversations/:conversation_id
Authorization: Bearer <your_api_key>
```

### 6. 工作流 API

#### 6.1 运行工作流

```
POST /v1/workflow/run
Authorization: Bearer <your_api_key>
Content-Type: application/json

{
  "workflow_id": 123456,
  "parameters": {
    "input_text": "测试输入"
  }
}
```

#### 6.2 流式运行工作流

```
POST /v1/workflow/stream_run
Authorization: Bearer <your_api_key>
Content-Type: application/json

{
  "workflow_id": 123456,
  "parameters": {
    "input_text": "测试输入"
  }
}
```

#### 6.3 获取工作流运行历史

```
GET /v1/workflow/get_run_history?workflow_id=123456
Authorization: Bearer <your_api_key>
```

#### 6.4 工作流聊天模式

```
POST /v1/workflows/chat
Authorization: Bearer <your_api_key>
Content-Type: application/json

{
  "workflow_id": 123456,
  "conversation_id": "conv_789",
  "query": "用户输入"
}
```

## 使用示例

### cURL 示例

#### 1. 创建 API Key

```bash
curl -X POST 'http://localhost:8888/api/permission_api/pat/create_personal_access_token_and_permission' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: your_session_cookie' \
  -d '{
    "name": "My API Key",
    "expire": 0
  }'
```

#### 2. 使用 API Key 调用聊天接口

```bash
curl -X POST 'http://localhost:8888/v3/chat' \
  -H 'Authorization: Bearer pat_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz' \
  -H 'Content-Type: application/json' \
  -d '{
    "bot_id": 123456,
    "user_id": "user_001",
    "stream": false,
    "query": "你好，请介绍一下你的功能"
  }'
```

#### 3. 流式调用示例

```bash
curl -X POST 'http://localhost:8888/v3/chat' \
  -H 'Authorization: Bearer pat_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz' \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{
    "bot_id": 123456,
    "stream": true,
    "query": "讲一个故事"
  }' \
  --no-buffer
```

### Python 示例

#### 1. 非流式调用

```python
import requests

API_BASE_URL = "http://localhost:8888"
API_KEY = "pat_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"

def chat(bot_id, query, conversation_id=None):
    """
    调用聊天接口
    """
    url = f"{API_BASE_URL}/v3/chat"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "bot_id": bot_id,
        "query": query,
        "stream": False
    }

    if conversation_id:
        payload["conversation_id"] = conversation_id

    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()

    return response.json()

# 使用示例
if __name__ == "__main__":
    result = chat(
        bot_id=123456,
        query="你好，请介绍一下你的功能"
    )
    print(result)
```

#### 2. 流式调用

```python
import requests
import json

def chat_stream(bot_id, query, conversation_id=None):
    """
    流式调用聊天接口
    """
    url = f"{API_BASE_URL}/v3/chat"
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }

    payload = {
        "bot_id": bot_id,
        "query": query,
        "stream": True
    }

    if conversation_id:
        payload["conversation_id"] = conversation_id

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        stream=True
    )
    response.raise_for_status()

    # 处理 SSE 流
    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data:'):
                data = line[5:].strip()
                if data == '[DONE]':
                    break
                try:
                    event_data = json.loads(data)
                    yield event_data
                except json.JSONDecodeError:
                    continue

# 使用示例
if __name__ == "__main__":
    for event in chat_stream(
        bot_id=123456,
        query="讲一个故事"
    ):
        if event.get('type') == 'answer':
            print(event.get('content', ''), end='', flush=True)
    print()
```

#### 3. SDK 封装示例

```python
import requests
from typing import Optional, Dict, Any, Iterator
import json

class CozePlusClient:
    """
    Coze Plus API 客户端
    """

    def __init__(self, api_key: str, base_url: str = "http://localhost:8888"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        })

    def chat(
        self,
        bot_id: int,
        query: str,
        conversation_id: Optional[str] = None,
        user_id: Optional[str] = None,
        stream: bool = False,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Any:
        """
        调用聊天接口
        """
        url = f"{self.base_url}/v3/chat"

        payload = {
            "bot_id": bot_id,
            "query": query,
            "stream": stream
        }

        if conversation_id:
            payload["conversation_id"] = conversation_id
        if user_id:
            payload["user_id"] = user_id
        if parameters:
            payload["parameters"] = parameters

        if stream:
            return self._chat_stream(url, payload)
        else:
            response = self.session.post(url, json=payload)
            response.raise_for_status()
            return response.json()

    def _chat_stream(self, url: str, payload: Dict) -> Iterator[Dict]:
        """
        处理流式响应
        """
        headers = {"Accept": "text/event-stream"}
        response = self.session.post(url, json=payload, headers=headers, stream=True)
        response.raise_for_status()

        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data:'):
                    data = line[5:].strip()
                    if data == '[DONE]':
                        break
                    try:
                        yield json.loads(data)
                    except json.JSONDecodeError:
                        continue

    def get_bot_info(self, bot_id: int) -> Dict:
        """
        获取 Bot 信息
        """
        url = f"{self.base_url}/v1/bot/get_online_info"
        params = {"bot_id": bot_id}
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def upload_file(self, file_path: str) -> Dict:
        """
        上传文件
        """
        url = f"{self.base_url}/v1/files/upload"
        with open(file_path, 'rb') as f:
            files = {'file': f}
            response = self.session.post(url, files=files)
            response.raise_for_status()
            return response.json()

    def create_conversation(self, bot_id: int, user_id: Optional[str] = None) -> Dict:
        """
        创建会话
        """
        url = f"{self.base_url}/v1/conversation/create"
        payload = {"bot_id": bot_id}
        if user_id:
            payload["user_id"] = user_id

        response = self.session.post(url, json=payload)
        response.raise_for_status()
        return response.json()

    def list_conversations(
        self,
        bot_id: int,
        user_id: Optional[str] = None
    ) -> Dict:
        """
        获取会话列表
        """
        url = f"{self.base_url}/v1/conversations"
        params = {"bot_id": bot_id}
        if user_id:
            params["user_id"] = user_id

        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()

# 使用示例
if __name__ == "__main__":
    client = CozePlusClient(
        api_key="pat_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz"
    )

    # 非流式调用
    result = client.chat(bot_id=123456, query="你好")
    print(result)

    # 流式调用
    for event in client.chat(bot_id=123456, query="讲个故事", stream=True):
        if event.get('type') == 'answer':
            print(event.get('content', ''), end='', flush=True)
    print()
```

### JavaScript/Node.js 示例

#### 1. 非流式调用

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8888';
const API_KEY = 'pat_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

async function chat(botId, query, conversationId = null) {
  const url = `${API_BASE_URL}/v3/chat`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };

  const payload = {
    bot_id: botId,
    query: query,
    stream: false
  };

  if (conversationId) {
    payload.conversation_id = conversationId;
  }

  try {
    const response = await axios.post(url, payload, { headers });
    return response.data;
  } catch (error) {
    console.error('Chat error:', error.response?.data || error.message);
    throw error;
  }
}

// 使用示例
(async () => {
  const result = await chat(123456, '你好，请介绍一下你的功能');
  console.log(result);
})();
```

#### 2. 流式调用

```javascript
const axios = require('axios');

async function chatStream(botId, query, conversationId = null) {
  const url = `${API_BASE_URL}/v3/chat`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  };

  const payload = {
    bot_id: botId,
    query: query,
    stream: true
  };

  if (conversationId) {
    payload.conversation_id = conversationId;
  }

  try {
    const response = await axios.post(url, payload, {
      headers,
      responseType: 'stream'
    });

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            return;
          }
          try {
            const event = JSON.parse(data);
            if (event.type === 'answer') {
              process.stdout.write(event.content || '');
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }
      }
    });

    response.data.on('end', () => {
      console.log('\n[Stream ended]');
    });

  } catch (error) {
    console.error('Chat stream error:', error.response?.data || error.message);
    throw error;
  }
}

// 使用示例
chatStream(123456, '讲一个故事');
```

#### 3. TypeScript SDK 示例

```typescript
import axios, { AxiosInstance } from 'axios';

interface ChatRequest {
  bot_id: number;
  query: string;
  conversation_id?: string;
  user_id?: string;
  stream?: boolean;
  parameters?: Record<string, any>;
}

interface ChatResponse {
  conversation_id: string;
  message: {
    id: string;
    role: string;
    content: string;
    created_at: number;
  };
}

interface BotInfo {
  bot_id: number;
  name: string;
  description: string;
  icon_url: string;
  version: string;
  created_at: number;
  updated_at: number;
}

class CozePlusClient {
  private client: AxiosInstance;

  constructor(apiKey: string, baseURL: string = 'http://localhost:8888') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>('/v3/chat', {
      ...request,
      stream: false
    });
    return response.data;
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<any> {
    const response = await this.client.post('/v3/chat', {
      ...request,
      stream: true
    }, {
      headers: {
        'Accept': 'text/event-stream'
      },
      responseType: 'stream'
    });

    const stream = response.data;
    let buffer = '';

    for await (const chunk of stream) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (data === '[DONE]') {
            return;
          }
          try {
            yield JSON.parse(data);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  async getBotInfo(botId: number): Promise<BotInfo> {
    const response = await this.client.get<BotInfo>('/v1/bot/get_online_info', {
      params: { bot_id: botId }
    });
    return response.data;
  }

  async uploadFile(file: Buffer, filename: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', new Blob([file]), filename);

    const response = await this.client.post('/v1/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
}

// 使用示例
(async () => {
  const client = new CozePlusClient('pat_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz');

  // 非流式调用
  const result = await client.chat({
    bot_id: 123456,
    query: '你好'
  });
  console.log(result);

  // 流式调用
  for await (const event of client.chatStream({
    bot_id: 123456,
    query: '讲个故事'
  })) {
    if (event.type === 'answer') {
      process.stdout.write(event.content || '');
    }
  }
  console.log();
})();
```

## 错误处理

### 错误码定义

根据代码实现，主要错误码包括：

| 错误码 | 说明                 | HTTP 状态码 |
|--------|----------------------|-------------|
| 401    | 鉴权失败             | 401         |
| 403    | 权限不足             | 403         |
| 404    | 资源不存在           | 404         |
| 422    | 参数错误             | 422         |
| 500    | 服务器内部错误       | 500         |

### 常见错误场景

#### 1. 鉴权失败

**错误原因**：
- Authorization Header 缺失或格式错误
- API Key 无效或已过期
- API Key 已被删除

**错误响应**：

```json
{
  "code": 401,
  "message": "api key invalid",
  "request_id": "req_abc123"
}
```

**解决方案**：
1. 检查 Authorization Header 格式：`Bearer <api_key>`
2. 确认 API Key 未过期（检查 `expired_at` 字段）
3. 重新创建 API Key

#### 2. API Key 已过期

**错误原因**：当前时间超过 `expired_at` 设置的过期时间

**解决方案**：
1. 检查 API Key 的过期时间
2. 创建新的 API Key
3. 或更新现有 API Key 的过期时间（如果支持）

#### 3. Bot 不存在或未发布

**错误响应**：

```json
{
  "code": 404,
  "message": "bot not found or not published",
  "request_id": "req_abc123"
}
```

**解决方案**：
1. 确认 bot_id 正确
2. 确认 Bot 已发布到线上版本
3. 检查 Bot 状态是否正常

#### 4. 参数验证失败

**错误响应**：

```json
{
  "code": 422,
  "message": "bot id is required",
  "request_id": "req_abc123"
}
```

**解决方案**：
1. 检查必填参数是否提供
2. 检查参数类型是否正确
3. 参考 API 文档确认参数格式

## 安全最佳实践

### 1. API Key 管理

- **最小权限原则**：为不同用途创建不同的 API Key
- **定期轮换**：建议每 90 天轮换一次 API Key
- **安全存储**：
  - 不要将 API Key 硬编码在代码中
  - 使用环境变量或密钥管理服务存储
  - 不要将 API Key 提交到版本控制系统

```bash
# 使用环境变量
export COZE_API_KEY="pat_abc123..."

# 在代码中读取
import os
api_key = os.environ.get('COZE_API_KEY')
```

### 2. 过期时间设置

- **生产环境**：建议设置合理的过期时间（如 90 天）
- **开发测试**：可以设置较短的过期时间
- **定时任务**：使用永不过期的 API Key，但需加强监控

### 3. 日志和监控

根据代码实现（`backend/api/middleware/openapi_auth.go:143-146`），系统会自动记录：

- API Key 最后使用时间（`last_used_at`）
- 请求日志（包含 API Key ID 和用户 ID）

**监控指标建议**：
- API Key 使用频率
- 异常请求次数
- 失败率和响应时间

### 4. 访问控制

- **IP 白名单**：限制 API Key 只能从特定 IP 访问（需自行实现）
- **请求频率限制**：防止滥用（需自行实现）
- **及时吊销**：发现异常使用立即删除 API Key

## 生产部署建议

### 1. 反向代理配置

使用 Nginx 作为反向代理时的配置示例：

```nginx
# API 限流
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL 配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API 代理
    location /v3/chat {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # SSE 支持
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # 其他 API 路径
    location /v1/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://backend:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. HTTPS 配置

**生产环境必须使用 HTTPS**，防止 API Key 在传输过程中被窃取。

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
apt-get install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d api.example.com

# 自动续期
certbot renew --dry-run
```

### 3. 数据库优化

针对 `api_key` 表的索引优化：

```sql
-- 已有索引
CREATE UNIQUE INDEX uniq_key ON api_key(api_key);
CREATE INDEX idx_user_id ON api_key(user_id);

-- 建议添加的索引
CREATE INDEX idx_expired_status ON api_key(expired_at, status);
CREATE INDEX idx_last_used ON api_key(last_used_at);
```

### 4. 监控告警

推荐监控指标：

```yaml
# Prometheus 监控示例
- name: api_key_auth_failures
  description: API Key 鉴权失败次数
  query: sum(rate(http_requests_total{endpoint="/v3/chat",status="401"}[5m]))

- name: api_key_usage
  description: API Key 使用次数
  query: sum(rate(http_requests_total{endpoint=~"/v.*"}[5m])) by (api_key_id)

- name: api_response_time
  description: API 响应时间
  query: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

## 附录

### A. 数据库表结构

完整的 `api_key` 表结构：

```sql
CREATE TABLE IF NOT EXISTS `api_key` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primary Key ID',
  `api_key` varchar(255) NOT NULL DEFAULT '' COMMENT 'API Key hash (MD5)',
  `name` varchar(255) NOT NULL DEFAULT '' COMMENT 'API Key Name',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '0:normal, 1:deleted',
  `user_id` bigint NOT NULL DEFAULT 0 COMMENT 'API Key Owner',
  `expired_at` bigint NOT NULL DEFAULT 0 COMMENT 'Expired Time (ms), 0:never',
  `created_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Create Time (ms)',
  `updated_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Update Time (ms)',
  `last_used_at` bigint NOT NULL DEFAULT 0 COMMENT 'Last Used Time (ms)',
  `ak_type` tinyint NOT NULL DEFAULT 0 COMMENT 'API Key Type',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_key` (`api_key`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expired_status` (`expired_at`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### B. 代码文件索引

| 功能模块 | 文件路径 |
|---------|----------|
| API Key 实体定义 | `backend/domain/openauth/openapiauth/entity/api_auth.go` |
| API Key 服务实现 | `backend/domain/openauth/openapiauth/api_auth_impl.go` |
| 鉴权中间件 | `backend/api/middleware/openapi_auth.go` |
| API Key 管理接口 | `backend/api/handler/coze/open_apiauth_service.go` |
| Bot Open API | `backend/api/handler/coze/bot_open_api_service.go` |
| 聊天接口 | `backend/api/handler/coze/agent_run_service.go` |
| 数据库 DAO | `backend/domain/openauth/openapiauth/internal/dal/api_key.go` |

### C. 相关链接

- [快速开始指南](./getting-started.md)
- [工作流开发指南](./workflow-development.md)
- [权限系统指南](./permission-guide.md)
- [后端架构文档](../architecture/backend.md)

## 常见问题

### Q1: API Key 明文丢失后如何处理？

A: API Key 明文仅在创建时返回一次，无法再次查看。如果丢失，需要删除旧的 API Key 并创建新的。

### Q2: 如何实现 API Key 的 IP 白名单？

A: 当前版本不支持 IP 白名单，可以在 Nginx 层面实现：

```nginx
location /v3/chat {
    # 允许特定 IP
    allow 192.168.1.0/24;
    deny all;

    proxy_pass http://backend:8888;
}
```

### Q3: API Key 过期后会自动删除吗？

A: 不会自动删除，但过期的 API Key 无法通过鉴权。系统会在鉴权时检查 `expired_at` 字段。

### Q4: 流式响应如何处理断线重连？

A: 流式响应断线后需要重新发起请求。建议在客户端实现重试机制，并使用 `conversation_id` 保持会话连续性。

### Q5: 如何限制某个 API Key 只能访问特定 Bot？

A: 当前版本不支持 Bot 级别的权限控制。建议通过应用层逻辑实现，或为不同 Bot 创建不同的用户账号和 API Key。

---

**文档版本**: v1.0
**最后更新**: 2025-10-27
**基于代码版本**: main branch (latest)
