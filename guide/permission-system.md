# 权限系统开发指南

## 概述

Coze Plus 权限系统基于 Casbin 构建，实现了灵活的 RBAC (Role-Based Access Control) 权限模型。本文档面向开发者，介绍权限系统的架构设计、核心组件和开发实践。

## 系统架构

### 架构层次

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer (HTTP)                      │
│  - Permission Service Handler                            │
│  - Permission Middleware                                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Application Layer                           │
│  - Permission Application Service                        │
│  - Role Management                                       │
│  - User Role Assignment                                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                Domain Layer                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Permission Service                              │   │
│  │  - RoleService                                   │   │
│  │  - UserRoleService                               │   │
│  │  - PermissionTemplateService                     │   │
│  │  - CasbinRuleService                             │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Permission Entities                             │   │
│  │  - Role                                          │   │
│  │  - UserRole                                      │   │
│  │  - PermissionTemplate                            │   │
│  │  - CasbinRule                                    │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            Infrastructure Layer                          │
│  - Casbin Enforcer                                       │
│  - Database (MySQL)                                      │
│  - Cache (Redis)                                         │
└─────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. Casbin 权限模型

Coze Plus 使用 Casbin 的 RBAC with domains 模型：

```ini
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act, eft

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && keyMatch2(r.obj, p.obj) && r.act == p.act
```

**模型说明：**

- **Subject (sub)**: 用户或角色，格式为 `user:123` 或 `space_admin`
- **Domain (dom)**: 权限域，`global` 或 `space:456`
- **Object (obj)**: 资源，格式为 `agent:*` 或 `workflow:789`
- **Action (act)**: 操作，如 `create`, `read`, `update`, `delete`
- **Effect (eft)**: 效果，`allow` 或 `deny`

#### 2. 权限规则类型

Casbin 使用两种规则类型：

**Policy Rules (p)**: 定义角色或用户对资源的权限

```
# 格式: p, subject, domain, resource, action, effect
p, space_admin, space:456, agent:*, create, allow
p, space_admin, space:456, agent:*, read, allow
p, space_member, space:456, agent:*, read, allow
p, user:123, space:456, agent:789, delete, deny
```

**Grouping Rules (g)**: 定义用户和角色的关系

```
# 格式: g, user, role, domain
g, user:123, space_admin, space:456
g, user:456, space_member, space:456
g, user:789, super_admin, global
```

## 核心实体设计

### 1. 角色实体（Role）

```go
type Role struct {
    ID            int64         `json:"id"`
    RoleCode      string        `json:"role_code"`      // 角色代码，唯一标识
    RoleName      string        `json:"role_name"`      // 角色名称
    RoleDomain    RoleDomain    `json:"role_domain"`    // 角色域：global/space
    SuperAdmin    int32         `json:"super_admin"`    // 是否超级管理员
    SpaceRoleType SpaceRoleType `json:"space_role_type"` // 空间角色类型
    IsBuiltin     int32         `json:"is_builtin"`     // 是否内置角色
    IsDisabled    RoleStatus    `json:"is_disabled"`    // 角色状态
    Permissions   string        `json:"permissions"`    // JSON权限配置
    Description   string        `json:"description"`    // 角色描述
    CreatedBy     int64         `json:"created_by"`     // 创建者ID
    CreatedAt     time.Time     `json:"created_at"`
    UpdatedAt     time.Time     `json:"updated_at"`
}

// 角色域类型
type RoleDomain string
const (
    RoleDomainGlobal RoleDomain = "global" // 全局角色
    RoleDomainSpace  RoleDomain = "space"  // 空间角色
)

// 空间角色类型
type SpaceRoleType int32
const (
    SpaceRoleTypeNormal    SpaceRoleType = 0 // 普通自定义角色
    SpaceRoleTypeOwner     SpaceRoleType = 1 // 空间所有者
    SpaceRoleTypeAdmin     SpaceRoleType = 2 // 空间管理员
    SpaceRoleTypeMember    SpaceRoleType = 3 // 空间成员
)
```

**字段解析：**

- **RoleCode**: 全局唯一的角色标识符，用于Casbin规则
- **RoleDomain**: 区分全局角色和空间角色
- **SuperAdmin**: 超级管理员标志，拥有所有权限，绕过Casbin检查
- **SpaceRoleType**: 空间内置角色类型（Owner/Admin/Member）
- **Permissions**: JSON格式的权限矩阵配置

**Permissions JSON 结构：**

```json
{
  "resources": [
    {
      "resource": "agent",
      "actions": ["create", "read", "update", "delete", "execute"]
    },
    {
      "resource": "workflow",
      "actions": ["create", "read", "update", "delete", "execute"]
    },
    {
      "resource": "knowledge",
      "actions": ["create", "read", "update", "delete"]
    }
  ]
}
```

### 2. 用户角色关系（UserRole）

```go
type UserRole struct {
    ID         int64      `json:"id"`
    UserID     int64      `json:"user_id"`     // 用户ID
    RoleID     int64      `json:"role_id"`     // 角色ID
    AssignedBy int64      `json:"assigned_by"` // 分配者ID
    AssignedAt time.Time  `json:"assigned_at"` // 分配时间
    ExpiredAt  *time.Time `json:"expired_at"`  // 过期时间
}
```

**注意事项：**

- `user_role` 表仅管理全局角色
- 空间角色通过 `space_user` 表的 `role_type` 和 `role_id` 字段管理
- 支持临时权限授予，通过 `expired_at` 字段实现

### 3. 权限模板（PermissionTemplate）

```go
type PermissionTemplate struct {
    ID           int64                     `json:"id"`
    TemplateCode string                    `json:"template_code"` // 模板代码
    TemplateName string                    `json:"template_name"` // 模板名称
    Domain       string                    `json:"domain"`        // 权限域
    Resource     string                    `json:"resource"`      // 资源类型
    ResourceName string                    `json:"resource_name"` // 资源中文名
    Action       string                    `json:"action"`        // 操作类型
    ActionName   string                    `json:"action_name"`   // 操作中文名
    Description  string                    `json:"description"`   // 描述
    IsDefault    int32                     `json:"is_default"`    // 是否默认选中
    SortOrder    int32                     `json:"sort_order"`    // 排序权重
    IsActive     PermissionTemplateStatus  `json:"is_active"`     // 是否激活
    CreatedAt    time.Time                 `json:"created_at"`
    UpdatedAt    time.Time                 `json:"updated_at"`
}
```

**用途：**

- 提供标准化的权限项定义
- 用于角色创建和编辑时的权限选择界面
- 按 Domain → Resource → Action 三级结构组织

### 4. Casbin 规则（CasbinRule）

```go
type CasbinRule struct {
    ID        int64  `json:"id"`
    Ptype     string `json:"ptype"`     // 策略类型: p/g
    V0        string `json:"v0"`        // User ID/Role
    V1        string `json:"v1"`        // Domain/Role
    V2        string `json:"v2"`        // Resource/Domain
    V3        string `json:"v3"`        // Action
    V4        string `json:"v4"`        // Effect
    V5        string `json:"v5"`        // 扩展字段
    CreatedAt int64  `json:"created_at"`
    UpdatedAt int64  `json:"updated_at"`
}

// Helper 方法
func NewCasbinRule(roleCode, domain, resource, action, effect string) *CasbinRule {
    now := time.Now().UnixMilli()
    return &CasbinRule{
        Ptype:     "p",
        V0:        roleCode,
        V1:        domain,
        V2:        resource,
        V3:        action,
        V4:        effect,
        CreatedAt: now,
        UpdatedAt: now,
    }
}

func NewGroupRule(userID, roleCode, domain string) *CasbinRule {
    now := time.Now().UnixMilli()
    return &CasbinRule{
        Ptype:     "g",
        V0:        userID,
        V1:        roleCode,
        V2:        domain,
        CreatedAt: now,
        UpdatedAt: now,
    }
}
```

**Ptype 字段：**

- `p`: Policy rules（权限策略）
- `g`: Grouping rules（用户-角色关系）

**V0-V5 字段映射：**

对于 Policy rules (p):
- V0: Subject（角色代码或用户）
- V1: Domain（权限域）
- V2: Resource（资源）
- V3: Action（操作）
- V4: Effect（允许/拒绝）

对于 Grouping rules (g):
- V0: User（用户，格式：`user:123`）
- V1: Role（角色代码）
- V2: Domain（权限域）

## 服务层设计

### 1. 角色服务（RoleService）

```go
type RoleService interface {
    // 创建角色
    CreateRole(ctx context.Context, req *CreateRoleRequest) (*CreateRoleResponse, error)

    // 更新角色
    UpdateRole(ctx context.Context, req *UpdateRoleRequest) error

    // 删除角色
    DeleteRole(ctx context.Context, req *DeleteRoleRequest) error

    // 查询角色
    GetRoleByID(ctx context.Context, req *GetRoleByIDRequest) (*GetRoleByIDResponse, error)
    GetRoleByCode(ctx context.Context, req *GetRoleByCodeRequest) (*GetRoleByCodeResponse, error)
    ListRoles(ctx context.Context, req *ListRolesRequest) (*ListRolesResponse, error)

    // 角色权限验证
    ValidateRolePermissions(ctx context.Context, req *ValidateRolePermissionsRequest) error
}
```

**创建角色示例：**

```go
func (s *roleServiceImpl) CreateRole(ctx context.Context, req *CreateRoleRequest) (*CreateRoleResponse, error) {
    // 1. 验证角色代码唯一性
    exists, err := s.repo.CheckRoleCodeExists(ctx, req.RoleCode)
    if err != nil {
        return nil, err
    }
    if exists {
        return nil, errors.New("role code already exists")
    }

    // 2. 解析和验证权限配置
    permissions, err := parsePermissions(req.Permissions)
    if err != nil {
        return nil, fmt.Errorf("invalid permissions: %w", err)
    }

    // 3. 创建角色记录
    role := &entity.Role{
        RoleCode:      req.RoleCode,
        RoleName:      req.RoleName,
        RoleDomain:    req.RoleDomain,
        SpaceRoleType: req.SpaceRoleType,
        Permissions:   req.Permissions,
        Description:   req.Description,
        CreatedBy:     req.CreatedBy,
        IsBuiltin:     0,
        IsDisabled:    entity.RoleStatusActive,
    }

    err = s.repo.CreateRole(ctx, role)
    if err != nil {
        return nil, err
    }

    // 4. 将角色权限同步到Casbin
    err = s.syncRoleToCasbin(ctx, role, permissions)
    if err != nil {
        return nil, err
    }

    return &CreateRoleResponse{Role: role}, nil
}

// 将角色权限同步到Casbin
func (s *roleServiceImpl) syncRoleToCasbin(ctx context.Context, role *entity.Role, permissions *PermissionConfig) error {
    domain := string(role.RoleDomain)

    for _, res := range permissions.Resources {
        for _, action := range res.Actions {
            rule := entity.NewCasbinRule(
                role.RoleCode,
                domain,
                res.Resource + ":*",
                action,
                "allow",
            )

            err := s.casbinRepo.CreatePolicyRule(ctx, rule)
            if err != nil {
                return err
            }
        }
    }

    return nil
}
```

### 2. 用户角色服务（UserRoleService）

```go
type UserRoleService interface {
    // 分配角色给用户
    AssignUserToRole(ctx context.Context, req *AssignUserToRoleRequest) error

    // 从用户移除角色
    RemoveUserFromRole(ctx context.Context, req *RemoveUserFromRoleRequest) error

    // 获取用户的所有角色
    GetUserRoles(ctx context.Context, req *GetUserRolesRequest) (*GetUserRolesResponse, error)

    // 检查用户权限
    CheckUserPermission(ctx context.Context, req *CheckUserPermissionRequest) (*CheckUserPermissionResponse, error)

    // 批量分配
    BatchAssignUsersToRole(ctx context.Context, req *BatchAssignUsersToRoleRequest) error
}
```

**分配角色示例：**

```go
func (s *userRoleServiceImpl) AssignUserToRole(ctx context.Context, req *AssignUserToRoleRequest) error {
    // 1. 验证角色存在
    role, err := s.roleRepo.GetRoleByID(ctx, req.RoleID)
    if err != nil {
        return fmt.Errorf("role not found: %w", err)
    }

    // 2. 检查是否已分配
    exists, err := s.repo.CheckUserRoleExists(ctx, req.UserID, req.RoleID)
    if err != nil {
        return err
    }
    if exists {
        return errors.New("user already has this role")
    }

    // 3. 创建用户-角色关系
    userRole := &entity.UserRole{
        UserID:     req.UserID,
        RoleID:     req.RoleID,
        AssignedBy: req.AssignedBy,
        AssignedAt: time.Now(),
    }

    err = s.repo.CreateUserRole(ctx, userRole)
    if err != nil {
        return err
    }

    // 4. 将用户-角色关系同步到Casbin
    domain := string(role.RoleDomain)
    groupRule := entity.NewGroupRule(
        fmt.Sprintf("user:%d", req.UserID),
        role.RoleCode,
        domain,
    )

    err = s.casbinRepo.CreateGroupRule(ctx, groupRule)
    if err != nil {
        return err
    }

    return nil
}
```

### 3. 权限检查服务

```go
type PermissionChecker interface {
    // 单个权限检查
    CheckPermission(ctx context.Context, req *CheckPermissionRequest) (bool, error)

    // 批量权限检查
    BatchCheckPermissions(ctx context.Context, reqs []*CheckPermissionRequest) ([]bool, error)
}

type CheckPermissionRequest struct {
    UserID     int64  `json:"user_id"`
    SpaceID    *int64 `json:"space_id"`    // 可选，空间级权限
    Resource   string `json:"resource"`     // 资源类型
    ResourceID string `json:"resource_id"`  // 资源ID，"*"表示所有
    Action     string `json:"action"`       // 操作
}
```

**权限检查实现：**

```go
func (c *CasbinRuleChecker) CheckPermission(ctx context.Context, req *CheckPermissionRequest) (bool, error) {
    // 1. 检查是否是超级管理员
    isSuperAdmin, err := c.checkSuperAdmin(ctx, req.UserID)
    if err != nil {
        return false, err
    }
    if isSuperAdmin {
        return true, nil // 超级管理员拥有所有权限
    }

    // 2. 构造Casbin检查参数
    subject := fmt.Sprintf("user:%d", req.UserID)

    domain := "global"
    if req.SpaceID != nil {
        domain = fmt.Sprintf("space:%d", *req.SpaceID)
    }

    object := fmt.Sprintf("%s:%s", req.Resource, req.ResourceID)
    action := req.Action

    // 3. 获取用户在指定域的角色
    userRoles, err := c.getUserRoles(ctx, req.UserID, domain)
    if err != nil {
        return false, err
    }

    // 4. 检查直接用户权限
    allowed, err := c.checkPolicyPermission(ctx, subject, domain, object, action)
    if err != nil {
        return false, err
    }
    if allowed {
        return true, nil
    }

    // 5. 检查角色权限
    for _, roleCode := range userRoles {
        allowed, err := c.checkPolicyPermission(ctx, roleCode, domain, object, action)
        if err != nil {
            return false, err
        }
        if allowed {
            return true, nil
        }
    }

    return false, nil
}

// 获取用户角色
func (c *CasbinRuleChecker) getUserRoles(ctx context.Context, userID int64, domain string) ([]string, error) {
    var rules []CasbinRule
    subject := fmt.Sprintf("user:%d", userID)

    query := c.db.WithContext(ctx).
        Where("ptype = ? AND v0 = ?", "g", subject)

    if domain != "" {
        query = query.Where("v2 = ?", domain)
    }

    err := query.Find(&rules).Error
    if err != nil {
        return nil, err
    }

    roles := make([]string, len(rules))
    for i, rule := range rules {
        roles[i] = rule.V1 // 角色代码在V1字段
    }

    return roles, nil
}

// 检查策略权限
func (c *CasbinRuleChecker) checkPolicyPermission(ctx context.Context, subject, domain, object, action string) (bool, error) {
    // 先检查deny规则
    denyCount := int64(0)
    err := c.db.WithContext(ctx).
        Model(&CasbinRule{}).
        Where("ptype = ? AND v0 = ? AND v1 = ? AND v2 = ? AND v3 = ? AND v4 = ?",
            "p", subject, domain, object, action, "deny").
        Count(&denyCount).Error
    if err != nil {
        return false, err
    }
    if denyCount > 0 {
        return false, nil // 明确拒绝优先
    }

    // 检查allow规则
    allowCount := int64(0)
    err = c.db.WithContext(ctx).
        Model(&CasbinRule{}).
        Where("ptype = ? AND v0 = ? AND v1 = ? AND v2 = ? AND v3 = ? AND v4 = ?",
            "p", subject, domain, object, action, "allow").
        Count(&allowCount).Error
    if err != nil {
        return false, err
    }

    return allowCount > 0, nil
}
```

## API 接口设计

### 1. 角色管理 API

```go
// 创建角色
// POST /api/permission_api/role/create
type CreateRoleRequest struct {
    RoleCode      string                `json:"role_code" binding:"required"`
    RoleName      string                `json:"role_name" binding:"required"`
    RoleDomain    entity.RoleDomain     `json:"role_domain" binding:"required"`
    SpaceRoleType entity.SpaceRoleType  `json:"space_role_type"`
    Permissions   string                `json:"permissions" binding:"required"`
    Description   string                `json:"description"`
}

// 更新角色
// POST /api/permission_api/role/update
type UpdateRoleRequest struct {
    ID          int64   `json:"id" binding:"required"`
    RoleName    *string `json:"role_name"`
    Permissions *string `json:"permissions"`
    Description *string `json:"description"`
}

// 删除角色
// POST /api/permission_api/role/delete
type DeleteRoleRequest struct {
    ID int64 `json:"id" binding:"required"`
}

// 获取角色
// GET /api/permission_api/role/get?id=123
type GetRoleRequest struct {
    ID int64 `json:"id" form:"id" binding:"required"`
}

// 列出角色
// POST /api/permission_api/role/list
type ListRolesRequest struct {
    RoleDomain    *entity.RoleDomain    `json:"role_domain"`
    SpaceRoleType *entity.SpaceRoleType `json:"space_role_type"`
    IsBuiltin     *int32                `json:"is_builtin"`
    IsDisabled    *entity.RoleStatus    `json:"is_disabled"`
    Keyword       *string               `json:"keyword"`
    Page          int                   `json:"page" binding:"required"`
    Limit         int                   `json:"limit" binding:"required"`
}
```

### 2. 用户角色管理 API

```go
// 分配多个角色给用户
// POST /api/permission_api/user/assign_roles
type AssignUserMultipleRolesRequest struct {
    UserID     int64   `json:"user_id" binding:"required"`
    RoleIDs    []int64 `json:"role_ids" binding:"required"`
    AssignedBy int64   `json:"assigned_by"`
}

// 获取用户角色
// GET /api/permission_api/user/roles?user_id=123
type GetUserRolesRequest struct {
    UserID int64 `json:"user_id" form:"user_id" binding:"required"`
}

// 取消用户角色
// POST /api/permission_api/user/unassign_roles
type UnassignUserRolesRequest struct {
    UserID  int64   `json:"user_id" binding:"required"`
    RoleIDs []int64 `json:"role_ids" binding:"required"`
}
```

### 3. 权限模板 API

```go
// 列出权限模板
// POST /api/permission_api/template/list
type ListPermissionTemplatesRequest struct {
    Domain    *string                            `json:"domain"`
    Resource  *string                            `json:"resource"`
    IsActive  *entity.PermissionTemplateStatus   `json:"is_active"`
    IsDefault *int32                             `json:"is_default"`
    Keyword   *string                            `json:"keyword"`
    Page      int                                `json:"page" binding:"required"`
    Limit     int                                `json:"limit" binding:"required"`
}
```

## 中间件集成

### 权限检查中间件

```go
// 检查空间权限的中间件
func SpacePermissionMiddleware(resource, action string) app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        // 1. 获取用户ID和空间ID
        userID := getUserIDFromContext(c)
        spaceID := getSpaceIDFromRequest(c)

        // 2. 构造权限检查请求
        req := &CheckPermissionRequest{
            UserID:     userID,
            SpaceID:    &spaceID,
            Resource:   resource,
            ResourceID: "*",
            Action:     action,
        }

        // 3. 执行权限检查
        allowed, err := permissionChecker.CheckPermission(ctx, req)
        if err != nil {
            c.JSON(500, gin.H{"error": "permission check failed"})
            c.Abort()
            return
        }

        if !allowed {
            c.JSON(403, gin.H{"error": "permission denied"})
            c.Abort()
            return
        }

        c.Next()
    }
}

// 使用示例
router.POST("/api/agent/create",
    SpacePermissionMiddleware("agent", "create"),
    agentHandler.CreateAgent,
)

router.DELETE("/api/agent/:id",
    SpacePermissionMiddleware("agent", "delete"),
    agentHandler.DeleteAgent,
)
```

### 资源所有权检查

```go
// 检查资源所有权的中间件
func ResourceOwnershipMiddleware(resourceType string) app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        userID := getUserIDFromContext(c)
        resourceID := c.Param("id")

        // 1. 查询资源信息
        resource, err := getResource(ctx, resourceType, resourceID)
        if err != nil {
            c.JSON(404, gin.H{"error": "resource not found"})
            c.Abort()
            return
        }

        // 2. 检查是否是资源创建者
        if resource.CreatorID == userID {
            c.Set("is_owner", true)
            c.Next()
            return
        }

        // 3. 检查空间权限
        req := &CheckPermissionRequest{
            UserID:     userID,
            SpaceID:    &resource.SpaceID,
            Resource:   resourceType,
            ResourceID: resourceID,
            Action:     getActionFromRequest(c),
        }

        allowed, err := permissionChecker.CheckPermission(ctx, req)
        if err != nil || !allowed {
            c.JSON(403, gin.H{"error": "permission denied"})
            c.Abort()
            return
        }

        c.Set("is_owner", false)
        c.Next()
    }
}
```

## 开发实践

### 1. 新增资源类型

当添加新的资源类型（如 Database）时，需要执行以下步骤：

**Step 1: 在 consts.go 中定义资源类型**

```go
// backend/domain/permission/consts.go
const (
    ResourceTypeDatabase ResourceType = 23
)
```

**Step 2: 创建权限模板数据**

```sql
INSERT INTO permission_template (
    template_code, template_name, domain, resource, resource_name,
    action, action_name, description, is_default, sort_order, is_active
) VALUES
('database_create', '创建数据库', 'space', 'database', '数据库', 'create', '创建', '创建新数据库', 1, 1, 1),
('database_read', '查看数据库', 'space', 'database', '数据库', 'read', '查看', '查看数据库详情', 1, 2, 1),
('database_update', '更新数据库', 'space', 'database', '数据库', 'update', '更新', '更新数据库配置', 1, 3, 1),
('database_delete', '删除数据库', 'space', 'database', '数据库', 'delete', '删除', '删除数据库', 1, 4, 1),
('database_query', '查询数据', 'space', 'database', '数据库', 'query', '查询', '查询数据库数据', 1, 5, 1);
```

**Step 3: 更新内置角色权限**

```json
{
  "resources": [
    {
      "resource": "database",
      "actions": ["create", "read", "update", "delete", "query"]
    }
  ]
}
```

**Step 4: 添加权限检查中间件**

```go
// 数据库API路由
router.POST("/api/database/create",
    authMiddleware,
    SpacePermissionMiddleware("database", "create"),
    databaseHandler.CreateDatabase,
)

router.POST("/api/database/:id/query",
    authMiddleware,
    ResourceOwnershipMiddleware("database"),
    SpacePermissionMiddleware("database", "query"),
    databaseHandler.QueryDatabase,
)
```

### 2. 自定义角色创建流程

```go
// 1. 定义权限配置
permissions := PermissionConfig{
    Resources: []ResourcePermission{
        {
            Resource: "agent",
            Actions:  []string{"create", "read", "update", "execute"},
        },
        {
            Resource: "workflow",
            Actions:  []string{"read", "execute"},
        },
        {
            Resource: "knowledge",
            Actions:  []string{"read"},
        },
    },
}

permissionsJSON, _ := json.Marshal(permissions)

// 2. 创建角色
req := &CreateRoleRequest{
    RoleCode:      "custom_developer",
    RoleName:      "开发者",
    RoleDomain:    RoleDomainSpace,
    SpaceRoleType: SpaceRoleTypeNormal,
    Permissions:   string(permissionsJSON),
    Description:   "自定义开发者角色，可创建和编辑智能体，查看工作流",
    CreatedBy:     currentUserID,
}

resp, err := roleService.CreateRole(ctx, req)

// 3. 分配角色给用户
assignReq := &AssignUserToRoleRequest{
    UserID:     targetUserID,
    RoleID:     resp.Role.ID,
    AssignedBy: currentUserID,
}

err = userRoleService.AssignUserToRole(ctx, assignReq)
```

### 3. 权限检查最佳实践

```go
// ✅ 推荐：在Handler中进行权限检查
func (h *AgentHandler) UpdateAgent(ctx context.Context, c *app.RequestContext) {
    userID := getUserIDFromContext(c)
    agentID := c.Param("id")

    // 1. 查询智能体
    agent, err := h.agentService.GetAgentByID(ctx, agentID)
    if err != nil {
        c.JSON(404, gin.H{"error": "agent not found"})
        return
    }

    // 2. 检查权限：是创建者或有update权限
    if agent.CreatorID != userID {
        allowed, err := h.permissionChecker.CheckPermission(ctx, &CheckPermissionRequest{
            UserID:     userID,
            SpaceID:    &agent.SpaceID,
            Resource:   "agent",
            ResourceID: agentID,
            Action:     "update",
        })

        if err != nil || !allowed {
            c.JSON(403, gin.H{"error": "permission denied"})
            return
        }
    }

    // 3. 执行更新逻辑
    // ...
}

// ❌ 不推荐：跳过权限检查
func (h *AgentHandler) UpdateAgent(ctx context.Context, c *app.RequestContext) {
    // 直接更新，没有权限检查
    // ...
}
```

### 4. 批量权限检查

```go
// 查询资源列表时，批量检查权限
func (h *AgentHandler) ListAgents(ctx context.Context, c *app.RequestContext) {
    userID := getUserIDFromContext(c)
    spaceID := getSpaceIDFromRequest(c)

    // 1. 查询所有智能体
    agents, err := h.agentService.ListAgentsBySpace(ctx, spaceID)
    if err != nil {
        c.JSON(500, gin.H{"error": "query failed"})
        return
    }

    // 2. 构造批量权限检查请求
    checkReqs := make([]*CheckPermissionRequest, len(agents))
    for i, agent := range agents {
        checkReqs[i] = &CheckPermissionRequest{
            UserID:     userID,
            SpaceID:    &spaceID,
            Resource:   "agent",
            ResourceID: fmt.Sprintf("%d", agent.AgentID),
            Action:     "read",
        }
    }

    // 3. 批量检查权限
    results, err := h.permissionChecker.BatchCheckPermissions(ctx, checkReqs)
    if err != nil {
        c.JSON(500, gin.H{"error": "permission check failed"})
        return
    }

    // 4. 过滤有权限的资源
    allowedAgents := make([]*Agent, 0)
    for i, allowed := range results {
        if allowed {
            allowedAgents = append(allowedAgents, agents[i])
        }
    }

    c.JSON(200, allowedAgents)
}
```

## 性能优化

### 1. 权限缓存

```go
type PermissionCache struct {
    cache *redis.Client
    ttl   time.Duration
}

func (c *PermissionCache) CheckPermission(ctx context.Context, req *CheckPermissionRequest) (bool, error) {
    // 1. 生成缓存键
    cacheKey := fmt.Sprintf("perm:%d:%s:%s:%s:%s",
        req.UserID,
        getDomain(req.SpaceID),
        req.Resource,
        req.ResourceID,
        req.Action,
    )

    // 2. 尝试从缓存获取
    cached, err := c.cache.Get(ctx, cacheKey).Result()
    if err == nil {
        return cached == "1", nil
    }

    // 3. 执行实际权限检查
    allowed, err := c.checker.CheckPermission(ctx, req)
    if err != nil {
        return false, err
    }

    // 4. 写入缓存
    value := "0"
    if allowed {
        value = "1"
    }
    c.cache.Set(ctx, cacheKey, value, c.ttl)

    return allowed, nil
}
```

### 2. 角色权限预加载

```go
func (s *userService) GetUserWithPermissions(ctx context.Context, userID int64) (*UserWithPermissions, error) {
    // 1. 查询用户信息
    user, err := s.repo.GetUserByID(ctx, userID)
    if err != nil {
        return nil, err
    }

    // 2. 查询用户所有角色（全局+所有空间）
    globalRoles, err := s.userRoleService.GetUserRoles(ctx, &GetUserRolesRequest{UserID: userID})
    if err != nil {
        return nil, err
    }

    spaces, err := s.spaceRepo.GetUserSpaces(ctx, userID)
    if err != nil {
        return nil, err
    }

    // 3. 构造权限映射
    permissionMap := make(map[string]map[string][]string) // domain -> resource -> actions

    // 全局权限
    for _, ur := range globalRoles.UserRoles {
        role, _ := s.roleService.GetRoleByID(ctx, &GetRoleByIDRequest{ID: ur.RoleID})
        addToPermissionMap(permissionMap, "global", role.Permissions)
    }

    // 空间权限
    for _, space := range spaces {
        domain := fmt.Sprintf("space:%d", space.SpaceID)
        role, _ := s.roleService.GetRoleByID(ctx, &GetRoleByIDRequest{ID: space.RoleID})
        addToPermissionMap(permissionMap, domain, role.Permissions)
    }

    return &UserWithPermissions{
        User:        user,
        Permissions: permissionMap,
    }, nil
}
```

## 调试和故障排查

### 1. 权限检查日志

```go
func (c *CasbinRuleChecker) CheckPermissionWithLog(ctx context.Context, req *CheckPermissionRequest) (bool, error) {
    startTime := time.Now()

    allowed, err := c.CheckPermission(ctx, req)

    duration := time.Since(startTime)

    // 记录权限检查日志
    log.Info().
        Int64("user_id", req.UserID).
        Str("resource", req.Resource).
        Str("resource_id", req.ResourceID).
        Str("action", req.Action).
        Bool("allowed", allowed).
        Dur("duration_ms", duration).
        Err(err).
        Msg("permission check")

    return allowed, err
}
```

### 2. 权限诊断工具

```go
// 诊断用户权限
func DiagnoseUserPermission(ctx context.Context, userID int64, spaceID *int64, resource, action string) *PermissionDiagnosis {
    diagnosis := &PermissionDiagnosis{
        UserID:   userID,
        Resource: resource,
        Action:   action,
    }

    // 1. 检查是否是超级管理员
    isSuperAdmin, _ := checkSuperAdmin(ctx, userID)
    diagnosis.IsSuperAdmin = isSuperAdmin
    if isSuperAdmin {
        diagnosis.Result = "ALLOWED (Super Admin)"
        return diagnosis
    }

    // 2. 获取用户角色
    domain := "global"
    if spaceID != nil {
        domain = fmt.Sprintf("space:%d", *spaceID)
    }

    userRoles, _ := getUserRoles(ctx, userID, domain)
    diagnosis.Roles = userRoles

    // 3. 检查每个角色的权限
    for _, roleCode := range userRoles {
        hasPermission, _ := checkPolicyPermission(ctx, roleCode, domain, resource+":*", action)
        diagnosis.RolePermissions = append(diagnosis.RolePermissions, RolePermissionCheck{
            RoleCode:      roleCode,
            HasPermission: hasPermission,
        })

        if hasPermission {
            diagnosis.Result = fmt.Sprintf("ALLOWED (Role: %s)", roleCode)
            return diagnosis
        }
    }

    diagnosis.Result = "DENIED"
    return diagnosis
}

type PermissionDiagnosis struct {
    UserID           int64
    Resource         string
    Action           string
    IsSuperAdmin     bool
    Roles            []string
    RolePermissions  []RolePermissionCheck
    Result           string
}
```

## 总结

Coze Plus 的权限系统通过 Casbin 实现了灵活的 RBAC 权限控制：

- **分层设计**：API → Application → Domain → Infrastructure 四层架构
- **双域模型**：Global 和 Space 两个权限域，满足不同场景需求
- **灵活扩展**：支持自定义角色和权限模板
- **性能优化**：多级缓存、批量检查、权限预加载
- **易于调试**：完善的日志和诊断工具

通过遵循本文档的设计原则和最佳实践，可以安全、高效地实现和扩展权限功能。
