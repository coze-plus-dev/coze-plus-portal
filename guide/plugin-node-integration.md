# 插件与节点集成指南

本文档详细说明插件（Plugin）与节点（Node）的区别、关系，以及如何在工作流中开发和使用插件节点。

## 核心概念

### 插件（Plugin）

**定义**：可复用的外部功能封装，基于 OpenAPI 3.0 规范定义的独立组件。

**特点**：
- 独立存在，可被多个工作流/智能体共享
- 支持版本管理（草稿版、在线版）
- 支持多种认证方式（None、API Token、OAuth）
- 一个插件可包含多个工具（Tool）

**代码位置**：`backend/domain/plugin/`

### 节点（Node）

**定义**：工作流中的执行单元，代表一个具体的处理步骤。

**特点**：
- 从属于工作流，每个节点实例配置独立
- 系统预定义 30+ 种节点类型
- 通过前端画布拖拽配置
- 直接在工作流引擎中执行

**代码位置**：`backend/domain/workflow/internal/nodes/`

### Plugin 节点（插件节点）

**定义**：一种特殊的节点类型 `NodeTypePlugin`，是工作流调用插件的桥梁。

**特点**：
- 在工作流中调用已注册的插件
- 继承插件的版本管理和认证机制
- 可配置插件 ID、工具 ID、版本等参数

## 核心区别

### 对比表

| 维度 | 插件（Plugin） | 节点（Node） | Plugin 节点 |
|-----|---------------|-------------|------------|
| **定位** | 可复用的功能组件 | 工作流执行单元 | 插件与工作流的桥梁 |
| **数量** | 用户自定义，无限制 | 系统预定义 30+ 种 | 节点类型之一 |
| **配置** | OpenAPI YAML/JSON | 前端画布配置 | 选择插件+工具 |
| **独立性** | 完全独立 | 从属工作流 | 依赖插件 |
| **版本管理** | 支持 Draft/Online | 无版本概念 | 继承插件版本 |
| **认证** | None/Token/OAuth | 节点无认证 | 继承插件认证 |
| **存储** | `plugin_version` 表 | `workflow_draft` | 节点配置引用插件 |
| **扩展** | 添加新插件 | 开发新节点类型 | 使用现有插件 |

### 使用场景

**何时使用插件**：
- ✅ 调用第三方 API（高德地图、飞书等）
- ✅ 需要跨工作流/智能体复用
- ✅ 需要版本管理和 OAuth 认证
- ✅ 功能标准化、API 化

**何时直接使用节点**：
- ✅ 工作流内部数据处理
- ✅ 需要与引擎深度集成（循环、分支）
- ✅ 访问工作流上下文
- ✅ 性能敏感操作

**何时使用 Plugin 节点**：
- ✅ 在工作流中调用插件功能
- ✅ 需要插件的版本和认证特性
- ✅ 实现工作流与插件的集成

## 系统架构

### 插件系统架构

```
插件类型
├── Custom Plugin（自定义插件）
│   └── 通过 Go 代码实现 Invocation 接口
├── Product Plugin（产品插件）
│   └── 预配置的第三方服务模板
└── SaaS Plugin（SaaS 插件）
    └── Coze 官方服务

插件组成
├── Plugin Manifest（清单）
│   ├── 名称、描述
│   ├── 认证配置
│   └── 公共参数
├── OpenAPI Document（文档）
│   └── API 路径、参数、响应定义
└── Tools（工具列表）
    └── 一个插件包含多个工具
```

### 节点系统架构

```
节点类型（30+ 种）
├── 基础节点
│   ├── Entry（入口）
│   ├── Exit（出口）
│   └── VariableAssigner（变量赋值）
│
├── 数据处理
│   ├── Database*（数据库）- Query/Insert/Update/Delete/CustomSQL
│   ├── HTTPRequester（HTTP 请求）
│   ├── TextProcessor（文本处理）
│   └── Json*（序列化/反序列化）
│
├── AI 节点
│   ├── LLM（大语言模型）
│   ├── Knowledge*（知识库）- Indexer/Retriever/Deleter
│   └── IntentDetector（意图识别）
│
├── 控制流
│   ├── Selector（条件分支）
│   ├── Loop（循环）
│   ├── Batch（批处理）
│   └── SubWorkflow（子工作流）
│
└── 扩展节点
    ├── Plugin（插件节点）⭐
    └── CodeRunner（代码执行）
```

### 执行流程

```
工作流执行引擎
    ↓
Plugin 节点（NodeTypePlugin）
    ↓ 配置：pluginID, toolID, pluginVersion
插件执行服务（ExecutePlugin）
    ↓ 场景：ExecSceneOfWorkflow
Plugin Domain Service
    ↓ 根据插件类型路由
    ├─→ HTTP Call（OpenAPI 插件）→ 第三方 API
    ├─→ Custom Call（自定义插件）→ Go 函数
    └─→ SaaS Call（SaaS 插件）→ Coze 服务
```

## 开发指南

### 一、在工作流中使用现有插件

#### 前置条件

确保插件已注册到系统中：

```bash
# 查询已注册插件
curl http://localhost:8888/api/plugin_api/list

# 或查询数据库
SELECT id, manifest->>'$.name_for_human', version
FROM plugin_version
WHERE deleted_at IS NULL;
```

#### 步骤 1：在前端添加 Plugin 节点

在工作流画布中添加 Plugin 节点的 JSON 配置：

```json
{
  "id": "plugin_node_001",
  "type": "4",  // NodeTypePlugin 在 node_meta.go 中的 ID
  "data": {
    "meta": {
      "title": "高德地图地理编码",
      "description": "将地址转换为经纬度"
    },
    "inputs": {
      "apiParams": [
        {
          "name": "pluginID",
          "input": {
            "value": {
              "content": "1"  // 插件 ID
            }
          }
        },
        {
          "name": "apiID",
          "input": {
            "value": {
              "content": "10001"  // 工具 ID（geocodeGeo）
            }
          }
        },
        {
          "name": "pluginVersion",
          "input": {
            "value": {
              "content": "v1.0.0"  // 插件版本
            }
          }
        }
      ],
      "inputParameters": [
        {
          "name": "address",
          "type": "string",
          "input": {
            "value": {
              "content": "北京市朝阳区"
            }
          }
        },
        {
          "name": "city",
          "type": "string",
          "input": {
            "value": {
              "content": "北京"
            }
          }
        }
      ]
    },
    "outputs": [
      {
        "name": "location",
        "type": "string",
        "description": "经纬度坐标"
      },
      {
        "name": "province",
        "type": "string",
        "description": "省份名称"
      }
    ]
  },
  "edges": [
    {
      "sourceNodeID": "100001",  // Entry 节点
      "targetNodeID": "plugin_node_001"
    }
  ]
}
```

#### 步骤 2：配置输入参数

Plugin 节点的输入参数来自：

1. **上游节点输出**：
```json
{
  "name": "address",
  "input": {
    "value": {
      "type": "reference",
      "content": "{{entry_node.user_address}}"  // 引用上游节点变量
    }
  }
}
```

2. **固定值**：
```json
{
  "name": "city",
  "input": {
    "value": {
      "type": "static",
      "content": "北京"
    }
  }
}
```

3. **工作流变量**：
```json
{
  "name": "api_key",
  "input": {
    "value": {
      "type": "variable",
      "content": "{{workflow.gaode_api_key}}"
    }
  }
}
```

#### 步骤 3：处理输出结果

Plugin 节点执行后，输出可供下游节点使用：

```json
{
  "id": "text_processor_001",
  "type": "8",  // NodeTypeTextProcessor
  "data": {
    "inputs": {
      "inputParameters": [
        {
          "name": "template",
          "input": {
            "value": {
              "content": "地址：{{plugin_node_001.geocodes[0].formatted_address}}\n经纬度：{{plugin_node_001.geocodes[0].location}}"
            }
          }
        }
      ]
    }
  }
}
```

### 二、开发自定义 Plugin 节点类型（高级）

如果需要开发新的节点类型来特殊处理某类插件，参考以下步骤。

#### 场景示例

假设需要开发一个"AI 图像生成节点"，专门调用图像生成类插件，并增加图片预览、尺寸调整等特殊逻辑。

#### 步骤 1：定义节点类型

在 `backend/domain/workflow/entity/node_meta.go` 中添加新节点类型：

```go
const (
    // ... 现有节点类型
    NodeTypeAIImageGenerator NodeType = "AIImageGenerator"
)

var NodeTypeMetas = []NodeTypeMeta{
    // ... 现有节点元数据
    {
        ID:              35,
        Key:             NodeTypeAIImageGenerator,
        DisplayKey:      "ai_image_generator",
        Name:            "AI 图像生成",
        Category:        "ai",
        Color:           "#FF6B6B",
        Desc:            "调用 AI 图像生成插件，支持提示词、风格、尺寸等配置",
        IconURI:         "official_icon/node_ai_image.png",
        SupportBatch:    true,
        ExecutableMeta: ExecutableMeta{
            DefaultTimeoutMS: 60000,  // 60秒超时
            UsePlugin:        true,   // ⭐ 标记为使用插件
        },
    },
}
```

#### 步骤 2：实现节点适配器（Adaptor）

创建 `backend/domain/workflow/internal/nodes/aiimagegen/adaptor.go`：

```go
package aiimagegen

import (
    "context"
    "fmt"
    "strconv"

    "github.com/coze-dev/coze-studio/backend/domain/workflow/entity"
    "github.com/coze-dev/coze-studio/backend/domain/workflow/entity/vo"
    "github.com/coze-dev/coze-studio/backend/domain/workflow/internal/canvas/convert"
    "github.com/coze-dev/coze-studio/backend/domain/workflow/internal/nodes"
    "github.com/coze-dev/coze-studio/backend/domain/workflow/internal/schema"
    "github.com/coze-dev/coze-studio/backend/pkg/lang/slices"
)

type Config struct {
    PluginID      int64
    ToolID        int64
    PluginVersion string

    // AI 图像生成特有配置
    DefaultWidth  int
    DefaultHeight int
    DefaultStyle  string
}

func (c *Config) Adapt(ctx context.Context, n *vo.Node, opts ...nodes.AdaptOption) (*schema.NodeSchema, error) {
    ns := &schema.NodeSchema{
        Key:     vo.NodeKey(n.ID),
        Type:    entity.NodeTypeAIImageGenerator,
        Name:    n.Data.Meta.Title,
        Configs: c,
    }

    // 解析插件配置
    apiParams := slices.ToMap(n.Data.Inputs.APIParams, func(e *vo.Param) (string, *vo.Param) {
        return e.Name, e
    })

    // 获取插件 ID
    if ps, ok := apiParams["pluginID"]; ok {
        pID, err := strconv.ParseInt(ps.Input.Value.Content.(string), 10, 64)
        if err != nil {
            return nil, fmt.Errorf("invalid plugin ID: %w", err)
        }
        c.PluginID = pID
    }

    // 获取工具 ID
    if ps, ok := apiParams["apiID"]; ok {
        tID, err := strconv.ParseInt(ps.Input.Value.Content.(string), 10, 64)
        if err != nil {
            return nil, fmt.Errorf("invalid tool ID: %w", err)
        }
        c.ToolID = tID
    }

    // 获取版本
    if ps, ok := apiParams["pluginVersion"]; ok {
        c.PluginVersion = ps.Input.Value.Content.(string)
    }

    // 解析特有配置
    if width, ok := apiParams["defaultWidth"]; ok {
        c.DefaultWidth, _ = strconv.Atoi(width.Input.Value.Content.(string))
    }
    if height, ok := apiParams["defaultHeight"]; ok {
        c.DefaultHeight, _ = strconv.Atoi(height.Input.Value.Content.(string))
    }
    if style, ok := apiParams["defaultStyle"]; ok {
        c.DefaultStyle = style.Input.Value.Content.(string)
    }

    // 设置输入输出
    if err := convert.SetInputsForNodeSchema(n, ns); err != nil {
        return nil, err
    }
    if err := convert.SetOutputTypesForNodeSchema(n, ns); err != nil {
        return nil, err
    }

    return ns, nil
}

func (c *Config) Build(_ context.Context, _ *schema.NodeSchema, _ ...schema.BuildOption) (any, error) {
    return &AIImageGenerator{
        pluginID:      c.PluginID,
        toolID:        c.ToolID,
        pluginVersion: c.PluginVersion,
        defaultWidth:  c.DefaultWidth,
        defaultHeight: c.DefaultHeight,
        defaultStyle:  c.DefaultStyle,
    }, nil
}
```

#### 步骤 3：实现节点执行逻辑

创建 `backend/domain/workflow/internal/nodes/aiimagegen/generator.go`：

```go
package aiimagegen

import (
    "context"
    "fmt"

    "github.com/coze-dev/coze-studio/backend/api/model/app/bot_common"
    crossplugin "github.com/coze-dev/coze-studio/backend/crossdomain/plugin"
    "github.com/coze-dev/coze-studio/backend/crossdomain/plugin/consts"
    "github.com/coze-dev/coze-studio/backend/crossdomain/plugin/model"
    workflowModel "github.com/coze-dev/coze-studio/backend/crossdomain/workflow/model"
    "github.com/coze-dev/coze-studio/backend/domain/workflow/entity/vo"
    "github.com/coze-dev/coze-studio/backend/domain/workflow/internal/execute"
    "github.com/coze-dev/coze-studio/backend/domain/workflow/internal/nodes"
    "github.com/coze-dev/coze-studio/backend/pkg/lang/conv"
    "github.com/coze-dev/coze-studio/backend/pkg/lang/ptr"
    "github.com/coze-dev/coze-studio/backend/pkg/sonic"
    "github.com/coze-dev/coze-studio/backend/types/errno"
)

type AIImageGenerator struct {
    pluginID      int64
    toolID        int64
    pluginVersion string
    defaultWidth  int
    defaultHeight int
    defaultStyle  string
}

// Invoke 实现 nodes.InvokableNode 接口
func (g *AIImageGenerator) Invoke(ctx context.Context, parameters map[string]any) (map[string]any, error) {
    // 1. 预处理参数：应用默认值
    if _, ok := parameters["width"]; !ok && g.defaultWidth > 0 {
        parameters["width"] = g.defaultWidth
    }
    if _, ok := parameters["height"]; !ok && g.defaultHeight > 0 {
        parameters["height"] = g.defaultHeight
    }
    if _, ok := parameters["style"]; !ok && g.defaultStyle != "" {
        parameters["style"] = g.defaultStyle
    }

    // 2. 验证必填参数
    prompt, ok := parameters["prompt"].(string)
    if !ok || prompt == "" {
        return nil, vo.NewError(errno.ErrParamInvalid, "prompt is required")
    }

    // 3. 序列化参数
    args, err := sonic.MarshalString(parameters)
    if err != nil {
        return nil, vo.WrapError(errno.ErrSerializationDeserializationFail, err)
    }

    // 4. 获取执行配置
    var exeCfg workflowModel.ExecuteConfig
    if ctxExeCfg := execute.GetExeCtx(ctx); ctxExeCfg != nil {
        exeCfg = ctxExeCfg.ExeCfg
    }

    var uID string
    if exeCfg.AgentID != nil {
        uID = exeCfg.ConnectorUID
    } else {
        uID = conv.Int64ToStr(exeCfg.Operator)
    }

    // 5. 构建插件执行请求
    req := &model.ExecuteToolRequest{
        UserID:          uID,
        PluginID:        g.pluginID,
        ToolID:          g.toolID,
        ExecScene:       consts.ExecSceneOfWorkflow,
        ArgumentsInJson: args,
        ExecDraftTool:   g.pluginVersion == "" || g.pluginVersion == "0",
        PluginFrom:      ptr.Of(bot_common.PluginFrom_FromCustom),
    }

    execOpts := []model.ExecuteToolOpt{
        model.WithInvalidRespProcessStrategy(consts.InvalidResponseProcessStrategyOfReturnDefault),
    }

    if g.pluginVersion != "" {
        execOpts = append(execOpts, model.WithToolVersion(g.pluginVersion))
    }

    // 6. 调用插件服务执行工具
    r, err := crossplugin.DefaultSVC().ExecuteTool(ctx, req, execOpts...)
    if err != nil {
        return nil, vo.WrapError(errno.ErrPluginAPIErr,
            fmt.Errorf("AI image generation failed: %w", err))
    }

    // 7. 反序列化输出
    var output map[string]any
    err = sonic.UnmarshalString(r.TrimmedResp, &output)
    if err != nil {
        return nil, vo.WrapError(errno.ErrSerializationDeserializationFail, err)
    }

    // 8. 后处理：添加节点特有的输出
    output["generation_params"] = map[string]any{
        "prompt": prompt,
        "width":  parameters["width"],
        "height": parameters["height"],
        "style":  parameters["style"],
    }

    return output, nil
}

// ToCallbackOutput 转换输出为前端友好格式（可选）
func (g *AIImageGenerator) ToCallbackOutput(ctx context.Context, out map[string]any) (*nodes.StructuredCallbackOutput, error) {
    imageURL, _ := out["image_url"].(string)

    return &nodes.StructuredCallbackOutput{
        Fields: []*nodes.StructuredField{
            {
                Key:   "image_url",
                Value: imageURL,
                Type:  "image",  // 标记为图片类型，前端可预览
            },
            {
                Key:   "generation_params",
                Value: out["generation_params"],
                Type:  "object",
            },
        },
    }, nil
}
```

#### 步骤 4：注册节点

在 `backend/domain/workflow/internal/nodes/init.go` 中注册新节点：

```go
package nodes

import (
    "github.com/coze-dev/coze-studio/backend/domain/workflow/entity"
    "github.com/coze-dev/coze-studio/backend/domain/workflow/internal/nodes/aiimagegen"
    // ... 其他导入
)

func init() {
    // ... 其他节点注册

    // 注册 AI 图像生成节点
    RegisterNodeAdaptor(entity.NodeTypeAIImageGenerator, func() NodeAdaptor {
        return &aiimagegen.Config{}
    })
}
```

#### 步骤 5：前端配置（参考）

前端需要为新节点类型提供配置表单：

```typescript
// frontend/packages/workflow/node-config/ai-image-generator.tsx
export const AIImageGeneratorConfig = {
  type: 'AIImageGenerator',
  meta: {
    title: 'AI 图像生成',
    icon: 'icon-ai-image',
    category: 'ai',
  },
  inputs: {
    apiParams: [
      {
        name: 'pluginID',
        label: '图像生成插件',
        type: 'plugin-selector',
        required: true,
        filter: { category: 'image_generation' },  // 只显示图像生成类插件
      },
      {
        name: 'apiID',
        label: '生成工具',
        type: 'tool-selector',
        required: true,
        dependsOn: 'pluginID',
      },
      {
        name: 'pluginVersion',
        label: '插件版本',
        type: 'version-selector',
        required: true,
        dependsOn: 'pluginID',
      },
      {
        name: 'defaultWidth',
        label: '默认宽度',
        type: 'number',
        default: 1024,
      },
      {
        name: 'defaultHeight',
        label: '默认高度',
        type: 'number',
        default: 1024,
      },
      {
        name: 'defaultStyle',
        label: '默认风格',
        type: 'select',
        options: ['realistic', 'anime', 'oil_painting', 'watercolor'],
        default: 'realistic',
      },
    ],
    inputParameters: [
      {
        name: 'prompt',
        label: '提示词',
        type: 'textarea',
        required: true,
        placeholder: '描述您想生成的图像...',
      },
      {
        name: 'negative_prompt',
        label: '负面提示词',
        type: 'textarea',
        placeholder: '描述不希望出现的内容...',
      },
      {
        name: 'width',
        label: '图像宽度',
        type: 'number',
        min: 256,
        max: 2048,
      },
      {
        name: 'height',
        label: '图像高度',
        type: 'number',
        min: 256,
        max: 2048,
      },
      {
        name: 'style',
        label: '风格',
        type: 'select',
        options: ['realistic', 'anime', 'oil_painting', 'watercolor'],
      },
    ],
  },
  outputs: [
    {
      name: 'image_url',
      type: 'string',
      label: '图像 URL',
    },
    {
      name: 'generation_params',
      type: 'object',
      label: '生成参数',
    },
  ],
};
```

### 三、在 LLM 节点中使用插件

LLM 节点支持配置工具（Tools），这些工具可以来自插件，实现类似智能体的 Function Calling。

#### 步骤 1：配置 LLM 节点使用插件工具

```json
{
  "id": "llm_node_001",
  "type": "21",  // NodeTypeLLM
  "data": {
    "inputs": {
      "llmParam": {
        "model_id": "gpt-4",
        "temperature": 0.7,
        "max_tokens": 2000,
        "tools": [
          {
            "type": "plugin",
            "plugin_id": 1,
            "tool_id": 10001,
            "plugin_version": "v1.0.0",
            "enabled": true
          },
          {
            "type": "plugin",
            "plugin_id": 5,
            "tool_id": 50001,
            "plugin_version": "v1.0.0",
            "enabled": true
          }
        ]
      },
      "inputParameters": [
        {
          "name": "prompt",
          "input": {
            "value": {
              "content": "帮我查询北京市朝阳区的经纬度，并搜索附近的餐厅"
            }
          }
        }
      ]
    }
  }
}
```

#### 步骤 2：LLM 节点执行流程

```
LLM 节点执行
    ↓
1. LLM 分析用户请求，决定调用哪些工具
    ↓
2. 调用插件工具（geocodeGeo）
   参数: {"address": "北京市朝阳区"}
    ↓
3. 获取返回结果
   {"location": "116.xxx,39.xxx"}
    ↓
4. LLM 继续推理，决定调用第二个工具
    ↓
5. 调用插件工具（searchNearby）
   参数: {"location": "116.xxx,39.xxx", "keyword": "餐厅"}
    ↓
6. 获取返回结果并生成最终回答
```

#### 实现细节

LLM 节点内部处理插件工具的代码（`backend/domain/workflow/internal/nodes/llm/plugin.go`）：

```go
// 构建工具列表
func buildPluginTools(ctx context.Context, toolInfos []*ToolInfo, cfg workflowModel.ExecuteConfig) ([]tool.Tool, error) {
    var tools []tool.Tool

    for _, ti := range toolInfos {
        if ti.Type != "plugin" || !ti.Enabled {
            continue
        }

        // 为每个插件工具创建 Eino Tool 包装
        pluginTool := &PluginTool{
            pluginID:  ti.PluginID,
            toolID:    ti.ToolID,
            version:   ti.PluginVersion,
            cfg:       cfg,
        }

        tools = append(tools, pluginTool)
    }

    return tools, nil
}

// PluginTool 实现 Eino tool.Tool 接口
type PluginTool struct {
    pluginID  int64
    toolID    int64
    version   string
    cfg       workflowModel.ExecuteConfig
}

func (pt *PluginTool) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
    // 调用插件执行服务
    var input map[string]any
    _ = sonic.UnmarshalString(argumentsInJSON, &input)

    result, err := plugin.ExecutePlugin(ctx, input, &vo.PluginEntity{
        PluginID:      pt.pluginID,
        PluginVersion: ptr.Of(pt.version),
    }, pt.toolID, pt.cfg)

    if err != nil {
        return "", err
    }

    output, _ := sonic.MarshalString(result)
    return output, nil
}
```

## 完整示例

### 示例：调用高德地图插件的工作流

#### 1. 工作流结构

```
Entry（入口）
    ↓
Plugin Node: 地理编码
    ↓ 输入: address = "北京市朝阳区"
    ↓ 输出: location, province, city
Text Processor: 格式化结果
    ↓ 输入: location = {{plugin_node.geocodes[0].location}}
    ↓ 输出: formatted_text
Exit（出口）
    ↓ 输出: formatted_text
```

#### 2. 完整 JSON 配置

```json
{
  "id": "wf_gaode_geocode",
  "name": "高德地图地理编码工作流",
  "version": "1.0.0",
  "nodes": [
    {
      "id": "100001",
      "type": "14",
      "data": {
        "meta": {
          "title": "开始"
        },
        "inputs": {
          "inputParameters": [
            {
              "name": "user_address",
              "type": "string",
              "description": "用户输入的地址"
            }
          ]
        },
        "outputs": [
          {
            "name": "user_address",
            "type": "string"
          }
        ]
      }
    },
    {
      "id": "plugin_001",
      "type": "4",
      "data": {
        "meta": {
          "title": "高德地图地理编码",
          "icon": "icon-location"
        },
        "inputs": {
          "apiParams": [
            {
              "name": "pluginID",
              "input": {"value": {"content": "1"}}
            },
            {
              "name": "apiID",
              "input": {"value": {"content": "10001"}}
            },
            {
              "name": "pluginVersion",
              "input": {"value": {"content": "v1.0.0"}}
            }
          ],
          "inputParameters": [
            {
              "name": "address",
              "type": "string",
              "input": {
                "value": {
                  "type": "reference",
                  "content": "{{100001.user_address}}"
                }
              }
            }
          ],
          "settingOnError": {
            "ignoreException": false,
            "defaultOutput": {}
          }
        },
        "outputs": [
          {
            "name": "geocodes",
            "type": "array"
          },
          {
            "name": "status",
            "type": "string"
          }
        ]
      },
      "edges": [
        {
          "sourceNodeID": "100001",
          "targetNodeID": "plugin_001"
        }
      ]
    },
    {
      "id": "text_001",
      "type": "8",
      "data": {
        "meta": {
          "title": "格式化输出"
        },
        "inputs": {
          "inputParameters": [
            {
              "name": "template",
              "type": "string",
              "input": {
                "value": {
                  "content": "地址：{{plugin_001.geocodes[0].formatted_address}}\n省份：{{plugin_001.geocodes[0].province}}\n城市：{{plugin_001.geocodes[0].city}}\n经纬度：{{plugin_001.geocodes[0].location}}"
                }
              }
            }
          ]
        },
        "outputs": [
          {
            "name": "text",
            "type": "string"
          }
        ]
      },
      "edges": [
        {
          "sourceNodeID": "plugin_001",
          "targetNodeID": "text_001"
        }
      ]
    },
    {
      "id": "900001",
      "type": "15",
      "data": {
        "meta": {
          "title": "结束"
        },
        "inputs": {
          "inputParameters": [
            {
              "name": "output",
              "input": {
                "value": {
                  "type": "reference",
                  "content": "{{text_001.text}}"
                }
              }
            }
          ]
        }
      },
      "edges": [
        {
          "sourceNodeID": "text_001",
          "targetNodeID": "900001"
        }
      ]
    }
  ]
}
```

#### 3. 执行效果

**输入**：
```json
{
  "user_address": "北京市朝阳区阜通东大街6号"
}
```

**Plugin 节点输出**：
```json
{
  "status": "1",
  "count": "1",
  "geocodes": [
    {
      "formatted_address": "北京市朝阳区阜通东大街6号",
      "country": "中国",
      "province": "北京市",
      "city": "北京市",
      "citycode": "010",
      "district": "朝阳区",
      "street": "阜通东大街",
      "number": "6号",
      "location": "116.483038,39.989806",
      "level": "门牌号"
    }
  ]
}
```

**最终输出**：
```
地址：北京市朝阳区阜通东大街6号
省份：北京市
城市：北京市
经纬度：116.483038,39.989806
```

## 最佳实践

### 1. 插件选择策略

**使用插件的场景**：
- ✅ 需要调用外部第三方 API
- ✅ 功能需要在多个工作流间复用
- ✅ 需要 OAuth 用户授权
- ✅ API 有标准的 OpenAPI 规范

**直接用节点的场景**：
- ✅ 工作流内部逻辑处理
- ✅ 需要访问工作流上下文
- ✅ 性能敏感的高频操作
- ✅ 与工作流引擎深度集成（如循环、分支）

### 2. 版本管理

**插件版本控制**：
```json
{
  "apiParams": [
    {
      "name": "pluginVersion",
      "input": {
        "value": {
          "content": "v1.0.0"  // ✅ 明确指定版本
          // "content": "0"     // ❌ 0 表示使用草稿版，生产环境不推荐
          // "content": "latest" // ❌ 不要使用 latest，可能导致不确定性
        }
      }
    }
  ]
}
```

### 3. 错误处理

**配置错误处理策略**：
```json
{
  "inputs": {
    "settingOnError": {
      "ignoreException": false,  // 是否忽略异常
      "defaultOutput": {         // 异常时的默认输出
        "status": "error",
        "message": "地理编码失败"
      }
    }
  }
}
```

**在代码中处理插件错误**：
```go
result, err := plugin.ExecutePlugin(ctx, parameters, pluginEntity, toolID, cfg)
if err != nil {
    // 检查是否是 OAuth 认证错误
    if extra, ok := compose.IsInterruptRerunError(err); ok {
        pluginTIE := extra.(*model.ToolInterruptEvent)
        if pluginTIE.Event == consts.InterruptEventTypeOfToolNeedOAuth {
            // 返回 OAuth 授权 URL 给用户
            return nil, vo.NewError(errno.ErrAuthorizationRequired,
                errorx.KV("oauth_url", pluginTIE.ToolNeedOAuth.Message))
        }
    }

    // 其他错误
    return nil, vo.WrapError(errno.ErrPluginAPIErr, err)
}
```

### 4. 性能优化

**避免重复调用**：
```json
{
  "nodes": [
    {
      "id": "cache_001",
      "type": "7",  // VariableAssigner
      "data": {
        "inputs": {
          "inputParameters": [
            {
              "name": "cached_location",
              "input": {
                "value": {
                  "content": "{{plugin_001.geocodes[0].location}}"
                }
              }
            }
          ]
        }
      }
    },
    {
      "id": "downstream_001",
      "data": {
        "inputs": {
          "inputParameters": [
            {
              "name": "location",
              "input": {
                "value": {
                  "content": "{{cache_001.cached_location}}"  // 使用缓存
                }
              }
            }
          ]
        }
      }
    }
  ]
}
```

**批量调用**：
```json
{
  "id": "batch_plugin_001",
  "type": "23",  // Batch 节点
  "data": {
    "inputs": {
      "batch": {
        "batchEnable": true,
        "batchSize": 10,
        "concurrentSize": 3
      }
    },
    "blocks": [
      {
        "id": "plugin_in_batch",
        "type": "4",
        "data": {
          "inputs": {
            "apiParams": [/* 插件配置 */],
            "inputParameters": [
              {
                "name": "address",
                "input": {
                  "value": {
                    "content": "{{batch.item}}"  // 批量项
                  }
                }
              }
            ]
          }
        }
      }
    ]
  }
}
```

### 5. 调试技巧

**启用详细日志**：
```go
// 在执行插件时启用详细日志
execOpts := []model.ExecuteToolOpt{
    model.WithInvalidRespProcessStrategy(consts.InvalidResponseProcessStrategyOfReturnDefault),
    model.WithDetailedLog(true),  // 启用详细日志
}
```

**使用调试模式**：
```bash
# 设置环境变量启用工作流调试
export WORKFLOW_DEBUG=true
export PLUGIN_DEBUG=true

# 查看执行日志
tail -f logs/workflow.log | grep "plugin_node"
```

**检查节点执行记录**：
```sql
-- 查询节点执行记录
SELECT
    ne.id,
    ne.node_id,
    ne.node_name,
    ne.status,
    ne.input,
    ne.output,
    ne.error_detail,
    ne.start_time,
    ne.end_time
FROM node_execution ne
WHERE ne.execute_id = 'your_execute_id'
  AND ne.node_type = 'Plugin'
ORDER BY ne.start_time DESC;
```

## 故障排查

### 常见问题

#### 1. 插件未找到

**错误**：
```
plugin not found: plugin_id=123
```

**原因**：
- 插件 ID 错误
- 插件未发布（还在草稿状态）
- 插件已被删除

**解决**：
```sql
-- 检查插件是否存在
SELECT id, manifest->>'$.name_for_human', version, deleted_at
FROM plugin_version
WHERE id = 123;

-- 检查插件状态
SELECT id, plugin_id, is_online, version
FROM plugin_version
WHERE plugin_id = 123
ORDER BY id DESC;
```

#### 2. 工具未找到

**错误**：
```
tool not found: tool_id=10001
```

**原因**：
- 工具 ID 错误
- 工具不属于指定的插件
- 工具版本不匹配

**解决**：
```sql
-- 检查工具是否存在
SELECT tv.id, tv.method, tv.sub_url, pv.manifest->>'$.name_for_human' as plugin_name
FROM tool_version tv
JOIN plugin_version pv ON tv.plugin_version_id = pv.id
WHERE tv.id = 10001;

-- 查看插件的所有工具
SELECT tv.id, tv.method, tv.sub_url
FROM tool_version tv
WHERE tv.plugin_version_id = (
    SELECT id FROM plugin_version WHERE plugin_id = 1 AND is_online = 1
);
```

#### 3. 参数错误

**错误**：
```
parameter validation failed: address is required
```

**原因**：
- 必填参数未提供
- 参数类型不匹配
- 参数格式错误

**解决**：
- 检查 OpenAPI 定义中的参数要求
- 确保节点配置中参数名称正确
- 验证参数值的类型和格式

#### 4. OAuth 认证失败

**错误**：
```
authorization required: oauth token expired
```

**原因**：
- OAuth Token 已过期
- 用户未授权
- OAuth 配置错误

**解决**：
```go
// 检查 OAuth 状态
ctx := context.Background()
authStatus, err := pluginService.CheckOAuthStatus(ctx, &plugin.CheckOAuthRequest{
    PluginID: pluginID,
    UserID:   userID,
})

// 刷新 Token
if authStatus.Expired {
    newToken, err := pluginService.RefreshOAuthToken(ctx, &plugin.RefreshTokenRequest{
        PluginID: pluginID,
        UserID:   userID,
    })
}
```

#### 5. 超时错误

**错误**：
```
plugin execution timeout: exceeded 30s
```

**原因**：
- 第三方 API 响应慢
- 网络问题
- 超时配置过短

**解决**：
```json
{
  "data": {
    "inputs": {
      "settingOnError": {
        "timeout": 60000  // 增加超时时间到 60 秒
      }
    }
  }
}
```

或在节点元数据中配置：
```go
ExecutableMeta: ExecutableMeta{
    DefaultTimeoutMS: 60000,  // 60 秒
}
```

## 参考资源

### 相关文档

- [插件技术架构](./plugin-architecture.md) - 插件系统的整体架构设计
- [插件开发指南](./plugin-development.md) - 如何开发和发布插件
- [工作流开发指南](./workflow-development.md) - 工作流系统开发
- [节点开发教程](./workflow-node-development.md) - 如何开发新的节点类型

### 代码文件位置

**插件相关**：
- `backend/domain/plugin/service/exec_tool.go` - 插件执行服务
- `backend/domain/plugin/service/tool/invocation.go` - 工具调用接口
- `backend/crossdomain/plugin/` - 插件跨域服务

**节点相关**：
- `backend/domain/workflow/entity/node_meta.go` - 节点类型定义
- `backend/domain/workflow/internal/nodes/node.go` - 节点接口定义
- `backend/domain/workflow/internal/nodes/plugin/` - Plugin 节点实现
- `backend/domain/workflow/internal/nodes/llm/plugin.go` - LLM 节点插件工具

**工作流引擎**：
- `backend/domain/workflow/internal/execute/` - 工作流执行引擎
- `backend/domain/workflow/internal/schema/` - 工作流 Schema

### API 参考

**插件 API**：
```bash
# 列出所有插件
GET /api/plugin_api/list

# 获取插件详情
GET /api/plugin_api/detail?plugin_id=1

# 调试插件工具
POST /api/plugin_api/debug_tool
{
  "plugin_id": 1,
  "tool_id": 10001,
  "arguments": {"address": "北京市"}
}
```

**工作流 API**：
```bash
# 执行工作流
POST /api/workflow/run
{
  "workflow_id": "wf_123",
  "inputs": {"user_address": "北京市朝阳区"}
}

# 查询执行状态
GET /api/workflow/execution/:execute_id
```

---

**最后更新时间**：2025-11-05

**文档版本**：v1.0.0

如有任何疑问或需要帮助，请联系：
- 📧 邮箱：support@coze-plus.cn
- 💬 交流群：参见[项目概述](./overview.md)
