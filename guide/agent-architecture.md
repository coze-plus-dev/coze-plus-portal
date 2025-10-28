# 智能体技术架构

本文档深入介绍 Coze Plus 智能体（Agent）的技术架构，包括核心组件、执行引擎、工具系统、版本管理等内容。

## 概述

Coze Plus 的智能体是一个集成了 LLM、工具调用、知识库检索、数据库操作等多种能力的智能对话系统。智能体基于 **ReAct（Reasoning and Acting）** 模式，能够进行推理、决策并执行各种工具操作。

### 核心特性

| 特性 | 说明 |
|------|------|
| **多工具集成** | 支持插件、工作流、知识库、数据库、变量等多种工具 |
| **ReAct 引擎** | 基于 Eino 框架的 ReAct Agent 执行引擎 |
| **流式响应** | 支持流式消息推送和中间结果输出 |
| **版本管理** | 草稿和发布版本分离，支持版本回滚 |
| **中断恢复** | 支持工具调用中断和任务恢复 |
| **多模态** | 支持文本、图片、文件等多模态输入 |

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                     Coze Plus Agent                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │          Agent Flow Runner (执行引擎)          │     │
│  ├───────────────────────────────────────────────┤     │
│  │                                               │     │
│  │  ┌────────────┐      ┌──────────────┐        │     │
│  │  │ Persona    │─────▶│ Prompt       │        │     │
│  │  │ Render     │      │ Variables    │        │     │
│  │  └────────────┘      └──────────────┘        │     │
│  │        │                     │                │     │
│  │        └──────────┬──────────┘                │     │
│  │                   ▼                           │     │
│  │          ┌─────────────────┐                  │     │
│  │          │   Chat Model    │                  │     │
│  │          │     (LLM)       │                  │     │
│  │          └─────────────────┘                  │     │
│  │                   │                           │     │
│  │                   ▼                           │     │
│  │          ┌─────────────────┐                  │     │
│  │          │  ReAct Agent    │                  │     │
│  │          │  (思考+行动)     │                  │     │
│  │          └─────────────────┘                  │     │
│  │                   │                           │     │
│  │      ┌────────────┴────────────┐              │     │
│  │      ▼                         ▼              │     │
│  │  ┌────────┐              ┌─────────┐          │     │
│  │  │ Tools  │              │ Answer  │          │     │
│  │  └────────┘              └─────────┘          │     │
│  │      │                                        │     │
│  │      ▼                                        │     │
│  │  ┌─────────────────────────────────┐          │     │
│  │  │         Tool Executor           │          │     │
│  │  ├─────────────────────────────────┤          │     │
│  │  │  • Plugin Tools                │          │     │
│  │  │  • Workflow Tools              │          │     │
│  │  │  • Knowledge Retriever         │          │     │
│  │  │  • Database Tools              │          │     │
│  │  │  • Variable Tools              │          │     │
│  │  └─────────────────────────────────┘          │     │
│  │                                               │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  ┌───────────────────────────────────────────────┐     │
│  │         Storage Layer (存储层)                 │     │
│  ├───────────────────────────────────────────────┤     │
│  │  • single_agent_draft (草稿)                 │     │
│  │  • single_agent_version (版本)               │     │
│  │  • single_agent_publish (发布)               │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 分层架构

Coze Plus 智能体采用经典的 DDD（领域驱动设计）分层架构：

```
┌─────────────────────────────────────────┐
│    Application Layer (应用层)           │
│  • application/conversation/            │
│  • application/singleagent/             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    Domain Layer (领域层)                 │
│  • domain/agent/singleagent/entity/     │
│  • domain/agent/singleagent/service/    │
│  • domain/agent/singleagent/repository/ │
│  • domain/agent/singleagent/internal/   │
│    └── agentflow/ (Agent 执行引擎)       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│    Infrastructure Layer (基础设施层)     │
│  • infra/database/                      │
│  • infra/cache/                         │
│  • infra/oss/                           │
└─────────────────────────────────────────┘
```

## 核心组件

### 1. SingleAgent（智能体实体）

智能体的核心数据结构，定义了智能体的所有配置和能力。

**数据结构** (`backend/crossdomain/agent/model/single_agent.go:56`)：

```go
type SingleAgent struct {
    AgentID   int64  // 智能体 ID
    CreatorID int64  // 创建者 ID
    SpaceID   int64  // 空间 ID
    Name      string // 名称
    Desc      string // 描述
    IconURI   string // 图标
    Version   string // 版本号

    // 核心配置
    ModelInfo       *bot_common.ModelInfo       // 模型配置
    Prompt          *bot_common.PromptInfo      // 提示词配置
    Plugin          []*bot_common.PluginInfo    // 插件工具
    Knowledge       *bot_common.Knowledge       // 知识库
    Workflow        []*bot_common.WorkflowInfo  // 工作流
    Database        []*bot_common.Database      // 数据库

    // 扩展功能
    OnboardingInfo          *bot_common.OnboardingInfo      // 开场白
    SuggestReply            *bot_common.SuggestReplyInfo    // 推荐回复
    JumpConfig              *bot_common.JumpConfig          // 跳转配置
    BackgroundImageInfoList []*bot_common.BackgroundImageInfo // 背景图
    LayoutInfo              *bot_common.LayoutInfo          // 布局信息
    ShortcutCommand         []string                        // 快捷命令
    VariablesMetaID         *int64                          // 变量配置 ID
    BotMode                 bot_common.BotMode              // Bot 模式

    // 时间戳
    CreatedAt int64
    UpdatedAt int64
    DeletedAt gorm.DeletedAt
}
```

**关键字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `ModelInfo` | `*ModelInfo` | 大语言模型配置，包括模型 ID、参数等 |
| `Prompt` | `*PromptInfo` | 系统提示词（Persona），定义智能体人设 |
| `Plugin` | `[]*PluginInfo` | 插件工具列表，可调用外部 API |
| `Knowledge` | `*Knowledge` | 知识库配置，用于文档检索 |
| `Workflow` | `[]*WorkflowInfo` | 工作流列表，可执行复杂逻辑 |
| `Database` | `[]*Database` | 数据库配置，可读写数据表 |
| `OnboardingInfo` | `*OnboardingInfo` | 开场白配置，首次对话的欢迎语 |
| `SuggestReply` | `*SuggestReplyInfo` | 推荐回复配置 |
| `VariablesMetaID` | `*int64` | 关联的变量配置 ID |

### 2. Agent Flow Builder（智能体构建器）

负责根据智能体配置构建可执行的 Agent Flow。

**构建流程** (`backend/domain/agent/singleagent/internal/agentflow/agent_flow_builder.go:60`)：

```go
func BuildAgent(ctx context.Context, conf *Config) (r *AgentRunner, err error) {
    // 1. 加载 Persona（人设）
    persona := conf.Agent.Prompt.GetPrompt()

    // 2. 加载变量
    avs, err := loadAgentVariables(ctx, avConf)

    // 3. 创建 Persona 渲染节点
    personaVars := &personaRender{
        persona:   persona,
        variables: avs,
    }

    // 4. 创建知识库检索器
    kr, err := newKnowledgeRetriever(ctx, &retrieverConfig{
        knowledgeConfig: conf.Agent.Knowledge,
    })

    // 5. 构建聊天模型
    chatModel, modelInfo, err := modelbuilder.BuildModelBySettings(ctx, conf.Agent.ModelInfo)

    // 6. 创建插件工具
    pluginTools, err := newPluginTools(ctx, &toolConfig{
        toolConf: conf.Agent.Plugin,
    })

    // 7. 创建工作流工具
    wfTools, returnDirectlyTools, err := newWorkflowTools(ctx, &workflowConfig{
        wfInfos: conf.Agent.Workflow,
    })

    // 8. 创建数据库工具
    dbTools, err := newDatabaseTools(ctx, &databaseConfig{
        databaseConf: conf.Agent.Database,
    })

    // 9. 创建变量工具
    avTools, err := newAgentVariableTools(ctx, avConf)

    // 10. 组合所有工具
    agentTools := append(pluginTools, wfTools, dbTools, avTools...)

    // 11. 构建 ReAct Agent
    g := compose.NewGraph[*AgentRequest, *schema.Message]()
    g.AddChatModelNode(keyOfLLM, chatModel)
    g.AddLambdaNode(keyOfPersonRender, personaVars.run)
    g.AddLambdaNode(keyOfPromptVariables, promptVars.run)

    reactAgent := react.NewAgent(chatModel, agentTools, reactOpts...)
    g.AddGraphNode(keyOfReActAgent, reactAgent.Compile(ctx))

    // 12. 构建执行流程图
    g.AddEdge(compose.START, keyOfPersonRender)
    g.AddEdge(keyOfPersonRender, keyOfPromptVariables)
    g.AddEdge(keyOfPromptVariables, keyOfReActAgent)
    g.AddEdge(keyOfReActAgent, compose.END)

    // 13. 编译并返回
    runner, err := g.Compile(ctx, compileOpts...)

    return &AgentRunner{
        runner:              runner,
        requireCheckpoint:   requireCheckpoint,
        returnDirectlyTools: returnDirectlyTools,
        containWfTool:       containWfTool,
        modelInfo:           modelInfo,
    }, nil
}
```

**构建流程图**：

```
START
  │
  ▼
┌─────────────────┐
│ Persona Render  │  渲染人设提示词
│ (人设渲染)      │  替换 Jinja2 变量
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Prompt Variables│  注入提示词变量
│ (变量注入)      │  如用户信息、上下文
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Knowledge       │  知识库检索（可选）
│ Retriever       │  RAG 增强
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ReAct Agent    │  推理和行动循环
│  (核心引擎)     │  LLM + Tools
└────────┬────────┘
         │
         ▼
       END
```

### 3. Agent Flow Runner（执行引擎）

负责执行智能体的流式推理和工具调用。

**执行流程** (`backend/domain/agent/singleagent/internal/agentflow/agent_flow_runner.go:67`)：

```go
func (r *AgentRunner) StreamExecute(ctx context.Context, req *AgentRequest) (
    sr *schema.StreamReader[*entity.AgentEvent], err error,
) {
    executeID := uuid.New()

    // 1. 创建回调处理器
    hdl, sr, sw := newReplyCallback(ctx, executeID.String(), r.returnDirectlyTools)

    // 2. 配置执行选项
    var composeOpts []compose.Option

    // 3. 工作流消息管道（如果包含工作流工具）
    if r.containWfTool {
        cfReq := crossworkflow.ExecuteConfig{
            AgentID:      &req.Identity.AgentID,
            ConnectorUID: req.UserID,
            ConnectorID:  req.Identity.ConnectorID,
            BizType:      crossworkflow.BizTypeAgent,
        }
        wfConfig := crossworkflow.DefaultSVC().WithExecuteConfig(cfReq)
        composeOpts = append(composeOpts, wfConfig)

        pipeMsgOpt, workflowMsgSr, workflowMsgCloser := crossworkflow.DefaultSVC().WithMessagePipe()
        composeOpts = append(composeOpts, pipeMsgOpt)

        // 处理工作流中间结果
        go r.processWfMidAnswerStream(ctx, sw, workflowMsgSr)
    }

    // 4. 添加回调
    composeOpts = append(composeOpts, compose.WithCallbacks(hdl))

    // 5. Checkpoint 配置（用于中断恢复）
    if r.requireCheckpoint {
        defaultCheckPointID := executeID.String()

        if req.ResumeInfo != nil {
            // 恢复之前的执行
            defaultCheckPointID = req.ResumeInfo.InterruptID
            opts := crossworkflow.DefaultSVC().WithResumeToolWorkflow(...)
            composeOpts = append(composeOpts, opts)
        }

        composeOpts = append(composeOpts, compose.WithCheckPointID(defaultCheckPointID))
    }

    // 6. 异步执行
    go func() {
        defer func() {
            if pe := recover(); pe != nil {
                sw.Send(nil, errors.New("internal server error"))
            }
            sw.Close()
        }()

        // 执行 Agent Flow
        _, _ = r.runner.Stream(ctx, req, composeOpts...)
    }()

    return sr, nil
}
```

**执行状态机**：

```
┌─────────────────┐
│  Start          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Load History   │  加载历史消息
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Render Prompt  │  渲染提示词
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  LLM Thinking   │  LLM 推理
└────────┬────────┘
         │
         ├─────────────┐
         │             │
         ▼             ▼
┌─────────────┐  ┌────────────┐
│ Tool Call   │  │   Answer   │
│ (工具调用)   │  │  (直接回复) │
└──────┬──────┘  └─────┬──────┘
       │                │
       ▼                │
┌─────────────┐         │
│ Execute Tool│         │
│ (执行工具)   │         │
└──────┬──────┘         │
       │                │
       └────────┬───────┘
                │
                ▼
        ┌───────────────┐
        │  Update State │  更新状态
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │  Loop or End  │  循环或结束
        └───────────────┘
```

### 4. Tool System（工具系统）

智能体可以调用多种类型的工具来扩展能力。

#### 4.1 Plugin Tools（插件工具）

**源码位置**：`backend/domain/agent/singleagent/internal/agentflow/node_tool_plugin.go`

**功能**：调用外部 API 服务

**示例**：
```go
// 创建插件工具
pluginTools, err := newPluginTools(ctx, &toolConfig{
    spaceID:       agent.SpaceID,
    userID:        userID,
    agentIdentity: identity,
    toolConf:      agent.Plugin,  // []*bot_common.PluginInfo
})
```

**特性**：
- 支持 OpenAPI 3.0 规范
- 支持多种鉴权方式（None、API Token、OAuth）
- 支持同步和异步调用
- 支持流式返回

#### 4.2 Workflow Tools（工作流工具）

**源码位置**：`backend/domain/agent/singleagent/internal/agentflow/node_tool_workflow.go`

**功能**：执行复杂的工作流逻辑

**示例**：
```go
// 创建工作流工具
wfTools, returnDirectlyTools, err := newWorkflowTools(ctx, &workflowConfig{
    wfInfos: agent.Workflow,  // []*bot_common.WorkflowInfo
})
```

**特性**：
- 支持有向无环图（DAG）执行
- 支持条件分支和循环
- 支持中断和恢复
- 支持工作流嵌套

#### 4.3 Knowledge Retriever（知识库检索）

**源码位置**：`backend/domain/agent/singleagent/internal/agentflow/node_retriever.go`

**功能**：从知识库中检索相关文档

**示例**：
```go
// 创建知识库检索器
kr, err := newKnowledgeRetriever(ctx, &retrieverConfig{
    knowledgeConfig: agent.Knowledge,  // *bot_common.Knowledge
})
```

**工作流程**：
```
用户输入
  │
  ▼
┌────────────────┐
│ Query Rewrite  │  查询重写
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Vector Search  │  向量搜索
│ (Milvus)       │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Rerank         │  重排序
│ (可选)         │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│ Top-K Results  │  返回 Top-K
└────────────────┘
```

#### 4.4 Database Tools（数据库工具）

**源码位置**：`backend/domain/agent/singleagent/internal/agentflow/node_tool_database.go`

**功能**：操作数据库表（CRUD）

**示例**：
```go
// 创建数据库工具
dbTools, err := newDatabaseTools(ctx, &databaseConfig{
    spaceID:       agent.SpaceID,
    userID:        userID,
    agentIdentity: identity,
    databaseConf:  agent.Database,  // []*bot_common.Database
})
```

**支持的操作**：
- **Query**：查询数据（支持 SQL 查询）
- **Insert**：插入数据
- **Update**：更新数据
- **Delete**：删除数据
- **Custom SQL**：执行自定义 SQL

#### 4.5 Variable Tools（变量工具）

**源码位置**：`backend/domain/agent/singleagent/internal/agentflow/node_tool_variables.go`

**功能**：管理对话变量（读写 KV 存储）

**示例**：
```go
// 创建变量工具
avTools, err := newAgentVariableTools(ctx, &variableConf{
    Agent:       agent,
    UserID:      userID,
    ConnectorID: connectorID,
})
```

**变量类型**：
- **User Variables**：用户级别变量
- **Session Variables**：会话级别变量
- **Global Variables**：全局变量

### 5. Event System（事件系统）

智能体执行过程中会产生多种类型的事件。

**事件类型** (`backend/crossdomain/agent/model/single_agent.go:31`)：

```go
type EventType string

const (
    EventTypeOfChatModelAnswer        EventType = "chatmodel_answer"        // LLM 回复
    EventTypeOfToolsAsChatModelStream EventType = "tools_as_chatmodel_answer" // 工具作为 LLM 流式回复
    EventTypeOfToolMidAnswer          EventType = "tool_mid_answer"        // 工具中间结果
    EventTypeOfToolsMessage           EventType = "tools_message"          // 工具消息
    EventTypeOfFuncCall               EventType = "func_call"              // 函数调用
    EventTypeOfSuggest                EventType = "suggest"                // 推荐回复
    EventTypeOfKnowledge              EventType = "knowledge"              // 知识库检索
    EventTypeOfInterrupt              EventType = "interrupt"              // 中断事件
)
```

**事件结构**：

```go
type AgentEvent struct {
    EventType EventType  // 事件类型

    // 不同类型事件的数据
    ToolMidAnswer         *schema.StreamReader[*schema.Message]  // 工具中间结果流
    ToolAsChatModelAnswer *schema.StreamReader[*schema.Message]  // 工具作为 LLM 流
    ChatModelAnswer       *schema.StreamReader[*schema.Message]  // LLM 回复流
    ToolsMessage          []*schema.Message                     // 工具消息
    FuncCall              *schema.Message                       // 函数调用
    Suggest               *schema.Message                       // 推荐回复
    Knowledge             []*schema.Document                    // 知识库文档
    Interrupt             *InterruptInfo                        // 中断信息
}
```

**事件流转**：

```
Agent Execute
     │
     ├─────────────────────────────────┐
     │                                 │
     ▼                                 ▼
┌──────────┐                   ┌──────────────┐
│   LLM    │                   │    Tools     │
│ Thinking │                   │   Execute    │
└─────┬────┘                   └──────┬───────┘
      │                               │
      ▼                               ▼
[chatmodel_answer]            [tool_mid_answer]
      │                               │
      │                               ▼
      │                       [tools_message]
      │                               │
      │                               ▼
      │                         [func_call]
      │                               │
      └───────────┬───────────────────┘
                  │
                  ▼
              [suggest]
                  │
                  ▼
            [knowledge]
                  │
                  ▼
             Response
```

## 版本管理

Coze Plus 智能体采用**草稿-发布**的版本管理机制。

### 版本类型

| 版本类型 | 表名 | 说明 | 特点 |
|----------|------|------|------|
| **Draft** | `single_agent_draft` | 草稿版本 | 可编辑、可调试、不对外 |
| **Version** | `single_agent_version` | 历史版本 | 只读、可回滚 |
| **Publish** | `single_agent_publish` | 发布版本 | 对外服务、稳定 |

### 版本流转

```
┌──────────┐
│  Draft   │  草稿编辑中
└────┬─────┘
     │ publish
     ▼
┌──────────┐
│ Version  │  生成版本快照
└────┬─────┘
     │ set as online
     ▼
┌──────────┐
│ Publish  │  对外发布
└──────────┘
```

### 数据库表结构

#### single_agent_draft（草稿表）

```sql
CREATE TABLE `single_agent_draft` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `agent_id` bigint NOT NULL COMMENT 'Agent ID',
  `space_id` bigint NOT NULL COMMENT 'Space ID',
  `creator_id` bigint NOT NULL COMMENT 'Creator ID',
  `name` varchar(255) NOT NULL DEFAULT '' COMMENT 'Agent Name',
  `description` text COMMENT 'Agent Description',
  `icon_uri` varchar(512) DEFAULT '' COMMENT 'Icon URI',

  -- 配置 JSON 字段
  `model_info` json COMMENT 'Model Configuration',
  `prompt_info` json COMMENT 'Prompt Configuration',
  `plugin_info` json COMMENT 'Plugin Configuration',
  `knowledge_info` json COMMENT 'Knowledge Configuration',
  `workflow_info` json COMMENT 'Workflow Configuration',
  `database_info` json COMMENT 'Database Configuration',
  `onboarding_info` json COMMENT 'Onboarding Configuration',
  `suggest_reply_info` json COMMENT 'Suggest Reply Configuration',

  `created_at` bigint unsigned NOT NULL,
  `updated_at` bigint unsigned NOT NULL,
  `deleted_at` bigint DEFAULT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_agent_id` (`agent_id`),
  KEY `idx_space_id` (`space_id`),
  KEY `idx_creator_id` (`creator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### single_agent_version（版本表）

```sql
CREATE TABLE `single_agent_version` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `agent_id` bigint NOT NULL COMMENT 'Agent ID',
  `version` varchar(64) NOT NULL COMMENT 'Version Number',
  `space_id` bigint NOT NULL,
  `creator_id` bigint NOT NULL,

  -- 快照数据（与 draft 表结构相同）
  `name` varchar(255) NOT NULL DEFAULT '',
  `description` text,
  `icon_uri` varchar(512) DEFAULT '',
  `model_info` json,
  `prompt_info` json,
  `plugin_info` json,
  `knowledge_info` json,
  `workflow_info` json,
  `database_info` json,

  `created_at` bigint unsigned NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_agent_version` (`agent_id`, `version`),
  KEY `idx_space_id` (`space_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### single_agent_publish（发布表）

```sql
CREATE TABLE `single_agent_publish` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `agent_id` bigint NOT NULL COMMENT 'Agent ID',
  `online_version` varchar(64) NOT NULL COMMENT 'Online Version',
  `space_id` bigint NOT NULL,

  `updated_at` bigint unsigned NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_agent_id` (`agent_id`),
  KEY `idx_space_id` (`space_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 版本操作

#### 发布新版本

**API 流程**：
```
1. 读取 Draft
   ├─> SELECT * FROM single_agent_draft WHERE agent_id = ?

2. 生成版本号
   ├─> version = timestamp + random

3. 创建 Version 快照
   ├─> INSERT INTO single_agent_version (agent_id, version, ...)
   │   VALUES (?, ?, ...)

4. 更新 Publish 记录
   ├─> INSERT INTO single_agent_publish (agent_id, online_version)
   │   VALUES (?, ?)
   │   ON DUPLICATE KEY UPDATE online_version = ?

5. 返回版本信息
```

**源码位置**：`backend/domain/agent/singleagent/service/publish.go`

#### 回滚版本

```
1. 查询指定版本
   ├─> SELECT * FROM single_agent_version
   │   WHERE agent_id = ? AND version = ?

2. 覆盖 Draft
   ├─> UPDATE single_agent_draft SET ... WHERE agent_id = ?

3. 更新 Publish（如果需要）
   ├─> UPDATE single_agent_publish
       SET online_version = ? WHERE agent_id = ?
```

## 中断与恢复

智能体支持工具调用中断和任务恢复机制。

### 中断类型

```go
type InterruptEventType int64

const (
    InterruptEventType_LocalPlugin         InterruptEventType = 1  // 本地插件授权
    InterruptEventType_Question            InterruptEventType = 2  // 需要用户确认
    InterruptEventType_RequireInfos        InterruptEventType = 3  // 需要补充信息
    InterruptEventType_SceneChat           InterruptEventType = 4  // 场景对话
    InterruptEventType_InputNode           InterruptEventType = 5  // 输入节点
    InterruptEventType_WorkflowLocalPlugin InterruptEventType = 6  // 工作流插件授权
    InterruptEventType_OauthPlugin         InterruptEventType = 7  // OAuth 插件授权
    InterruptEventType_WorkflowLLM         InterruptEventType = 100 // 工作流 LLM 节点
)
```

### 中断数据结构

```go
type InterruptInfo struct {
    AllToolInterruptData map[string]*model.ToolInterruptEvent           // 工具中断数据
    AllWfInterruptData   map[string]*crossworkflow.ToolInterruptEvent   // 工作流中断数据
    ToolCallID           string                                         // 工具调用 ID
    InterruptType        InterruptEventType                             // 中断类型
    InterruptID          string                                         // 中断 ID（用于恢复）
    ChatflowInterrupt    *crossworkflow.StateMessage                    // 对话流中断信息
}
```

### 中断与恢复流程

```
┌─────────────────┐
│  Agent Execute  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tool Call      │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
   ┌──────────┐      ┌─────────────┐
   │ Success  │      │  Interrupt  │
   └──────────┘      └──────┬──────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Save State   │  保存状态到 CheckPoint
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Return Event │  返回中断事件
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Wait User    │  等待用户操作
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Resume       │  恢复执行
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Load State   │  加载 CheckPoint
                     └──────┬───────┘
                            │
                            ▼
                     ┌──────────────┐
                     │ Continue     │  继续执行
                     └──────────────┘
```

### CheckPoint 存储

Coze Plus 使用 **CheckPoint Store** 来保存中断状态。

**接口定义**：
```go
type CheckPointStore interface {
    // 保存 CheckPoint
    Save(ctx context.Context, checkpointID string, data []byte) error

    // 加载 CheckPoint
    Load(ctx context.Context, checkpointID string) ([]byte, error)

    // 删除 CheckPoint
    Delete(ctx context.Context, checkpointID string) error
}
```

**实现**：
- **Redis**：快速读写，适合短期存储
- **MySQL**：持久化存储，适合长期保留
- **Memory**：内存存储，仅用于测试

## 性能优化

### 1. 流式响应

智能体采用流式响应机制，提升用户体验：

```go
// 流式执行
sr, err := agent.StreamExecute(ctx, req)

// 读取事件流
for {
    event, err := sr.Recv()
    if err == io.EOF {
        break
    }

    switch event.EventType {
    case EventTypeOfChatModelAnswer:
        // 处理 LLM 流式回复
        handleChatModelStream(event.ChatModelAnswer)

    case EventTypeOfToolsMessage:
        // 处理工具消息
        handleToolsMessage(event.ToolsMessage)

    case EventTypeOfInterrupt:
        // 处理中断
        handleInterrupt(event.Interrupt)
    }
}
```

### 2. 并发优化

**工具并发调用**：
```go
// ReAct Agent 支持并发工具调用
reactOpts := []react.Option{
    react.WithMaxIterations(15),        // 最大迭代次数
    react.WithMaxConcurrency(5),        // 最大并发数
    react.WithTimeout(120 * time.Second), // 超时时间
}

reactAgent := react.NewAgent(chatModel, agentTools, reactOpts...)
```

### 3. 缓存优化

**提示词缓存**：
- 使用 LLM 的前缀缓存功能（Prefix Caching）
- 缓存人设提示词，减少重复处理

**知识库缓存**：
- 向量检索结果缓存
- Embedding 缓存

### 4. 资源管理

**连接池**：
- HTTP 连接池复用
- 数据库连接池
- Redis 连接池

**内存管理**：
- 流式处理避免大对象
- 及时释放资源
- Goroutine 池管理

## 安全机制

### 1. 权限控制

**Space 级别隔离**：
```go
// 检查用户权限
func checkPermission(ctx context.Context, userID, spaceID, agentID int64) error {
    agent, err := GetAgent(ctx, agentID)
    if err != nil {
        return err
    }

    // 检查 Space 权限
    if agent.SpaceID != spaceID {
        return ErrPermissionDenied
    }

    // 检查用户权限
    if !hasSpacePermission(ctx, userID, spaceID) {
        return ErrPermissionDenied
    }

    return nil
}
```

### 2. 工具调用安全

**工具白名单**：
- 仅允许调用已配置的工具
- 工具参数验证
- 工具输出过滤

**敏感操作保护**：
- 数据库操作需要权限
- 文件操作限制路径
- 外部 API 调用限流

### 3. 内容安全

**输入过滤**：
- SQL 注入防护
- XSS 攻击防护
- 敏感词过滤

**输出审核**：
- 内容安全检查
- 敏感信息脱敏
- 日志审计

## 监控与日志

### 1. 执行日志

**日志级别**：
```go
logs.CtxInfof(ctx, "Agent execute started, agent_id=%d", agentID)
logs.CtxDebugf(ctx, "Tool call: %s, params: %v", toolName, params)
logs.CtxErrorf(ctx, "Agent execute failed: %v", err)
```

### 2. 性能监控

**指标采集**：
- 执行耗时
- 工具调用次数
- Token 消耗
- 错误率

### 3. 追踪

**分布式追踪**：
- Request ID 贯穿整个调用链
- 每个工具调用记录 Trace
- 支持 OpenTelemetry

## 扩展点

### 1. 自定义工具

开发者可以实现自定义工具：

```go
// 实现 InvokableTool 接口
type CustomTool struct {
    name        string
    description string
}

func (t *CustomTool) Info(ctx context.Context) (*schema.ToolInfo, error) {
    return &schema.ToolInfo{
        Name:        t.name,
        Description: t.description,
        ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
            "param1": {
                Type:        schema.String,
                Description: "参数1说明",
                Required:    true,
            },
        }),
    }, nil
}

func (t *CustomTool) InvokableRun(ctx context.Context, argumentsInJSON string) (string, error) {
    // 解析参数
    var args map[string]interface{}
    json.Unmarshal([]byte(argumentsInJSON), &args)

    // 执行逻辑
    result := doSomething(args)

    // 返回结果
    return conv.ToJSONString(result), nil
}
```

### 2. 自定义回调

```go
// 实现回调接口
type CustomCallback struct {}

func (c *CustomCallback) OnChatModelStart(ctx context.Context, info *compose.CallbackInput) context.Context {
    // LLM 开始执行
    return ctx
}

func (c *CustomCallback) OnChatModelEnd(ctx context.Context, output *compose.CallbackOutput) context.Context {
    // LLM 执行结束
    return ctx
}

func (c *CustomCallback) OnToolStart(ctx context.Context, info *compose.CallbackInput) context.Context {
    // 工具开始执行
    return ctx
}

func (c *CustomCallback) OnToolEnd(ctx context.Context, output *compose.CallbackOutput) context.Context {
    // 工具执行结束
    return ctx
}

// 使用
composeOpts = append(composeOpts, compose.WithCallbacks(&CustomCallback{}))
```

## 参考资源

### 源码位置

- **智能体实体**：`backend/crossdomain/agent/model/single_agent.go`
- **领域服务**：`backend/domain/agent/singleagent/service/single_agent_impl.go`
- **执行引擎**：`backend/domain/agent/singleagent/internal/agentflow/`
  - `agent_flow_builder.go` - 构建器
  - `agent_flow_runner.go` - 运行器
  - `node_tool_*.go` - 工具节点
- **仓库层**：`backend/domain/agent/singleagent/repository/repository.go`
- **数据访问**：`backend/domain/agent/singleagent/internal/dal/`

### 相关文档

- [智能体功能开发流程](./agent-development.md)
- [工作流开发指南](./workflow-development.md)
- [插件技术架构](./plugin-architecture.md)
- [模型技术架构](./model-architecture.md)

---

**最后更新时间**：2025-10-27

**文档版本**：v1.0.0

如有任何疑问或需要帮助，请联系：
- 📧 邮箱：support@coze-plus.cn
- 💬 交流群：参见[项目概述](./overview.md)
