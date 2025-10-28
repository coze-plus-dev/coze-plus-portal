# 模型技术架构

本文档详细介绍 Coze Plus 模型管理系统的技术架构、核心概念和实现原理。

## 概述

Coze Plus 模型管理系统是一个灵活且可扩展的大语言模型（LLM）集成框架，支持多种模型提供商和部署方式。系统通过统一的抽象层，使得接入新模型变得简单快捷，同时保证了模型调用的一致性和可靠性。

### 核心特性

- 🌐 **多提供商支持**：支持 OpenAI、Claude、Gemini、DeepSeek、Qwen、Ollama 等主流提供商
- 🔧 **灵活配置**：基于 YAML 的配置文件，支持热加载
- 🏗️ **统一抽象**：所有模型通过统一接口调用，降低使用复杂度
- 📊 **能力管理**：细粒度的能力声明（Function Call、多模态、推理模式等）
- 🎛️ **参数控制**：丰富的模型参数配置和前端 UI 组件支持
- 🔐 **安全管理**：API Key 和凭证的加密存储和管理
- 📦 **实例管理**：支持创建、更新、删除模型实例
- 🚀 **高性能**：基于 Eino 框架的高效模型调用

## 核心概念

### Model Meta（模型元数据）

**模型元数据**定义了某个模型提供商下特定模型的基础配置模板，包括模型能力、连接配置、默认参数等。元数据存储在 `model_meta.json` 文件中，作为创建模型实例的基础。

**数据结构**（`backend/bizpkg/config/modelmgr/model_meta.go:36-42`）：

```go
type ModelMeta struct {
    DisplayInfo     *config.DisplayInfo             // 显示信息
    Capability      *developer_api.ModelAbility     // 模型能力
    Connection      *config.Connection              // 连接配置
    Parameters      []*developer_api.ModelParameter // 模型参数
    EnableBase64URL bool                            // 是否启用 Base64 URL
}
```

**元数据结构**：

```json
{
  "provider2models": {
    "openai": {
      "gpt-4o": {
        "display_info": {...},
        "capability": {...},
        "connection": {...},
        "parameters": [...]
      },
      "default": {
        ...
      }
    },
    "claude": {
      "claude-3.5-sonnet": {...},
      "default": {...}
    }
  }
}
```

### Model Template（模型模板）

**模型模板**是用于创建新模型的 YAML 配置文件，位于 `backend/conf/model/template/` 目录。每个模板定义了一个具体模型的完整配置，包括显示信息、能力、连接参数等。

**模板文件结构**：

```yaml
id: 69010                          # 模型 ID（唯一）
name: GPT-4o                       # 模型显示名称
icon_uri: default_icon/openai_v2.png  # 图标路径
icon_url: ""                       # 图标 URL（可选）
description:                       # 模型描述（多语言）
  zh: gpt 模型简介
  en: Multi-modal model description

default_parameters:                # 默认参数配置
  - name: temperature
    label:
      zh: 生成随机性
      en: Temperature
    desc:
      zh: 调高温度会使得模型的输出更多样性...
      en: When you increase this value...
    type: float
    min: "0"
    max: "1"
    default_val:
      balance: "0.8"
      creative: "1"
      default_val: "1.0"
      precise: "0.3"
    precision: 1
    style:
      widget: slider               # UI 组件类型
      label:
        zh: 生成多样性
        en: Generation diversity

meta:                              # 元数据配置
  protocol: openai                 # 协议类型
  capability:                      # 模型能力
    function_call: true            # 支持函数调用
    input_modal:                   # 输入模态
      - text
      - image
    input_tokens: 128000           # 输入 Token 上限
    json_mode: false               # JSON 模式
    max_tokens: 128000             # 最大 Token 数
    output_modal:                  # 输出模态
      - text
    output_tokens: 16384           # 输出 Token 上限
    prefix_caching: false          # 前缀缓存
    reasoning: false               # 推理模式
    prefill_response: false        # 预填充响应

  conn_config:                     # 连接配置
    base_url: "https://api.openai.com/v1"
    api_key: ""                    # API 密钥（部署时配置）
    timeout: 0s
    model: ""                      # 模型名称（如 gpt-4o）
    temperature: 0.7
    max_tokens: 4096
    top_p: 1
    openai:                        # OpenAI 特定配置
      by_azure: false
      api_version: ""
      response_format:
        type: text
    custom: {}                     # 自定义配置

  status: 0                        # 状态
```

### Model Instance（模型实例）

**模型实例**是基于模型模板创建的具体可用模型，存储在 `model_instance` 数据库表中。每个实例包含完整的配置信息，可以被智能体和工作流引用。

**数据库表结构**（`backend/bizpkg/config/modelmgr/modelmgr.go:31-45`）：

```sql
CREATE TABLE IF NOT EXISTS `model_instance` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT COMMENT 'id',
  `type` tinyint NOT NULL COMMENT 'Model Type 0-LLM 1-TextEmbedding 2-Rerank',
  `provider` json NOT NULL COMMENT 'Provider Information',
  `display_info` json NOT NULL COMMENT 'Display Information',
  `connection` json NOT NULL COMMENT 'Connection Information',
  `capability` json NOT NULL COMMENT 'Model Capability',
  `parameters` json NOT NULL COMMENT 'Model Parameters',
  `extra` json COMMENT 'Extra Information',
  `created_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Create Time in Milliseconds',
  `updated_at` bigint unsigned NOT NULL DEFAULT 0 COMMENT 'Update Time in Milliseconds',
  `deleted_at` datetime(3) NULL COMMENT 'Delete Time',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**实例数据结构**：

```json
{
  "id": 1,
  "type": 0,
  "provider": {
    "name": "OpenAI",
    "icon_uri": "default_icon/openai_v2.png"
  },
  "display_info": {
    "name": "GPT-4o",
    "description": {...}
  },
  "connection": {
    "base_url": "https://api.openai.com/v1",
    "api_key": "sk-...",
    "model": "gpt-4o",
    "temperature": 0.7
  },
  "capability": {
    "function_call": true,
    "input_modal": ["text", "image"],
    "input_tokens": 128000
  },
  "parameters": [...],
  "extra": {},
  "created_at": 1234567890000,
  "updated_at": 1234567890000
}
```

### Model Builder（模型构建器）

**模型构建器**负责根据模型配置创建实际的模型调用客户端。不同的提供商有不同的构建器实现。

**构建器接口**（`backend/bizpkg/llm/modelbuilder/model_builder.go:38-40`）：

```go
type Service interface {
    Build(ctx context.Context, params *LLMParams) (ToolCallingChatModel, error)
}
```

**支持的构建器**：

- `ArkModelBuilder` - 字节跳动 Ark 平台（Doubao 模型）
- `OpenaiModelBuilder` - OpenAI 模型
- `ClaudeModelBuilder` - Anthropic Claude 模型
- `DeepseekModelBuilder` - DeepSeek 模型
- `GeminiModelBuilder` - Google Gemini 模型
- `OllamaModelBuilder` - Ollama 本地模型
- `QwenModelBuilder` - 阿里云通义千问模型

## 模型类型

### 1. LLM（大语言模型）

用于文本生成、对话、推理等任务的通用语言模型。

**支持的提供商**：

| 提供商 | 协议 | 代表模型 | 特点 |
|--------|------|---------|------|
| **OpenAI** | openai | GPT-4o, GPT-4o-mini | 多模态、长上下文 |
| **Anthropic** | claude | Claude-3.5-Sonnet | 推理能力强、安全性高 |
| **ByteDance** | ark | Doubao-1.5-Pro | 中文优化、高性价比 |
| **Google** | gemini | Gemini-Pro, Gemini-Flash | 多模态、实时数据 |
| **DeepSeek** | deepseek | DeepSeek-V3, DeepSeek-R1 | 推理模式、开源 |
| **Alibaba** | qwen | Qwen-Max, Qwen-Plus | 中文优化、工具调用 |
| **Ollama** | ollama | Llama3, Gemma, Mistral | 本地部署、隐私保护 |

### 2. Text Embedding（文本嵌入模型）

用于将文本转换为向量表示，支持语义检索和相似度计算。

**典型应用**：
- 知识库文档向量化
- 语义搜索
- 文本相似度计算

### 3. Rerank（重排序模型）

用于对检索结果进行重新排序，提升检索准确性。

**典型应用**：
- 知识库检索结果重排序
- 搜索结果优化

## 模型能力（Capability）

### Function Call（函数调用）

模型是否支持主动调用外部工具（插件）。

```json
{
  "function_call": true
}
```

**适用场景**：
- 智能体工作流
- 插件集成
- 复杂任务编排

### Input Modal（输入模态）

模型支持的输入类型。

```json
{
  "input_modal": ["text", "image", "audio", "video"]
}
```

**模态类型**：
- `text`：纯文本输入
- `image`：图像输入（如 GPT-4o、Claude-3）
- `audio`：音频输入（未来支持）
- `video`：视频输入（未来支持）

### Output Modal（输出模态）

模型支持的输出类型。

```json
{
  "output_modal": ["text", "image"]
}
```

### Tokens 限制

```json
{
  "input_tokens": 128000,      // 输入 Token 上限
  "output_tokens": 16384,      // 输出 Token 上限
  "max_tokens": 128000         // 总 Token 上限
}
```

### JSON Mode（JSON 模式）

模型是否支持结构化 JSON 输出。

```json
{
  "json_mode": true
}
```

### Reasoning（推理模式）

模型是否支持 Chain-of-Thought 推理（如 DeepSeek-R1）。

```json
{
  "reasoning": true
}
```

### Prefix Caching（前缀缓存）

模型是否支持前缀缓存优化（Claude 3.5 支持）。

```json
{
  "prefix_caching": true
}
```

### Prefill Response（预填充响应）

模型是否支持预填充响应内容（Claude 支持）。

```json
{
  "prefill_response": true
}
```

## 模型参数

### 通用参数

所有模型都支持的基础参数：

#### temperature（温度）

控制输出的随机性和创造性。

```yaml
- name: temperature
  type: float
  min: "0"
  max: "1"
  default_val:
    balance: "0.8"      # 平衡模式
    creative: "1"       # 创造模式
    default_val: "1.0"  # 默认值
    precise: "0.3"      # 精确模式
  precision: 1
  style:
    widget: slider      # 前端使用滑块组件
```

**取值说明**：
- `0.0 - 0.3`：精确模式，输出确定性强，适合事实性任务
- `0.4 - 0.7`：平衡模式，兼顾准确性和多样性
- `0.8 - 1.0`：创造模式，输出更多样化，适合创作性任务

#### max_tokens（最大 Token 数）

控制模型输出的最大长度。

```yaml
- name: max_tokens
  type: int
  min: "1"
  max: "4096"
  default_val:
    default_val: "4096"
  style:
    widget: slider
```

**计算方式**：
- 英文：1 Token ≈ 4 字符
- 中文：1 Token ≈ 1-1.5 个汉字
- 示例：100 Tokens ≈ 150 个中文汉字

#### top_p（Top P 采样）

累计概率采样策略。

```yaml
- name: top_p
  type: float
  min: "0"
  max: "1"
  default_val:
    default_val: "0.7"
  precision: 2
```

**工作原理**：
- 从概率最高的 Token 开始累加，直到累计概率达到 `top_p`
- 只考虑这些高概率 Token
- 控制输出的多样性

**建议**：
- 不要同时调整 `temperature` 和 `top_p`
- 一般情况下使用默认值即可

#### frequency_penalty（频率惩罚）

惩罚已出现的 Token，增加输出多样性。

```yaml
- name: frequency_penalty
  type: float
  min: "-2"
  max: "2"
  default_val:
    default_val: "0"
  precision: 2
```

**取值说明**：
- `> 0`：阻止重复使用相同词汇
- `= 0`：无惩罚
- `< 0`：鼓励使用相同词汇（不推荐）

#### presence_penalty（存在惩罚）

惩罚已讨论的主题，增加话题多样性。

```yaml
- name: presence_penalty
  type: float
  min: "-2"
  max: "2"
  default_val:
    default_val: "0"
  precision: 2
```

### 提供商特定参数

#### OpenAI 专属

**response_format（响应格式）**：

```yaml
- name: response_format
  type: int
  options:
    - label: Text
      value: "0"
    - label: Markdown
      value: "1"
    - label: JSON
      value: "2"
  style:
    widget: radio_buttons
```

**by_azure（使用 Azure OpenAI）**：

```json
{
  "openai": {
    "by_azure": true,
    "api_version": "2024-02-01"
  }
}
```

#### Claude 专属

**by_bedrock（使用 AWS Bedrock）**：

```json
{
  "claude": {
    "by_bedrock": true,
    "access_key": "AWS_ACCESS_KEY",
    "secret_access_key": "AWS_SECRET_KEY",
    "region": "us-west-2"
  }
}
```

**budget_tokens（预算 Token 数）**：

```json
{
  "claude": {
    "budget_tokens": 100000
  }
}
```

#### Ollama 专属

**top_k（Top K 采样）**：

```yaml
- name: top_k
  type: int
  min: "1"
  max: "100"
  default_val:
    default_val: "20"
```

只考虑概率最高的 K 个 Token。

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
│  (智能体、工作流、对话管理)                             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│               Model Management Layer                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Model Config │  │ Model Meta   │  │ Model Params │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │           Model Instance Management                ││
│  │  - Create / Update / Delete                        ││
│  │  - List / Get                                      ││
│  └────────────────────────────────────────────────────┘│
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│                  Model Builder Layer                    │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ OpenAI   │ │ Claude   │ │ Gemini   │ │ DeepSeek │  │
│  │ Builder  │ │ Builder  │ │ Builder  │ │ Builder  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │ Ark      │ │ Qwen     │ │ Ollama   │               │
│  │ Builder  │ │ Builder  │ │ Builder  │               │
│  └──────────┘ └──────────┘ └──────────┘               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│                    Eino Framework                       │
│  (统一的模型调用接口)                                   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────┐
│             LLM Provider APIs                           │
│  OpenAI | Claude | Gemini | DeepSeek | Qwen | Ollama  │
└─────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. Model Config（模型配置管理器）

**文件**：`backend/bizpkg/config/modelmgr/modelmgr.go`

**职责**：
- 初始化模型配置系统
- 加载模型元数据
- 管理模型实例的 CRUD 操作
- 缓存模型配置信息

**初始化流程**（`backend/bizpkg/config/modelmgr/modelmgr.go:59-83`）：

```go
func Init(ctx context.Context, db *gorm.DB, oss storage.Storage) (*ModelConfig, error) {
    // 1. 初始化数据库查询
    query.SetDefault(db)

    // 2. 加载模型元数据
    mMetaConf, err := initModelMetaConf()
    if err != nil {
        return nil, err
    }

    // 3. 创建配置管理器
    c := &ModelConfig{
        oss:           oss,
        kv:            kvstore.New[struct{}](db),
        ModelMetaConf: mMetaConf,
    }

    // 4. 初始化旧版模型配置（兼容性）
    err = initOldModelConf(ctx, oss, c)
    if err != nil {
        return nil, err
    }

    return c, nil
}
```

#### 2. Model Meta Loader（元数据加载器）

**文件**：`backend/bizpkg/config/modelmgr/model_meta.go`

**职责**：
- 从 `model_meta.json` 加载元数据
- 提供元数据查询接口
- 深拷贝元数据防止修改

**加载流程**（`backend/bizpkg/config/modelmgr/model_meta.go:46-65`）：

```go
func initModelMetaConf() (*ModelMetaConf, error) {
    // 1. 获取工作目录
    wd, err := os.Getwd()

    // 2. 构建配置文件路径
    const modelMetaConfPath = "resources/conf/model/model_meta.json"
    configRoot := filepath.Join(wd, modelMetaConfPath)

    // 3. 读取 JSON 文件
    jsonData, err := os.ReadFile(configRoot)

    // 4. 解析为结构体
    err = json.Unmarshal(jsonData, &modelMetaConf)

    return modelMetaConf, nil
}
```

**查询元数据**（`backend/bizpkg/config/modelmgr/model_meta.go:67-87`）：

```go
func (c *ModelMetaConf) GetModelMeta(modelClass developer_api.ModelClass, modelName string) (*ModelMeta, error) {
    // 1. 根据 modelClass 查找提供商
    modelName2Meta, ok := c.Provider2Models[modelClass.String()]

    // 2. 查找指定模型的元数据
    modelMeta, ok := modelName2Meta[modelName]
    if ok {
        return deepCopyModelMeta(&modelMeta)
    }

    // 3. 如果找不到，使用 default 元数据
    const defaultKey = "default"
    modelMeta, ok = modelName2Meta[defaultKey]
    if ok {
        return deepCopyModelMeta(&modelMeta)
    }

    return nil, fmt.Errorf("model meta not found")
}
```

#### 3. Model Builder（模型构建器）

**文件**：`backend/bizpkg/llm/modelbuilder/model_builder.go`

**职责**：
- 根据模型类型选择对应的构建器
- 构建模型调用客户端
- 应用运行时参数

**构建器工厂**（`backend/bizpkg/llm/modelbuilder/model_builder.go:42-73`）：

```go
func NewModelBuilder(modelClass developer_api.ModelClass, cfg *config.Model) (Service, error) {
    // 1. 验证配置完整性
    if cfg == nil || cfg.Connection == nil || cfg.Connection.BaseConnInfo == nil {
        return nil, fmt.Errorf("invalid model config")
    }

    // 2. 根据 modelClass 创建对应的构建器
    switch modelClass {
    case developer_api.ModelClass_SEED:
        return newArkModelBuilder(cfg), nil
    case developer_api.ModelClass_GPT:
        return newOpenaiModelBuilder(cfg), nil
    case developer_api.ModelClass_Claude:
        return newClaudeModelBuilder(cfg), nil
    case developer_api.ModelClass_DeekSeek:
        return newDeepseekModelBuilder(cfg), nil
    case developer_api.ModelClass_Gemini:
        return newGeminiModelBuilder(cfg), nil
    case developer_api.ModelClass_Llama:
        return newOllamaModelBuilder(cfg), nil
    case developer_api.ModelClass_QWen:
        return newQwenModelBuilder(cfg), nil
    default:
        return nil, fmt.Errorf("model class %v not supported", modelClass)
    }
}
```

**构建模型**（`backend/bizpkg/llm/modelbuilder/model_builder.go:93-105`）：

```go
func BuildModelByID(ctx context.Context, modelID int64, params *LLMParams) (ToolCallingChatModel, *modelmgr.Model, error) {
    // 1. 从数据库获取模型配置
    m, err := bizConf.ModelConf().GetModelByID(ctx, modelID)
    if err != nil {
        return nil, nil, fmt.Errorf("get model by id failed: %w", err)
    }

    // 2. 构建模型客户端
    bcm, err := buildModelWithConfParams(ctx, m, params)
    if err != nil {
        return nil, nil, fmt.Errorf("build model failed: %w", err)
    }

    return bcm, m, nil
}
```

#### 4. Eino Framework 集成

Coze Plus 使用字节跳动开源的 [Eino](https://github.com/cloudwego/eino) 框架作为底层模型调用抽象层。

**统一接口**：

```go
type BaseChatModel interface {
    Generate(ctx context.Context, req *GenerateRequest) (*GenerateResponse, error)
    Stream(ctx context.Context, req *GenerateRequest) (*GenerateStreamResponse, error)
}

type ToolCallingChatModel interface {
    BaseChatModel
    BindTools(tools []Tool) ToolCallingChatModel
}
```

**优势**：
- 统一的接口，降低切换成本
- 高性能，支持流式响应
- 内置重试和错误处理
- 支持工具调用（Function Call）

## 数据流程

### 创建模型实例

```
用户 → API → Application Layer → Model Config
                                      ↓
                           1. 从元数据获取默认配置
                                      ↓
                           2. 用户填写 API Key 等信息
                                      ↓
                           3. 保存到 model_instance 表
                                      ↓
                           4. 返回模型实例 ID
```

**代码流程**（`backend/bizpkg/config/modelmgr/model_save.go`）：

```go
func (c *ModelConfig) CreateModel(ctx context.Context, req *CreateModelRequest) (int64, error) {
    // 1. 从元数据获取模板
    modelMeta, err := c.ModelMetaConf.GetModelMeta(req.ModelClass, req.ModelName)

    // 2. 合并用户配置
    instance := &Model{
        Type:        ModelTypeLLM,
        Provider:    req.Provider,
        DisplayInfo: req.DisplayInfo,
        Connection:  mergeConnection(modelMeta.Connection, req.Connection),
        Capability:  modelMeta.Capability,
        Parameters:  modelMeta.Parameters,
    }

    // 3. 加密敏感信息（API Key）
    encryptSensitiveInfo(instance.Connection)

    // 4. 保存到数据库
    result := query.ModelInstance.Create(instance)

    return instance.ID, nil
}
```

### 调用模型

```
智能体/工作流 → BuildModelByID
                     ↓
         1. 从 model_instance 加载配置
                     ↓
         2. 解密 API Key
                     ↓
         3. 选择对应的 Model Builder
                     ↓
         4. 构建 Eino ChatModel 实例
                     ↓
         5. 应用运行时参数（temperature 等）
                     ↓
         6. 调用 LLM API
                     ↓
         7. 返回响应
```

**代码流程**（`backend/bizpkg/llm/modelbuilder/model_builder.go`）：

```go
func BuildModelByID(ctx context.Context, modelID int64, params *LLMParams) (ToolCallingChatModel, *modelmgr.Model, error) {
    // 1. 获取模型实例
    m, err := bizConf.ModelConf().GetModelByID(ctx, modelID)

    // 2. 解密配置信息
    decryptConnection(m.Connection)

    // 3. 创建模型构建器
    builder, err := NewModelBuilder(m.Provider.ModelClass, m.Config)

    // 4. 构建模型
    bcm, err := builder.Build(ctx, params)

    return bcm, m, nil
}
```

## 安全性

### API Key 加密

所有 API Key 在存储到数据库前都会使用 AES 加密。

**加密流程**：

```go
func encryptAPIKey(apiKey string) (string, error) {
    secret := os.Getenv("MODEL_SECRET_KEY")
    if secret == "" {
        secret = DefaultSecretKey
    }

    encrypted, err := aes.Encrypt([]byte(apiKey), []byte(secret))
    return base64.StdEncoding.EncodeToString(encrypted), err
}
```

**解密流程**：

```go
func decryptAPIKey(encryptedKey string) (string, error) {
    secret := os.Getenv("MODEL_SECRET_KEY")

    ciphertext, _ := base64.StdEncoding.DecodeString(encryptedKey)
    plaintext, err := aes.Decrypt(ciphertext, []byte(secret))

    return string(plaintext), err
}
```

### 环境变量配置

建议通过环境变量管理敏感信息：

```bash
# 模型加密密钥
MODEL_SECRET_KEY=your_32_byte_secret_key

# OpenAI API Key
OPENAI_API_KEY=sk-...

# Claude API Key
ANTHROPIC_API_KEY=sk-ant-...

# Gemini API Key
GOOGLE_API_KEY=...
```

## 性能优化

### 1. 连接池

每个模型构建器维护一个 HTTP 连接池，复用连接提升性能。

```go
var httpClient = &http.Client{
    Timeout: 60 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 20,
        IdleConnTimeout:     90 * time.Second,
    },
}
```

### 2. 配置缓存

模型配置和元数据使用内存缓存，减少数据库查询。

```go
var (
    modelCache sync.Map  // modelID -> Model
    metaCache  sync.Map  // modelClass -> ModelMeta
)
```

### 3. 批量加载

支持批量加载多个模型配置，减少 DB 往返。

```go
func (c *ModelConfig) BatchGetModels(ctx context.Context, modelIDs []int64) ([]*Model, error) {
    return query.ModelInstance.Where(query.ModelInstance.ID.In(modelIDs...)).Find()
}
```

## 扩展新模型提供商

### 步骤 1：定义模型类型

在 `backend/api/model/app/developer_api/model.thrift` 中添加新的 `ModelClass`：

```thrift
enum ModelClass {
    GPT = 1;
    Claude = 2;
    Gemini = 3;
    DeekSeek = 4;
    QWen = 5;
    Llama = 6;
    SEED = 7;
    NewProvider = 8;  // 新增
}
```

### 步骤 2：创建模型模板

在 `backend/conf/model/template/` 目录创建新模板文件：

```yaml
# model_template_newprovider.yaml
id: 70010
name: NewProvider-Model
icon_uri: default_icon/newprovider.png
description:
  zh: 新提供商模型
  en: New provider model

default_parameters:
  - name: temperature
    type: float
    min: "0"
    max: "1"
    default_val:
      default_val: "0.7"

meta:
  protocol: newprovider
  capability:
    function_call: true
    input_modal: [text]
    input_tokens: 8000
    output_tokens: 4000

  conn_config:
    base_url: "https://api.newprovider.com/v1"
    api_key: ""
    model: ""
    temperature: 0.7
```

### 步骤 3：实现 Model Builder

在 `backend/bizpkg/llm/modelbuilder/` 创建新文件：

```go
// newprovider.go
package modelbuilder

import (
    "context"

    "github.com/cloudwego/eino/components/model"
    "github.com/coze-dev/coze-studio/backend/api/model/admin/config"
)

type newproviderModelBuilder struct {
    cfg *config.Model
}

func newNewProviderModelBuilder(cfg *config.Model) Service {
    return &newproviderModelBuilder{cfg: cfg}
}

func (b *newproviderModelBuilder) Build(ctx context.Context, params *LLMParams) (ToolCallingChatModel, error) {
    // 1. 构建配置
    connConfig := b.cfg.Connection

    // 2. 创建客户端
    client := newprovider.NewClient(
        connConfig.BaseURL,
        connConfig.APIKey,
    )

    // 3. 应用参数
    if params != nil {
        client.SetTemperature(params.Temperature)
        client.SetMaxTokens(params.MaxTokens)
    }

    // 4. 包装为 Eino ChatModel
    chatModel := model.NewChatModel(client)

    return chatModel, nil
}
```

### 步骤 4：注册构建器

在 `model_builder.go` 的 `NewModelBuilder` 函数中添加新分支：

```go
func NewModelBuilder(modelClass developer_api.ModelClass, cfg *config.Model) (Service, error) {
    switch modelClass {
    // ... 现有的 case
    case developer_api.ModelClass_NewProvider:
        return newNewProviderModelBuilder(cfg), nil
    default:
        return nil, fmt.Errorf("model class %v not supported", modelClass)
    }
}
```

### 步骤 5：更新元数据

在 `model_meta.json` 中添加新提供商的元数据：

```json
{
  "provider2models": {
    "newprovider": {
      "default": {
        "display_info": {...},
        "capability": {...},
        "connection": {...},
        "parameters": [...]
      }
    }
  }
}
```

## 故障排查

### 常见问题

#### 1. API Key 无效

**错误信息**：
```
Error: Invalid API Key
```

**排查步骤**：
1. 检查 API Key 是否正确
2. 确认 API Key 是否过期
3. 验证 API Key 权限

#### 2. 模型超时

**错误信息**：
```
Error: Request timeout after 60s
```

**排查步骤**：
1. 检查网络连接
2. 调整超时配置：
   ```yaml
   conn_config:
     timeout: 120s
   ```
3. 检查模型服务状态

#### 3. Token 超限

**错误信息**：
```
Error: Maximum context length exceeded
```

**解决方案**：
1. 减少输入文本长度
2. 调整 `max_tokens` 参数
3. 选择支持更长上下文的模型

#### 4. 模型不支持函数调用

**错误信息**：
```
Error: Function calling not supported
```

**解决方案**：
1. 检查模型能力配置：
   ```json
   {
     "capability": {
       "function_call": true
     }
   }
   ```
2. 切换到支持函数调用的模型

## 最佳实践

### DO（推荐做法）

✅ **使用环境变量管理 API Key**
```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
```

✅ **合理设置超时时间**
```yaml
conn_config:
  timeout: 60s  # 根据实际情况调整
```

✅ **使用合适的 temperature**
- 事实性任务：0.0 - 0.3
- 通用对话：0.5 - 0.7
- 创作性任务：0.8 - 1.0

✅ **监控 Token 使用量**
```go
// 记录每次调用的 Token 消耗
logs.Infof("Model call: input_tokens=%d, output_tokens=%d", inputTokens, outputTokens)
```

✅ **使用流式响应提升体验**
```go
resp, err := model.Stream(ctx, req)
for chunk := range resp.Stream {
    // 实时返回给用户
    sendToUser(chunk.Text)
}
```

### DON'T（避免做法）

❌ **硬编码 API Key**
```yaml
# 不要这样
conn_config:
  api_key: "sk-1234567890"  # 危险！
```

❌ **使用过大的 max_tokens**
```yaml
# 不要这样
max_tokens: 999999  # 会导致高额费用
```

❌ **忽略错误处理**
```go
// 不要这样
resp, _ := model.Generate(ctx, req)  // 忽略错误
```

❌ **频繁创建模型实例**
```go
// 不要这样
for i := 0; i < 1000; i++ {
    model, _ := BuildModelByID(ctx, modelID, nil)  // 每次都创建
    model.Generate(ctx, req)
}
```

应该复用模型实例：
```go
model, _ := BuildModelByID(ctx, modelID, nil)
for i := 0; i < 1000; i++ {
    model.Generate(ctx, req)  // 复用实例
}
```

## 文件索引

相关代码文件位置：

- `backend/bizpkg/config/modelmgr/modelmgr.go:31-45` - 数据库表结构
- `backend/bizpkg/config/modelmgr/model_meta.go:36-42` - ModelMeta 定义
- `backend/bizpkg/config/modelmgr/model_meta.go:46-65` - 元数据加载
- `backend/bizpkg/llm/modelbuilder/model_builder.go:38-40` - Builder 接口
- `backend/bizpkg/llm/modelbuilder/model_builder.go:42-73` - Builder 工厂
- `backend/bizpkg/llm/modelbuilder/model_builder.go:93-105` - 构建模型
- `backend/conf/model/template/` - 模型模板目录

---

**最后更新时间**：2025-10-27

**文档版本**：v1.0.0

如有任何疑问或需要帮助，请联系：
- 📧 邮箱：support@coze-plus.cn
- 💬 交流群：参见[项目概述](./overview.md)
