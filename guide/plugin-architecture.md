# 插件技术架构

本文档详细介绍 Coze Plus 插件系统的技术架构、核心概念和实现原理。

## 概述

Coze Plus 插件系统是一个基于 **OpenAPI 3.0 规范**的可扩展工具调用框架，允许开发者通过声明式配置快速集成第三方 API 服务。插件系统支持多种认证方式、动态参数处理和智能响应解析，是实现智能体能力扩展的核心机制。

### 核心特性

- 🚀 **基于 OpenAPI 标准**：遵循 OpenAPI 3.0 规范，自动解析 API 定义
- 🔐 **多种认证方式**：支持 None、API Token、OAuth 2.0 等认证方式
- 🎯 **动态参数处理**：根据 Schema 自动验证和转换参数
- 🔄 **版本管理**：支持草稿和发布版本，实现灰度发布
- 🛠️ **可视化调试**：内置 API 调试工具，支持在线测试
- 📦 **插件市场**：预置多个官方插件，支持一键导入

## 核心概念

### Plugin（插件）

**插件**是一组相关 API 工具的集合，代表一个完整的第三方服务集成。每个插件包含：

- **Plugin Manifest**：插件元数据定义
- **OpenAPI Document**：API 接口规范文档
- **Authentication Config**：认证配置信息
- **Multiple Tools**：多个工具（API 接口）

**插件的核心数据结构**（`backend/crossdomain/plugin/model/plugin.go:38-60`）：

```go
type PluginInfo struct {
    ID           int64              // 插件 ID
    PluginType   api.PluginType     // 插件类型
    SpaceID      int64              // 空间 ID
    DeveloperID  int64              // 开发者 ID
    APPID        *int64             // 关联的应用 ID
    RefProductID *int64             // 产品插件引用 ID
    IconURI      *string            // 图标 URI
    IconURL      *string            // 图标 URL
    ServerURL    *string            // 服务器 URL
    Version      *string            // 版本号
    VersionDesc  *string            // 版本描述

    CreatedAt int64
    UpdatedAt int64

    Source          *bot_common.PluginFrom     // 插件来源
    SaasPluginExtra *SaasPluginExtraInfo       // SaaS 插件额外信息
    Extra           map[string]any             // 扩展字段

    Manifest   *PluginManifest  // 插件清单
    OpenapiDoc *Openapi3T       // OpenAPI 文档
}
```

### Tool（工具）

**工具**是插件中的单个 API 接口，对应 OpenAPI 文档中的一个 `operation`。每个工具定义了：

- **HTTP Method**：GET、POST、PUT、DELETE 等
- **Sub URL**：相对路径
- **Parameters**：请求参数（Path、Query、Header、Body）
- **Request Body**：请求体 Schema
- **Responses**：响应 Schema
- **Operation Metadata**：operationId、summary、description 等

**工具的核心数据结构**（`backend/crossdomain/plugin/model/toolinfo.go:37-55`）：

```go
type ToolInfo struct {
    ID        int64
    PluginID  int64
    CreatedAt int64
    UpdatedAt int64
    Version   *string

    ActivatedStatus *consts.ActivatedStatus    // 激活状态
    DebugStatus     *common.APIDebugStatus     // 调试状态

    Source *bot_common.PluginFrom
    Extra  map[string]any

    Method    *string                 // HTTP 方法
    SubURL    *string                 // 子路径
    Operation *Openapi3Operation      // OpenAPI Operation 定义

    AgentID *int64                    // 关联的智能体 ID（用于默认参数）
}
```

### Plugin Manifest

**插件清单**定义了插件的基本信息、认证配置和公共参数。遵循特定的 JSON Schema 格式。

**Manifest 数据结构**（`backend/crossdomain/plugin/model/plugin_manifest.go:34-44`）：

```go
type PluginManifest struct {
    SchemaVersion       string                      `json:"schema_version"`        // 固定为 "v1"
    NameForModel        string                      `json:"name_for_model"`        // 给模型看的名称
    NameForHuman        string                      `json:"name_for_human"`        // 给用户看的名称
    DescriptionForModel string                      `json:"description_for_model"` // 给模型看的描述
    DescriptionForHuman string                      `json:"description_for_human"` // 给用户看的描述
    Auth                *AuthV2                     `json:"auth"`                  // 认证配置
    LogoURL             string                      `json:"logo_url"`              // Logo URL
    API                 APIDesc                     `json:"api"`                   // API 描述
    CommonParams        map[HTTPParamLocation][]*CommonParamSchema  // 公共参数
}
```

**Manifest 示例**：

```json
{
  "schema_version": "v1",
  "name_for_model": "gaode_map",
  "name_for_human": "高德地图",
  "description_for_model": "高德地图 API 插件，提供地理编码、逆地理编码、路径规划等功能",
  "description_for_human": "使用高德地图 API 查询地理位置信息",
  "auth": {
    "type": "service",
    "sub_type": "api_token",
    "payload": "{\"location\":\"header\",\"key\":\"X-API-Key\",\"service_token\":\"your_api_key\"}"
  },
  "logo_url": "https://example.com/logo.png",
  "api": {
    "type": "cloud"
  },
  "common_params": {}
}
```

### OpenAPI Document

**OpenAPI 文档**定义了插件的所有 API 接口。Coze Plus 使用 **OpenAPI 3.0.1** 标准，支持完整的 Schema 定义。

**关键扩展字段**：

Coze Plus 在标准 OpenAPI 规范基础上增加了一些扩展字段（使用 `x-` 前缀）：

```yaml
paths:
  /v3/geocode/geo:
    get:
      operationId: geocodeGeo  # 工具唯一标识符
      summary: 地理编码        # 工具简短描述
      x-auth-mode: required    # 认证模式：required | optional | disabled
      parameters:
        - name: address
          in: query
          required: true
          schema:
            type: string
            x-assist-type: address        # 辅助类型：用于 UI 提示
            x-global-disable: false       # 是否全局禁用
            x-local-disable: false        # 是否局部禁用
            x-variable-ref: "{{address}}" # 变量引用
      responses:
        "200":
          description: 成功返回
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  geocodes:
                    type: array
                    items:
                      type: object
```

## 插件类型

### 1. 自定义插件（Custom Plugin）

用户自己创建的插件，完全自定义配置。

**特点**：
- 开发者自主创建和维护
- 可以绑定到特定应用（App）或空间（Space）
- 支持版本管理和发布流程
- 数据完全独立，支持导出和迁移

**创建方式**：
- UI 创建：通过前端可视化界面创建
- 代码创建：通过 API 上传 OpenAPI 文档创建

### 2. 产品插件（Product Plugin）

预配置的官方插件，由平台提供。

**特点**：
- 官方维护和更新
- 配置文件存储在 `backend/conf/plugin/pluginproduct/` 目录
- 启动时自动加载到数据库
- 用户只能使用，不能修改

**配置示例**（`gaode_map.yaml`）：

```yaml
info:
  title: 高德地图
  description: 高德地图相关工具，可以帮助用户规划路线、搜索附近相关地点
  version: v1
openapi: 3.0.1
paths:
  /v3/geocode/geo:
    get:
      operationId: geocodeGeo
      summary: 地理编码：将详细的结构化地址转换为高德经纬度坐标
      parameters: [...]
      responses: [...]
```

### 3. SaaS 插件（SaaS Plugin）

来自 SaaS 平台（如 Coze 官方市场）的插件。

**特点**：
- 从远程 SaaS 平台同步
- 支持一键导入到本地空间
- 可能包含官方标识和跳转链接
- 与本地插件隔离管理

## 认证方式

### 1. None 认证

无需认证，直接调用 API。

**配置示例**：

```json
{
  "auth": {
    "type": "none",
    "sub_type": "",
    "payload": ""
  }
}
```

### 2. Service 认证 - API Token

通过固定的 API Token 进行认证。

**配置结构**（`backend/crossdomain/plugin/model/plugin_manifest.go:493-501`）：

```go
type AuthOfAPIToken struct {
    Location     HTTPParamLocation `json:"location"`      // header | query
    Key          string            `json:"key"`           // 参数名称
    ServiceToken string            `json:"service_token"` // Token 值
}
```

**配置示例**：

```json
{
  "auth": {
    "type": "service",
    "sub_type": "api_token",
    "payload": "{\"location\":\"header\",\"key\":\"Authorization\",\"service_token\":\"Bearer your_token\"}"
  }
}
```

**执行时处理**：
- `location="header"`：将 Token 添加到 HTTP Header
- `location="query"`：将 Token 添加到 URL Query 参数

### 3. OAuth 认证 - Authorization Code

OAuth 2.0 授权码模式，适用于需要用户授权的场景。

**配置结构**（`backend/crossdomain/plugin/model/plugin_manifest.go:503-515`）：

```go
type OAuthAuthorizationCodeConfig struct {
    ClientID                 string `json:"client_id"`
    ClientSecret             string `json:"client_secret"`
    ClientURL                string `json:"client_url"`                // 授权页面 URL
    Scope                    string `json:"scope,omitempty"`
    AuthorizationURL         string `json:"authorization_url"`         // Token 交换 URL
    AuthorizationContentType string `json:"authorization_content_type"`// 固定为 application/json
}
```

**配置示例**：

```json
{
  "auth": {
    "type": "oauth",
    "sub_type": "authorization_code",
    "payload": "{\"client_id\":\"your_client_id\",\"client_secret\":\"your_secret\",\"client_url\":\"https://provider.com/oauth/authorize\",\"authorization_url\":\"https://provider.com/oauth/token\",\"authorization_content_type\":\"application/json\",\"scope\":\"read write\"}"
  }
}
```

**OAuth 流程**：

1. **用户授权**：
   - 用户点击授权按钮
   - 跳转到第三方授权页面（`client_url`）
   - 用户同意授权，返回 `code`

2. **交换 Access Token**：
   - 使用 `code` 调用 `authorization_url`
   - 请求 Body：
     ```json
     {
       "grant_type": "authorization_code",
       "code": "returned_code",
       "client_id": "your_client_id",
       "client_secret": "your_secret",
       "redirect_uri": "callback_url"
     }
     ```
   - 获得 `access_token` 和 `refresh_token`

3. **存储和使用**：
   - Access Token 存储在 `oauth_token` 表
   - 每次调用 API 时自动添加到 Header：`Authorization: Bearer {access_token}`

4. **Token 刷新**：
   - Access Token 过期时自动使用 Refresh Token 刷新

### 4. OAuth 认证 - Client Credentials

OAuth 2.0 客户端凭证模式，适用于服务端到服务端的调用。

**配置结构**（`backend/crossdomain/plugin/model/plugin_manifest.go:517-521`）：

```go
type OAuthClientCredentialsConfig struct {
    ClientID     string `json:"client_id"`
    ClientSecret string `json:"client_secret"`
    TokenURL     string `json:"token_url"`
}
```

**配置示例**：

```json
{
  "auth": {
    "type": "oauth",
    "sub_type": "client_credentials",
    "payload": "{\"client_id\":\"your_client_id\",\"client_secret\":\"your_secret\",\"token_url\":\"https://provider.com/oauth/token\"}"
  }
}
```

## 插件生命周期

### 草稿阶段（Draft）

**特点**：
- 可以随时编辑和修改
- 支持在线调试工具
- 不影响已发布的版本
- 可以与特定应用绑定

**数据库表**：
- `plugin_draft`：草稿插件信息
- `tool_draft`：草稿工具信息

**核心操作**：
- 创建插件：`CreateDraftPlugin`
- 编辑插件：`UpdateDraftPlugin`
- 调试工具：`ExecuteTool` (scene=tool_debug)
- 删除插件：`DeleteDraftPlugin`

### 发布阶段（Online）

**特点**：
- 不可修改，只读
- 具有唯一版本号（语义化版本）
- 可以被智能体正式引用
- 支持版本回滚

**数据库表**：
- `plugin_version`：已发布插件版本
- `tool_version`：已发布工具版本

**版本管理**：

版本号格式：`v{major}.{minor}.{patch}`，例如 `v1.0.0`

```go
// 获取下一个版本号
func GetPluginNextVersion(ctx context.Context, pluginID int64) (version string, err error)
```

**发布流程**（`backend/domain/plugin/service/plugin_release.go`）：

1. **验证草稿插件**：
   - 检查 Manifest 完整性
   - 验证 OpenAPI 文档格式
   - 确保所有工具调试通过

2. **生成版本号**：
   - 自动递增版本号
   - 或使用指定版本号

3. **复制到版本表**：
   - 将草稿插件复制到 `plugin_version`
   - 将所有工具复制到 `tool_version`

4. **触发事件**：
   - 发送插件发布事件
   - 更新搜索索引

**发布 API**（`backend/domain/plugin/service/service.go:42-43`）：

```go
PublishPlugin(ctx context.Context, req *model.PublishPluginRequest) error
PublishAPPPlugins(ctx context.Context, req *model.PublishAPPPluginsRequest) (*model.PublishAPPPluginsResponse, error)
```

### 绑定到智能体（Agent Binding）

**草稿智能体**：
- 使用草稿版本插件进行开发和测试
- 支持实时修改插件配置

**在线智能体**：
- 只能使用已发布的插件版本
- 锁定特定版本号，保证稳定性

**智能体工具绑定**（`backend/domain/plugin/service/agent_tool.go`）：

```go
// 绑定工具到智能体
BindAgentTools(ctx context.Context, agentID int64, bindTools []*model.BindToolInfo) error

// 发布智能体时冻结插件版本
PublishAgentTools(ctx context.Context, agentID int64, agentVersion string) error
```

## 工具执行引擎

### 执行场景（Execute Scene）

插件工具可以在不同场景下执行，每个场景有不同的行为：

**场景类型**（`backend/crossdomain/plugin/consts/consts.go`）：

```go
type ExecuteScene string

const (
    ExecSceneOfToolDebug    ExecuteScene = "tool_debug"     // 工具调试
    ExecSceneOfDraftAgent   ExecuteScene = "draft_agent"    // 草稿智能体
    ExecSceneOfOnlineAgent  ExecuteScene = "online_agent"   // 在线智能体
    ExecSceneOfWorkflow     ExecuteScene = "workflow"       // 工作流
)
```

**不同场景的差异**：

| 场景 | 插件版本 | 工具版本 | 认证 | 调试日志 |
|------|---------|---------|------|---------|
| `tool_debug` | Draft | Draft | 支持临时 Token | 完整记录 |
| `draft_agent` | Draft | Draft | 用户授权 | 完整记录 |
| `online_agent` | Online | 指定版本 | 用户授权 | 基本记录 |
| `workflow` | Draft/Online | 对应版本 | 用户授权 | 基本记录 |

### 执行流程

**核心执行方法**（`backend/domain/plugin/service/exec_tool.go:45-94`）：

```go
func (p *pluginServiceImpl) ExecuteTool(
    ctx context.Context,
    req *model.ExecuteToolRequest,
    opts ...model.ExecuteToolOpt
) (resp *model.ExecuteToolResponse, err error) {
    // 1. 构建执行器
    executor, err := p.buildToolExecutor(ctx, req, opt)

    // 2. 获取 Access Token（如需要）
    authInfo := executor.plugin.GetAuthInfo()
    accessToken, authURL, err := p.acquireAccessTokenIfNeed(ctx, req, authInfo, executor.tool.Operation)

    // 3. 执行工具
    result, err := executor.execute(ctx, req.ArgumentsInJson, accessToken, authURL)

    // 4. 更新调试状态（调试场景）
    if req.ExecScene == consts.ExecSceneOfToolDebug {
        p.toolRepo.UpdateDraftTool(ctx, &entity.ToolInfo{
            ID: req.ToolID,
            DebugStatus: ptr.Of(common.APIDebugStatus_DebugPassed),
        })
    }

    // 5. 自动生成响应 Schema（可选）
    if opt.AutoGenRespSchema {
        respSchema, err = p.genToolResponseSchema(ctx, result.RawResp)
    }

    return resp, nil
}
```

**详细执行步骤**：

#### 1. 参数处理

根据 OpenAPI Schema 验证和转换参数：

- **Path Parameters**：替换 URL 路径中的占位符
- **Query Parameters**：构建 Query String
- **Header Parameters**：添加到 HTTP Header
- **Body Parameters**：序列化为 JSON

**参数验证**（`backend/domain/plugin/service/tool/invocation_args.go`）：

```go
// 解析参数
func (inv *invocation) parseArguments(argumentsInJson string) (args *toolArgs, err error) {
    // 1. 解析 JSON 参数
    // 2. 验证必填参数
    // 3. 类型转换
    // 4. 应用默认值
}
```

#### 2. 认证处理

根据插件认证配置添加认证信息：

**API Token 认证**：

```go
if auth.SubType == consts.AuthzSubTypeOfServiceAPIToken {
    token := auth.AuthOfAPIToken
    if token.Location == consts.ParamInHeader {
        req.Header.Set(token.Key, token.ServiceToken)
    } else if token.Location == consts.ParamInQuery {
        query.Set(token.Key, token.ServiceToken)
    }
}
```

**OAuth 认证**：

```go
if auth.SubType == consts.AuthzSubTypeOfOAuthAuthorizationCode {
    accessToken, err := p.GetAccessToken(ctx, &dto.OAuthInfo{...})
    req.Header.Set("Authorization", "Bearer " + accessToken)
}
```

#### 3. HTTP 请求构建

**请求构建**（`backend/domain/plugin/service/tool/invocation_http.go`）：

```go
func (inv *invocation) buildHTTPRequest(
    ctx context.Context,
    args *toolArgs,
    accessToken string,
) (*http.Request, error) {
    // 1. 构建完整 URL
    fullURL := inv.plugin.ServerURL + inv.tool.SubURL

    // 2. 替换 Path 参数
    for name, value := range args.pathParams {
        fullURL = strings.Replace(fullURL, "{"+name+"}", value, 1)
    }

    // 3. 添加 Query 参数
    if len(args.queryParams) > 0 {
        fullURL += "?" + encodeQueryParams(args.queryParams)
    }

    // 4. 构建请求
    method := inv.tool.GetMethod()
    var body io.Reader
    if len(args.bodyParams) > 0 {
        bodyBytes, _ := json.Marshal(args.bodyParams)
        body = bytes.NewReader(bodyBytes)
    }

    req, err := http.NewRequestWithContext(ctx, method, fullURL, body)

    // 5. 添加 Header 参数
    for name, value := range args.headerParams {
        req.Header.Set(name, value)
    }

    // 6. 添加认证 Header
    if accessToken != "" {
        req.Header.Set("Authorization", "Bearer " + accessToken)
    }

    return req, nil
}
```

#### 4. 响应处理

**响应解析和验证**：

```go
func (inv *invocation) processResponse(resp *http.Response) (result *executeResult, err error) {
    // 1. 读取响应 Body
    bodyBytes, err := io.ReadAll(resp.Body)

    // 2. 验证 Content-Type
    contentType := resp.Header.Get("Content-Type")
    if !strings.Contains(contentType, "application/json") {
        return nil, fmt.Errorf("unsupported content type: %s", contentType)
    }

    // 3. 解析 JSON
    var respData map[string]any
    err = json.Unmarshal(bodyBytes, &respData)

    // 4. 根据 Response Schema 裁剪数据
    trimmedResp := trimResponseBySchema(respData, inv.tool.Operation.Responses)

    // 5. 返回结果
    return &executeResult{
        RawResp:     string(bodyBytes),
        TrimmedResp: trimmedResp,
        Request:     formatRequest(req),
    }, nil
}
```

#### 5. 错误处理

**常见错误类型**：

- `ErrPluginRecordNotFound`：插件或工具不存在
- `ErrPluginInvalidManifest`：Manifest 格式错误
- `ErrPluginExecuteToolFailed`：工具执行失败
- `ErrPluginOAuthFailed`：OAuth 认证失败

**OAuth 中断处理**：

当 OAuth Token 不存在或已过期时，返回中断事件：

```go
type ToolInterruptEvent struct {
    Event         consts.InterruptEventType
    ToolNeedOAuth *ToolNeedOAuthInterruptEvent
}

type ToolNeedOAuthInterruptEvent struct {
    Message string  // "请先完成 OAuth 授权"
}
```

## 架构分层

Coze Plus 插件系统遵循 DDD（领域驱动设计）架构，分为以下层次：

### 1. API 层（`backend/api/handler/coze/plugin_*.go`）

**职责**：
- 处理 HTTP 请求
- 参数验证和序列化
- 调用 Application 层服务
- 返回响应

**主要 Handler**：
- `plugin_develop_service.go`：插件开发相关接口
- `plugin_product_service.go`：产品插件相关接口

### 2. Application 层（`backend/application/plugin/`）

**职责**：
- 编排多个 Domain 服务
- 处理跨域逻辑
- 事件发布
- 权限检查

**主要服务**：
- `plugin.go`：插件管理
- `registration.go`：插件注册
- `lifecycle.go`：生命周期管理
- `auth.go`：认证管理

### 3. Domain 层（`backend/domain/plugin/`）

**职责**：
- 核心业务逻辑
- 领域模型定义
- 数据持久化接口

**目录结构**：

```
domain/plugin/
├── entity/          # 实体定义
│   ├── plugin.go
│   └── tool.go
├── dto/             # 数据传输对象
│   ├── auth.go
│   └── plugin.go
├── service/         # 领域服务
│   ├── service.go           # 服务接口
│   ├── plugin_draft.go      # 草稿插件
│   ├── plugin_online.go     # 在线插件
│   ├── plugin_release.go    # 插件发布
│   ├── agent_tool.go        # 智能体工具
│   ├── exec_tool.go         # 工具执行
│   └── tool/                # 工具执行器
│       ├── invocation_args.go    # 参数处理
│       └── invocation_http.go    # HTTP 调用
├── repository/      # 数据访问接口
│   ├── plugin_repository.go
│   └── tool_repository.go
└── internal/        # 内部实现
    ├── dal/         # 数据访问层
    └── openapi/     # OpenAPI 解析
```

### 4. Infrastructure 层（`backend/infra/`）

**职责**：
- 数据库访问实现
- 第三方服务集成
- 工具类和辅助函数

### 5. Crossdomain 层（`backend/crossdomain/plugin/`）

**职责**：
- 跨域数据模型
- 通用工具函数
- 类型转换

**目录结构**：

```
crossdomain/plugin/
├── model/           # 跨域数据模型
│   ├── plugin.go
│   ├── plugin_manifest.go
│   ├── toolinfo.go
│   └── openapi.go
├── convert/         # 类型转换
│   ├── plugin.go
│   ├── param.go
│   └── http.go
├── consts/          # 常量定义
│   └── consts.go
└── contract.go      # 跨域接口契约
```

## 数据库设计

### 核心表结构

#### 1. `plugin_draft` - 草稿插件表

```sql
CREATE TABLE `plugin_draft` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `plugin_type` int NOT NULL COMMENT '插件类型：1-自定义',
  `space_id` bigint NOT NULL COMMENT '空间ID',
  `developer_id` bigint NOT NULL COMMENT '开发者ID',
  `app_id` bigint DEFAULT NULL COMMENT '关联应用ID',
  `ref_product_id` bigint DEFAULT NULL COMMENT '产品插件引用ID',
  `icon_uri` varchar(512) DEFAULT NULL COMMENT '图标URI',
  `server_url` varchar(512) DEFAULT NULL COMMENT '服务器URL',
  `manifest` json NOT NULL COMMENT 'Plugin Manifest JSON',
  `openapi_doc` json NOT NULL COMMENT 'OpenAPI 文档 JSON',
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_space_id` (`space_id`),
  KEY `idx_app_id` (`app_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 2. `plugin_version` - 已发布插件表

```sql
CREATE TABLE `plugin_version` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `plugin_id` bigint NOT NULL COMMENT '插件ID（对应draft表的ID）',
  `version` varchar(64) NOT NULL COMMENT '版本号',
  `version_desc` text COMMENT '版本描述',
  `plugin_type` int NOT NULL,
  `space_id` bigint NOT NULL,
  `developer_id` bigint NOT NULL,
  `app_id` bigint DEFAULT NULL,
  `ref_product_id` bigint DEFAULT NULL,
  `icon_uri` varchar(512) DEFAULT NULL,
  `server_url` varchar(512) DEFAULT NULL,
  `manifest` json NOT NULL,
  `openapi_doc` json NOT NULL,
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plugin_version` (`plugin_id`, `version`),
  KEY `idx_space_id` (`space_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 3. `tool_draft` - 草稿工具表

```sql
CREATE TABLE `tool_draft` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `plugin_id` bigint NOT NULL COMMENT '插件ID',
  `method` varchar(16) NOT NULL COMMENT 'HTTP方法',
  `sub_url` varchar(512) NOT NULL COMMENT '子路径',
  `operation` json NOT NULL COMMENT 'OpenAPI Operation JSON',
  `activated_status` int DEFAULT 1 COMMENT '激活状态：1-激活 2-禁用',
  `debug_status` int DEFAULT 0 COMMENT '调试状态：0-未调试 1-已通过',
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_plugin_id` (`plugin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 4. `tool_version` - 已发布工具表

```sql
CREATE TABLE `tool_version` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tool_id` bigint NOT NULL COMMENT '工具ID（对应draft表的ID）',
  `plugin_id` bigint NOT NULL COMMENT '插件ID',
  `version` varchar(64) NOT NULL COMMENT '版本号',
  `method` varchar(16) NOT NULL,
  `sub_url` varchar(512) NOT NULL,
  `operation` json NOT NULL,
  `activated_status` int DEFAULT 1,
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tool_version` (`tool_id`, `version`),
  KEY `idx_plugin_id` (`plugin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 5. `agent_tool_draft` - 智能体工具绑定表（草稿）

```sql
CREATE TABLE `agent_tool_draft` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `agent_id` bigint NOT NULL COMMENT '智能体ID',
  `plugin_id` bigint NOT NULL COMMENT '插件ID',
  `tool_id` bigint NOT NULL COMMENT '工具ID',
  `plugin_from` int NOT NULL COMMENT '插件来源：1-自定义 2-产品 3-SaaS',
  `operation` json DEFAULT NULL COMMENT '自定义 Operation（覆盖默认）',
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_agent_tool` (`agent_id`, `tool_id`),
  KEY `idx_plugin_id` (`plugin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 6. `agent_tool_version` - 智能体工具绑定表（已发布）

```sql
CREATE TABLE `agent_tool_version` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `agent_id` bigint NOT NULL,
  `agent_version` varchar(64) NOT NULL COMMENT '智能体版本号',
  `plugin_id` bigint NOT NULL,
  `plugin_version` varchar(64) NOT NULL COMMENT '插件版本号',
  `tool_id` bigint NOT NULL,
  `tool_version` varchar(64) NOT NULL COMMENT '工具版本号',
  `plugin_from` int NOT NULL,
  `operation` json DEFAULT NULL,
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_agent_version` (`agent_id`, `agent_version`),
  KEY `idx_plugin_version` (`plugin_id`, `plugin_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### 7. `oauth_token` - OAuth Token 存储表

```sql
CREATE TABLE `oauth_token` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` varchar(64) NOT NULL COMMENT '用户ID',
  `plugin_id` bigint NOT NULL COMMENT '插件ID',
  `is_draft` tinyint(1) NOT NULL COMMENT '是否草稿插件',
  `access_token` varchar(1024) NOT NULL COMMENT 'Access Token',
  `refresh_token` varchar(1024) DEFAULT NULL COMMENT 'Refresh Token',
  `expires_at` bigint NOT NULL COMMENT '过期时间戳',
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_plugin` (`user_id`, `plugin_id`, `is_draft`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 配置加载

### 产品插件加载流程

**启动时自动加载**（`backend/domain/plugin/conf/load_plugin.go`）：

```go
func LoadPluginProducts() {
    // 1. 扫描配置目录
    files := scanPluginConfigDir("backend/conf/plugin/pluginproduct")

    // 2. 解析 YAML/JSON 文件
    for _, file := range files {
        openapiDoc := parseOpenapiDoc(file)

        // 3. 生成 Plugin Manifest
        manifest := generateManifest(openapiDoc)

        // 4. 保存到数据库
        savePluginProduct(manifest, openapiDoc)
    }
}
```

**配置文件格式**：

支持标准的 OpenAPI 3.0 YAML 或 JSON 格式，文件命名规范：`{plugin_name}.yaml`

## 与智能体集成

### 工具调用流程

当智能体需要调用插件工具时：

1. **LLM 生成工具调用**：
   ```json
   {
     "tool_calls": [
       {
         "id": "call_123",
         "type": "function",
         "function": {
           "name": "geocodeGeo",
           "arguments": "{\"address\":\"北京市朝阳区\"}"
         }
       }
     ]
   }
   ```

2. **解析工具名称和参数**：
   - 从 `function.name` 获取 `operationId`
   - 从 `function.arguments` 获取 JSON 参数

3. **查找工具定义**：
   - 根据 `operationId` 查找对应的 Tool
   - 获取关联的 Plugin 信息

4. **执行工具**：
   ```go
   resp, err := pluginService.ExecuteTool(ctx, &model.ExecuteToolRequest{
       UserID:     "user_123",
       PluginID:   plugin.ID,
       ToolID:     tool.ID,
       ExecScene:  consts.ExecSceneOfOnlineAgent,
       ArgumentsInJson: arguments,
   })
   ```

5. **返回结果给 LLM**：
   ```json
   {
     "tool_call_id": "call_123",
     "role": "tool",
     "content": "{\"status\":\"1\",\"geocodes\":[...]}"
   }
   ```

### 工作流集成

在工作流节点中调用插件工具：

**工作流节点配置**（`backend/domain/workflow/internal/nodes/plugin/plugin.go`）：

```go
type PluginNode struct {
    PluginID   int64
    ToolName   string
    Parameters map[string]any
}

func (n *PluginNode) Execute(ctx *workflow.Context) (*workflow.Result, error) {
    // 执行插件工具
    resp, err := pluginService.ExecuteTool(ctx, &model.ExecuteToolRequest{
        PluginID:        n.PluginID,
        ToolID:          n.ToolID,
        ExecScene:       consts.ExecSceneOfWorkflow,
        ArgumentsInJson: jsonEncode(n.Parameters),
    })

    return &workflow.Result{
        Output: resp.TrimmedResp,
    }, nil
}
```

## 扩展和自定义

### 自定义参数处理

通过 OpenAPI Schema Extensions 实现自定义参数处理：

```yaml
parameters:
  - name: file
    in: query
    schema:
      type: string
      format: binary
      x-assist-type: file        # 文件类型
      x-upload-to-oss: true      # 自动上传到 OSS
```

**自定义处理器**（`backend/domain/plugin/service/tool/invocation_args.go`）：

```go
func (inv *invocation) processFileParameter(param *openapi3.Parameter, value any) (string, error) {
    // 1. 检查 x-assist-type
    if assistType, ok := param.Schema.Value.Extensions["x-assist-type"]; ok {
        if assistType == "file" {
            // 2. 上传文件到 OSS
            fileURL, err := inv.oss.Upload(ctx, value.([]byte))

            // 3. 返回文件 URL
            return fileURL, nil
        }
    }

    return value.(string), nil
}
```

### 自定义响应处理

根据 Response Schema 裁剪响应数据：

```go
func trimResponseBySchema(respData map[string]any, schema *openapi3.Responses) string {
    // 1. 获取 200 响应的 Schema
    resp200 := schema["200"]
    jsonSchema := resp200.Value.Content["application/json"].Schema.Value

    // 2. 根据 Schema 提取字段
    trimmed := make(map[string]any)
    for propName := range jsonSchema.Properties {
        if value, ok := respData[propName]; ok {
            trimmed[propName] = value
        }
    }

    // 3. 序列化为 JSON
    return jsonEncode(trimmed)
}
```

## 性能优化

### 1. 插件信息缓存

**Redis 缓存策略**：

```go
// 缓存 Key 设计
const (
    CacheKeyPluginDraft   = "plugin:draft:{pluginID}"
    CacheKeyPluginVersion = "plugin:version:{pluginID}:{version}"
    CacheKeyTool          = "tool:{toolID}"
)

// 缓存时间
const (
    CacheTTLPluginDraft   = 5 * time.Minute
    CacheTTLPluginVersion = 1 * time.Hour
)
```

### 2. OpenAPI 文档解析缓存

由于 OpenAPI 文档解析比较耗时，使用内存缓存：

```go
var openapiCache sync.Map

func ParseOpenapi(doc string) (*Openapi3T, error) {
    // 1. 计算文档哈希
    hash := md5.Sum([]byte(doc))

    // 2. 查找缓存
    if cached, ok := openapiCache.Load(hash); ok {
        return cached.(*Openapi3T), nil
    }

    // 3. 解析文档
    parsed := parseOpenapiDoc(doc)

    // 4. 存入缓存
    openapiCache.Store(hash, parsed)

    return parsed, nil
}
```

### 3. HTTP 连接池

复用 HTTP 连接提升性能：

```go
var httpClient = &http.Client{
    Timeout: 30 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
    },
}
```

## 安全性

### 1. 认证信息加密

**AES 加密存储**（`backend/domain/plugin/encrypt/encrypt.go`）：

```go
// Auth Payload 加密
func EncryptAuthPayload(payload string) (string, error) {
    secret := os.Getenv("AUTH_SECRET")
    if secret == "" {
        secret = DefaultAuthSecret
    }

    encrypted, err := EncryptByAES([]byte(payload), secret)
    return encrypted, err
}
```

**环境变量配置**：

```bash
AUTH_SECRET=your_32_byte_secret_key_here
```

### 2. OAuth Token 安全存储

- Access Token 加密存储在数据库
- Refresh Token 加密存储，仅用于刷新
- 定期清理过期 Token

### 3. API 调用限制

**请求超时控制**：

```go
ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
defer cancel()
```

**响应大小限制**：

```go
const MaxResponseSize = 10 * 1024 * 1024 // 10MB

func readResponseBody(resp *http.Response) ([]byte, error) {
    limitedReader := io.LimitReader(resp.Body, MaxResponseSize)
    return io.ReadAll(limitedReader)
}
```

## 最佳实践

### 1. 插件设计原则

- **单一职责**：每个插件聚焦一个服务领域
- **最小暴露**：只暴露必要的 API 接口
- **清晰命名**：`operationId` 使用驼峰命名，具有描述性
- **完整文档**：提供详细的 `summary` 和 `description`

### 2. 认证配置建议

- **开发环境**：使用固定的测试 API Token
- **生产环境**：使用环境变量或密钥管理服务
- **OAuth 应用**：为每个环境创建独立的 OAuth Client

### 3. 错误处理

- **明确的错误码**：使用标准 HTTP 状态码
- **详细的错误信息**：返回 JSON 格式的错误详情
- **重试机制**：对临时性错误（如网络超时）自动重试

### 4. 版本管理

- **语义化版本**：遵循 `v{major}.{minor}.{patch}` 格式
- **向后兼容**：Minor 版本保持向后兼容
- **废弃通知**：通过 `deprecated` 字段标记废弃的 API

### 5. 性能优化

- **响应裁剪**：只返回必要的字段
- **批量操作**：提供批量 API 减少请求次数
- **缓存策略**：合理使用 HTTP 缓存头

## 调试和测试

### 1. 工具调试

在前端 Plugin 编辑器中：

1. 配置插件 Manifest
2. 添加 API 工具
3. 点击"调试"按钮
4. 输入测试参数
5. 查看请求和响应

**调试请求格式**：

```json
{
  "plugin_id": 123,
  "tool_id": 456,
  "arguments": {
    "address": "北京市朝阳区"
  }
}
```

**调试响应格式**：

```json
{
  "request": "GET /v3/geocode/geo?address=北京市朝阳区 HTTP/1.1\nHost: restapi.amap.com\nX-API-Key: your_key\n\n",
  "raw_response": "{\"status\":\"1\",\"count\":\"1\",\"geocodes\":[...]}",
  "trimmed_response": "{\"status\":\"1\",\"geocodes\":[...]}"
}
```

### 2. 单元测试

**测试插件执行**（`backend/domain/plugin/service/exec_tool_test.go`）：

```go
func TestExecuteTool(t *testing.T) {
    // 1. Mock Plugin 和 Tool
    plugin := &entity.PluginInfo{
        ID: 1,
        Manifest: &model.PluginManifest{
            Auth: &model.AuthV2{Type: consts.AuthzTypeOfNone},
        },
        ServerURL: "https://api.example.com",
    }

    tool := &entity.ToolInfo{
        ID: 1,
        Method: "GET",
        SubURL: "/test",
        Operation: &model.Openapi3Operation{...},
    }

    // 2. 执行工具
    resp, err := service.ExecuteTool(ctx, &model.ExecuteToolRequest{
        UserID:          "test_user",
        PluginID:        1,
        ToolID:          1,
        ArgumentsInJson: `{"param1": "value1"}`,
    })

    // 3. 验证结果
    assert.NoError(t, err)
    assert.Contains(t, resp.RawResp, "expected_value")
}
```

## 故障排查

### 常见问题

#### 1. 插件执行失败

**问题**：工具调用返回 `ErrPluginExecuteToolFailed`

**排查步骤**：
1. 检查插件 Manifest 配置是否正确
2. 验证 OpenAPI 文档格式
3. 检查认证信息是否有效
4. 查看详细错误日志

#### 2. OAuth 认证失败

**问题**：返回 `ErrPluginOAuthFailed`

**排查步骤**：
1. 确认 OAuth Client ID 和 Secret 正确
2. 检查 Redirect URI 是否配置正确
3. 验证 Token URL 和 Authorization URL
4. 查看 OAuth 错误响应

#### 3. 参数验证失败

**问题**：提示必填参数缺失

**排查步骤**：
1. 检查 OpenAPI Schema 中的 `required` 字段
2. 确认传入的参数 JSON 格式正确
3. 验证参数类型是否匹配

#### 4. 响应解析失败

**问题**：无法解析响应数据

**排查步骤**：
1. 检查响应 Content-Type 是否为 `application/json`
2. 验证响应 JSON 格式
3. 确认 Response Schema 定义正确

## 文件索引

### 核心代码文件

- `backend/crossdomain/plugin/model/plugin.go:38-60` - PluginInfo 定义
- `backend/crossdomain/plugin/model/plugin_manifest.go:34-44` - PluginManifest 定义
- `backend/crossdomain/plugin/model/toolinfo.go:37-55` - ToolInfo 定义
- `backend/domain/plugin/service/service.go:28-91` - PluginService 接口
- `backend/domain/plugin/service/exec_tool.go:45-94` - ExecuteTool 实现
- `backend/domain/plugin/service/tool/invocation_http.go` - HTTP 请求构建
- `backend/application/plugin/plugin.go` - Application 层服务

### 配置文件

- `backend/conf/plugin/pluginproduct/*.yaml` - 产品插件配置
- `backend/conf/plugin/common/oauth_schema.json` - OAuth Schema 定义

### 数据库 Schema

- `docker/volumes/mysql/schema.sql` - 数据库表结构

---

**最后更新时间**：2025-10-27

**文档版本**：v1.0.0

如有任何疑问或需要帮助，请联系：
- 📧 邮箱：support@coze-plus.cn
- 💬 交流群：参见[项目概述](./overview.md)
