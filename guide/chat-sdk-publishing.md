# 发布智能体到 Chat SDK

本指南介绍如何将 Coze Plus 中的智能体（Bot）或工作流（Workflow）发布为 Chat SDK，供网页、移动应用等前端环境集成使用。

## 概述

Chat SDK 是 Coze Plus 提供的 JavaScript SDK，允许开发者在任何网页或 Web 应用中快速集成对话能力。通过 SDK，你可以：

- ✅ 在网页中嵌入对话界面
- ✅ 完全自定义 UI 样式和交互逻辑
- ✅ 支持流式响应和实时消息推送
- ✅ 管理会话历史和上下文
- ✅ 上传图片、文件等多模态内容

### 核心特性

| 特性 | 说明 |
|------|------|
| **轻量化** | 纯 JavaScript 实现，无需后端支持 |
| **流式推送** | 基于 SSE (Server-Sent Events) 的流式消息 |
| **事件驱动** | 监听消息、错误、状态变化等事件 |
| **会话管理** | 自动管理 conversation_id 和上下文 |
| **多模态** | 支持文本、图片、文件等多种消息类型 |
| **鉴权安全** | 基于 API Key 的鉴权机制 |

## 发布流程

### 前提条件

在发布到 Chat SDK 之前，请确保：
1. ✅ 已创建智能体或工作流
2. ✅ 项目中至少有一个**对话流**（Chatflow）
3. ✅ 对话流已经过测试并正常运行

**注意**：Chat SDK 发布方式仅支持包含对话流的项目。如果你的项目是纯工作流，建议使用 [API 发布](./api-publishing.md)。

### 步骤 1：进入发布管理

1. 打开你的智能体或项目
2. 点击右上角的 **"发布"** 按钮
3. 在发布管理页面，找到 **"Chat SDK"** 选项

### 步骤 2：选择对话流

**关键步骤**：Chat SDK 需要绑定一个对话流作为入口。

1. 在 **"Chat SDK"** 行，点击右侧的下拉框
2. 选择要发布的对话流（Chatflow）
   - 显示对话流名称和状态
   - 仅可选择已启用的对话流
   - 灰色选项表示对话流已禁用或有错误

**前端实现** (`frontend/packages/studio/workspace/project-publish/src/publish-main/components/bind-actions/web-sdk-bind.tsx`):
```typescript
// 选择对话流绑定到 Chat SDK
const handleChatflowSelect = (option: ChatflowOptionProps) => {
  setProjectPublishInfo({
    connectorPublishConfig: {
      [connectorID]: {
        selected_workflows: [{
          workflow_id: option.value,
          workflow_name: option.label,
        }],
      },
    },
  });
};
```

### 步骤 3：确认发布

1. 检查配置无误
2. 点击 **"确认发布"** 按钮
3. 等待发布完成（通常在 3-5 秒内）

**发布成功提示**：
```
✓ 发布成功
Chat SDK 已配置完成
现在可以使用 API Key 调用智能体
```

### 步骤 4：获取 API Key

发布成功后，系统会自动生成或显示可用的 API Key：

1. 在发布管理页面，点击 **"查看 API Key"**
2. 复制 API Key（格式：`sk-...`）
3. 获取智能体 ID (`bot_id`)

**重要**：
- API Key 仅显示一次，请妥善保管
- API Key 具有完整权限，请勿泄露
- 可以在 **"个人设置" > "API 管理"** 中管理所有 API Key

## SDK 集成

### 安装 SDK

#### 方式 1：NPM 安装（推荐）

```bash
npm install @coze-common/chat-core
# 或
yarn add @coze-common/chat-core
# 或
pnpm add @coze-common/chat-core
```

#### 方式 2：CDN 引入

```html
<script src="https://cdn.jsdelivr.net/npm/@coze-common/chat-core@latest/dist/index.umd.js"></script>
<script>
  // SDK 会注册到全局变量 CozeChat
  const ChatSDK = window.CozeChat;
</script>
```

### 快速开始

#### 5 分钟实现对话功能

**HTML 结构**：
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Coze Chat SDK Demo</title>
  <style>
    .chat-container {
      max-width: 600px;
      margin: 50px auto;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    .messages {
      height: 400px;
      overflow-y: auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .message {
      margin-bottom: 15px;
      padding: 10px;
      border-radius: 6px;
      max-width: 80%;
    }
    .message.user {
      background: #1890ff;
      color: white;
      margin-left: auto;
    }
    .message.bot {
      background: white;
    }
    .input-area {
      display: flex;
      padding: 15px;
      border-top: 1px solid #ddd;
    }
    .input-area input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-right: 10px;
    }
    .input-area button {
      padding: 10px 20px;
      background: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="chat-container">
    <div class="messages" id="messages"></div>
    <div class="input-area">
      <input type="text" id="messageInput" placeholder="输入消息..." />
      <button onclick="sendMessage()">发送</button>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@coze-common/chat-core@latest/dist/index.umd.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

**JavaScript 代码** (`app.js`):
```javascript
// 配置信息
const CONFIG = {
  bot_id: '7434343434343434',      // 你的智能体 ID
  api_key: 'sk-your-api-key-here', // 你的 API Key
  base_url: 'https://your-coze-plus.com', // Coze Plus 部署地址
};

// 创建 TokenManager
class TokenManager {
  getApiKeyAuthorizationValue() {
    return `Bearer ${CONFIG.api_key}`;
  }
}

// 初始化 SDK
const chatSDK = window.CozeChat.default.create({
  bot_id: CONFIG.bot_id,
  conversation_id: generateConversationId(), // 生成会话 ID
  user: 'user_' + Date.now(), // 用户标识
  biz: 'third_part',
  env: 'prod',
  deployVersion: 'v1',
  tokenManager: new TokenManager(),
  requestManagerOptions: {
    baseURL: CONFIG.base_url,
  },
});

// 监听消息接收事件
chatSDK.on(window.CozeChat.default.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, (event) => {
  console.log('收到消息：', event.data);
  event.data.forEach(message => {
    displayMessage(message);
  });
});

// 监听错误事件
chatSDK.on(window.CozeChat.default.EVENTS.ERROR, (event) => {
  console.error('SDK 错误：', event.data.error);
  alert('发送失败：' + event.data.error.message);
});

// 监听消息拉取状态
chatSDK.on(window.CozeChat.default.EVENTS.MESSAGE_PULLING_STATUS, (event) => {
  console.log('消息状态：', event.data.pullingStatus);

  if (event.data.pullingStatus === 'error') {
    console.error('消息拉取失败：', event.error);
  }
});

// 发送消息
async function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();

  if (!text) return;

  // 清空输入框
  input.value = '';

  // 显示用户消息
  displayMessage({
    role: 'user',
    content: text,
    type: 'text',
  });

  try {
    // 创建消息
    const message = chatSDK.createTextMessage({
      content: text,
      contentType: 'text',
    });

    // 发送消息
    await chatSDK.sendMessage(message, {
      autoRetry: true,
      retryCount: 3,
    });
  } catch (error) {
    console.error('发送失败：', error);
    alert('发送失败：' + error.message);
  }
}

// 显示消息
function displayMessage(message) {
  const messagesDiv = document.getElementById('messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.role}`;
  messageDiv.textContent = message.content || message.text || '';
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 生成会话 ID
function generateConversationId() {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Enter 键发送
document.getElementById('messageInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});
```

**运行效果**：
```
┌────────────────────────────────────┐
│  Messages                          │
├────────────────────────────────────┤
│                                    │
│  你好！                 [User]     │
│                                    │
│  [Bot] 你好！我是 AI 助手，       │
│        有什么可以帮助你的吗？     │
│                                    │
│  介绍一下你自己         [User]     │
│                                    │
│  [Bot] 我是一个 AI 智能助手...    │
│                                    │
├────────────────────────────────────┤
│ [输入框]                  [发送]   │
└────────────────────────────────────┘
```

## SDK API 参考

### 初始化配置

#### ChatSDK.create(props)

创建 Chat SDK 实例。

**参数** (`CreateProps`)：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bot_id` | string | 是* | 智能体 ID（与 `preset_bot` 二选一） |
| `preset_bot` | string | 是* | 预设智能体模板（与 `bot_id` 二选一） |
| `space_id` | string | 否 | 空间 ID，用于资源计费 |
| `conversation_id` | string | 是 | 会话 ID，用于区分不同对话 |
| `user` | string | 否 | 用户标识（默认为空） |
| `biz` | string | 是 | 业务标识：`'third_part'`（第三方）/`'coze_home'`/`'bot_editor'` |
| `bot_version` | string | 否 | 智能体版本号 |
| `draft_mode` | boolean | 否 | 是否使用草稿模式（默认 `false`） |
| `scene` | number | 否 | 场景值，用于鉴权（默认 `0`） |
| `env` | string | 是 | 环境：`'prod'`/`'test'`/`'dev'` |
| `deployVersion` | string | 是 | 部署版本（如 `'v1'`） |
| `enableDebug` | boolean | 否 | 是否启用调试模式（默认 `false`） |
| `logLevel` | string | 否 | 日志级别：`'disable'`/`'info'`/`'error'`（默认 `'error'`） |
| `tokenManager` | object | 是 | Token 管理器 |
| `requestManagerOptions` | object | 否 | 请求配置选项 |

**TokenManager 接口**：
```typescript
interface TokenManager {
  getApiKeyAuthorizationValue(): string;
}
```

**RequestManagerOptions 接口**：
```typescript
interface RequestManagerOptions {
  baseURL?: string;           // API 基础 URL
  timeout?: number;           // 请求超时时间（毫秒）
  headers?: Record<string, string>; // 自定义请求头
  hooks?: {
    onBeforeRequest?: Array<(config) => config>;  // 请求前钩子
    onAfterResponse?: Array<(response) => response>; // 响应后钩子
  };
}
```

**返回值**：`ChatSDK` 实例

**示例**：
```javascript
const sdk = ChatSDK.create({
  bot_id: '7434343434343434',
  conversation_id: 'conv_123456',
  user: 'user_001',
  biz: 'third_part',
  env: 'prod',
  deployVersion: 'v1',
  enableDebug: true,
  logLevel: 'info',
  tokenManager: {
    getApiKeyAuthorizationValue() {
      return 'Bearer sk-your-api-key';
    },
  },
  requestManagerOptions: {
    baseURL: 'https://your-coze-plus.com',
    timeout: 60000,
    headers: {
      'X-Custom-Header': 'value',
    },
  },
});
```

**源码位置**：`frontend/packages/common/chat-area/chat-core/src/chat-sdk/index.ts:175`

### 消息创建

#### sdk.createTextMessage(props)

创建文本消息。

**参数**：
```typescript
interface TextMessageProps {
  content: string;        // 消息内容
  contentType: 'text';    // 内容类型
}
```

**返回值**：`Message` 对象

**示例**：
```javascript
const message = sdk.createTextMessage({
  content: '你好，世界！',
  contentType: 'text',
});
```

#### sdk.createImageMessage(props, options)

创建图片消息。

**参数**：
```typescript
interface ImageMessageProps {
  file: File;             // 图片文件对象
  contentType: 'image';   // 内容类型
}

interface CreateMessageOptions {
  onProgress?: (percent: number) => void; // 上传进度回调
}
```

**返回值**：`Promise<Message>`

**示例**：
```javascript
const fileInput = document.getElementById('imageInput');
const file = fileInput.files[0];

const message = await sdk.createImageMessage({
  file: file,
  contentType: 'image',
}, {
  onProgress: (percent) => {
    console.log(`上传进度：${percent}%`);
  },
});
```

#### sdk.createFileMessage(props, options)

创建文件消息。

**参数**：
```typescript
interface FileMessageProps {
  file: File;             // 文件对象
  contentType: 'file';    // 内容类型
}
```

**返回值**：`Promise<Message>`

**示例**：
```javascript
const fileInput = document.getElementById('fileInput');
const file = fileInput.files[0];

const message = await sdk.createFileMessage({
  file: file,
  contentType: 'file',
}, {
  onProgress: (percent) => {
    console.log(`上传进度：${percent}%`);
  },
});
```

### 消息发送

#### sdk.sendMessage(message, options)

发送消息。

**参数**：
```typescript
interface SendMessageOptions {
  autoRetry?: boolean;    // 是否自动重试（默认 false）
  retryCount?: number;    // 重试次数（默认 3）
  timeout?: number;       // 超时时间（毫秒）
  signal?: AbortSignal;   // 用于取消请求的信号
}
```

**返回值**：`Promise<Message>`

**示例**：
```javascript
try {
  const message = sdk.createTextMessage({
    content: '你好',
    contentType: 'text',
  });

  const sentMessage = await sdk.sendMessage(message, {
    autoRetry: true,
    retryCount: 3,
    timeout: 30000,
  });

  console.log('发送成功：', sentMessage);
} catch (error) {
  console.error('发送失败：', error);
}
```

#### sdk.resumeMessage(message, options)

恢复发送失败的消息。

**参数**：与 `sendMessage` 相同

**返回值**：`Promise<Message>`

**示例**：
```javascript
// 发送失败后恢复
try {
  await sdk.resumeMessage(failedMessage, {
    autoRetry: true,
  });
} catch (error) {
  console.error('恢复发送失败：', error);
}
```

### 事件监听

#### sdk.on(event, callback)

监听 SDK 事件。

**事件类型** (`SdkEventsEnum`)：

| 事件 | 说明 | 回调参数 |
|------|------|----------|
| `MESSAGE_RECEIVED_AND_UPDATE` | 接收到消息或消息更新 | `SdkMessageEvent` |
| `MESSAGE_PULLING_STATUS` | 消息拉取状态变化 | `SdkPullingStatusEvent` |
| `ERROR` | SDK 错误 | `SdkErrorEvent` |

**SdkMessageEvent 结构**：
```typescript
interface SdkMessageEvent {
  name: 'MESSAGE_RECEIVED_AND_UPDATE';
  data: Message[];  // 消息列表
}
```

**SdkPullingStatusEvent 结构**：
```typescript
interface SdkPullingStatusEvent {
  name: 'MESSAGE_PULLING_STATUS';
  data: {
    pullingStatus: 'start' | 'pulling' | 'answerEnd' | 'success' | 'error' | 'timeout';
    local_message_id: string;  // 本地消息 ID
    reply_id: string;          // 回复消息 ID
  };
  error?: Error;
  abort?: () => void;  // 取消拉取的函数
}
```

**SdkErrorEvent 结构**：
```typescript
interface SdkErrorEvent {
  name: 'ERROR';
  data: {
    error: Error;
  };
}
```

**返回值**：取消监听的函数

**示例**：
```javascript
// 监听消息接收
const unsubscribe = sdk.on(ChatSDK.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, (event) => {
  console.log('收到消息：', event.data);
  event.data.forEach(message => {
    if (message.role === 'assistant') {
      displayBotMessage(message.content);
    }
  });
});

// 监听消息拉取状态
sdk.on(ChatSDK.EVENTS.MESSAGE_PULLING_STATUS, (event) => {
  const status = event.data.pullingStatus;

  switch (status) {
    case 'start':
      console.log('开始拉取回复');
      showTypingIndicator();
      break;
    case 'pulling':
      console.log('正在拉取回复...');
      break;
    case 'answerEnd':
      console.log('回复结束');
      hideTypingIndicator();
      break;
    case 'success':
      console.log('拉取成功');
      break;
    case 'error':
      console.error('拉取失败：', event.error);
      showErrorMessage(event.error.message);
      break;
    case 'timeout':
      console.error('拉取超时');
      if (event.abort) {
        event.abort(); // 取消拉取
      }
      break;
  }
});

// 监听错误
sdk.on(ChatSDK.EVENTS.ERROR, (event) => {
  console.error('SDK 错误：', event.data.error);
  showErrorNotification(event.data.error.message);
});

// 取消监听
unsubscribe();
```

**源码位置**：`frontend/packages/common/chat-area/chat-core/src/chat-sdk/index.ts:400`

#### sdk.off(event, callback)

取消事件监听。

**示例**：
```javascript
const callback = (event) => {
  console.log(event);
};

sdk.on(ChatSDK.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, callback);

// 取消监听
sdk.off(ChatSDK.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, callback);
```

### 会话管理

#### sdk.getHistoryMessage(params)

获取历史消息。

**参数**：
```typescript
interface GetHistoryMessageParams {
  before_id?: string;      // 获取该消息之前的消息
  after_id?: string;       // 获取该消息之后的消息
  limit?: number;          // 每页数量（默认 20）
  order?: 'asc' | 'desc'; // 排序方式（默认 'desc'）
}
```

**返回值**：`Promise<GetHistoryMessageResponse>`

**响应结构**：
```typescript
interface GetHistoryMessageResponse {
  message_list: Message[];  // 消息列表
  has_more: boolean;        // 是否还有更多消息
  first_id: string;         // 第一条消息 ID
  last_id: string;          // 最后一条消息 ID
}
```

**示例**：
```javascript
// 获取最新 20 条消息
const response = await sdk.getHistoryMessage({
  limit: 20,
  order: 'desc',
});

console.log('消息列表：', response.message_list);
console.log('是否还有更多：', response.has_more);

// 加载更多消息（向上翻页）
if (response.has_more) {
  const moreMessages = await sdk.getHistoryMessage({
    before_id: response.first_id,
    limit: 20,
  });
}
```

#### sdk.clearHistory()

清空会话历史。

**返回值**：`Promise<void>`

**示例**：
```javascript
try {
  await sdk.clearHistory();
  console.log('历史已清空');

  // 刷新界面
  clearMessageUI();
} catch (error) {
  console.error('清空失败：', error);
}
```

#### sdk.deleteMessage(params)

删除指定消息。

**参数**：
```typescript
interface DeleteMessageParams {
  message_id: string;  // 消息 ID
}
```

**返回值**：`Promise<void>`

**示例**：
```javascript
try {
  await sdk.deleteMessage({
    message_id: 'msg_123456',
  });

  console.log('消息已删除');

  // 从 UI 中移除
  removeMessageFromUI('msg_123456');
} catch (error) {
  console.error('删除失败：', error);
}
```

#### sdk.updateConversationId(conversationId)

更新会话 ID（用于切换会话）。

**参数**：
- `conversationId` (string): 新的会话 ID

**返回值**：`void`

**示例**：
```javascript
// 切换到新会话
const newConversationId = 'conv_' + Date.now();
sdk.updateConversationId(newConversationId);

console.log('已切换到新会话：', newConversationId);
```

### 实例管理

#### sdk.destroy()

销毁 SDK 实例，释放资源。

**返回值**：`void`

**示例**：
```javascript
// 页面卸载时销毁实例
window.addEventListener('beforeunload', () => {
  sdk.destroy();
  console.log('SDK 已销毁');
});

// 或在 React 中
useEffect(() => {
  const sdk = ChatSDK.create({...});

  return () => {
    sdk.destroy(); // 组件卸载时销毁
  };
}, []);
```

**源码位置**：`frontend/packages/common/chat-area/chat-core/src/chat-sdk/index.ts:377`

## 高级用例

### 多模态消息

#### 发送图片消息

```javascript
// HTML
<input type="file" id="imageUpload" accept="image/*" />
<button onclick="sendImage()">发送图片</button>

// JavaScript
async function sendImage() {
  const fileInput = document.getElementById('imageUpload');
  const file = fileInput.files[0];

  if (!file) {
    alert('请选择图片');
    return;
  }

  try {
    // 创建图片消息（自动上传）
    const message = await sdk.createImageMessage({
      file: file,
      contentType: 'image',
    }, {
      onProgress: (percent) => {
        updateProgressBar(percent);
      },
    });

    // 发送消息
    await sdk.sendMessage(message);

    console.log('图片发送成功');
  } catch (error) {
    console.error('发送失败：', error);
    alert('发送失败：' + error.message);
  }
}
```

#### 发送文件消息

```javascript
async function sendFile() {
  const fileInput = document.getElementById('fileUpload');
  const file = fileInput.files[0];

  if (!file) return;

  try {
    const message = await sdk.createFileMessage({
      file: file,
      contentType: 'file',
    }, {
      onProgress: (percent) => {
        console.log(`文件上传进度：${percent}%`);
      },
    });

    await sdk.sendMessage(message);
  } catch (error) {
    console.error('发送失败：', error);
  }
}
```

### 流式响应处理

Chat SDK 默认支持流式响应（SSE），无需额外配置。

```javascript
let currentBotMessage = '';

sdk.on(ChatSDK.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, (event) => {
  event.data.forEach(message => {
    if (message.role === 'assistant') {
      // 流式更新消息内容
      currentBotMessage = message.content;
      updateBotMessageUI(message.id, currentBotMessage);
    }
  });
});

sdk.on(ChatSDK.EVENTS.MESSAGE_PULLING_STATUS, (event) => {
  if (event.data.pullingStatus === 'answerEnd') {
    console.log('流式响应结束');
    currentBotMessage = '';
  }
});
```

### 会话持久化

```javascript
// 保存会话 ID 到 localStorage
function saveConversationId(conversationId) {
  localStorage.setItem('current_conversation', conversationId);
}

// 加载历史会话
function loadConversation() {
  const conversationId = localStorage.getItem('current_conversation');

  if (conversationId) {
    return conversationId;
  } else {
    // 创建新会话
    const newId = 'conv_' + Date.now();
    saveConversationId(newId);
    return newId;
  }
}

// 初始化 SDK
const sdk = ChatSDK.create({
  bot_id: CONFIG.bot_id,
  conversation_id: loadConversation(),
  // ... 其他配置
});

// 加载历史消息
async function loadHistory() {
  const response = await sdk.getHistoryMessage({
    limit: 50,
    order: 'asc',
  });

  response.message_list.forEach(message => {
    displayMessage(message);
  });
}

loadHistory();
```

### 错误处理和重试

```javascript
class ErrorHandler {
  constructor(sdk) {
    this.sdk = sdk;
    this.retryQueue = [];
    this.maxRetries = 3;

    this.setupErrorHandling();
  }

  setupErrorHandling() {
    // 监听错误事件
    this.sdk.on(ChatSDK.EVENTS.ERROR, (event) => {
      const error = event.data.error;

      if (this.isNetworkError(error)) {
        this.handleNetworkError(error);
      } else if (this.isAuthError(error)) {
        this.handleAuthError(error);
      } else {
        this.handleGenericError(error);
      }
    });

    // 监听拉取状态
    this.sdk.on(ChatSDK.EVENTS.MESSAGE_PULLING_STATUS, (event) => {
      if (event.data.pullingStatus === 'error') {
        this.handlePullingError(event.error, event.data.local_message_id);
      } else if (event.data.pullingStatus === 'timeout') {
        this.handleTimeout(event.abort, event.data.local_message_id);
      }
    });
  }

  isNetworkError(error) {
    return error.message.includes('network') ||
           error.message.includes('timeout') ||
           error.code === 'ECONNABORTED';
  }

  isAuthError(error) {
    return error.message.includes('unauthorized') ||
           error.message.includes('authentication') ||
           error.code === 401;
  }

  handleNetworkError(error) {
    console.warn('网络错误：', error.message);
    showNotification('网络连接失败，请检查网络设置', 'warning');
  }

  handleAuthError(error) {
    console.error('鉴权失败：', error.message);
    showNotification('API Key 无效或已过期，请重新登录', 'error');

    // 清空本地 token
    localStorage.removeItem('api_key');

    // 重定向到登录页
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }

  handleGenericError(error) {
    console.error('SDK 错误：', error);
    showNotification('操作失败：' + error.message, 'error');
  }

  async handlePullingError(error, messageId) {
    console.error('消息拉取失败：', error);

    const retryCount = this.getRetryCount(messageId);

    if (retryCount < this.maxRetries) {
      console.log(`重试第 ${retryCount + 1} 次...`);
      this.incrementRetryCount(messageId);

      // 延迟后重试
      setTimeout(() => {
        this.retryMessage(messageId);
      }, 1000 * Math.pow(2, retryCount)); // 指数退避
    } else {
      showNotification('消息发送失败，已达最大重试次数', 'error');
      this.removeFromRetryQueue(messageId);
    }
  }

  handleTimeout(abortFn, messageId) {
    console.warn('消息拉取超时：', messageId);

    // 取消当前请求
    if (abortFn) {
      abortFn();
    }

    showNotification('请求超时，请重试', 'warning');
  }

  getRetryCount(messageId) {
    const item = this.retryQueue.find(q => q.messageId === messageId);
    return item ? item.count : 0;
  }

  incrementRetryCount(messageId) {
    const item = this.retryQueue.find(q => q.messageId === messageId);
    if (item) {
      item.count++;
    } else {
      this.retryQueue.push({ messageId, count: 1 });
    }
  }

  removeFromRetryQueue(messageId) {
    this.retryQueue = this.retryQueue.filter(q => q.messageId !== messageId);
  }

  async retryMessage(messageId) {
    // 实现重试逻辑
    const message = getMessageById(messageId);
    if (message) {
      await this.sdk.resumeMessage(message);
    }
  }
}

// 使用
const errorHandler = new ErrorHandler(sdk);
```

### 自定义插件

Chat SDK 支持注册自定义插件。

```javascript
// 定义上传插件
class CustomUploadPlugin {
  constructor(options) {
    this.options = options;
  }

  // 上传文件
  async upload(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          onProgress?.(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.url);
        } else {
          reject(new Error('上传失败'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'));
      });

      xhr.open('POST', this.options.uploadUrl);
      xhr.setRequestHeader('Authorization', this.options.token);
      xhr.send(formData);
    });
  }
}

// 注册插件
sdk.registerPlugin('upload-plugin', CustomUploadPlugin, {
  uploadUrl: 'https://your-api.com/upload',
  token: 'Bearer ' + api_key,
});

// 检查插件是否已注册
if (sdk.checkPluginIsRegistered('upload-plugin')) {
  console.log('上传插件已注册');

  // 获取插件实例
  const uploadPlugin = sdk.getRegisteredPlugin('upload-plugin');
}
```

**源码位置**：`frontend/packages/common/chat-area/chat-core/src/chat-sdk/index.ts:476`

## React 集成示例

### 基础 Hook 封装

```typescript
// hooks/useChatSDK.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import ChatSDK, { type Message, type CreateProps } from '@coze-common/chat-core';

export function useChatSDK(config: CreateProps) {
  const sdkRef = useRef<ChatSDK | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 初始化 SDK
  useEffect(() => {
    const sdk = ChatSDK.create(config);
    sdkRef.current = sdk;

    // 监听消息接收
    sdk.on(ChatSDK.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, (event) => {
      setMessages(prevMessages => {
        const newMessages = [...prevMessages];

        event.data.forEach(newMsg => {
          const index = newMessages.findIndex(m => m.id === newMsg.id);
          if (index >= 0) {
            newMessages[index] = newMsg; // 更新
          } else {
            newMessages.push(newMsg); // 新增
          }
        });

        return newMessages;
      });
    });

    // 监听拉取状态
    sdk.on(ChatSDK.EVENTS.MESSAGE_PULLING_STATUS, (event) => {
      const status = event.data.pullingStatus;
      setIsLoading(status === 'start' || status === 'pulling');

      if (status === 'error') {
        setError(event.error || new Error('消息拉取失败'));
      }
    });

    // 监听错误
    sdk.on(ChatSDK.EVENTS.ERROR, (event) => {
      setError(event.data.error);
      setIsLoading(false);
    });

    // 清理
    return () => {
      sdk.destroy();
    };
  }, []); // 仅初始化一次

  // 发送消息
  const sendMessage = useCallback(async (text: string) => {
    if (!sdkRef.current) return;

    setError(null);
    setIsLoading(true);

    try {
      const message = sdkRef.current.createTextMessage({
        content: text,
        contentType: 'text',
      });

      await sdkRef.current.sendMessage(message, {
        autoRetry: true,
        retryCount: 3,
      });
    } catch (err) {
      setError(err as Error);
      setIsLoading(false);
    }
  }, []);

  // 加载历史消息
  const loadHistory = useCallback(async () => {
    if (!sdkRef.current) return;

    try {
      const response = await sdkRef.current.getHistoryMessage({
        limit: 50,
        order: 'asc',
      });

      setMessages(response.message_list);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  // 清空历史
  const clearHistory = useCallback(async () => {
    if (!sdkRef.current) return;

    try {
      await sdkRef.current.clearHistory();
      setMessages([]);
    } catch (err) {
      setError(err as Error);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadHistory,
    clearHistory,
    sdk: sdkRef.current,
  };
}
```

### 聊天组件

```typescript
// components/ChatBox.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useChatSDK } from '../hooks/useChatSDK';

interface ChatBoxProps {
  botId: string;
  apiKey: string;
  baseURL: string;
}

export function ChatBox({ botId, apiKey, baseURL }: ChatBoxProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error, sendMessage, loadHistory } = useChatSDK({
    bot_id: botId,
    conversation_id: `conv_${Date.now()}`,
    user: `user_${Date.now()}`,
    biz: 'third_part',
    env: 'prod',
    deployVersion: 'v1',
    tokenManager: {
      getApiKeyAuthorizationValue() {
        return `Bearer ${apiKey}`;
      },
    },
    requestManagerOptions: {
      baseURL,
    },
  });

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 加载历史消息
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    await sendMessage(inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role === 'user' ? 'user' : 'bot'}`}
          >
            <div className="message-content">
              {message.content || message.text}
            </div>
            <div className="message-time">
              {new Date(message.created_at || 0).toLocaleTimeString()}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message bot">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          rows={3}
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading || !inputText.trim()}>
          {isLoading ? '发送中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
```

### CSS 样式

```css
/* ChatBox.css */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 600px;
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f5f5f5;
}

.message {
  margin-bottom: 16px;
  max-width: 70%;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message.user {
  margin-left: auto;
  text-align: right;
}

.message.bot {
  margin-right: auto;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message.user .message-content {
  background: #1890ff;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.bot .message-content {
  background: white;
  color: #333;
  border: 1px solid #e0e0e0;
  border-bottom-left-radius: 4px;
}

.message-time {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e0e0e0;
  width: fit-content;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; }
  30% { opacity: 1; }
}

.error-message {
  padding: 12px 16px;
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  margin: 12px 0;
}

.input-area {
  display: flex;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  background: white;
  gap: 12px;
}

.input-area textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

.input-area textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.input-area textarea:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.input-area button {
  padding: 12px 24px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
}

.input-area button:hover:not(:disabled) {
  background: #40a9ff;
}

.input-area button:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}
```

## 后端 API 说明

Chat SDK 调用的主要后端 API：

### 聊天 API

**端点**：`POST /v1/chat`

**鉴权**：`Authorization: Bearer <api_key>`

**请求体**：
```json
{
  "bot_id": "7434343434343434",
  "conversation_id": "conv_123456",
  "connector_id": 999,
  "query": "你好",
  "stream": true,
  "user": "user_001"
}
```

**响应**（流式）：
```
data: {"event":"conversation.chat.created","data":{"id":"msg_001","conversation_id":"conv_123456"}}

data: {"event":"conversation.message.delta","data":{"role":"assistant","content":"你"}}

data: {"event":"conversation.message.delta","data":{"role":"assistant","content":"好"}}

data: {"event":"conversation.message.completed","data":{"id":"msg_001","role":"assistant","content":"你好！有什么可以帮助你的吗？"}}

data: [DONE]
```

**源码位置**：
- Handler: `backend/application/conversation/openapi_agent_run.go:50`
- Connector ID 检查: `backend/application/conversation/openapi_agent_run.go:56`

**关键代码**：
```go
func (a *OpenapiAgentRunApplication) OpenapiAgentRun(ctx context.Context, sseSender *sseImpl.SSenderImpl, ar *run.ChatV3Request) error {
    apiKeyInfo := ctxutil.GetApiAuthFromCtx(ctx)
    creatorID := apiKeyInfo.UserID
    connectorID := apiKeyInfo.ConnectorID

    // Web SDK 使用特殊的 Connector ID (999)
    if ptr.From(ar.ConnectorID) == consts.WebSDKConnectorID {
        connectorID = ptr.From(ar.ConnectorID)
    }

    // ... 处理逻辑
}
```

## 常见问题

### Q1: API Key 鉴权失败

**错误信息**：
```
Error: Unauthorized - API Key is invalid or expired
```

**原因**：
- API Key 格式错误
- API Key 已过期
- API Key 被删除或禁用

**解决方案**：
1. 检查 API Key 格式（应该以 `sk-` 开头）
2. 在管理后台查看 API Key 状态
3. 重新生成 API Key

### Q2: CORS 跨域错误

**错误信息**：
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**原因**：
- Coze Plus 服务未配置 CORS 允许来源

**解决方案**：

方式 1：配置服务端 CORS（推荐）
```go
// backend/api/middleware/cors.go
func CORSMiddleware() app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if string(c.Method()) == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next(ctx)
    }
}
```

方式 2：使用代理
```javascript
// 在 vite.config.js 中配置代理
export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://your-coze-plus.com',
        changeOrigin: true,
      },
    },
  },
};
```

### Q3: 消息发送后无响应

**原因**：
- 对话流未正确配置
- 智能体未发布
- 网络问题

**排查步骤**：

1. **检查发布状态**：
   ```bash
   # 在管理后台查看发布状态
   # 确认 Chat SDK 已绑定对话流
   ```

2. **查看浏览器控制台**：
   ```javascript
   // 启用 SDK 调试日志
   const sdk = ChatSDK.create({
     // ...
     enableDebug: true,
     logLevel: 'info',
   });
   ```

3. **检查网络请求**：
   - 打开浏览器开发者工具 > Network
   - 查找 `/v1/chat` 请求
   - 检查请求参数和响应

4. **验证对话流**：
   - 在 Coze Plus 编辑器中测试对话流
   - 确认对话流能够正常执行

### Q4: 流式响应不更新

**问题**：消息发送后，机器人回复不是逐字显示，而是一次性显示

**原因**：
- 未正确监听 `MESSAGE_RECEIVED_AND_UPDATE` 事件
- 消息状态未正确处理

**解决方案**：
```javascript
let currentMessageId = null;
let currentContent = '';

sdk.on(ChatSDK.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, (event) => {
  event.data.forEach(message => {
    if (message.role === 'assistant') {
      if (message.id !== currentMessageId) {
        // 新消息
        currentMessageId = message.id;
        currentContent = message.content || '';
        createNewMessageElement(message.id, currentContent);
      } else {
        // 更新现有消息
        currentContent = message.content || '';
        updateMessageElement(message.id, currentContent);
      }
    }
  });
});

sdk.on(ChatSDK.EVENTS.MESSAGE_PULLING_STATUS, (event) => {
  if (event.data.pullingStatus === 'answerEnd') {
    // 回复结束
    finalizeMessage(currentMessageId);
    currentMessageId = null;
    currentContent = '';
  }
});
```

### Q5: 会话历史丢失

**问题**：刷新页面后会话历史消失

**原因**：
- `conversation_id` 未持久化
- 每次初始化 SDK 使用新的 `conversation_id`

**解决方案**：
```javascript
// 持久化会话 ID
class ConversationManager {
  static STORAGE_KEY = 'coze_conversation_id';

  static getOrCreateConversationId() {
    let id = localStorage.getItem(this.STORAGE_KEY);

    if (!id) {
      id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.saveConversationId(id);
    }

    return id;
  }

  static saveConversationId(id) {
    localStorage.setItem(this.STORAGE_KEY, id);
  }

  static clearConversation() {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static createNewConversation() {
    this.clearConversation();
    return this.getOrCreateConversationId();
  }
}

// 使用
const sdk = ChatSDK.create({
  bot_id: CONFIG.bot_id,
  conversation_id: ConversationManager.getOrCreateConversationId(),
  // ...
});

// 加载历史
async function init() {
  const response = await sdk.getHistoryMessage({ limit: 50 });
  displayMessages(response.message_list);
}

// 开始新会话
function startNewConversation() {
  const newId = ConversationManager.createNewConversation();
  sdk.updateConversationId(newId);
  clearMessageUI();
}
```

### Q6: 内存泄漏问题

**问题**：长时间使用后页面卡顿或崩溃

**原因**：
- SDK 实例未正确销毁
- 事件监听器未清理
- 消息列表无限增长

**解决方案**：

1. **正确销毁 SDK**：
```javascript
// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  sdk.destroy();
});

// React 组件
useEffect(() => {
  const sdk = ChatSDK.create({...});

  return () => {
    sdk.destroy();
  };
}, []);
```

2. **限制消息数量**：
```javascript
const MAX_MESSAGES = 100;

function addMessage(message) {
  setMessages(prevMessages => {
    const newMessages = [...prevMessages, message];

    // 保持最新的 100 条消息
    if (newMessages.length > MAX_MESSAGES) {
      return newMessages.slice(-MAX_MESSAGES);
    }

    return newMessages;
  });
}
```

3. **清理事件监听**：
```javascript
const unsubscribeMessage = sdk.on(ChatSDK.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, handler);
const unsubscribeError = sdk.on(ChatSDK.EVENTS.ERROR, errorHandler);

// 清理
function cleanup() {
  unsubscribeMessage();
  unsubscribeError();
  sdk.destroy();
}
```

### Q7: 移动端适配问题

**问题**：在移动设备上输入框被键盘遮挡

**解决方案**：
```javascript
// 监听键盘弹起
window.addEventListener('resize', () => {
  // 滚动到底部
  scrollToBottom();
});

// iOS 特殊处理
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  });
}
```

**CSS 优化**：
```css
/* 移动端适配 */
@media (max-width: 768px) {
  .chat-container {
    height: 100vh;
    height: -webkit-fill-available;
    max-width: 100%;
    border-radius: 0;
  }

  .messages {
    padding: 12px;
  }

  .message {
    max-width: 85%;
  }

  .input-area {
    padding: 12px;
  }

  .input-area textarea {
    font-size: 16px; /* 防止 iOS 自动缩放 */
  }
}
```

## 最佳实践

### DO（推荐做法）

✅ **使用环境变量管理 API Key**
```javascript
const api_key = process.env.VITE_COZE_API_KEY;
```

✅ **正确处理错误和边界情况**
```javascript
try {
  await sdk.sendMessage(message);
} catch (error) {
  if (error.code === 401) {
    // 处理鉴权失败
  } else if (error.code === 'ECONNABORTED') {
    // 处理超时
  } else {
    // 通用错误处理
  }
}
```

✅ **实现自动重试机制**
```javascript
await sdk.sendMessage(message, {
  autoRetry: true,
  retryCount: 3,
});
```

✅ **持久化会话 ID**
```javascript
localStorage.setItem('conversation_id', conversationId);
```

✅ **监听所有必要事件**
```javascript
sdk.on(ChatSDK.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, handler);
sdk.on(ChatSDK.EVENTS.ERROR, errorHandler);
sdk.on(ChatSDK.EVENTS.MESSAGE_PULLING_STATUS, statusHandler);
```

✅ **及时销毁 SDK 实例**
```javascript
window.addEventListener('beforeunload', () => {
  sdk.destroy();
});
```

### DON'T（避免做法）

❌ **硬编码 API Key**
```javascript
// 不要这样
const api_key = 'sk-1234567890abcdef';
```

❌ **忽略错误处理**
```javascript
// 不要这样
await sdk.sendMessage(message); // 没有 try-catch
```

❌ **创建多个 SDK 实例**
```javascript
// 不要这样
const sdk1 = ChatSDK.create({...});
const sdk2 = ChatSDK.create({...}); // 重复创建
```

❌ **不清理事件监听**
```javascript
// 不要这样
sdk.on(ChatSDK.EVENTS.MESSAGE_RECEIVED_AND_UPDATE, handler);
// 从未调用 sdk.off() 或 sdk.destroy()
```

❌ **直接操作 SDK 内部属性**
```javascript
// 不要这样
sdk.conversation_id = 'new_id'; // 应该使用 updateConversationId()
```

## 参考资源

### 源码位置

- **Chat SDK 核心**：`frontend/packages/common/chat-area/chat-core/src/chat-sdk/`
- **发布绑定逻辑**：`frontend/packages/studio/workspace/project-publish/src/publish-main/components/bind-actions/web-sdk-bind.tsx`
- **后端 API Handler**：`backend/application/conversation/openapi_agent_run.go`
- **Connector 定义**：`backend/types/consts/consts.go:71`

### 相关文档

- [发布智能体为 API 服务](./api-publishing.md)
- [工作流开发指南](./workflow-development.md)
- [项目概述](./overview.md)

---

**最后更新时间**：2025-10-27

**文档版本**：v1.0.0

如有任何疑问或需要帮助，请联系：
- 📧 邮箱：support@coze-plus.cn
- 💬 交流群：参见[项目概述](./overview.md)
