# 节点技术架构

本文档深入剖析 Coze Plus 工作流系统中节点（Node）的技术架构，包括核心接口、执行流程、数据流转机制等。

## 概述

### 节点是什么

**节点（Node）** 是工作流中的最小执行单元，代表一个具体的处理步骤。每个节点接收输入数据，执行特定的业务逻辑，并产生输出数据供下游节点使用。

### 技术栈

**后端**：
- 语言：Go 1.21+
- 框架：Cloudwego Eino（工作流编排引擎）
- 架构：DDD（领域驱动设计）
- 代码位置：`backend/domain/workflow/internal/nodes/`

**前端**：
- 语言：TypeScript 5.0+
- 框架：React 18
- 构建工具：Rsbuild（基于 Rspack）
- 状态管理：Zustand
- 代码位置：`frontend/packages/workflow/playground/src/node-registries/`

## 核心架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      工作流执行引擎                           │
│                   (Cloudwego Eino)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    节点运行时层                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 预处理器  │→│ 初始化器  │→│ 执行器    │→│ 后处理器  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 超时控制  │  │ 重试机制  │  │ 错误处理  │  │ 回调转换  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    节点抽象层                                 │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  NodeAdaptor    │  │  NodeBuilder    │                   │
│  │  前端→后端转换   │  │  Schema→实例构建 │                   │
│  └─────────────────┘  └─────────────────┘                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            执行接口（6种模式）                         │    │
│  │  • InvokableNode      • StreamableNode             │    │
│  │  • InvokableNodeWOpt  • StreamableNodeWOpt         │    │
│  │  • CollectableNode    • TransformableNode          │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  具体节点实现层（30+ 种）                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ LLM 节点  │  │Plugin节点│  │Database  │  │ HTTP请求 │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 循环控制  │  │ 条件分支  │  │ 批处理    │  │ 代码执行 │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 核心接口定义

### 节点执行接口（6 种模式）

**文件位置**：`backend/domain/workflow/internal/nodes/node.go`

#### 1. InvokableNode - 基础同步调用

```go
// 适用场景：大多数节点，如 Plugin、Database、HTTPRequester
type InvokableNode interface {
    Invoke(ctx context.Context, input map[string]any) (output map[string]any, err error)
}
```

**特点**：
- 接收非流式输入，返回非流式输出
- 不接受任何选项参数
- 最常用的节点接口

**实现示例**：Plugin 节点、Database 节点、HTTP 节点

#### 2. InvokableNodeWOpt - 带选项的同步调用

```go
// 适用场景：需要传递运行时选项的节点，如 LLM、SubWorkflow
type InvokableNodeWOpt interface {
    Invoke(ctx context.Context, in map[string]any, opts ...NodeOption) (map[string]any, error)
}
```

**特点**：
- 支持传递 NodeOption 参数
- 用于需要动态配置的节点

**NodeOption 定义**：
```go
type NodeOption func(*NodeOptions)

type NodeOptions struct {
    Checkpoint      compose.Checkpoint  // 检查点（用于恢复）
    History         []schema.Message    // 历史消息
    ConversationID  string              // 会话 ID
}
```

#### 3. StreamableNode - 流式输出

```go
// 适用场景：理论上支持流式输出的插件（目前无实际实现）
type StreamableNode interface {
    Stream(ctx context.Context, in map[string]any) (*einoschema.StreamReader[map[string]any], error)
}
```

**特点**：
- 接收非流式输入，返回流式输出
- 用于支持流式响应的节点

#### 4. StreamableNodeWOpt - 带选项的流式输出

```go
// 适用场景：LLM 节点的流式响应
type StreamableNodeWOpt interface {
    Stream(ctx context.Context, in map[string]any, opts ...NodeOption) (*einoschema.StreamReader[map[string]any], error)
}
```

**特点**：
- 支持流式输出和选项参数
- LLM 节点使用此接口实现流式文本生成

**使用示例**：
```go
// LLM 节点实现
func (l *LLM) Stream(ctx context.Context, in map[string]any, opts ...nodes.NodeOption) (*schema.StreamReader[map[string]any], error) {
    // 准备选项
    composeOpts, resumingEvent, err := l.prepare(ctx, in, opts...)

    // 调用内部 Graph 的 Stream 方法
    out, err := l.r.Stream(ctx, in, composeOpts...)

    return out, nil
}
```

#### 5. CollectableNode - 流式输入收集

```go
// 适用场景：接收流式输入并聚合的节点（目前无实际实现）
type CollectableNode interface {
    Collect(ctx context.Context, in *einoschema.StreamReader[map[string]any]) (map[string]any, error)
}
```

**特点**：
- 接收流式输入，返回非流式输出
- 用于流式数据聚合场景

**潜在用例**：
- 流式文本拼接节点
- 流式数据批处理节点

#### 6. TransformableNode - 流式转换

```go
// 适用场景：VariableAggregator（变量聚合器）
type TransformableNode interface {
    Transform(ctx context.Context, in *einoschema.StreamReader[map[string]any]) (*einoschema.StreamReader[map[string]any], error)
}
```

**特点**：
- 接收流式输入，返回流式输出
- 用于流式数据转换

**实现示例**：VariableAggregator
```go
func (va *VariableAggregator) Transform(ctx context.Context, in *einoschema.StreamReader[map[string]any]) (*einoschema.StreamReader[map[string]any], error) {
    return einoschema.StreamReaderWithConvert(in, func(ctx context.Context, chunk map[string]any) (map[string]any, error) {
        // 转换每个流式块
        return va.aggregateChunk(ctx, chunk)
    }), nil
}
```

### 辅助接口

#### CallbackInputConverted - 输入回调转换

```go
// 将节点输入转换为前端友好的展示格式
type CallbackInputConverted interface {
    ToCallbackInput(ctx context.Context, in map[string]any) (*StructuredCallbackInput, error)
}

type StructuredCallbackInput struct {
    Input  map[string]any
    Fields []*StructuredField  // 结构化字段（可选）
}

type StructuredField struct {
    Key   string
    Value any
    Type  string  // "text", "image", "file", "object" 等
}
```

**使用场景**：
- LLM 节点展示聊天历史
- 插件节点展示 API 参数
- 在测试运行时展示输入详情

**LLM 节点示例**：
```go
func (l *LLM) ToCallbackInput(ctx context.Context, input map[string]any) (*nodes.StructuredCallbackInput, error) {
    if l.chatHistorySetting != nil && l.chatHistorySetting.EnableChatHistory {
        ret := maps.Clone(input)

        // 获取聊天历史
        execCtx := execute.GetExeCtx(ctx)
        messages := execCtx.ExeCfg.ConversationHistory

        // 格式化并添加到输入
        ret["chatHistory"] = formatMessages(messages)

        return &nodes.StructuredCallbackInput{Input: ret}, nil
    }

    return &nodes.StructuredCallbackInput{Input: input}, nil
}
```

#### CallbackOutputConverted - 输出回调转换

```go
// 将节点输出转换为前端友好的展示格式
type CallbackOutputConverted interface {
    ToCallbackOutput(ctx context.Context, out map[string]any) (*StructuredCallbackOutput, error)
}

type StructuredCallbackOutput struct {
    Output    map[string]any
    RawOutput *string            // 原始输出（可选）
    Error     *vo.WorkflowError  // 警告信息（可选）
    Fields    []*StructuredField // 结构化字段（可选）
}
```

**使用场景**：
- LLM 节点展示原始 LLM 响应和警告
- Plugin 节点展示原始 API 响应
- Database 节点展示查询 SQL

**LLM 节点示例**：
```go
func (l *LLM) ToCallbackOutput(ctx context.Context, output map[string]any) (*nodes.StructuredCallbackOutput, error) {
    // 从上下文缓存中获取原始输出
    rawOutput, _ := ctxcache.Get[string](ctx, rawOutputK)

    // 从上下文缓存中获取警告信息
    warning, _ := ctxcache.Get[vo.WorkflowError](ctx, warningK)

    return &nodes.StructuredCallbackOutput{
        Output:    output,
        RawOutput: ptr.Of(rawOutput),  // 显示完整 LLM 响应
        Error:     warning,             // 显示 Token 警告等
    }, nil
}
```

#### Initializer - 初始化器

```go
// 节点执行前的初始化逻辑
type Initializer interface {
    Init(ctx context.Context) (context.Context, error)
}
```

**使用场景**：
- 设置上下文缓存
- 准备执行环境
- 初始化资源连接

## 节点适配器（Adaptor）机制

### NodeAdaptor 接口

**作用**：将前端画布节点（Canvas Node）转换为后端节点配置（NodeSchema）

**文件位置**：`backend/domain/workflow/internal/nodes/node.go`

```go
type NodeAdaptor interface {
    Adapt(ctx context.Context, n *vo.Node, opts ...AdaptOption) (*schema.NodeSchema, error)
}

type AdaptOptions struct {
    Canvas *vo.Canvas  // 完整画布，用于访问其他节点信息
}
```

### 转换流程

```
前端 Canvas Node (JSON)
    ↓
    ├─ node.id        → NodeSchema.Key
    ├─ node.type      → NodeSchema.Type
    ├─ node.data.meta → NodeSchema.Name
    ├─ node.data.inputs.inputParameters → NodeSchema.InputTypes, InputSources
    └─ node.data.outputs → NodeSchema.OutputTypes
    ↓
后端 NodeSchema
```

### 实现示例：Plugin 节点

```go
type Config struct {
    PluginID      int64
    ToolID        int64
    PluginVersion string
    PluginFrom    *bot_common.PluginFrom
}

func (c *Config) Adapt(ctx context.Context, n *vo.Node, opts ...nodes.AdaptOption) (*schema.NodeSchema, error) {
    ns := &schema.NodeSchema{
        Key:     vo.NodeKey(n.ID),
        Type:    entity.NodeTypePlugin,
        Name:    n.Data.Meta.Title,
        Configs: c,
    }

    // 1. 解析 API 参数
    apiParams := slices.ToMap(n.Data.Inputs.APIParams, func(e *vo.Param) (string, *vo.Param) {
        return e.Name, e
    })

    // 2. 提取插件信息
    pluginID, _ := strconv.ParseInt(apiParams["pluginID"].Input.Value.Content.(string), 10, 64)
    toolID, _ := strconv.ParseInt(apiParams["apiID"].Input.Value.Content.(string), 10, 64)
    version := apiParams["pluginVersion"].Input.Value.Content.(string)

    c.PluginID = pluginID
    c.ToolID = toolID
    c.PluginVersion = version

    // 3. 设置输入输出类型和映射
    if err := convert.SetInputsForNodeSchema(n, ns); err != nil {
        return nil, err
    }

    if err := convert.SetOutputTypesForNodeSchema(n, ns); err != nil {
        return nil, err
    }

    return ns, nil
}
```

### 输入输出映射

#### FieldInfo 数据结构

```go
type FieldInfo struct {
    Path   compose.FieldPath  // 目标字段路径
    Source FieldSource        // 字段来源
}

type FieldSource struct {
    Ref       *Reference     // 引用其他节点输出
    Val       any            // 字面量值
    FileExtra *FileExtra     // 文件额外信息
}

type Reference struct {
    FromNodeKey  NodeKey           // 源节点 Key
    FromPath     compose.FieldPath // 源字段路径
    VariableType *GlobalVarType    // 全局变量类型（sys/env）
}
```

#### 示例：引用上游节点输出

```go
// 前端配置
{
  "name": "user_query",
  "input": {
    "value": {
      "type": "reference",
      "content": "{{100001.user_input}}"  // 引用 Entry 节点的 user_input
    }
  }
}

// 转换后的 FieldInfo
&vo.FieldInfo{
    Path: []string{"user_query"},
    Source: vo.FieldSource{
        Ref: &vo.Reference{
            FromNodeKey: "100001",              // Entry 节点
            FromPath:    []string{"user_input"},
        },
    },
}
```

#### 示例：字面量值

```go
// 前端配置
{
  "name": "temperature",
  "input": {
    "value": {
      "type": "static",
      "content": 0.7
    }
  }
}

// 转换后的 FieldInfo
&vo.FieldInfo{
    Path: []string{"temperature"},
    Source: vo.FieldSource{
        Val: 0.7,
    },
}
```

## 节点构建器（Builder）流程

### NodeBuilder 接口

**作用**：从 NodeSchema 构建可执行的节点实例

```go
type NodeBuilder interface {
    Build(ctx context.Context, ns *NodeSchema, opts ...BuildOption) (executable any, err error)
}

type BuildOptions struct {
    WS    *WorkflowSchema                              // 工作流 Schema
    Inner compose.Runnable[map[string]any, map[string]any]  // 复合节点的内部工作流
}
```

### 构建流程

**文件位置**：`backend/domain/workflow/internal/compose/node_builder.go`

```
NodeSchema
    ↓
1. 前置处理
   - 为 InputSourceAware 节点获取完整输入源信息
   - 设置 FullSources 到 NodeSchema
    ↓
2. 调用 Config.Build()
   - 创建节点实例
   - 初始化节点配置
    ↓
3. 包装为 Eino Lambda
   - 检测节点实现的接口类型
   - 创建 nodeRunConfig
   - 转换为 compose.Lambda
    ↓
可执行的 Eino Lambda
```

### LLM 节点构建示例

```go
func (c *Config) Build(ctx context.Context, ns *schema2.NodeSchema, opts ...schema2.BuildOption) (any, error) {
    // 1. 构建聊天模型
    chatModel, info, err := modelbuilder.BuildModelByID(
        ctx,
        c.LLMParams.ModelType,
        c.LLMParams.ToModelBuilderLLMParams(),
    )
    if err != nil {
        return nil, err
    }

    // 2. 处理 Function Calling
    var tools []tool.Tool
    var knowledgeRecallConfig *KnowledgeRecallConfig

    if fcParams := c.FCParam; fcParams != nil {
        // 添加工作流工具
        for _, wf := range fcParams.WorkflowFCParam.WorkflowList {
            wfTool, err := workflow.GetRepository().WorkflowAsTool(ctx, wf.WorkflowID)
            tools = append(tools, wfTool)
        }

        // 添加插件工具
        for _, p := range fcParams.PluginFCParam.PluginList {
            pluginTools, err := wrapPlugin.GetPluginInvokableTools(ctx, &wrapPlugin.GetPluginReq{
                PluginID: p.PluginID,
                ToolIDs:  p.ToolIDList,
            })
            tools = append(tools, pluginTools...)
        }

        // 配置知识库检索
        if len(fcParams.KnowledgeFCParam.KnowledgeList) > 0 {
            knowledgeRecallConfig = &KnowledgeRecallConfig{
                KnowledgeList: fcParams.KnowledgeFCParam.KnowledgeList,
            }
        }
    }

    // 3. 构建 Eino Graph
    g := compose.NewGraph[map[string]any, map[string]any]()

    // 添加 Prompt 模板节点
    template := newPrompts(c.SystemPrompt, c.UserPrompt, modelWithInfo)
    g.AddChatTemplateNode(templateNodeKey, template)

    // 添加 LLM 节点（或 React Agent）
    if len(tools) > 0 {
        // 使用 React Agent 支持工具调用
        reactConfig := &react.Config{
            Model: chatModel,
            Tools: tools,
            // ...
        }
        reactAgent, err := react.NewAgent(ctx, reactConfig)
        g.AddGraphNode(llmNodeKey, reactAgent)
    } else {
        // 直接使用 ChatModel
        g.AddChatModelNode(llmNodeKey, modelWithInfo)
    }

    // 添加输出转换节点
    if c.OutputFormat == FormatJSON {
        g.AddLambdaNode(outputConvertNodeKey, compose.InvokableLambda(jsonParse))
    } else {
        g.AddLambdaNode(outputConvertNodeKey, compose.AnyLambda(iConvert, nil, nil, tConvert))
    }

    // 4. 连接边
    g.AddEdge(compose.START, templateNodeKey)
    g.AddEdge(templateNodeKey, llmNodeKey)
    g.AddEdge(llmNodeKey, outputConvertNodeKey)
    g.AddEdge(outputConvertNodeKey, compose.END)

    // 5. 编译并返回
    r, err := g.Compile(ctx, compileOpts...)

    return &LLM{
        r:                  r,
        outputFormat:       c.OutputFormat,
        requireCheckpoint:  len(tools) > 0,
        chatHistorySetting: c.ChatHistorySetting,
        nodeKey:            ns.Key,
    }, nil
}
```

### 节点包装为 Lambda

**文件位置**：`backend/domain/workflow/internal/compose/node_runner.go`

```go
func toNode(ns *schema2.NodeSchema, r any) *Node {
    // 1. 检测节点实现的接口类型
    i, hasI := r.(nodes.InvokableNode)
    iWOpt, hasIWOpt := r.(nodes.InvokableNodeWOpt)
    s, hasS := r.(nodes.StreamableNode)
    sWOpt, hasSWOpt := r.(nodes.StreamableNodeWOpt)
    c, hasC := r.(nodes.CollectableNode)
    cWOpt, hasCWOpt := r.(nodes.CollectableNodeWOpt)
    t, hasT := r.(nodes.TransformableNode)
    tWOpt, hasTWOpt := r.(nodes.TransformableNodeWOpt)

    // 2. 创建 nodeRunConfig
    options := []newNodeOption{
        // 回调转换器
        withCallbackInputConverter(r),
        withCallbackOutputConverter(r),
        // 初始化器
        withInit(r),
    }

    config := newNodeRunConfig(ns, iWOpt, sWOpt, cWOpt, tWOpt, options)

    // 3. 转换为 Eino Lambda
    composeOpts := []compose.AnyLambdaOption{
        compose.WithLambdaName(string(ns.Key)),
    }

    l, err := compose.AnyLambda(
        config.invoke(),
        config.stream(),
        config.collect(),
        config.transform(),
        composeOpts...,
    )

    return &Node{Lambda: l}
}
```

## 节点运行时（NodeRunner）

### NodeRunConfig 结构

**文件位置**：`backend/domain/workflow/internal/compose/node_runner.go`

```go
type nodeRunConfig[O any] struct {
    // 节点基本信息
    nodeKey    vo.NodeKey
    nodeName   string
    nodeType   entity.NodeType

    // 超时和重试配置
    timeoutMS  int64
    maxRetry   int64

    // 错误处理配置
    errProcessType vo.ErrorProcessType
    dataOnErr      func(ctx context.Context) map[string]any

    // 预处理器和后处理器
    preProcessors       []func(ctx context.Context, input map[string]any) (map[string]any, error)
    postProcessors      []func(ctx context.Context, input map[string]any) (map[string]any, error)
    streamPreProcessors []func(ctx context.Context, input *schema.StreamReader[map[string]any]) *schema.StreamReader[map[string]any]

    // 回调转换器
    callbackInputConverter  func(context.Context, map[string]any) (*nodes.StructuredCallbackInput, error)
    callbackOutputConverter func(context.Context, map[string]any) (*nodes.StructuredCallbackOutput, error)

    // 初始化函数
    init []func(context.Context) (context.Context, error)

    // 执行函数（4 种模式）
    i compose.Invoke[map[string]any, map[string]any, O]      // Invoke
    s compose.Stream[map[string]any, map[string]any, O]      // Stream
    c compose.Collect[map[string]any, map[string]any, O]     // Collect
    t compose.Transform[map[string]any, map[string]any, O]   // Transform
}
```

### 执行流程（Invoke 模式）

```go
func (nc *nodeRunConfig[O]) invoke() func(...) {
    return func(ctx context.Context, input map[string]any, opts ...O) (output map[string]any, err error) {
        // 创建 nodeRunner
        ctx, runner := newNodeRunner(ctx, nc)

        // Defer 错误处理和清理
        defer func() {
            // 1. Panic 恢复
            if panicErr := recover(); panicErr != nil {
                err = safego.NewPanicErr(panicErr, debug.Stack())
            }

            // 2. 正常结束处理
            if err == nil {
                err = runner.onEnd(ctx, output)
            }

            // 3. 错误处理（支持返回默认值或异常分支）
            if err != nil {
                errOutput, hasErrOutput := runner.onError(ctx, err)
                if hasErrOutput {
                    output = errOutput
                    err = nil
                }
            }
        }()

        // 4. 初始化
        for _, initFn := range runner.init {
            ctx, err = initFn(ctx)
            if err != nil {
                return nil, err
            }
        }

        // 5. 预处理（类型转换、填充零值等）
        input, err = runner.preProcess(ctx, input)
        if err != nil {
            return nil, err
        }

        // 6. 开始回调
        ctx, err = runner.onStart(ctx, input)
        if err != nil {
            return nil, err
        }

        // 7. 实际执行（带重试和超时）
        output, err = runner.invoke(ctx, input, opts...)
        if err != nil {
            return nil, err
        }

        // 8. 后处理
        return runner.postProcess(ctx, output)
    }
}
```

### 关键特性详解

#### 1. 超时控制

```go
func newNodeRunner[O any](ctx context.Context, cfg *nodeRunConfig[O]) (context.Context, *nodeRunner[O]) {
    runner := &nodeRunner[O]{
        nodeRunConfig: cfg,
        startTime:     time.Now(),
    }

    // 设置超时
    if cfg.timeoutMS > 0 {
        ctx, runner.cancelFn = context.WithTimeout(ctx, time.Duration(cfg.timeoutMS)*time.Millisecond)
    }

    return ctx, runner
}
```

**配置方式**：
```go
// 在 NodeTypeMeta 中配置默认超时
ExecutableMeta: ExecutableMeta{
    DefaultTimeoutMS: 60000,  // 60 秒
}

// 用户可在前端配置中覆盖
{
  "data": {
    "inputs": {
      "settingOnError": {
        "timeout": 120000  // 120 秒
      }
    }
  }
}
```

#### 2. 重试机制

```go
func (r *nodeRunner[O]) invoke(ctx context.Context, input map[string]any, opts ...O) (map[string]any, error) {
    var (
        invokeOutput map[string]any
        invokeErr    error
        n            int64 = 0
    )

    execCtx := execute.GetExeCtx(ctx)

    for {
        // 执行节点（监听 context.Done）
        err := exec.RunWithContextDone(ctx, func() error {
            invokeOutput, invokeErr = r.i(ctx, input, opts...)
            return invokeErr
        })

        // 检查是否需要重试
        if err != nil && r.maxRetry > n {
            n++
            execCtx.CurrentRetryCount++

            logs.CtxInfof(ctx, "node %s retry %d/%d, error: %v", r.nodeKey, n, r.maxRetry, err)
            continue
        }

        return invokeOutput, err
    }
}
```

**配置方式**：
```go
// 在前端配置中设置重试次数
{
  "data": {
    "inputs": {
      "settingOnError": {
        "retryTimes": 3
      }
    }
  }
}
```

#### 3. 错误处理策略

```go
func (r *nodeRunner[O]) onError(ctx context.Context, err error) (map[string]any, bool) {
    // 提取错误码和消息
    code, msg := vo.ExtractErrorCodeAndMsg(err)

    switch r.errProcessType {
    case vo.ErrorProcessTypeReturnDefaultData:
        // 返回默认数据，不抛出错误
        d := r.dataOnErr(ctx)
        d["errorBody"] = map[string]any{
            "errorMessage": msg,
            "errorCode":    code,
        }
        d["isSuccess"] = false

        logs.CtxInfof(ctx, "node %s error handled by returning default data: %v", r.nodeKey, msg)
        return d, true

    case vo.ErrorProcessTypeExceptionBranch:
        // 走异常分支（返回错误信息作为输出）
        s := map[string]any{
            "errorBody": map[string]any{
                "errorMessage": msg,
                "errorCode":    code,
            },
            "isSuccess": false,
        }

        logs.CtxInfof(ctx, "node %s error handled by exception branch: %v", r.nodeKey, msg)
        return s, true

    default:
        // ErrorProcessTypeThrow：直接抛出错误
        return nil, false
    }
}
```

**三种错误处理策略对比**：

| 策略 | 行为 | 使用场景 | 输出 |
|-----|------|---------|------|
| `throw` | 抛出错误，停止工作流 | 默认行为，严格错误处理 | 无（工作流失败） |
| `return_default_data` | 返回默认值，继续执行 | 允许失败的节点，提供降级数据 | `{...defaultData, errorBody, isSuccess: false}` |
| `exception_branch` | 返回错误信息，走异常分支 | 需要根据成功/失败执行不同逻辑 | `{errorBody, isSuccess: false}` |

#### 4. 预处理和后处理

**预处理器**：
```go
preProcessors := []func(ctx context.Context, input map[string]any) (map[string]any, error){
    // 1. 类型转换（将 JSON Number 转为实际类型）
    convertTypes,

    // 2. 填充零值（PreFillZero）
    preFillZero,

    // 3. 文件 URI 转 URL
    convertFileURIToURL,
}
```

**后处理器**：
```go
postProcessors := []func(ctx context.Context, output map[string]any) (map[string]any, error){
    // 1. 移除非输出字段
    removeNonOutputFields,

    // 2. 填充 nil（PostFillNil）
    postFillNil,
}
```

**PreFillZero 示例**：
```go
// 如果输出类型定义为 string，但实际未返回该字段，填充空字符串
func preFillZero(ctx context.Context, input map[string]any) (map[string]any, error) {
    for fieldName, typeInfo := range ns.OutputTypes {
        if _, exists := input[fieldName]; !exists {
            input[fieldName] = getZeroValue(typeInfo.Type)
        }
    }
    return input, nil
}
```

#### 5. 回调机制

```go
// 开始回调
func (r *nodeRunner[O]) onStart(ctx context.Context, input map[string]any) (context.Context, error) {
    // 1. 转换输入（用于 UI 展示）
    callbackInput, err := r.callbackInputConverter(ctx, input)

    // 2. 发送 onNodeStart 事件
    err = callbacks.OnNodeStart(ctx, &callbacks.NodeInfo{
        Name:       r.nodeName,
        Type:       string(r.nodeType),
        Input:      callbackInput.Input,
        InputExtra: callbackInput.Fields,
    })

    return ctx, err
}

// 结束回调
func (r *nodeRunner[O]) onEnd(ctx context.Context, output map[string]any) error {
    // 1. 转换输出（用于 UI 展示）
    callbackOutput, err := r.callbackOutputConverter(ctx, output)

    // 2. 发送 onNodeEnd 事件
    err = callbacks.OnNodeEnd(ctx, &callbacks.NodeInfo{
        Name:        r.nodeName,
        Type:        string(r.nodeType),
        Output:      callbackOutput.Output,
        OutputExtra: callbackOutput.Fields,
        RawOutput:   callbackOutput.RawOutput,
        Error:       callbackOutput.Error,
    })

    return err
}
```

## 流式数据处理

### FieldStreamType

**定义**：
```go
const (
    FieldNotStream   FieldStreamType = 0  // 非流式
    FieldIsStream    FieldStreamType = 1  // 流式
    FieldMaybeStream FieldStreamType = 2  // 可能流式（运行时决定）
)
```

### StreamGenerator 接口

```go
type StreamGenerator interface {
    FieldStreamType(path compose.FieldPath, ns *schema.NodeSchema, sc *schema.WorkflowSchema) (schema.FieldStreamType, error)
}
```

### LLM 节点流式示例

```go
func (c *Config) FieldStreamType(path compose.FieldPath, ns *schema2.NodeSchema, sc *schema2.WorkflowSchema) (schema2.FieldStreamType, error) {
    // 如果工作流不需要流式，返回非流式
    if !sc.RequireStreaming() {
        return schema2.FieldNotStream, nil
    }

    // 只有文本输出字段是流式的
    field := path[0]
    if field == ReasoningOutputKey || field == outputKey {
        return schema2.FieldIsStream, nil
    }

    return schema2.FieldNotStream, nil
}
```

### 流式转换示例

```go
// VariableAggregator 实现流式转换
func (va *VariableAggregator) Transform(ctx context.Context, in *einoschema.StreamReader[map[string]any]) (*einoschema.StreamReader[map[string]any], error) {
    return einoschema.StreamReaderWithConvert(in, func(ctx context.Context, chunk map[string]any) (map[string]any, error) {
        // 对每个流式块进行转换
        result := make(map[string]any)

        for targetField, mapping := range va.mappings {
            sourceField := mapping.SourceField
            if val, ok := chunk[sourceField]; ok {
                result[targetField] = val
            }
        }

        return result, nil
    }), nil
}
```

## 复合节点

### Loop 节点

**结构**：
```go
type Loop struct {
    innerWorkflow compose.Runnable[map[string]any, map[string]any]
    loopConfig    *LoopConfig
}

type LoopConfig struct {
    MaxIterations int
    BreakOnError  bool
}
```

**执行流程**：
```go
func (l *Loop) Invoke(ctx context.Context, in map[string]any, opts ...nodes.NodeOption) (map[string]any, error) {
    var results []map[string]any

    for i := 0; i < l.loopConfig.MaxIterations; i++ {
        // 1. 准备当前迭代的输入
        iterInput := map[string]any{
            "index": i,
            "item":  extractLoopItem(in, i),
        }

        // 2. 执行内部工作流
        iterOutput, err := l.innerWorkflow.Invoke(ctx, iterInput, composeOpts...)

        // 3. 处理控制流
        if err != nil {
            if isBreak(err) {
                break  // Break 节点
            }
            if isContinue(err) {
                continue  // Continue 节点
            }
            if l.loopConfig.BreakOnError {
                return nil, err
            }
        }

        results = append(results, iterOutput)
    }

    // 4. 聚合结果
    return map[string]any{
        "results": results,
        "count":   len(results),
    }, nil
}
```

### Batch 节点

**结构**：
```go
type Batch struct {
    innerWorkflow  compose.Runnable[map[string]any, map[string]any]
    batchSize      int64
    concurrentSize int64
}
```

**执行流程**：
```go
func (b *Batch) Invoke(ctx context.Context, in map[string]any, opts ...nodes.NodeOption) (map[string]any, error) {
    items := in["items"].([]any)

    // 1. 分批处理
    var results []map[string]any
    for i := 0; i < len(items); i += int(b.batchSize) {
        end := min(i+int(b.batchSize), len(items))
        batch := items[i:end]

        // 2. 并发执行
        batchResults := make([]map[string]any, len(batch))
        sem := make(chan struct{}, b.concurrentSize)

        var wg sync.WaitGroup
        for j, item := range batch {
            wg.Add(1)
            sem <- struct{}{}  // 获取并发许可

            go func(index int, item any) {
                defer wg.Done()
                defer func() { <-sem }()  // 释放并发许可

                // 执行内部工作流
                result, err := b.innerWorkflow.Invoke(ctx, map[string]any{"item": item})
                if err != nil {
                    batchResults[index] = map[string]any{"error": err.Error()}
                } else {
                    batchResults[index] = result
                }
            }(j, item)
        }

        wg.Wait()
        results = append(results, batchResults...)
    }

    return map[string]any{
        "results": results,
        "total":   len(results),
    }, nil
}
```

## 中断与恢复

### 中断事件

```go
type InterruptEvent struct {
    ID            int64
    NodeKey       vo.NodeKey
    NodeType      entity.NodeType
    NodeTitle     string
    NodeIcon      string
    EventType     InterruptEventType
    InterruptData any
}

const (
    InterruptEventLLM      InterruptEventType = "llm_tool_call"
    InterruptEventOAuth    InterruptEventType = "oauth_required"
    InterruptEventApproval InterruptEventType = "approval_required"
)
```

### LLM 节点中断处理

```go
func (l *LLM) handleInterrupt(ctx context.Context, err error, resumingEvent *entity.InterruptEvent) error {
    // 1. 提取中断信息
    info, ok := compose.ExtractInterruptInfo(err)
    if !ok {
        return err
    }

    // 2. 创建新的中断事件
    id, _ := workflow.GetRepository().GenID(ctx)
    ie := &entity.InterruptEvent{
        ID:        id,
        NodeKey:   l.nodeKey,
        NodeType:  entity.NodeTypeLLM,
        NodeTitle: l.nodeName,
        EventType: entity.InterruptEventLLM,
        ToolInterruptEvent: highPriorityEvent,
    }

    // 3. 保存中断状态
    _ = compose.ProcessState(ctx, func(ctx context.Context, state nodes.IntermediateResultStore) error {
        // 保存工具调用 ID 到 执行 ID 的映射
        state.SetIntermediateResult(l.nodeKey, callID2ExeID)
        return nil
    })

    // 4. 返回中断错误
    return compose.NewInterruptAndRerunErr(ie)
}
```

### 恢复执行

```go
func (l *LLM) prepare(ctx context.Context, in map[string]any, opts ...nodes.NodeOption) ([]compose.GraphOption, *entity.InterruptEvent, error) {
    var composeOpts []compose.GraphOption

    // 从 NodeOption 中提取恢复事件
    nodeOpts := nodes.GetNodeOptions(opts...)
    resumingEvent := nodeOpts.ResumingEvent

    if resumingEvent != nil {
        // 添加恢复选项
        composeOpts = append(composeOpts, compose.WithToolsNodeOption(
            compose.WithToolOption(
                execute.WithResume(&entity.ResumeRequest{
                    ExecuteID:  resumingEvent.ToolInterruptEvent.ExecuteID,
                    EventID:    resumingEvent.ToolInterruptEvent.ID,
                    ResumeData: resumeData,
                }, allIEs),
            ),
        ))

        // 加载中断状态
        var callID2ExeID map[string]int64
        _ = compose.ProcessState(ctx, func(ctx context.Context, state nodes.IntermediateResultStore) error {
            state.GetIntermediateResult(l.nodeKey, &callID2ExeID)
            return nil
        })
    }

    return composeOpts, resumingEvent, nil
}
```

## 节点元数据（NodeTypeMeta）

**文件位置**：`backend/domain/workflow/entity/node_meta.go`

```go
type NodeTypeMeta struct {
    ID              int64      // 节点类型 ID
    Key             NodeType   // 节点类型 Key
    DisplayKey      string     // 显示 Key
    Name            string     // 中文名称
    Category        string     // 分类
    Color           string     // 节点颜色
    Desc            string     // 描述
    IconURI         string     // 图标 URI
    SupportBatch    bool       // 是否支持批处理
    Disabled        bool       // 是否禁用
    EnUSName        string     // 英文名称
    EnUSDescription string     // 英文描述

    ExecutableMeta             // 执行元数据
}

type ExecutableMeta struct {
    IsComposite      bool   // 是否是复合节点（包含子工作流）
    DefaultTimeoutMS int64  // 默认超时（毫秒）
    PreFillZero      bool   // 执行前填充零值
    PostFillNil      bool   // 执行后填充 nil
    MayUseChatModel  bool   // 可能使用聊天模型
    InputSourceAware bool   // 需要完整输入源信息
    IncrementalOutput bool  // 增量输出（用于流式）
    UseCtxCache      bool   // 使用上下文缓存
    PersistInputOnInterrupt bool  // 中断时持久化输入
    BlockEndStream   bool   // 阻塞结束流
    UseDatabase      bool   // 需要数据库配置
    UseKnowledge     bool   // 需要知识库配置
    UsePlugin        bool   // 需要插件配置
}
```

### 配置示例

```go
var NodeTypeMetas = map[NodeType]*NodeTypeMeta{
    NodeTypeLLM: {
        ID:           3,
        Key:          NodeTypeLLM,
        DisplayKey:   "LLM",
        Name:         "大模型",
        Category:     "",
        Desc:         "调用大语言模型,使用变量和提示词生成回复",
        Color:        "#5C62FF",
        IconURI:      "default_icon/workflow_icon/icon-llm.jpg",
        SupportBatch: true,
        ExecutableMeta: ExecutableMeta{
            PreFillZero:      true,
            PostFillNil:      true,
            InputSourceAware: true,
            MayUseChatModel:  true,
            UseCtxCache:      true,
        },
        EnUSName:        "LLM",
        EnUSDescription: "Invoke the large language model, generate responses using variables and prompt words.",
    },

    NodeTypePlugin: {
        ID:           4,
        Key:          NodeTypePlugin,
        DisplayKey:   "Api",
        Name:         "插件",
        Category:     "",
        Desc:         "通过添加工具访问实时数据和执行外部操作",
        Color:        "#CA61FF",
        IconURI:      "default_icon/workflow_icon/icon-plugin.jpg",
        SupportBatch: true,
        ExecutableMeta: ExecutableMeta{
            PreFillZero: true,
            PostFillNil: true,
            UsePlugin:   true,
        },
        EnUSName:        "Plugin",
        EnUSDescription: "Used to access external real-time data and perform operations",
    },
}
```

## 总结

### 核心技术特点

1. **高度抽象**：6 种执行接口覆盖所有节点类型
2. **流式支持**：原生支持流式数据处理
3. **错误处理完善**：支持重试、默认值、异常分支
4. **中断恢复**：支持长时间运行的工作流中断和恢复
5. **类型安全**：Go 强类型 + 完整的输入输出类型定义
6. **可扩展性强**：注册机制支持动态添加节点

### 关键文件位置

| 组件 | 文件位置 |
|-----|---------|
| 节点接口定义 | `backend/domain/workflow/internal/nodes/node.go` |
| 节点元数据 | `backend/domain/workflow/entity/node_meta.go` |
| 节点 Schema | `backend/domain/workflow/internal/schema/node_schema.go` |
| 节点构建器 | `backend/domain/workflow/internal/compose/node_builder.go` |
| 节点运行器 | `backend/domain/workflow/internal/compose/node_runner.go` |
| 节点注册 | `backend/domain/workflow/internal/canvas/adaptor/to_schema.go` |
| LLM 节点 | `backend/domain/workflow/internal/nodes/llm/` |
| Plugin 节点 | `backend/domain/workflow/internal/nodes/plugin/` |
| Database 节点 | `backend/domain/workflow/internal/nodes/database/` |

### 执行流程总结

```
前端画布保存
    ↓
Canvas JSON → Adapt → NodeSchema
    ↓
NodeSchema → Build → 可执行节点实例
    ↓
节点实例 → toNode → Eino Lambda
    ↓
工作流编译 → Eino Graph
    ↓
运行时执行：
    - 超时控制（context.WithTimeout）
    - 初始化 (init)
    - 预处理 (preProcess)
    - 开始回调 (onStart)
    - 实际执行 (invoke/stream - 带重试)
    - 后处理 (postProcess)
    - 结束回调 (onEnd)
    - 错误处理 (onError - 三种策略)
    - Panic 恢复
```

---

**文档版本**：v1.0.0
**最后更新**：2025-11-05

如有疑问，请参考：
- [节点开发指南](./node-development.md)
- [插件与节点集成](./plugin-node-integration.md)
- [工作流开发指南](./workflow-development.md)
