# 工作空间设计方案

## 概述

Coze Plus 的工作空间（Space）是组织和管理 AI 资源的核心容器。每个工作空间提供了独立的资源隔离、成员协作和权限管理能力，支持个人开发和团队协作两种模式。

## 设计目标

- **资源隔离**：不同空间的资源完全隔离，互不干扰
- **灵活协作**：支持多人协作，提供细粒度的角色和权限控制
- **易于管理**：简化空间创建、成员邀请和权限配置流程
- **可扩展性**：支持从个人使用到大规模团队协作的平滑过渡

## 核心概念

### 1. 工作空间（Space）

工作空间是 Coze Plus 中最基本的组织单元，所有的 AI 资源（智能体、工作流、知识库、插件等）都归属于某个工作空间。

#### 空间类型

```go
type SpaceType int32

const (
    SpaceTypePersonal SpaceType = 1  // 个人空间
    SpaceTypeTeam     SpaceType = 2  // 团队空间
)
```

| 空间类型 | 描述 | 适用场景 | 特点 |
|---------|------|---------|------|
| 个人空间 | 用户注册时自动创建的私有空间 | 个人学习、实验、原型开发 | 默认只有创建者可访问 |
| 团队空间 | 多人协作的共享空间 | 团队项目、企业应用开发 | 支持成员邀请和角色管理 |

### 2. 空间实体（Space Entity）

```go
type Space struct {
    ID          int64     `json:"id"`           // 空间ID
    Name        string    `json:"name"`         // 空间名称
    Description string    `json:"description"`  // 空间描述
    IconURL     string    `json:"icon_url"`     // 空间图标URL
    SpaceType   SpaceType `json:"space_type"`   // 空间类型
    OwnerID     int64     `json:"owner_id"`     // 所有者ID
    CreatorID   int64     `json:"creator_id"`   // 创建者ID
    CreatedAt   int64     `json:"created_at"`   // 创建时间（毫秒）
    UpdatedAt   int64     `json:"updated_at"`   // 更新时间（毫秒）
}
```

**字段说明：**

- **ID**：空间唯一标识符，全局递增
- **Name**：空间显示名称，支持中英文和特殊字符
- **Description**：空间描述信息，用于说明空间用途
- **IconURL**：空间图标的存储路径或URL
- **SpaceType**：区分个人空间和团队空间
- **OwnerID**：空间所有者，拥有最高权限
- **CreatorID**：空间创建者，通常与OwnerID相同
- **CreatedAt/UpdatedAt**：时间戳，用于审计和排序

### 3. 空间成员（Space User）

空间成员关联用户与工作空间，定义了用户在空间内的角色和权限。

```go
type SpaceUser struct {
    ID        int64  `json:"id"`         // 记录ID
    SpaceID   int64  `json:"space_id"`   // 空间ID
    UserID    int64  `json:"user_id"`    // 用户ID
    RoleType  int32  `json:"role_type"`  // 角色类型：1.owner 2.admin 3.member
    RoleID    int64  `json:"role_id"`    // 自定义角色ID（可选）
    CreatedAt int64  `json:"created_at"` // 加入时间
    UpdatedAt int64  `json:"updated_at"` // 更新时间
    ExpiredAt int64  `json:"expired_at"` // 权限过期时间（NULL表示永久）
}
```

## 空间角色设计

### 角色层级

Coze Plus 的空间角色采用三级层级设计：

```
空间所有者 (Owner)
    ├── 空间管理员 (Admin)
    │   └── 空间成员 (Member)
```

### 角色类型定义

```go
const (
    RoleTypeOwner  = 1  // 空间所有者
    RoleTypeAdmin  = 2  // 空间管理员
    RoleTypeMember = 3  // 空间成员（默认）
)
```

### 角色权限矩阵

| 权限项 | 所有者 (Owner) | 管理员 (Admin) | 成员 (Member) |
|-------|---------------|---------------|--------------|
| **空间管理** |
| 修改空间信息 | ✓ | ✓ | ✗ |
| 删除空间 | ✓ | ✗ | ✗ |
| 转让空间所有权 | ✓ | ✗ | ✗ |
| **成员管理** |
| 邀请新成员 | ✓ | ✓ | ✗ |
| 移除成员 | ✓ | ✓ | ✗ |
| 修改成员角色 | ✓ | ✓ (不能设置Owner) | ✗ |
| 查看成员列表 | ✓ | ✓ | ✓ |
| **资源管理** |
| 创建智能体/工作流 | ✓ | ✓ | ✓ |
| 编辑自己的资源 | ✓ | ✓ | ✓ |
| 编辑他人的资源 | ✓ | ✓ | ✗ (需授权) |
| 删除自己的资源 | ✓ | ✓ | ✓ |
| 删除他人的资源 | ✓ | ✓ | ✗ |
| 发布资源 | ✓ | ✓ | ✓ |
| **知识库管理** |
| 创建知识库 | ✓ | ✓ | ✓ |
| 上传文档 | ✓ | ✓ | ✓ |
| 管理文档分片 | ✓ | ✓ | ✓ |
| **插件管理** |
| 安装插件 | ✓ | ✓ | ✗ |
| 卸载插件 | ✓ | ✓ | ✗ |
| 配置插件 | ✓ | ✓ | ✗ |

### 自定义角色

除了内置的三种角色类型，Coze Plus 还支持自定义角色：

- 通过 `role_id` 字段关联到自定义角色定义
- 当 `role_id` 为 NULL 时，使用 `role_type` 的默认权限
- 自定义角色可以精确控制每个资源类型和操作的权限

## 数据库设计

### 1. 空间表（space）

```sql
CREATE TABLE IF NOT EXISTS `space` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primary Key ID, Space ID',
  `owner_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Owner ID',
  `name` varchar(200) NOT NULL DEFAULT '' COMMENT 'Space Name',
  `description` varchar(2000) NOT NULL DEFAULT '' COMMENT 'Space Description',
  `icon_uri` varchar(200) NOT NULL DEFAULT '' COMMENT 'Icon URI',
  `space_type` int NOT NULL DEFAULT 1 COMMENT 'Space Type: 1.Personal 2.Team',
  `creator_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Creator ID',
  `created_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Creation Time (Milliseconds)',
  `updated_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Update Time (Milliseconds)',
  `deleted_at` bigint unsigned NULL COMMENT 'Deletion Time (Milliseconds)',
  PRIMARY KEY (`id`),
  INDEX `idx_creator_id` (`creator_id`),
  INDEX `idx_owner_id` (`owner_id`)
) ENGINE=InnoDB CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Space Table';
```

**索引设计：**

- `PRIMARY KEY (id)`：主键索引，用于快速查找
- `idx_creator_id`：创建者索引，用于查询用户创建的所有空间
- `idx_owner_id`：所有者索引，用于查询用户拥有的空间

### 2. 空间成员表（space_user）

```sql
CREATE TABLE IF NOT EXISTS `space_user` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'Primary Key ID, Auto Increment',
  `space_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Space ID',
  `user_id` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'User ID',
  `role_type` int NOT NULL DEFAULT 3 COMMENT 'Role Type: 1.owner 2.admin 3.member',
  `role_id` bigint unsigned NULL COMMENT 'Custom role ID (NULL uses role_type)',
  `created_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Creation Time (Milliseconds)',
  `updated_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Update Time (Milliseconds)',
  `expired_at` bigint unsigned NULL COMMENT 'Permission expiration time (NULL means permanent)',
  PRIMARY KEY (`id`),
  INDEX `idx_role_id` (`role_id`),
  INDEX `idx_user_id` (`user_id`),
  UNIQUE INDEX `uniq_space_user` (`space_id`, `user_id`)
) ENGINE=InnoDB CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Space Member Table';
```

**索引设计：**

- `PRIMARY KEY (id)`：主键索引
- `idx_user_id`：用户索引，用于查询用户参与的所有空间
- `idx_role_id`：角色索引，用于自定义角色查询
- `uniq_space_user`：唯一约束，确保一个用户在同一空间只有一条记录

**设计亮点：**

1. **双角色支持**：同时支持 `role_type`（内置角色）和 `role_id`（自定义角色）
2. **权限过期**：`expired_at` 字段支持临时权限授予
3. **唯一约束**：防止重复添加同一用户

## 核心功能实现

### 1. 空间创建

#### 个人空间自动创建

用户注册时，系统自动创建个人空间：

```go
func (u *userImpl) CreateUser(ctx context.Context, req *CreateUserRequest) (*User, error) {
    // 1. 创建用户记录
    userID, err := u.UserRepo.CreateUser(ctx, &model.User{
        Email:      req.Email,
        UniqueName: req.UniqueName,
        Password:   hashedPassword,
    })
    if err != nil {
        return nil, err
    }

    // 2. 自动创建个人空间
    space := &model.Space{
        Name:        req.UniqueName + "'s Space",
        Description: "Personal workspace",
        SpaceType:   entity.SpaceTypePersonal,
        OwnerID:     userID,
        CreatorID:   userID,
    }

    err = u.SpaceRepo.CreateSpace(ctx, space)
    if err != nil {
        return nil, err
    }

    // 3. 将用户添加为空间所有者
    spaceUser := &model.SpaceUser{
        SpaceID:  space.ID,
        UserID:   userID,
        RoleType: 1, // Owner
    }

    err = u.SpaceRepo.AddSpaceUser(ctx, spaceUser)
    return user, err
}
```

#### 团队空间创建

```go
func (s *spaceService) CreateTeamSpace(ctx context.Context, req *CreateSpaceRequest) (*Space, error) {
    // 1. 验证用户权限
    if !canCreateTeamSpace(ctx, req.CreatorID) {
        return nil, errors.New("no permission to create team space")
    }

    // 2. 创建团队空间
    space := &model.Space{
        Name:        req.Name,
        Description: req.Description,
        IconURI:     req.IconURI,
        SpaceType:   entity.SpaceTypeTeam,
        OwnerID:     req.CreatorID,
        CreatorID:   req.CreatorID,
    }

    err := s.repo.CreateSpace(ctx, space)
    if err != nil {
        return nil, err
    }

    // 3. 添加创建者为所有者
    spaceUser := &model.SpaceUser{
        SpaceID:  space.ID,
        UserID:   req.CreatorID,
        RoleType: 1, // Owner
    }

    err = s.repo.AddSpaceUser(ctx, spaceUser)
    if err != nil {
        return nil, err
    }

    return spaceModel2Entity(space), nil
}
```

### 2. 成员管理

#### 邀请成员

```go
func (s *spaceService) InviteMember(ctx context.Context, req *InviteMemberRequest) error {
    // 1. 验证邀请者权限（需要是Owner或Admin）
    inviter, err := s.repo.GetSpaceUser(ctx, req.SpaceID, req.InviterID)
    if err != nil {
        return err
    }

    if inviter.RoleType != 1 && inviter.RoleType != 2 {
        return errors.New("no permission to invite members")
    }

    // 2. 检查被邀请用户是否已存在
    exists, err := s.repo.CheckSpaceUserExists(ctx, req.SpaceID, req.UserID)
    if err != nil {
        return err
    }
    if exists {
        return errors.New("user already in space")
    }

    // 3. 添加成员（默认角色为Member）
    spaceUser := &model.SpaceUser{
        SpaceID:  req.SpaceID,
        UserID:   req.UserID,
        RoleType: 3, // Member
    }

    return s.repo.AddSpaceUser(ctx, spaceUser)
}
```

#### 修改成员角色

```go
func (s *spaceService) UpdateMemberRole(ctx context.Context, req *UpdateMemberRoleRequest) error {
    // 1. 验证操作者权限
    operator, err := s.repo.GetSpaceUser(ctx, req.SpaceID, req.OperatorID)
    if err != nil {
        return err
    }

    // 2. 只有Owner可以设置Admin，Admin可以设置Member
    if req.NewRoleType == 1 && operator.RoleType != 1 {
        return errors.New("only owner can set admin role")
    }

    if operator.RoleType != 1 && operator.RoleType != 2 {
        return errors.New("no permission to update member role")
    }

    // 3. 不能修改自己的角色
    if req.OperatorID == req.TargetUserID {
        return errors.New("cannot update own role")
    }

    // 4. 更新角色
    return s.repo.UpdateSpaceUserRole(ctx, req.SpaceID, req.TargetUserID, req.NewRoleType)
}
```

#### 移除成员

```go
func (s *spaceService) RemoveMember(ctx context.Context, req *RemoveMemberRequest) error {
    // 1. 验证操作者权限（Owner或Admin）
    operator, err := s.repo.GetSpaceUser(ctx, req.SpaceID, req.OperatorID)
    if err != nil {
        return err
    }

    if operator.RoleType != 1 && operator.RoleType != 2 {
        return errors.New("no permission to remove members")
    }

    // 2. 获取目标成员信息
    target, err := s.repo.GetSpaceUser(ctx, req.SpaceID, req.TargetUserID)
    if err != nil {
        return err
    }

    // 3. Admin不能移除Owner，也不能移除其他Admin
    if operator.RoleType == 2 && target.RoleType <= 2 {
        return errors.New("admin cannot remove owner or other admins")
    }

    // 4. 不能移除空间所有者
    space, err := s.repo.GetSpaceByID(ctx, req.SpaceID)
    if err != nil {
        return err
    }

    if req.TargetUserID == space.OwnerID {
        return errors.New("cannot remove space owner")
    }

    // 5. 移除成员
    return s.repo.RemoveSpaceUser(ctx, req.SpaceID, req.TargetUserID)
}
```

### 3. 空间查询

#### 获取用户的所有空间

```go
func (dao *SpaceDAO) GetSpaceList(ctx context.Context, userID int64) ([]*SpaceWithRole, error) {
    // 1. 查询用户参与的所有空间
    spaceUsers, err := dao.query.SpaceUser.WithContext(ctx).
        Where(dao.query.SpaceUser.UserID.Eq(userID)).
        Find()
    if err != nil {
        return nil, err
    }

    // 2. 提取空间ID列表
    spaceIDs := make([]int64, len(spaceUsers))
    roleMap := make(map[int64]int32)
    for i, su := range spaceUsers {
        spaceIDs[i] = su.SpaceID
        roleMap[su.SpaceID] = su.RoleType
    }

    // 3. 批量查询空间信息
    spaces, err := dao.query.Space.WithContext(ctx).
        Where(dao.query.Space.ID.In(spaceIDs...)).
        Find()
    if err != nil {
        return nil, err
    }

    // 4. 组合空间信息和角色信息
    result := make([]*SpaceWithRole, len(spaces))
    for i, space := range spaces {
        result[i] = &SpaceWithRole{
            Space:    space,
            RoleType: roleMap[space.ID],
        }
    }

    return result, nil
}
```

#### 获取空间成员列表

```go
func (s *spaceService) GetSpaceMembers(ctx context.Context, req *GetSpaceMembersRequest) (*GetSpaceMembersResponse, error) {
    // 1. 验证请求者是空间成员
    isMember, err := s.repo.CheckSpaceUserExists(ctx, req.SpaceID, req.RequesterID)
    if err != nil {
        return nil, err
    }
    if !isMember {
        return nil, errors.New("not a space member")
    }

    // 2. 查询空间所有成员
    spaceUsers, err := s.repo.GetSpaceUsers(ctx, req.SpaceID)
    if err != nil {
        return nil, err
    }

    // 3. 批量查询用户信息
    userIDs := make([]int64, len(spaceUsers))
    for i, su := range spaceUsers {
        userIDs[i] = su.UserID
    }

    users, err := s.userRepo.GetUsersByIDs(ctx, userIDs)
    if err != nil {
        return nil, err
    }

    // 4. 组合成员信息
    members := make([]*SpaceMember, len(spaceUsers))
    userMap := make(map[int64]*User)
    for _, u := range users {
        userMap[u.ID] = u
    }

    for i, su := range spaceUsers {
        user := userMap[su.UserID]
        members[i] = &SpaceMember{
            UserID:    su.UserID,
            UserName:  user.UniqueName,
            Email:     user.Email,
            Avatar:    user.IconURL,
            RoleType:  su.RoleType,
            JoinedAt:  su.CreatedAt,
        }
    }

    return &GetSpaceMembersResponse{
        Members: members,
        Total:   len(members),
    }, nil
}
```

## 权限控制集成

### 权限检查中间件

```go
func SpacePermissionMiddleware() app.HandlerFunc {
    return func(ctx context.Context, c *app.RequestContext) {
        // 1. 提取用户ID和空间ID
        userID := getUserIDFromContext(ctx, c)
        spaceID := getSpaceIDFromRequest(c)

        // 2. 检查用户是否是空间成员
        isMember, err := spaceRepo.CheckSpaceUserExists(ctx, spaceID, userID)
        if err != nil {
            c.JSON(500, gin.H{"error": "permission check failed"})
            c.Abort()
            return
        }

        if !isMember {
            c.JSON(403, gin.H{"error": "not a space member"})
            c.Abort()
            return
        }

        // 3. 获取用户在空间的角色
        spaceUser, err := spaceRepo.GetSpaceUser(ctx, spaceID, userID)
        if err != nil {
            c.JSON(500, gin.H{"error": "failed to get user role"})
            c.Abort()
            return
        }

        // 4. 将角色信息存入上下文
        c.Set("space_role_type", spaceUser.RoleType)
        c.Set("space_role_id", spaceUser.RoleID)

        c.Next()
    }
}
```

### 资源归属检查

所有资源（智能体、工作流、知识库等）都通过 `space_id` 字段关联到工作空间：

```go
// 智能体实体
type SingleAgent struct {
    AgentID   int64
    SpaceID   int64  // 所属空间ID
    CreatorID int64  // 创建者ID
    // ... 其他字段
}

// 工作流实体
type Workflow struct {
    WorkflowID int64
    SpaceID    int64  // 所属空间ID
    CreatorID  int64  // 创建者ID
    // ... 其他字段
}
```

访问资源时的权限检查：

```go
func CheckResourceAccess(ctx context.Context, userID, resourceSpaceID int64) (bool, error) {
    // 1. 检查用户是否是资源所在空间的成员
    isMember, err := spaceRepo.CheckSpaceUserExists(ctx, resourceSpaceID, userID)
    if err != nil {
        return false, err
    }

    // 2. 如果是空间成员，则可以访问
    return isMember, nil
}
```

## 最佳实践

### 1. 空间规划

**个人空间使用建议：**
- 用于个人学习和实验
- 存放原型项目和测试资源
- 不要在个人空间中开发生产环境应用

**团队空间使用建议：**
- 为每个项目创建独立的团队空间
- 使用清晰的命名规范（如：项目名-环境）
- 定期清理不活跃的空间

### 2. 成员管理

**角色分配原则：**
- Owner：仅分配给项目负责人，数量控制在1-2人
- Admin：分配给核心团队成员，负责日常管理
- Member：普通开发者，可以创建和编辑自己的资源

**成员邀请流程：**
1. 确认新成员的职责和所需权限
2. 选择合适的角色类型
3. 发送邀请链接或直接添加
4. 新成员完成入职培训后开始工作

### 3. 权限管理

**权限最小化原则：**
- 默认给予 Member 角色，按需升级
- 使用自定义角色实现精细化权限控制
- 定期审查成员权限，及时回收不需要的权限

**临时权限授予：**
- 使用 `expired_at` 字段设置权限过期时间
- 适用于外部顾问、临时协作者等场景
- 到期后自动失效，无需手动回收

### 4. 空间迁移

当项目从个人空间迁移到团队空间时：

1. 创建新的团队空间
2. 将资源（智能体、工作流等）复制到团队空间
3. 邀请团队成员加入新空间
4. 验证所有功能正常后，归档个人空间中的旧资源

## 监控和审计

### 1. 空间使用统计

```sql
-- 统计每个空间的资源数量
SELECT
    s.id AS space_id,
    s.name AS space_name,
    COUNT(DISTINCT a.id) AS agent_count,
    COUNT(DISTINCT w.id) AS workflow_count,
    COUNT(DISTINCT k.id) AS knowledge_count
FROM space s
LEFT JOIN single_agent a ON s.id = a.space_id
LEFT JOIN workflow w ON s.id = w.space_id
LEFT JOIN knowledge k ON s.id = k.space_id
GROUP BY s.id, s.name;
```

### 2. 成员活跃度

```sql
-- 统计空间成员的活跃度
SELECT
    su.space_id,
    su.user_id,
    u.unique_name,
    su.role_type,
    COUNT(a.id) AS created_agents,
    MAX(a.updated_at) AS last_activity_time
FROM space_user su
JOIN user u ON su.user_id = u.id
LEFT JOIN single_agent a ON su.user_id = a.creator_id AND su.space_id = a.space_id
GROUP BY su.space_id, su.user_id, u.unique_name, su.role_type
ORDER BY last_activity_time DESC;
```

### 3. 权限变更日志

建议记录以下关键操作：
- 空间创建和删除
- 成员加入和离开
- 角色变更
- 所有权转让

## 常见问题

### Q1: 如何转让空间所有权？

**A:** 空间所有权转让需要以下步骤：

1. 当前Owner将目标用户添加为Admin（如果尚未加入）
2. 调用转让接口，将 `owner_id` 更新为新Owner
3. 更新 `space_user` 表，将原Owner角色改为Admin，新Owner角色改为Owner
4. 通知所有空间成员所有权变更

```go
func (s *spaceService) TransferOwnership(ctx context.Context, req *TransferOwnershipRequest) error {
    // 1. 验证当前Owner身份
    space, err := s.repo.GetSpaceByID(ctx, req.SpaceID)
    if err != nil {
        return err
    }

    if space.OwnerID != req.CurrentOwnerID {
        return errors.New("not the space owner")
    }

    // 2. 确保新Owner已经是空间成员
    newOwner, err := s.repo.GetSpaceUser(ctx, req.SpaceID, req.NewOwnerID)
    if err != nil {
        return errors.New("new owner is not a space member")
    }

    // 3. 事务：更新空间所有者 + 更新角色
    return s.repo.WithTransaction(ctx, func(tx *gorm.DB) error {
        // 更新空间所有者
        if err := tx.Model(&model.Space{}).
            Where("id = ?", req.SpaceID).
            Update("owner_id", req.NewOwnerID).Error; err != nil {
            return err
        }

        // 原Owner降级为Admin
        if err := tx.Model(&model.SpaceUser{}).
            Where("space_id = ? AND user_id = ?", req.SpaceID, req.CurrentOwnerID).
            Update("role_type", 2).Error; err != nil {
            return err
        }

        // 新Owner升级为Owner角色
        if err := tx.Model(&model.SpaceUser{}).
            Where("space_id = ? AND user_id = ?", req.SpaceID, req.NewOwnerID).
            Update("role_type", 1).Error; err != nil {
            return err
        }

        return nil
    })
}
```

### Q2: 删除空间时如何处理空间内的资源？

**A:** 空间删除采用软删除策略：

1. 将空间的 `deleted_at` 字段设置为当前时间
2. 空间内所有资源自动失效（通过查询时过滤 `deleted_at IS NULL`）
3. 保留数据30天，期间可以恢复
4. 30天后通过定时任务物理删除

```go
func (s *spaceService) DeleteSpace(ctx context.Context, req *DeleteSpaceRequest) error {
    // 1. 验证Owner身份
    space, err := s.repo.GetSpaceByID(ctx, req.SpaceID)
    if err != nil {
        return err
    }

    if space.OwnerID != req.OperatorID {
        return errors.New("only owner can delete space")
    }

    // 2. 软删除空间
    now := time.Now().UnixMilli()
    return s.repo.SoftDeleteSpace(ctx, req.SpaceID, now)
}
```

### Q3: 如何限制用户创建的空间数量？

**A:** 可以在创建空间时增加配额检查：

```go
func (s *spaceService) CreateTeamSpace(ctx context.Context, req *CreateSpaceRequest) (*Space, error) {
    // 1. 查询用户已创建的空间数量
    count, err := s.repo.CountUserSpaces(ctx, req.CreatorID, entity.SpaceTypeTeam)
    if err != nil {
        return nil, err
    }

    // 2. 检查配额（可以从用户配置或订阅计划中获取）
    quota := getUserSpaceQuota(ctx, req.CreatorID)
    if count >= quota {
        return nil, errors.New("space quota exceeded")
    }

    // 3. 继续创建空间...
    // ...
}
```

### Q4: 空间成员可以同时属于多个空间吗？

**A:** 可以。一个用户可以加入多个空间，并在不同空间中拥有不同的角色：

- 在空间A中是Owner
- 在空间B中是Admin
- 在空间C中是Member

用户在切换空间时，系统会根据当前选择的空间ID加载对应的角色和权限。

### Q5: 如何实现空间级别的资源隔离？

**A:** 资源隔离通过以下机制保证：

1. **数据层隔离**：所有资源表都有 `space_id` 字段
2. **查询过滤**：所有查询都添加 `WHERE space_id = ?` 条件
3. **权限检查**：访问资源前验证用户是否是资源所在空间的成员
4. **中间件防护**：在API层增加空间权限检查中间件

```go
// 查询时自动添加空间过滤条件
func (r *agentRepo) GetAgentsBySpace(ctx context.Context, spaceID int64) ([]*Agent, error) {
    return r.query.SingleAgent.WithContext(ctx).
        Where(r.query.SingleAgent.SpaceID.Eq(spaceID)).
        Find()
}
```

## 总结

Coze Plus 的工作空间设计提供了灵活的多租户隔离和协作能力：

- **清晰的层级结构**：个人空间 → 团队空间，支持平滑迁移
- **细粒度角色管理**：Owner / Admin / Member 三级角色，支持自定义扩展
- **完善的权限控制**：与权限系统深度集成，确保资源安全
- **可扩展性**：支持从个人使用到企业级大规模协作

通过合理的空间规划和成员管理，可以高效地组织团队协作，提升开发效率。
