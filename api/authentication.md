# API 鉴权方式设计方案

## 概述

Coze Plus 提供了灵活的多层鉴权体系，支持 Web 应用和 OpenAPI 两种访问方式，满足不同场景下的安全认证需求。系统通过中间件链式调用实现了统一的鉴权管理，确保 API 的安全性和可扩展性。

## 鉴权架构设计

### 架构层次

```
┌─────────────────────────────────────────────────────────┐
│                   Client Request                         │
│  - Web Browser (Cookie)                                  │
│  - API Client (Bearer Token)                             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│           Request Inspector Middleware                   │
│  - Detect Request Type                                   │
│  - Set Auth Type (WebAPI/OpenAPI/StaticFile)            │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
┌───────▼──────────┐    ┌──────────▼─────────┐
│ Session Auth MW  │    │  OpenAPI Auth MW   │
│ (Web Console)    │    │  (API Access)      │
│ - Cookie Check   │    │ - Bearer Token     │
│ - Session Valid  │    │ - API Key Check    │
└───────┬──────────┘    └──────────┬─────────┘
        │                          │
        └────────────┬─────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Permission Middleware                       │
│  - Check User Permissions                                │
│  - Space Role Validation                                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Business Handler                        │
└─────────────────────────────────────────────────────────┘
```

### 鉴权类型（RequestAuthType）

系统支持三种请求鉴权类型：

```go
type RequestAuthType = int32

const (
    RequestAuthTypeWebAPI     RequestAuthType = 0  // Web 控制台鉴权
    RequestAuthTypeOpenAPI    RequestAuthType = 1  // OpenAPI 鉴权
    RequestAuthTypeStaticFile RequestAuthType = 2  // 静态文件（无需鉴权）
)
```

| 类型 | 值 | 描述 | 鉴权方式 | 适用场景 |
|-----|-----|------|---------|---------|
| WebAPI | 0 | Web 控制台访问 | Session Cookie | 用户通过浏览器访问控制台 |
| OpenAPI | 1 | API 接口访问 | Bearer Token (API Key) | 第三方应用、脚本调用 API |
| StaticFile | 2 | 静态资源访问 | 无需鉴权 | 前端静态文件、公共资源 |

## 鉴权方式详解

### 1. Session 鉴权（Web 控制台）

#### 工作原理

Session 鉴权用于 Web 控制台的用户认证，采用传统的 Cookie-Session 模式：

1. 用户登录成功后，服务器生成唯一的 Session ID
2. Session ID 通过 Cookie 返回给浏览器
3. 后续请求自动携带 Cookie，服务器验证 Session 有效性
4. Session 关联用户信息，实现有状态会话

#### 实现细节

**Session 实体结构**：

```go
type Session struct {
    SessionKey   string  `json:"session_key"`   // Session 唯一标识
    UserID       int64   `json:"user_id"`       // 用户ID
    UserEmail    string  `json:"user_email"`    // 用户邮箱
    UniqueName   string  `json:"unique_name"`   // 用户名
    IconURL      string  `json:"icon_url"`      // 头像URL
    SpaceID      int64   `json:"space_id"`      // 当前工作空间ID
    CreatedAt    int64   `json:"created_at"`    // 创建时间
    ExpiresAt    int64   `json:"expires_at"`    // 过期时间
}
```

**登录流程**：

```go
func Login(ctx context.Context, email, password string) (*User, error) {
    // 1. 验证用户凭证
    user, err := userRepo.GetUsersByEmail(ctx, email)
    if err != nil || !verifyPassword(password, user.Password) {
        return nil, errors.New("invalid credentials")
    }

    // 2. 生成唯一 Session ID
    sessionID, err := idGenerator.GenID(ctx)
    if err != nil {
        return nil, err
    }

    // 3. 生成 Session Key（HMAC-SHA256）
    sessionKey := generateSessionKey(sessionID)

    // 4. 存储 Session Key 到数据库
    err = userRepo.UpdateSessionKey(ctx, user.ID, sessionKey)
    if err != nil {
        return nil, err
    }

    // 5. 设置 Cookie
    c.SetCookie("session_key", sessionKey,
        maxAge, "/", domain, secure, httpOnly)

    return user, nil
}
```

**Session 验证中间件**：

```go
func SessionAuthMW() app.HandlerFunc {
    return func(c context.Context, ctx *app.RequestContext) {
        // 1. 检查请求类型
        requestAuthType := ctx.GetInt32(RequestAuthTypeStr)
        if requestAuthType != int32(RequestAuthTypeWebAPI) {
            ctx.Next(c)
            return
        }

        // 2. 跳过不需要检查的路径
        if noNeedSessionCheckPath[string(ctx.GetRequest().URI().Path())] {
            ctx.Next(c)
            return
        }

        // 3. 获取 Cookie 中的 session_key
        sessionKey := ctx.Cookie("session_key")
        if len(sessionKey) == 0 {
            httputil.Unauthorized(ctx, "missing session_key in cookie")
            return
        }

        // 4. 验证 Session 有效性
        session, err := userService.ValidateSession(c, string(sessionKey))
        if err != nil || session == nil {
            httputil.Unauthorized(ctx, "invalid or expired session")
            return
        }

        // 5. 将 Session 数据存入上下文
        ctxcache.Store(c, consts.SessionDataKeyInCtx, session)

        ctx.Next(c)
    }
}
```

**免鉴权路径**：

```go
var noNeedSessionCheckPath = map[string]bool{
    "/api/passport/web/email/login/":       true,  // 登录接口
    "/api/passport/web/email/register/v2/": true,  // 注册接口
}
```

#### 优势与限制

**优势**：
- ✅ 实现简单，服务器完全控制会话
- ✅ 支持服务器主动失效（登出、过期）
- ✅ 适合有状态的 Web 应用
- ✅ 安全性高（HttpOnly Cookie 防止 XSS）

**限制**：
- ❌ 需要服务器存储 Session 状态
- ❌ 跨域访问需要特殊处理
- ❌ 不适合分布式无状态架构
- ❌ 移动端和第三方应用支持不佳

### 2. API Key 鉴权（OpenAPI）

#### 工作原理

API Key 鉴权用于第三方应用和程序化访问，采用 Bearer Token 模式：

1. 用户在控制台创建 API Key
2. API Key 以 MD5 哈希形式存储在数据库
3. 客户端在 HTTP Header 中携带 `Authorization: Bearer {API_KEY}`
4. 服务器验证 API Key 的有效性和权限

#### API Key 实体结构

```go
type ApiKey struct {
    ID          int64  `json:"id"`            // API Key ID
    Name        string `json:"name"`          // API Key 名称
    ApiKey      string `json:"api_key"`       // API Key（MD5哈希）
    ConnectorID int64  `json:"connector"`     // 关联的连接器ID
    UserID      int64  `json:"user_id"`       // 所有者用户ID
    LastUsedAt  int64  `json:"last_used_at"`  // 最后使用时间
    ExpiredAt   int64  `json:"expired_at"`    // 过期时间
    CreatedAt   int64  `json:"created_at"`    // 创建时间
    UpdatedAt   int64  `json:"updated_at"`    // 更新时间
}

// API Key 类型
type AkType int32
const (
    AkTypeCustomer  AkType = 0  // 客户 API Key（长期有效）
    AkTypeTemporary AkType = 1  // 临时 API Key（短期有效）
)
```

#### 数据库表设计

```sql
CREATE TABLE IF NOT EXISTS `api_key` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primary Key ID',
  `api_key` varchar(255) NOT NULL DEFAULT '' COMMENT 'API Key hash (MD5)',
  `name` varchar(255) NOT NULL DEFAULT '' COMMENT 'API Key Name',
  `status` tinyint NOT NULL DEFAULT 0 COMMENT '0 normal, 1 deleted',
  `user_id` bigint NOT NULL DEFAULT 0 COMMENT 'API Key Owner',
  `expired_at` bigint NOT NULL DEFAULT 0 COMMENT 'API Key Expired Time',
  `created_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Create Time in Milliseconds',
  `updated_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Update Time in Milliseconds',
  `last_used_at` bigint NOT NULL DEFAULT 0 COMMENT 'Used Time in Milliseconds',
  `ak_type` tinyint NOT NULL DEFAULT 0 COMMENT 'API key type',
  PRIMARY KEY (`id`),
  INDEX `idx_api_key` (`api_key`),
  INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'API Key Table';
```

#### API Key 创建流程

```go
func CreateApiKey(ctx context.Context, req *CreateApiKey) (*ApiKey, error) {
    // 1. 生成随机 API Key（32字节）
    randomBytes := make([]byte, 32)
    _, err := rand.Read(randomBytes)
    if err != nil {
        return nil, err
    }
    apiKey := base64.URLEncoding.EncodeToString(randomBytes)

    // 2. 计算 MD5 哈希（用于存储）
    md5Hash := md5.Sum([]byte(apiKey))
    md5Key := hex.EncodeToString(md5Hash[:])

    // 3. 计算过期时间
    expiredAt := time.Now().Add(req.Expire * time.Second).UnixMilli()

    // 4. 存储到数据库
    apiKeyModel := &model.APIKey{
        ID:         genID(),
        APIKey:     md5Key,  // 存储 MD5 哈希
        Name:       req.Name,
        UserID:     req.UserID,
        ExpiredAt:  expiredAt,
        CreatedAt:  time.Now().UnixMilli(),
        UpdatedAt:  time.Now().UnixMilli(),
        AkType:     int32(req.AkType),
    }

    err = dao.Create(ctx, apiKeyModel)
    if err != nil {
        return nil, err
    }

    // 5. 返回明文 API Key（只显示一次）
    return &ApiKey{
        ID:        apiKeyModel.ID,
        Name:      apiKeyModel.Name,
        ApiKey:    apiKey,  // 明文，仅在创建时返回
        UserID:    apiKeyModel.UserID,
        ExpiredAt: expiredAt,
    }, nil
}
```

#### API Key 验证中间件

```go
func OpenapiAuthMW() app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        // 1. 检查请求类型
        requestAuthType := c.GetInt32(RequestAuthTypeStr)
        if requestAuthType != int32(RequestAuthTypeOpenAPI) {
            c.Next(ctx)
            return
        }

        // 2. 获取 Authorization Header
        authHeader := c.Request.Header.Get("Authorization")
        if len(authHeader) == 0 {
            httputil.Unauthorized(c, "missing authorization in header")
            return
        }

        // 3. 解析 Bearer Token
        apiKey := parseBearerAuthToken(authHeader)
        if len(apiKey) == 0 {
            httputil.Unauthorized(c, "invalid bearer token format")
            return
        }

        // 4. 计算 API Key 的 MD5 哈希
        md5Hash := md5.Sum([]byte(apiKey))
        md5Key := hex.EncodeToString(md5Hash[:])

        // 5. 验证 API Key
        apiKeyInfo, err := openauth.CheckPermission(ctx, md5Key)
        if err != nil || apiKeyInfo == nil {
            httputil.Unauthorized(c, "invalid or expired api key")
            return
        }

        // 6. 检查过期时间
        if apiKeyInfo.ExpiredAt > 0 && time.Now().UnixMilli() > apiKeyInfo.ExpiredAt {
            httputil.Unauthorized(c, "api key expired")
            return
        }

        // 7. 更新最后使用时间
        _ = openauth.UpdateLastUsedAt(ctx, apiKeyInfo.ID, apiKeyInfo.UserID)

        // 8. 将 API Key 信息存入上下文
        ctxcache.Store(ctx, consts.OpenapiAuthKeyInCtx, apiKeyInfo)

        c.Next(ctx)
    }
}

// 解析 Bearer Token
func parseBearerAuthToken(authHeader string) string {
    if len(authHeader) == 0 {
        return ""
    }

    // 格式: "Bearer {token}"
    parts := strings.Split(authHeader, "Bearer")
    if len(parts) != 2 {
        return ""
    }

    token := strings.TrimSpace(parts[1])
    return token
}
```

#### 需要 OpenAPI 鉴权的路径

**固定路径**：

```go
var needAuthPath = map[string]bool{
    "/v3/chat":                         true,  // 聊天接口
    "/v1/conversations":                true,  // 会话管理
    "/v1/conversation/create":          true,  // 创建会话
    "/v1/conversation/message/list":    true,  // 消息列表
    "/v1/files/upload":                 true,  // 文件上传
    "/v1/workflow/run":                 true,  // 工作流运行
    "/v1/workflow/stream_run":          true,  // 流式工作流
    "/v1/workflow/stream_resume":       true,  // 恢复工作流
    "/v1/workflow/get_run_history":     true,  // 运行历史
    "/v1/bot/get_online_info":          true,  // 获取Bot信息
    "/v1/workflows/chat":               true,  // 工作流聊天
    "/v1/workflow/conversation/create": true,  // 工作流会话
    "/v3/chat/cancel":                  true,  // 取消聊天
}
```

**正则路径**：

```go
var needAuthFunc = map[string]bool{
    "^/v1/conversations/[0-9]+/clear$": true,  // 清空会话
    "^/v1/bots/[0-9]+$":                true,  // 获取Bot
    "^/v1/conversations/[0-9]+$":       true,  // 获取会话
    "^/v1/workflows/[0-9]+$":           true,  // 获取工作流
    "^/v1/apps/[0-9]+$":                true,  // 获取应用
}

func isNeedOpenapiAuth(c *app.RequestContext) bool {
    uriPath := c.URI().Path()

    // 检查正则路径
    for rule, needAuth := range needAuthFunc {
        if regexp.MustCompile(rule).MatchString(string(uriPath)) {
            return needAuth
        }
    }

    // 检查固定路径
    return needAuthPath[string(uriPath)]
}
```

#### 优势与限制

**优势**：
- ✅ 无状态，易于分布式部署
- ✅ 适合第三方应用和程序化访问
- ✅ 支持长期有效的访问令牌
- ✅ 可以设置过期时间和权限范围
- ✅ 易于撤销（删除数据库记录）

**限制**：
- ❌ API Key 泄露风险较高
- ❌ 无法像 Session 一样实时失效
- ❌ 需要客户端妥善保管密钥

## 请求鉴权流程

### 请求类型识别（Request Inspector）

系统通过 `RequestInspectorMW` 中间件自动识别请求类型：

```go
func RequestInspectorMW() app.HandlerFunc {
    return func(c context.Context, ctx *app.RequestContext) {
        authType := RequestAuthTypeWebAPI  // 默认为 Web API

        // 1. 检查是否需要 OpenAPI 鉴权
        if isNeedOpenapiAuth(ctx) {
            authType = RequestAuthTypeOpenAPI
        }
        // 2. 检查是否是静态文件
        else if isStaticFile(ctx) {
            authType = RequestAuthTypeStaticFile
        }

        // 3. 将鉴权类型存入上下文
        ctx.Set(RequestAuthTypeStr, authType)
        ctx.Next(c)
    }
}

// 静态文件路径
var staticFilePath = map[string]bool{
    "/static":      true,
    "/":            true,
    "/sign":        true,
    "/favicon.png": true,
}

func isStaticFile(ctx *app.RequestContext) bool {
    path := string(ctx.GetRequest().URI().Path())

    // 检查固定路径
    if staticFilePath[path] {
        return true
    }

    // 检查路径前缀
    if strings.HasPrefix(path, "/static/") ||
       strings.HasPrefix(path, "/explore/") ||
       strings.HasPrefix(path, "/admin/") ||
       strings.HasPrefix(path, "/space/") {
        return true
    }

    return false
}
```

### 完整鉴权流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    Incoming Request                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              RequestInspectorMW                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Path Analysis:                                      │   │
│  │  - Check if needAuthPath or needAuthFunc           │   │
│  │  - Check if staticFilePath                         │   │
│  │  - Determine RequestAuthType                       │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌───────────────┐ ┌──────────────┐ ┌─────────────┐
│  WebAPI (0)   │ │ OpenAPI (1)  │ │StaticFile(2)│
│               │ │              │ │             │
│ SessionAuthMW │ │OpenapiAuthMW │ │  No Auth    │
└───────┬───────┘ └──────┬───────┘ └──────┬──────┘
        │                │                │
        ▼                ▼                │
┌──────────────┐ ┌──────────────┐        │
│Cookie Check  │ │Bearer Token  │        │
│Session Valid │ │API Key Check │        │
└──────┬───────┘ └──────┬───────┘        │
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                PermissionMiddleware                          │
│  - Check Space Membership                                    │
│  - Validate Resource Access                                  │
│  - Role-based Permission Check                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Business Handler                            │
│  - Process Request                                           │
│  - Return Response                                           │
└─────────────────────────────────────────────────────────────┘
```

## API 管理

### API Key 生命周期管理

#### 创建 API Key

```http
POST /api/openapi/v1/api_key/create
Content-Type: application/json

{
  "name": "Production API Key",
  "expire": 7776000,  // 90天（秒）
  "ak_type": 0        // 0: 客户Key, 1: 临时Key
}

Response:
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": 123456,
    "name": "Production API Key",
    "api_key": "coz_abc123def456ghi789jkl...",  // 明文，仅显示一次
    "user_id": 1001,
    "expired_at": 1756723200000,
    "created_at": 1756723200000
  }
}
```

**重要提示**：
- ⚠️ API Key 明文仅在创建时返回一次，请妥善保管
- 🔒 后端存储 MD5 哈希，无法恢复明文
- ⏰ 过期时间单位为秒，0 表示永不过期

#### 列出 API Keys

```http
GET /api/openapi/v1/api_key/list?page=1&limit=20
Authorization: session_key_from_cookie

Response:
{
  "code": 0,
  "msg": "success",
  "data": {
    "api_keys": [
      {
        "id": 123456,
        "name": "Production API Key",
        "api_key": "coz_abc...***...",  // 脱敏显示
        "user_id": 1001,
        "last_used_at": 1756723100000,
        "expired_at": 1756723200000,
        "created_at": 1756723000000
      }
    ],
    "has_more": false
  }
}
```

#### 删除 API Key

```http
POST /api/openapi/v1/api_key/delete
Content-Type: application/json

{
  "id": 123456
}

Response:
{
  "code": 0,
  "msg": "success"
}
```

### 管理员鉴权

针对管理功能，系统提供了额外的管理员鉴权中间件：

```go
func AdminAuthMW() app.HandlerFunc {
    return func(c context.Context, ctx *app.RequestContext) {
        // 1. 获取 Session 数据
        session, ok := ctxcache.Get[*entity.Session](c, consts.SessionDataKeyInCtx)
        if !ok {
            httputil.Unauthorized(ctx, "session required")
            return
        }

        // 2. 获取管理员邮箱配置
        baseConf, err := config.Base().GetBaseConfig(c)
        if err != nil {
            httputil.InternalError(c, ctx, err)
            return
        }

        // 3. 检查用户邮箱是否在管理员列表中
        adminEmails := strings.Split(baseConf.AdminEmails, ",")
        for _, adminEmail := range adminEmails {
            if adminEmail == session.UserEmail {
                ctx.Next(c)
                return
            }
        }

        httputil.Forbidden(ctx, "admin access required")
    }
}
```

**管理员配置**：

管理员邮箱在配置文件中定义：

```yaml
# backend/conf/base/base.yaml
admin_emails: "admin@example.com,superuser@example.com"
```

**使用示例**：

```go
// 管理员专用路由
adminRouter.POST("/api/admin/users/list",
    middleware.SessionAuthMW(),
    middleware.AdminAuthMW(),
    handler.ListUsers,
)
```

## 安全最佳实践

### 1. Session 安全

**Cookie 配置**：

```go
// 设置安全的 Cookie 属性
c.SetCookie(
    "session_key",           // name
    sessionKey,              // value
    86400,                   // maxAge (1天)
    "/",                     // path
    "yourdomain.com",        // domain
    true,                    // secure (仅HTTPS)
    true,                    // httpOnly (防XSS)
)
```

**Session 过期策略**：

- ✅ 设置合理的过期时间（推荐1-7天）
- ✅ 支持"记住我"功能（延长过期时间）
- ✅ 登出时立即失效 Session
- ✅ 检测异常登录行为（IP变化、设备变化）

### 2. API Key 安全

**存储安全**：

- ✅ 后端仅存储 MD5 哈希，不存储明文
- ✅ 使用 HTTPS 传输 API Key
- ✅ 客户端使用环境变量或密钥管理服务存储

**权限控制**：

- ✅ API Key 与用户账号关联，继承用户权限
- ✅ 支持设置过期时间，定期轮换
- ✅ 记录 `last_used_at`，检测异常使用
- ✅ 支持立即撤销（删除记录）

**使用建议**：

```bash
# ❌ 错误：硬编码在代码中
api_key = "coz_abc123def456ghi789jkl..."

# ✅ 正确：使用环境变量
api_key = os.environ.get("COZE_API_KEY")

# ✅ 正确：使用配置文件（不提交到版本控制）
api_key = config.get("coze_api_key")
```

### 3. 防止常见攻击

#### CSRF 防护

Session 鉴权需要防范 CSRF 攻击：

```go
// 生成 CSRF Token
csrfToken := generateCSRFToken(sessionKey)
c.SetCookie("csrf_token", csrfToken, 86400, "/", "", true, false)

// 验证 CSRF Token
func CSRFMiddleware() app.HandlerFunc {
    return func(c context.Context, ctx *app.RequestContext) {
        if ctx.Request.Method() != "GET" {
            cookieToken := ctx.Cookie("csrf_token")
            headerToken := ctx.Request.Header.Get("X-CSRF-Token")

            if cookieToken != headerToken {
                httputil.Forbidden(ctx, "CSRF token mismatch")
                return
            }
        }
        ctx.Next(c)
    }
}
```

#### 重放攻击防护

API Key 鉴权需要防范重放攻击：

```go
// 方案1: 添加时间戳和签名
Authorization: Bearer {API_KEY}
X-Timestamp: 1756723200
X-Signature: hmac_sha256(API_KEY + timestamp + request_body)

// 方案2: 使用 nonce（一次性随机数）
Authorization: Bearer {API_KEY}
X-Nonce: random_string_123
// 服务器记录已使用的 nonce（Redis）
```

#### 限流保护

防止暴力破解和 DDoS 攻击：

```go
// 基于 IP 的限流
func RateLimitMiddleware() app.HandlerFunc {
    limiter := NewRateLimiter(100, time.Minute)  // 每分钟100次

    return func(c context.Context, ctx *app.RequestContext) {
        clientIP := ctx.ClientIP()

        if !limiter.Allow(clientIP) {
            httputil.TooManyRequests(ctx, "rate limit exceeded")
            return
        }

        ctx.Next(c)
    }
}

// 基于 API Key 的限流
func APIKeyRateLimitMiddleware() app.HandlerFunc {
    limiter := NewRateLimiter(1000, time.Hour)  // 每小时1000次

    return func(c context.Context, ctx *app.RequestContext) {
        apiKeyInfo := ctxcache.Get[*entity.ApiKey](c, consts.OpenapiAuthKeyInCtx)

        keyID := fmt.Sprintf("api_key:%d", apiKeyInfo.ID)
        if !limiter.Allow(keyID) {
            httputil.TooManyRequests(ctx, "api key rate limit exceeded")
            return
        }

        ctx.Next(c)
    }
}
```

## 开发示例

### 客户端调用示例

#### Web 控制台（Session）

```javascript
// 登录
async function login(email, password) {
  const response = await fetch('/api/passport/web/email/login/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',  // 重要：携带 Cookie
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (data.code === 0) {
    console.log('登录成功，Session 已设置');
  }
}

// 调用受保护的 API
async function createAgent(agentData) {
  const response = await fetch('/api/agent/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': getCookie('csrf_token'),  // CSRF 保护
    },
    credentials: 'include',  // 自动携带 session_key Cookie
    body: JSON.stringify(agentData),
  });

  return await response.json();
}
```

#### OpenAPI 调用（API Key）

```python
import requests

# API Key（从环境变量读取）
API_KEY = os.environ.get('COZE_API_KEY')
BASE_URL = 'https://api.your-coze-plus.com'

# 调用 Chat API
def chat(bot_id, message):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
    }

    data = {
        'bot_id': bot_id,
        'user': 'user_123',
        'query': message,
        'stream': False,
    }

    response = requests.post(
        f'{BASE_URL}/v3/chat',
        headers=headers,
        json=data,
    )

    return response.json()

# 调用工作流 API
def run_workflow(workflow_id, inputs):
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
    }

    data = {
        'workflow_id': workflow_id,
        'parameters': inputs,
    }

    response = requests.post(
        f'{BASE_URL}/v1/workflow/run',
        headers=headers,
        json=data,
    )

    return response.json()
```

```bash
# 使用 cURL 调用 API
curl -X POST https://api.your-coze-plus.com/v3/chat \
  -H "Authorization: Bearer coz_abc123def456ghi789jkl..." \
  -H "Content-Type: application/json" \
  -d '{
    "bot_id": "7434343434343434",
    "user": "user_123",
    "query": "你好，请介绍一下自己",
    "stream": false
  }'
```

### 服务端开发示例

#### 添加新的受保护路由

```go
// 1. 定义 Handler
func CreateWorkflow(ctx context.Context, c *app.RequestContext) {
    // 获取认证信息
    var userID int64

    // 从 Session 获取（WebAPI）
    if session, ok := ctxcache.Get[*entity.Session](ctx, consts.SessionDataKeyInCtx); ok {
        userID = session.UserID
    }

    // 从 API Key 获取（OpenAPI）
    if apiKey, ok := ctxcache.Get[*entity.ApiKey](ctx, consts.OpenapiAuthKeyInCtx); ok {
        userID = apiKey.UserID
    }

    // 业务逻辑
    workflow, err := workflowService.Create(ctx, userID, req)
    // ...
}

// 2. 注册路由（支持两种鉴权方式）
func RegisterRoutes(r *server.Hertz) {
    // 中间件链
    r.Use(
        middleware.RequestInspectorMW(),  // 识别请求类型
        middleware.SessionAuthMW(),       // Session 鉴权
        middleware.OpenapiAuthMW(),       // API Key 鉴权
        middleware.PermissionMW(),        // 权限检查
    )

    // 注册路由
    r.POST("/api/workflow/create", CreateWorkflow)
    r.POST("/v1/workflow/create", CreateWorkflow)  // OpenAPI 路径
}
```

#### 添加需要 OpenAPI 鉴权的路径

```go
// 在 openapi_auth.go 中添加路径
var needAuthPath = map[string]bool{
    // ... 现有路径
    "/v1/my_new_api":  true,  // 新增固定路径
}

var needAuthFunc = map[string]bool{
    // ... 现有正则
    "^/v1/my_resource/[0-9]+$": true,  // 新增正则路径
}
```

## 监控与审计

### 鉴权日志

```go
// 记录鉴权日志
func logAuthEvent(ctx context.Context, authType string, userID int64, result bool, reason string) {
    log.Info().
        Str("auth_type", authType).
        Int64("user_id", userID).
        Bool("success", result).
        Str("reason", reason).
        Str("ip", getClientIP(ctx)).
        Str("user_agent", getUserAgent(ctx)).
        Msg("Authentication Event")
}
```

### 监控指标

关键监控指标：

1. **认证成功率**：`auth_success_rate{auth_type="session|api_key"}`
2. **认证失败原因分布**：`auth_failure_reason{reason="invalid_token|expired|missing"}`
3. **API Key 使用频率**：`api_key_requests{api_key_id="123"}`
4. **Session 并发数**：`active_sessions_count`
5. **鉴权延迟**：`auth_middleware_duration_ms`

### 审计日志

```sql
-- 审计日志表
CREATE TABLE `auth_audit_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `auth_type` varchar(20) NOT NULL COMMENT 'session|api_key',
  `action` varchar(50) NOT NULL COMMENT 'login|logout|api_call',
  `result` tinyint NOT NULL COMMENT '0: fail, 1: success',
  `reason` varchar(255) COMMENT 'failure reason',
  `ip_address` varchar(45) NOT NULL,
  `user_agent` varchar(500),
  `request_path` varchar(500),
  `created_at` bigint unsigned NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB CHARSET utf8mb4;
```

## 常见问题

### Q1: Session 和 API Key 可以同时使用吗？

**A:** 可以。系统通过 `RequestInspectorMW` 自动识别请求类型：
- 如果路径匹配 OpenAPI 路径，使用 API Key 鉴权
- 否则使用 Session 鉴权
- 同一个用户可以同时拥有 Session 和多个 API Keys

### Q2: API Key 泄露后如何快速响应？

**A:** 立即执行以下步骤：

1. **撤销 API Key**：调用删除接口或在控制台删除
2. **审计使用记录**：检查 `last_used_at` 和访问日志
3. **通知用户**：如果检测到异常使用，通知 API Key 所有者
4. **生成新密钥**：创建新的 API Key 并更新客户端配置

### Q3: 如何实现 API Key 的权限隔离？

**A:** API Key 通过 `user_id` 关联到用户账号，自动继承用户的所有权限：

```go
// API Key 鉴权后，获取用户信息
apiKeyInfo := ctxcache.Get[*entity.ApiKey](ctx, consts.OpenapiAuthKeyInCtx)
userID := apiKeyInfo.UserID

// 后续权限检查基于 userID
hasPermission := permissionService.CheckPermission(ctx, &CheckPermissionRequest{
    UserID:     userID,
    SpaceID:    &spaceID,
    Resource:   "agent",
    ResourceID: agentID,
    Action:     "read",
})
```

### Q4: Session 在分布式环境下如何共享？

**A:** 推荐使用 Redis 存储 Session：

```go
// 使用 Redis 存储 Session
func (s *sessionStore) Set(ctx context.Context, sessionKey string, session *entity.Session) error {
    data, _ := json.Marshal(session)
    return s.redis.Set(ctx, "session:"+sessionKey, data, 24*time.Hour).Err()
}

func (s *sessionStore) Get(ctx context.Context, sessionKey string) (*entity.Session, error) {
    data, err := s.redis.Get(ctx, "session:"+sessionKey).Result()
    if err != nil {
        return nil, err
    }

    var session entity.Session
    json.Unmarshal([]byte(data), &session)
    return &session, nil
}
```

### Q5: 如何为不同的 API Key 设置不同的权限？

**A:** 当前实现中，API Key 继承用户权限。如需更细粒度的控制，可以扩展 API Key 实体：

```go
type ApiKey struct {
    // ... 现有字段
    Scopes      string  `json:"scopes"`  // 权限范围，如 "agent:read,workflow:execute"
    AllowedIPs  string  `json:"allowed_ips"`  // 允许的IP白名单
}

// 验证时检查 Scopes
func validateAPIKeyScope(apiKey *ApiKey, resource, action string) bool {
    scopes := strings.Split(apiKey.Scopes, ",")
    requiredScope := fmt.Sprintf("%s:%s", resource, action)

    for _, scope := range scopes {
        if scope == requiredScope || scope == resource+":*" {
            return true
        }
    }

    return false
}
```

## 总结

Coze Plus 的 API 鉴权系统具有以下特点：

✅ **双模式支持**：Session（Web 控制台）+ API Key（OpenAPI）
✅ **自动识别**：通过路径自动选择鉴权方式
✅ **安全设计**：MD5 哈希存储、HttpOnly Cookie、HTTPS 传输
✅ **灵活扩展**：支持管理员鉴权、权限集成、自定义中间件
✅ **易于监控**：完善的日志、审计和监控指标

通过合理使用 Session 和 API Key 两种鉴权方式，Coze Plus 为不同场景提供了安全、便捷的 API 访问能力。
