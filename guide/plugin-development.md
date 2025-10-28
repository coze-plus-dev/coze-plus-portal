# 插件开发指南

本文档将带你从零开始开发一个 Coze Plus 插件，包括插件设计、开发、调试、发布的完整流程。

## 快速开始

### 开发前准备

在开始开发插件之前，你需要：

1. **了解目标 API 服务**
   - 获取 API 文档
   - 了解认证方式
   - 确认请求和响应格式

2. **准备开发环境**
   - Coze Plus 本地部署或远程实例
   - API 测试工具（Postman、curl 等）
   - 文本编辑器或 IDE

3. **获取 API 凭证**
   - API Key / Token
   - OAuth Client ID 和 Secret（如需要）

### 5 分钟快速示例

让我们通过一个简单的天气 API 插件快速入门：

```yaml
# weather_api.yaml
openapi: 3.0.1
info:
  title: 天气查询
  description: 查询城市天气信息
  version: v1.0.0

servers:
  - url: https://api.weather.com

paths:
  /weather/current:
    get:
      operationId: getCurrentWeather
      summary: 获取当前天气
      parameters:
        - name: city
          in: query
          required: true
          description: 城市名称
          schema:
            type: string
        - name: units
          in: query
          description: 温度单位（metric/imperial）
          schema:
            type: string
            default: metric
      responses:
        "200":
          description: 成功返回
          content:
            application/json:
              schema:
                type: object
                properties:
                  city:
                    type: string
                  temperature:
                    type: number
                  weather:
                    type: string
```

将上述 YAML 保存为文件，然后在 Coze Plus 中：

1. 进入"插件管理"页面
2. 点击"创建插件"
3. 选择"导入 OpenAPI 文档"
4. 上传 YAML 文件
5. 配置认证信息
6. 点击"保存"

完成！你的第一个插件就创建好了。

## 插件开发完整流程

### 步骤 1：设计插件

#### 1.1 确定插件范围

**单一职责原则**：一个插件应该聚焦于一个特定的服务或功能领域。

**好的示例**：
- ✅ 高德地图插件 - 只包含地图相关的 API
- ✅ GitHub 插件 - 只包含 GitHub 相关的 API
- ❌ 综合工具插件 - 包含地图、天气、翻译等多个不相关的 API

#### 1.2 规划 API 工具

列出插件需要包含的所有 API 接口：

**示例：GitHub 插件工具列表**

| 工具名称 | 功能描述 | HTTP 方法 | 路径 |
|---------|---------|----------|------|
| `listRepos` | 列出用户仓库 | GET | `/users/{username}/repos` |
| `getRepo` | 获取仓库详情 | GET | `/repos/{owner}/{repo}` |
| `createIssue` | 创建 Issue | POST | `/repos/{owner}/{repo}/issues` |
| `listIssues` | 列出 Issue | GET | `/repos/{owner}/{repo}/issues` |
| `getIssue` | 获取 Issue 详情 | GET | `/repos/{owner}/{repo}/issues/{issue_number}` |

#### 1.3 选择认证方式

根据目标 API 的认证要求选择合适的认证方式：

| 认证方式 | 适用场景 | 配置难度 |
|---------|---------|---------|
| **None** | 公开 API，无需认证 | ⭐ |
| **API Token** | 服务端 API，固定密钥 | ⭐⭐ |
| **OAuth - Client Credentials** | 服务端到服务端 | ⭐⭐⭐ |
| **OAuth - Authorization Code** | 需要用户授权的 API | ⭐⭐⭐⭐ |

### 步骤 2：编写 OpenAPI 文档

#### 2.1 基本结构

完整的 OpenAPI 3.0 文档包含以下部分：

```yaml
openapi: 3.0.1
info:
  title: 插件标题
  description: 插件描述
  version: v1.0.0

servers:
  - url: https://api.example.com
    description: 生产环境
  - url: https://api-dev.example.com
    description: 开发环境

paths:
  # API 路径定义

components:
  schemas:
    # 通用 Schema 定义
  securitySchemes:
    # 安全认证方案（可选）
```

#### 2.2 定义 API 路径

每个 API 路径对应一个工具：

```yaml
paths:
  /users/{username}/repos:
    get:
      operationId: listUserRepos              # 【必需】唯一标识符
      summary: 列出用户的所有仓库            # 【必需】简短描述
      description: 获取指定用户的公开仓库列表  # 【可选】详细描述
      parameters:                             # 参数定义
        - name: username
          in: path                            # path | query | header
          required: true
          description: GitHub 用户名
          schema:
            type: string
        - name: sort
          in: query
          required: false
          description: 排序方式
          schema:
            type: string
            enum: [created, updated, pushed, full_name]
            default: created
        - name: per_page
          in: query
          required: false
          description: 每页数量
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 30
      responses:
        "200":
          description: 成功返回
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Repository'
        "404":
          description: 用户不存在
```

#### 2.3 定义请求体（POST/PUT）

对于需要请求体的接口：

```yaml
paths:
  /repos/{owner}/{repo}/issues:
    post:
      operationId: createIssue
      summary: 创建 Issue
      parameters:
        - name: owner
          in: path
          required: true
          schema:
            type: string
        - name: repo
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - title
              properties:
                title:
                  type: string
                  description: Issue 标题
                body:
                  type: string
                  description: Issue 正文
                labels:
                  type: array
                  items:
                    type: string
                  description: 标签列表
      responses:
        "201":
          description: Issue 创建成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Issue'
```

#### 2.4 定义通用 Schema

使用 `components.schemas` 定义可复用的数据结构：

```yaml
components:
  schemas:
    Repository:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        full_name:
          type: string
        owner:
          $ref: '#/components/schemas/User'
        description:
          type: string
        html_url:
          type: string

    User:
      type: object
      properties:
        id:
          type: integer
        login:
          type: string
        avatar_url:
          type: string

    Issue:
      type: object
      properties:
        id:
          type: integer
        number:
          type: integer
        title:
          type: string
        body:
          type: string
        state:
          type: string
          enum: [open, closed]
```

#### 2.5 使用 Coze Plus 扩展字段

Coze Plus 支持一些扩展字段来增强功能：

```yaml
parameters:
  - name: file
    in: query
    schema:
      type: string
      x-assist-type: file             # 辅助类型：file | image | video | audio | address
      x-global-disable: false         # 全局禁用此参数
      x-local-disable: false          # 智能体级别禁用
      x-variable-ref: "{{user_file}}" # 引用变量

paths:
  /api/endpoint:
    get:
      x-auth-mode: required           # 认证模式：required | optional | disabled
```

**扩展字段说明**：

| 扩展字段 | 位置 | 说明 | 示例值 |
|---------|------|------|--------|
| `x-assist-type` | Parameter Schema | 参数辅助类型，用于前端 UI 提示 | `file`, `image`, `address` |
| `x-global-disable` | Parameter Schema | 是否在插件级别禁用此参数 | `true`, `false` |
| `x-local-disable` | Parameter Schema | 是否在智能体级别禁用此参数 | `true`, `false` |
| `x-variable-ref` | Parameter Schema | 引用的变量名 | `{{variable_name}}` |
| `x-auth-mode` | Operation | 此接口的认证模式 | `required`, `optional`, `disabled` |

### 步骤 3：配置插件 Manifest

#### 3.1 基本信息

创建 Plugin Manifest JSON 文件：

```json
{
  "schema_version": "v1",
  "name_for_model": "github_plugin",
  "name_for_human": "GitHub",
  "description_for_model": "GitHub API 插件，用于管理仓库、Issue、Pull Request 等",
  "description_for_human": "通过 GitHub API 管理你的代码仓库",
  "logo_url": "https://github.com/logo.png",
  "api": {
    "type": "cloud"
  }
}
```

**字段说明**：

- `schema_version`：固定为 `"v1"`
- `name_for_model`：给 AI 模型看的名称（建议使用小写字母和下划线）
- `name_for_human`：给用户看的名称（可以使用中文或任何语言）
- `description_for_model`：给 AI 模型看的描述（详细说明插件的功能和用途）
- `description_for_human`：给用户看的描述（简洁明了）
- `logo_url`：插件图标 URL（建议尺寸：256x256px）
- `api.type`：固定为 `"cloud"`

#### 3.2 配置 None 认证

无需认证的插件：

```json
{
  "schema_version": "v1",
  "name_for_model": "free_api",
  "name_for_human": "公开 API",
  "description_for_model": "无需认证的公开 API",
  "description_for_human": "公开访问的 API 服务",
  "auth": {
    "type": "none",
    "sub_type": "",
    "payload": ""
  },
  "api": {
    "type": "cloud"
  }
}
```

#### 3.3 配置 API Token 认证

使用固定 API Token 的插件：

```json
{
  "schema_version": "v1",
  "name_for_model": "weather_api",
  "name_for_human": "天气 API",
  "description_for_model": "查询天气信息的 API",
  "description_for_human": "查询全球城市天气",
  "auth": {
    "type": "service",
    "sub_type": "api_token",
    "payload": "{\"location\":\"header\",\"key\":\"X-API-Key\",\"service_token\":\"your_api_key_here\"}"
  },
  "api": {
    "type": "cloud"
  }
}
```

**Payload 字段说明**：

```json
{
  "location": "header",        // 或 "query"
  "key": "X-API-Key",          // 参数名称（Header 名称或 Query 参数名）
  "service_token": "your_key"  // 实际的 API Key
}
```

**示例：Header 认证**

```json
{
  "location": "header",
  "key": "Authorization",
  "service_token": "Bearer sk-1234567890abcdef"
}
```

HTTP 请求时自动添加：
```
Authorization: Bearer sk-1234567890abcdef
```

**示例：Query 认证**

```json
{
  "location": "query",
  "key": "api_key",
  "service_token": "1234567890abcdef"
}
```

HTTP 请求时自动添加：
```
GET /api/endpoint?api_key=1234567890abcdef
```

#### 3.4 配置 OAuth 认证

##### OAuth Authorization Code 模式

适用于需要用户授权的场景：

```json
{
  "schema_version": "v1",
  "name_for_model": "github_plugin",
  "name_for_human": "GitHub",
  "description_for_model": "GitHub API 插件",
  "description_for_human": "管理你的 GitHub 仓库",
  "auth": {
    "type": "oauth",
    "sub_type": "authorization_code",
    "payload": "{\"client_id\":\"your_github_client_id\",\"client_secret\":\"your_github_client_secret\",\"client_url\":\"https://github.com/login/oauth/authorize\",\"authorization_url\":\"https://github.com/login/oauth/access_token\",\"authorization_content_type\":\"application/json\",\"scope\":\"repo user\"}"
  },
  "api": {
    "type": "cloud"
  }
}
```

**Payload 字段说明**：

```json
{
  "client_id": "your_oauth_client_id",
  "client_secret": "your_oauth_client_secret",
  "client_url": "https://provider.com/oauth/authorize",  // 用户授权页面 URL
  "authorization_url": "https://provider.com/oauth/token",  // Token 交换 URL
  "authorization_content_type": "application/json",  // 固定值
  "scope": "read write"  // 授权范围，多个用空格分隔
}
```

##### OAuth Client Credentials 模式

适用于服务端到服务端的场景：

```json
{
  "auth": {
    "type": "oauth",
    "sub_type": "client_credentials",
    "payload": "{\"client_id\":\"your_client_id\",\"client_secret\":\"your_client_secret\",\"token_url\":\"https://provider.com/oauth/token\"}"
  }
}
```

**Payload 字段说明**：

```json
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "token_url": "https://provider.com/oauth/token"
}
```

#### 3.5 配置公共参数

如果所有 API 都需要某些相同的参数，可以在 Manifest 中配置公共参数：

```json
{
  "schema_version": "v1",
  "name_for_model": "custom_api",
  "name_for_human": "自定义 API",
  "description_for_model": "带公共参数的 API",
  "description_for_human": "自定义 API 服务",
  "auth": {
    "type": "none"
  },
  "api": {
    "type": "cloud"
  },
  "common_params": {
    "header": [
      {
        "name": "X-Client-Version",
        "type": "string",
        "value": "1.0.0",
        "required": true
      }
    ],
    "query": [
      {
        "name": "format",
        "type": "string",
        "value": "json",
        "required": false
      }
    ]
  }
}
```

### 步骤 4：创建插件

#### 方式 1：通过 UI 创建（推荐）

1. **登录 Coze Plus**
   - 打开浏览器访问 Coze Plus 地址
   - 登录你的账号

2. **进入插件管理**
   - 点击左侧导航栏"插件管理"
   - 点击"创建插件"按钮

3. **填写基本信息**
   - 插件名称：GitHub
   - 插件描述：管理你的 GitHub 仓库
   - 上传图标（可选）

4. **导入 OpenAPI 文档**
   - 选择"导入 OpenAPI 文档"
   - 上传之前编写的 YAML 文件
   - 或粘贴 OpenAPI JSON/YAML 内容

5. **配置认证**
   - 选择认证类型
   - 填写认证配置信息
   - 保存配置

6. **保存插件**
   - 点击"保存"按钮
   - 插件创建完成

#### 方式 2：通过 API 创建

**请求示例**：

```bash
curl -X POST https://your-coze-plus.com/api/plugin_api/register \
  -H "Authorization: Bearer your_access_token" \
  -H "Content-Type: application/json" \
  -d '{
    "space_id": "123",
    "ai_plugin": "{\"schema_version\":\"v1\",\"name_for_model\":\"github_plugin\",\"name_for_human\":\"GitHub\",\"description_for_model\":\"GitHub API 插件\",\"description_for_human\":\"管理你的 GitHub 仓库\",\"auth\":{\"type\":\"oauth\",\"sub_type\":\"authorization_code\"},\"api\":{\"type\":\"openapi\",\"url\":\"https://api.github.com\"}}",
    "openapi": "openapi: 3.0.1\ninfo:\n  title: GitHub API\n  version: v1.0.0\nservers:\n  - url: https://api.github.com\npaths:\n  /users/{username}/repos:\n    get:\n      operationId: listUserRepos\n      summary: 列出用户仓库\n      parameters:\n        - name: username\n          in: path\n          required: true\n          schema:\n            type: string\n      responses:\n        '200':\n          description: 成功返回\n          content:\n            application/json:\n              schema:\n                type: array\n                items:\n                  type: object"
  }'
```

**注意**：
- API 路径为 `/api/plugin_api/register`（通过代码创建插件）
- `space_id` 必须是字符串类型
- `ai_plugin` 是 JSON 字符串（manifest）
- `openapi` 是 YAML 字符串（OpenAPI 文档）

**响应示例**：

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "plugin_id": "123",
    "api_infos": [
      {
        "api_id": "456",
        "api_name": "listUserRepos"
      }
    ]
  }
}
```

### 步骤 5：调试插件

#### 5.1 在线调试工具

Coze Plus 提供了在线调试工具，可以快速测试 API 调用：

1. **进入插件详情页**
   - 在插件列表中找到你的插件
   - 点击进入详情页

2. **选择要调试的工具**
   - 在工具列表中点击"调试"按钮

3. **填写测试参数**
   - 根据参数定义填写测试值
   - 必填参数用红色标记

4. **执行调试**
   - 点击"执行"按钮
   - 查看请求和响应

5. **分析结果**
   - 查看原始请求（包括 Headers、Body）
   - 查看原始响应
   - 查看处理后的响应（根据 Schema 裁剪）

**调试界面示例**：

```
┌─────────────────────────────────────────────────┐
│ 工具：listUserRepos                            │
├─────────────────────────────────────────────────┤
│ 参数：                                          │
│   username: octocat                    [必填]   │
│   sort: created                                 │
│   per_page: 10                                  │
│                                                 │
│ [执行]  [重置]                                  │
├─────────────────────────────────────────────────┤
│ 请求：                                          │
│ GET /users/octocat/repos?sort=created&per_page=10│
│ Host: api.github.com                            │
│ Authorization: Bearer ghp_xxxx                  │
│                                                 │
├─────────────────────────────────────────────────┤
│ 响应：                                          │
│ Status: 200 OK                                  │
│ [{                                              │
│   "id": 123,                                    │
│   "name": "hello-world",                        │
│   "full_name": "octocat/hello-world"            │
│ }]                                              │
└─────────────────────────────────────────────────┘
```

#### 5.2 使用 Postman 调试

你也可以先在 Postman 中测试 API：

1. **导出 OpenAPI 文档**
   - 从 Coze Plus 导出 OpenAPI JSON
   - 或使用你编写的原始文档

2. **导入到 Postman**
   - Postman → Import → OpenAPI 3.0
   - 自动生成所有 API 请求

3. **配置环境变量**
   - 创建 Environment
   - 设置 `base_url`、`api_key` 等变量

4. **测试 API**
   - 运行请求
   - 验证响应格式

5. **调整 OpenAPI 文档**
   - 根据实际响应修改 Schema
   - 更新参数定义

#### 5.3 常见调试问题

##### 问题 1：认证失败

**错误信息**：
```
401 Unauthorized
```

**解决方案**：
1. 检查 API Token 是否正确
2. 确认 Token 位置（Header/Query）配置正确
3. 验证 Token 格式（如是否需要 "Bearer " 前缀）

##### 问题 2：参数验证失败

**错误信息**：
```
400 Bad Request: Missing required parameter 'username'
```

**解决方案**：
1. 检查 OpenAPI 文档中 `required: true` 是否正确
2. 确认参数位置（path/query/header/body）
3. 验证参数类型定义

##### 问题 3：响应解析失败

**错误信息**：
```
Failed to parse response: invalid JSON
```

**解决方案**：
1. 检查 API 返回的 Content-Type
2. 确认响应确实是 JSON 格式
3. 如果是 XML 等其他格式，需要转换为 JSON

##### 问题 4：CORS 错误

**错误信息**：
```
CORS policy: No 'Access-Control-Allow-Origin' header
```

**解决方案**：
- Coze Plus 后端代理会自动处理 CORS
- 不要在浏览器中直接调用第三方 API
- 确保使用 Coze Plus 的调试工具

### 步骤 6：测试插件

#### 6.1 创建测试智能体

1. **创建新智能体**
   - 进入"智能体管理"
   - 点击"创建智能体"
   - 填写基本信息

2. **添加插件**
   - 在智能体配置页面
   - 点击"添加工具"
   - 选择你的插件
   - 勾选需要的工具

3. **配置提示词**
   ```
   你是一个 GitHub 助手，可以帮助用户管理 GitHub 仓库。

   当用户询问仓库信息时，使用 listUserRepos 工具获取仓库列表。
   当用户想创建 Issue 时，使用 createIssue 工具。

   请始终以友好的方式回复用户。
   ```

4. **保存智能体**

#### 6.2 对话测试

在智能体对话界面进行测试：

**测试用例 1：列出仓库**

```
User: 帮我看看 octocat 用户有哪些仓库？
Agent: 好的，让我查询一下 octocat 用户的仓库列表。

[调用 listUserRepos 工具]
参数：{"username": "octocat"}

Agent: 我找到了 octocat 用户的仓库列表：

1. **Hello-World** - 我的第一个仓库
2. **Spoon-Knife** - 用于测试 Fork 功能
3. **octocat.github.io** - 个人主页

需要查看具体哪个仓库的详情吗？
```

**验证要点**：
- ✅ 智能体正确调用了 `listUserRepos` 工具
- ✅ 参数传递正确
- ✅ 响应数据格式化展示清晰

**测试用例 2：创建 Issue**

```
User: 帮我在 octocat/Hello-World 仓库创建一个 Issue，标题是"测试 Issue"，内容是"这是一个测试"

Agent: 好的，我来为你创建 Issue。

[调用 createIssue 工具]
参数：{
  "owner": "octocat",
  "repo": "Hello-World",
  "title": "测试 Issue",
  "body": "这是一个测试"
}

Agent: Issue 创建成功！

Issue #123: 测试 Issue
状态：Open
链接：https://github.com/octocat/Hello-World/issues/123
```

**验证要点**：
- ✅ 智能体正确解析了仓库路径（owner/repo）
- ✅ 正确调用了 `createIssue` 工具
- ✅ 参数映射正确
- ✅ 返回结果格式化展示

#### 6.3 错误处理测试

测试插件的错误处理能力：

**测试用例 3：处理不存在的用户**

```
User: 查询 nonexistentuser12345 的仓库

Agent: [调用 listUserRepos 工具]
参数：{"username": "nonexistentuser12345"}

[工具返回 404 错误]

Agent: 抱歉，没有找到用户 nonexistentuser12345。请确认用户名是否正确。
```

**测试用例 4：处理认证错误**

```
[模拟 OAuth Token 过期]

Agent: [调用 listUserRepos 工具]
[返回认证失败]

Agent: 抱歉，需要重新授权 GitHub 账户。请点击下方链接完成授权：
[授权链接]
```

#### 6.4 性能测试

测试插件的响应速度：

1. **单次调用延迟**
   - 目标：< 2 秒
   - 测试：连续调用 10 次，记录平均响应时间

2. **并发调用**
   - 目标：支持 10 个并发请求
   - 测试：同时发起 10 个请求，验证全部成功

3. **大数据响应**
   - 目标：正确处理大于 1MB 的响应
   - 测试：调用返回大量数据的 API

### 步骤 7：发布插件

#### 7.1 发布前检查清单

在发布插件之前，确保完成以下检查：

**✅ 功能完整性**
- [ ] 所有工具都已测试通过
- [ ] 参数验证正确
- [ ] 错误处理完善
- [ ] 响应格式符合预期

**✅ 文档完整性**
- [ ] 每个工具都有清晰的 `summary`
- [ ] 所有参数都有 `description`
- [ ] 响应 Schema 定义完整
- [ ] 提供了使用示例

**✅ 安全性**
- [ ] API Token 已加密存储
- [ ] 不包含敏感信息（如密钥、密码）
- [ ] OAuth 配置正确
- [ ] 权限范围（Scope）合理

**✅ 性能**
- [ ] 响应时间合理（< 5 秒）
- [ ] 没有明显的性能瓶颈
- [ ] 适当的超时配置

#### 7.2 创建版本

1. **进入插件详情页**
   - 在插件列表中找到你的插件
   - 点击进入详情页

2. **填写版本信息**
   - 版本号：`v1.0.0`（遵循语义化版本）
   - 版本描述：
     ```
     ## v1.0.0

     ### 新功能
     - 支持列出用户仓库
     - 支持获取仓库详情
     - 支持创建 Issue
     - 支持列出和查看 Issue

     ### 已知限制
     - 仅支持公开仓库
     - Issue 评论功能待后续版本添加
     ```

3. **发布版本**
   - 点击"发布"按钮
   - 确认发布信息
   - 等待发布完成

#### 7.3 通知和文档

发布后，建议：

1. **更新插件文档**
   - 编写详细的使用文档
   - 提供示例对话
   - 说明认证配置步骤

2. **通知用户**
   - 如果有邮件列表，发送更新通知
   - 在社区论坛发布公告
   - 更新官网插件页面

3. **收集反馈**
   - 设置反馈渠道
   - 监控错误日志
   - 跟踪使用数据

### 步骤 8：维护和迭代

#### 8.1 监控插件运行

**关键指标**：

1. **调用量统计**
   - 每日调用次数
   - 每个工具的使用频率
   - 高峰时段分布

2. **成功率监控**
   - 成功请求占比
   - 失败原因分类
   - 错误码分布

3. **性能指标**
   - 平均响应时间
   - P95/P99 响应时间
   - 超时请求占比

4. **用户反馈**
   - 错误报告数量
   - 功能请求数量
   - 满意度评分

#### 8.2 版本迭代

**发布新版本流程**：

1. **创建新的草稿**
   - 基于当前在线版本创建草稿
   - 或创建全新的草稿

2. **添加新功能**
   - 在 OpenAPI 文档中添加新的 API 路径
   - 或修改现有 API 的参数/响应

3. **测试新功能**
   - 使用调试工具测试新 API
   - 在测试智能体中验证

4. **更新版本号**
   - **Major 版本**（v2.0.0）：不兼容的 API 变更
   - **Minor 版本**（v1.1.0）：向后兼容的功能添加
   - **Patch 版本**（v1.0.1）：向后兼容的问题修复

5. **发布新版本**
   - 填写详细的 Changelog
   - 发布版本
   - 通知用户

**版本更新示例**：

```markdown
## v1.1.0 (2025-10-27)

### 新功能
- 添加 `listPullRequests` 工具：列出仓库的 Pull Request
- 添加 `createPullRequest` 工具：创建新的 Pull Request

### 改进
- 优化 `listUserRepos` 的响应速度（从 2s 降至 0.5s）
- 增加 `getRepo` 的响应字段：`stargazers_count`、`watchers_count`

### 修复
- 修复 `createIssue` 在标签为空时的错误
- 修复 OAuth Token 刷新失败的问题

### 破坏性变更
- 无

### 已知问题
- 大型仓库的 `listIssues` 可能响应较慢（正在优化中）
```

#### 8.3 处理问题和反馈

**常见问题分类**：

1. **认证问题**
   - Token 过期
   - OAuth 授权失败
   - 权限不足

   **解决方案**：
   - 提供清晰的认证错误提示
   - 引导用户重新授权
   - 文档中说明所需权限

2. **参数错误**
   - 必填参数缺失
   - 参数类型错误
   - 参数格式不正确

   **解决方案**：
   - 完善参数验证
   - 提供清晰的错误信息
   - 在文档中提供示例

3. **API 限流**
   - 达到 API 调用限制
   - 请求频率过高

   **解决方案**：
   - 实现智能重试机制
   - 显示限流提示
   - 建议用户升级 API 配额

4. **响应超时**
   - API 响应缓慢
   - 网络问题

   **解决方案**：
   - 调整超时配置
   - 实现超时重试
   - 优化 API 调用

## 高级主题

### 1. 文件上传处理

某些 API 需要上传文件，可以通过以下方式处理：

**OpenAPI 定义**：

```yaml
paths:
  /upload:
    post:
      operationId: uploadFile
      summary: 上传文件
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                  x-assist-type: file
                description:
                  type: string
      responses:
        "200":
          description: 上传成功
```

**前端处理**：
- 用户选择文件
- 文件自动上传到 OSS
- 将 OSS URL 作为参数传递给插件

### 2. 流式响应处理

对于支持 Server-Sent Events (SSE) 的 API：

**OpenAPI 定义**：

```yaml
paths:
  /stream:
    post:
      operationId: streamResponse
      summary: 流式响应
      x-response-streaming: true  # 标记为流式响应
      requestBody:
        content:
          application/json:
            schema:
              type: object
      responses:
        "200":
          description: 流式响应
          content:
            text/event-stream:
              schema:
                type: string
```

**执行时处理**：
- 插件会逐块接收响应
- 实时返回给用户

### 3. 批量操作优化

对于需要多次调用的场景，考虑：

1. **提供批量 API**：
   ```yaml
   paths:
     /batch/repos:
       post:
         operationId: batchGetRepos
         summary: 批量获取仓库信息
         requestBody:
           content:
             application/json:
               schema:
                 type: object
                 properties:
                   repos:
                     type: array
                     items:
                       type: string
                     example: ["octocat/Hello-World", "octocat/Spoon-Knife"]
   ```

2. **客户端聚合**：
   - 在智能体提示词中引导批量操作
   - 减少 API 调用次数

### 4. Webhook 集成

对于支持 Webhook 的服务，可以实现主动通知：

**配置 Webhook**：

```json
{
  "webhook_url": "https://your-coze-plus.com/api/webhook/callback",
  "events": ["push", "pull_request", "issues"],
  "secret": "your_webhook_secret"
}
```

**处理 Webhook 事件**：
- Coze Plus 接收 Webhook 回调
- 验证签名
- 触发相应的智能体任务

### 5. 缓存策略

对于查询类 API，合理使用缓存可以提升性能：

**配置缓存**（OpenAPI 扩展）：

```yaml
paths:
  /users/{username}:
    get:
      operationId: getUser
      summary: 获取用户信息
      x-cache-ttl: 3600  # 缓存 1 小时
```

**缓存场景**：
- 用户信息（变化不频繁）
- 仓库元数据
- 配置信息

**不适合缓存的场景**：
- 实时数据（如股票价格）
- 用户个人数据
- 频繁变化的数据

## 最佳实践总结

### DO（推荐做法）

✅ **详细的文档**
- 为每个工具提供清晰的描述
- 包含丰富的示例
- 说明所有参数的含义和格式

✅ **合理的错误处理**
- 返回明确的错误信息
- 使用标准的 HTTP 状态码
- 提供错误恢复建议

✅ **版本管理**
- 使用语义化版本号
- 保持向后兼容性
- 详细的 Changelog

✅ **性能优化**
- 合理使用缓存
- 提供批量接口
- 设置合理的超时时间

✅ **安全性**
- 加密存储敏感信息
- 最小权限原则
- 定期轮换密钥

### DON'T（避免做法）

❌ **过度复杂的参数**
- 避免嵌套层级过深的对象
- 不要使用过于复杂的类型

❌ **不一致的命名**
- 不要混用不同的命名风格
- 避免使用缩写和专业术语

❌ **缺少文档**
- 不要省略参数描述
- 不要假设用户了解 API 细节

❌ **硬编码配置**
- 不要在 OpenAPI 文档中硬编码 Token
- 不要在代码中写死 URL

❌ **忽略错误处理**
- 不要直接返回原始错误信息
- 不要忽略边界情况

## 常见问题 (FAQ)

### Q1: 如何处理 API 返回的非 JSON 格式响应？

**A**: Coze Plus 目前主要支持 JSON 格式的响应。对于 XML、HTML 等格式：

1. **服务端转换**：在 API 服务端将响应转换为 JSON
2. **中间服务**：创建一个中间服务进行格式转换
3. **自定义节点**：在工作流中使用自定义代码节点处理

### Q2: 插件可以调用多个不同的域名吗？

**A**: 一个插件的 `server_url` 只能指向一个域名。如果需要调用多个服务：

1. **创建多个插件**：为每个服务创建独立的插件
2. **API 网关**：使用 API 网关统一入口
3. **子路径区分**：如果是同一组织的服务，可以通过子路径区分

### Q3: 如何处理分页数据？

**A**: 在 OpenAPI 定义中包含分页参数：

```yaml
parameters:
  - name: page
    in: query
    schema:
      type: integer
      default: 1
  - name: per_page
    in: query
    schema:
      type: integer
      default: 30
      maximum: 100
```

智能体会根据需要多次调用 API 获取所有数据。

### Q4: 插件可以访问 Coze Plus 内部数据吗？

**A**: 不可以。插件只能调用外部 API。如需访问 Coze Plus 内部数据：

1. **使用内置节点**：工作流中使用数据库节点、知识库节点等
2. **通过 API 暴露**：将内部数据通过 API 暴露给插件

### Q5: 如何调试生产环境的插件问题？

**A**: 推荐使用以下方法：

1. **查看执行日志**：在智能体对话记录中查看工具调用详情
2. **启用详细日志**：在插件设置中启用详细日志模式
3. **使用测试环境**：在测试环境复现问题
4. **本地调试**：使用 Postman 等工具模拟请求

### Q6: 插件发布后可以修改吗？

**A**: 已发布的版本不能修改，只能发布新版本。建议：

1. **草稿充分测试**：发布前在草稿阶段充分测试
2. **发布新版本**：发现问题后发布新版本修复
3. **版本回滚**：严重问题可以回滚到之前的版本

### Q7: 如何保护 API Token 不泄露？

**A**: Coze Plus 自动加密存储 API Token：

1. **Manifest 中的 Token**：自动使用 AES 加密
2. **数据库存储**：加密后存储在数据库
3. **日志脱敏**：日志中自动脱敏敏感信息

建议：
- 不要在 OpenAPI 文档中包含 Token
- 使用环境变量管理敏感信息
- 定期轮换 Token

## 示例项目

### 完整的 GitHub 插件

完整的 GitHub 插件代码示例已上传到 GitHub：

**仓库地址**：https://github.com/coze-plus-dev/plugin-examples

**包含内容**：
- 完整的 OpenAPI 文档
- Plugin Manifest 配置
- 测试用例
- 使用文档

**其他示例插件**：
- 高德地图插件
- 天气 API 插件
- 翻译 API 插件
- Lark（飞书）插件

## 参考资源

### 官方文档

- [OpenAPI 3.0 规范](https://swagger.io/specification/)
- [OAuth 2.0 协议](https://oauth.net/2/)
- [Coze Plus 插件 API 参考](../api/)

### 工具推荐

- **OpenAPI 编辑器**：[Swagger Editor](https://editor.swagger.io/)
- **API 测试**：[Postman](https://www.postman.com/)
- **JSON Schema 验证**：[JSON Schema Validator](https://www.jsonschemavalidator.net/)
- **YAML 验证**：[YAML Lint](http://www.yamllint.com/)

### 社区资源

- [Coze Plus GitHub](https://github.com/coze-plus-dev/coze-plus)
- [Coze Plus 交流群](../guide/overview.md#社区与支持)
- [插件市场](https://marketplace.coze-plus.cn)

## 文件索引

相关代码文件位置：

- `backend/domain/plugin/service/plugin_draft.go` - 草稿插件管理
- `backend/domain/plugin/service/exec_tool.go` - 工具执行
- `backend/domain/plugin/service/plugin_release.go` - 插件发布
- `backend/conf/plugin/pluginproduct/` - 产品插件配置目录

---

**最后更新时间**：2025-10-27

**文档版本**：v1.0.0

如有任何疑问或需要帮助，请联系：
- 📧 邮箱：support@coze-plus.cn
- 💬 交流群：参见[项目概述](./overview.md)
