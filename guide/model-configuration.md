# 模型配置指南

本文档介绍如何在 Coze Plus 中配置和管理大语言模型，包括添加新模型、配置参数、管理 API Key 等操作指南。

## 快速开始

### 5 分钟配置一个 OpenAI 模型

以配置 GPT-4o 模型为例：

#### 步骤 1：获取 API Key

1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 登录账号，进入 API Keys 页面
3. 点击 "Create new secret key"
4. 复制生成的 API Key（格式：`sk-...`）

#### 步骤 2：修改模型配置文件

在 `backend/conf/model/template/` 目录找到 `model_template_openai.yaml`，复制并重命名为 `model_gpt4o.yaml`：

```yaml
id: 69010
name: GPT-4o
icon_uri: default_icon/openai_v2.png
description:
  zh: GPT-4o 多模态模型
  en: GPT-4o multi-modal model

meta:
  protocol: openai
  capability:
    function_call: true
    input_modal: [text, image]
    input_tokens: 128000
    output_tokens: 16384

  conn_config:
    base_url: "https://api.openai.com/v1"
    api_key: "sk-your-api-key-here"     # 填入你的 API Key
    model: "gpt-4o"                      # 模型名称
    temperature: 0.7
    max_tokens: 4096
```

#### 步骤 3：重启服务

```bash
# 重启 Coze Plus 后端服务
make server
```

#### 步骤 4：验证配置

验证方法：
1. 打开 Coze Plus 前端界面
2. 创建一个新的智能体
3. 在模型选择下拉框中选择新配置的 GPT-4o 模型
4. 发送测试消息，验证模型响应是否正常

完成！现在可以在智能体中使用 GPT-4o 模型了。

## 通过管理界面配置模型

**推荐方式**：Coze Plus 提供了可视化的后台管理界面来配置模型，无需手动编辑 YAML 文件，更加直观和安全。

### 界面配置优势

✅ **图形化操作**：通过表单界面填写配置，无需了解 YAML 语法
✅ **实时验证**：创建模型时自动测试连接，确保配置正确
✅ **安全加密**：API Key 自动加密存储在数据库中
✅ **动态管理**：无需重启服务即可添加、删除模型
✅ **权限控制**：仅管理员可访问模型配置页面

### 5 分钟通过界面添加模型

以添加 GPT-4o 模型为例：

#### 步骤 1：访问管理后台

1. 登录 Coze Plus
2. 点击右上角头像，选择 **"管理后台"** 或 **"系统设置"**
3. 在左侧菜单中选择 **"模型管理"** > **"LLM 模型"**

#### 步骤 2：创建新模型

点击页面右上角的 **"添加模型"** 按钮，进入创建表单。

#### 步骤 3：选择模型提供商

在 **"提供商"** 下拉框中选择 **"OpenAI"**。系统会显示该提供商支持的所有模型。

#### 步骤 4：填写模型信息

**基本信息**：
- **模型名称**：GPT-4o（自定义显示名称）
- **模型类型**：LLM（大语言模型）

**连接配置**：
- **API 端点** (Base URL)：`https://api.openai.com/v1`
- **API Key**：`sk-your-openai-api-key-here`
- **模型名称** (Model)：`gpt-4o`

**可选配置**：
- **Temperature**：0.7
- **Max Tokens**：4096
- **Top P**：1.0

**高级选项**（根据需要填写）：
- **使用 Azure OpenAI**：否（默认）
- **启用 Base64 URL 支持**：否（默认）

#### 步骤 5：测试连接

点击 **"测试连接"** 按钮，系统会：
1. 使用填写的配置构建模型客户端
2. 发送测试消息："1+1=?, Just answer with a number"
3. 验证模型是否正常响应

**测试成功**：
```
✓ 模型连接成功
响应时间: 1.2s
测试响应: 2
```

**测试失败示例**：
```
✗ 模型连接失败
错误信息: Incorrect API key provided
请检查 API Key 是否正确
```

#### 步骤 6：保存配置

测试通过后，点击 **"保存"** 按钮。系统会：
1. 加密 API Key（使用 AES-256）
2. 将配置保存到数据库 `model_instance` 表
3. 立即生效，无需重启服务

**保存成功提示**：
```
✓ 模型创建成功
模型 ID: 10001
现在可以在智能体中使用 GPT-4o 了
```

#### 步骤 7：验证模型

1. 返回 **"模型管理"** 列表页
2. 在 **"OpenAI"** 分组下找到新创建的 **"GPT-4o"**
3. 状态显示为 **"使用中"** ✓
4. 创建智能体时可在模型下拉框中选择该模型

### 管理界面功能

#### 查看模型列表

**API 接口**：
```bash
GET /api/admin/config/model/list
```

**请求示例**：
```bash
curl -X GET http://localhost:8888/api/admin/config/model/list \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json"
```

**响应示例**：
```json
{
  "code": 0,
  "msg": "success",
  "provider_model_list": [
    {
      "provider": {
        "name": {
          "zh_cn": "OpenAI",
          "en_us": "OpenAI"
        },
        "icon_uri": "default_icon/openai_v2.png",
        "model_class": "GPT"
      },
      "model_list": [
        {
          "id": 10001,
          "display_info": {
            "name": "GPT-4o",
            "output_tokens": 16384,
            "max_tokens": 128000
          },
          "capability": {
            "function_call": true,
            "input_modal": ["text", "image"],
            "input_tokens": 128000,
            "output_tokens": 16384
          },
          "status": 1,
          "enable_base64_url": false
        }
      ]
    }
  ]
}
```

界面会将模型按提供商分组展示：

```
┌─────────────────────────────────────────┐
│ OpenAI                                  │
├─────────────────────────────────────────┤
│ ○ GPT-4o                    [编辑] [删除]│
│   输入: 128K tokens | 输出: 16K tokens   │
│   支持: 函数调用, 多模态(文本+图像)       │
│   状态: ✓ 使用中                         │
│                                         │
│ ○ GPT-4o-mini              [编辑] [删除]│
│   输入: 128K tokens | 输出: 16K tokens   │
│   状态: ✓ 使用中                         │
├─────────────────────────────────────────┤
│ Claude                                  │
├─────────────────────────────────────────┤
│ ○ Claude-3.5-Sonnet        [编辑] [删除]│
│   输入: 200K tokens | 输出: 8K tokens    │
│   支持: 前缀缓存, 预填充响应              │
│   状态: ✓ 使用中                         │
└─────────────────────────────────────────┘
```

#### 创建模型

**API 接口**：
```bash
POST /api/admin/config/model/create
```

**请求参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model_class` | string | 是 | 模型类型：`GPT`/`Claude`/`Gemini`/`DeepSeek`/`Qwen`/`Ollama`/`Ark` |
| `model_name` | string | 是 | 模型显示名称 |
| `connection` | object | 是 | 连接配置对象 |
| `connection.base_conn_info` | object | 是 | 基础连接信息 |
| `connection.base_conn_info.base_url` | string | 是 | API 端点 URL |
| `connection.base_conn_info.api_key` | string | 是 | API 密钥 |
| `connection.base_conn_info.model` | string | 是 | 模型名称（如 `gpt-4o`） |
| `connection.openai` | object | 否 | OpenAI 特定配置 |
| `connection.openai.by_azure` | boolean | 否 | 是否使用 Azure OpenAI |
| `connection.openai.api_version` | string | 否 | API 版本（Azure 需要） |
| `enable_base64_url` | boolean | 否 | 是否启用 Base64 URL 支持 |

**请求示例**：
```bash
curl -X POST http://localhost:8888/api/admin/config/model/create \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model_class": "GPT",
    "model_name": "GPT-4o",
    "connection": {
      "base_conn_info": {
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-your-api-key-here",
        "model": "gpt-4o"
      },
      "openai": {
        "by_azure": false,
        "request_dims": 0
      }
    },
    "enable_base64_url": false
  }'
```

**响应示例**：
```json
{
  "code": 0,
  "msg": "success",
  "id": "10001"
}
```

**创建流程说明**：

1. **参数验证**：检查必填字段、URL 格式、API Key 格式
2. **模型构建**：根据 `model_class` 创建对应的模型 Builder
3. **连接测试**：发送测试消息验证模型可用性
   ```go
   // 测试消息
   testMessage := "1+1=?, Just answer with a number, no explanation."
   ```
4. **加密存储**：使用 AES-256 加密 API Key
5. **持久化**：保存到 `model_instance` 表并返回模型 ID

**源码位置**：`backend/api/handler/coze/config_service.go:170`

#### 删除模型

**API 接口**：
```bash
POST /api/admin/config/model/delete
```

**请求示例**：
```bash
curl -X POST http://localhost:8888/api/admin/config/model/delete \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "10001"
  }'
```

**响应示例**：
```json
{
  "code": 0,
  "msg": "success"
}
```

**删除规则**：
- 模型状态更新为 `StatusDeleted` (2)
- 不会物理删除记录，仅软删除
- 删除后在智能体中不再可选
- 已使用该模型的智能体不受影响（历史记录保留）

**源码位置**：`backend/api/handler/coze/config_service.go:221`

### 不同提供商配置示例

#### OpenAI / Azure OpenAI

**标准 OpenAI**：
```json
{
  "model_class": "GPT",
  "model_name": "GPT-4o",
  "connection": {
    "base_conn_info": {
      "base_url": "https://api.openai.com/v1",
      "api_key": "sk-...",
      "model": "gpt-4o"
    },
    "openai": {
      "by_azure": false
    }
  }
}
```

**Azure OpenAI**：
```json
{
  "model_class": "GPT",
  "model_name": "GPT-4o (Azure)",
  "connection": {
    "base_conn_info": {
      "base_url": "https://your-resource.openai.azure.com",
      "api_key": "azure-api-key",
      "model": "gpt-4o-deployment-name"
    },
    "openai": {
      "by_azure": true,
      "api_version": "2024-02-01"
    }
  }
}
```

#### Claude (Anthropic)

```json
{
  "model_class": "Claude",
  "model_name": "Claude-3.5-Sonnet",
  "connection": {
    "base_conn_info": {
      "base_url": "https://api.anthropic.com/v1/",
      "api_key": "sk-ant-...",
      "model": "claude-3-5-sonnet-20241022"
    },
    "claude": {}
  }
}
```

#### Google Gemini

```json
{
  "model_class": "Gemini",
  "model_name": "Gemini-1.5-Pro",
  "connection": {
    "base_conn_info": {
      "base_url": "https://generativelanguage.googleapis.com/v1",
      "api_key": "your-google-api-key",
      "model": "gemini-1.5-pro"
    },
    "gemini": {
      "backend": 1
    }
  }
}
```

#### DeepSeek

```json
{
  "model_class": "DeepSeek",
  "model_name": "DeepSeek-V3",
  "connection": {
    "base_conn_info": {
      "base_url": "https://api.deepseek.com/v1",
      "api_key": "sk-...",
      "model": "deepseek-chat"
    },
    "deepseek": {}
  }
}
```

#### Alibaba Qwen

```json
{
  "model_class": "Qwen",
  "model_name": "Qwen-Max",
  "connection": {
    "base_conn_info": {
      "base_url": "https://dashscope.aliyuncs.com/api/v1",
      "api_key": "sk-...",
      "model": "qwen-max"
    },
    "qwen": {}
  }
}
```

#### Ollama (本地)

```json
{
  "model_class": "Ollama",
  "model_name": "Llama-3.3-70B",
  "connection": {
    "base_conn_info": {
      "base_url": "http://host.docker.internal:11434",
      "api_key": "",
      "model": "llama3.3:70b"
    },
    "ollama": {}
  }
}
```

#### ByteDance Ark

```json
{
  "model_class": "Ark",
  "model_name": "Doubao-1.5-Pro",
  "connection": {
    "base_conn_info": {
      "base_url": "https://ark.cn-beijing.volces.com/api/v3",
      "api_key": "your-ark-api-key",
      "model": "doubao-pro-128k"
    },
    "ark": {
      "region": "cn-beijing",
      "api_type": ""
    }
  }
}
```

### 界面配置 vs 文件配置

| 对比维度 | 界面配置 | 文件配置 |
|----------|----------|----------|
| **操作难度** | ⭐⭐⭐⭐⭐ 图形化表单 | ⭐⭐⭐ 需要了解 YAML 语法 |
| **实时验证** | ✅ 创建时自动测试连接 | ❌ 需手动测试 |
| **安全性** | ✅ API Key 自动加密 | ⚠️ 明文存储或需手动管理 |
| **生效速度** | ✅ 立即生效，无需重启 | ❌ 需重启服务 |
| **适用场景** | 生产环境、运维管理 | 开发环境、批量配置 |
| **版本控制** | ❌ 存储在数据库 | ✅ 可提交到 Git |
| **批量操作** | ⚠️ 需逐个创建 | ✅ 支持脚本批量生成 |
| **权限控制** | ✅ 仅管理员可访问 | ⚠️ 依赖文件系统权限 |

**推荐使用场景**：

✅ **使用界面配置**：
- 生产环境添加新模型
- 运维人员日常管理
- 需要快速验证配置
- 敏感信息安全要求高

✅ **使用文件配置**：
- 开发环境快速测试
- 批量配置多个模型
- CI/CD 自动化部署
- 需要版本控制配置

### 常见问题

#### Q1: 界面创建的模型在哪里存储？

**答**：存储在数据库 `model_instance` 表中，结构如下：

```sql
CREATE TABLE `model_instance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `provider` varchar(50) NOT NULL,
  `model_class` varchar(50) NOT NULL,
  `display_info` json NOT NULL,
  `capability` json NOT NULL,
  `connection` json NOT NULL,        -- API Key 已加密
  `type` int NOT NULL DEFAULT '0',
  `parameters` json DEFAULT NULL,
  `status` int NOT NULL DEFAULT '1',
  `enable_base64_url` tinyint(1) DEFAULT '0',
  `created_at` bigint NOT NULL,
  `updated_at` bigint NOT NULL,
  `delete_at_ms` bigint DEFAULT '0',
  PRIMARY KEY (`id`)
);
```

**查询示例**：
```sql
-- 查看所有模型（不显示加密的 API Key）
SELECT id, provider, model_class,
       JSON_EXTRACT(display_info, '$.name') AS name,
       status
FROM model_instance
WHERE status != 2;  -- 2 = StatusDeleted
```

**源码位置**：`backend/bizpkg/config/modelmgr/modelmgr.go:38`

#### Q2: 如何在界面和文件配置之间切换？

**答**：两种配置方式可以共存：
- **文件配置** 的模型从 YAML 文件加载到内存
- **界面配置** 的模型从数据库加载
- 系统启动时会合并两者，按 ID 去重（数据库优先）

**加载顺序**：
1. 加载 `backend/conf/model/template/*.yaml` 文件
2. 加载数据库 `model_instance` 表
3. 合并模型列表（ID 冲突时数据库配置覆盖文件配置）

**ID 规划建议**：
- 文件配置：使用 60000-69999 范围
- 界面配置：使用 10000-59999 范围（系统自动分配）

#### Q3: API Key 如何加密存储？

**答**：使用 AES-256-CBC 加密算法：

1. **加密流程**：
   ```go
   // 生成密钥（从环境变量或配置文件）
   key := []byte("your-32-byte-encryption-key-here")

   // 加密 API Key
   encryptedKey := aes.Encrypt(apiKey, key)

   // 存储到数据库
   connection := {"api_key": encryptedKey}
   ```

2. **解密流程**：
   ```go
   // 从数据库读取
   connection := loadFromDB()

   // 解密 API Key
   apiKey := aes.Decrypt(connection.APIKey, key)

   // 使用明文 API Key 调用模型
   ```

**安全建议**：
- 加密密钥存储在环境变量 `MODEL_ENCRYPTION_KEY` 中
- 定期轮换加密密钥
- 数据库备份时确保加密密钥同步备份

**源码位置**：`backend/bizpkg/config/modelmgr/model_meta.go`

#### Q4: 测试连接失败怎么办？

**常见错误及解决方案**：

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| `Incorrect API key provided` | API Key 无效 | 检查 API Key 格式和有效期 |
| `Connection timeout` | 网络超时 | 检查网络连接和 base_url |
| `Model not found` | 模型名称错误 | 确认 model 字段与提供商文档一致 |
| `Rate limit exceeded` | API 调用频率超限 | 稍后重试或升级套餐 |
| `Invalid base_url` | URL 格式错误 | 确保 URL 包含协议（http/https） |

**调试步骤**：
1. 在浏览器开发者工具中查看网络请求
2. 检查后端日志：`tail -f logs/coze-plus.log | grep "model"`
3. 使用 curl 直接测试 API：
   ```bash
   curl https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer sk-..." \
     -H "Content-Type: application/json" \
     -d '{"model":"gpt-4o","messages":[{"role":"user","content":"test"}]}'
   ```

#### Q5: 如何迁移文件配置到界面？

**迁移步骤**：

1. **导出现有配置**：
   ```bash
   # 列出所有 YAML 配置
   ls backend/conf/model/template/*.yaml
   ```

2. **逐个迁移**：
   - 打开管理界面
   - 点击 "添加模型"
   - 按照 YAML 配置填写表单
   - 测试连接并保存

3. **验证迁移**：
   ```bash
   # 检查数据库
   mysql -u root -p coze_plus -e \
     "SELECT id, JSON_EXTRACT(display_info, '$.name') AS name FROM model_instance;"
   ```

4. **清理文件配置**（可选）：
   ```bash
   # 备份原文件
   mkdir -p backup/model_configs
   cp backend/conf/model/template/*.yaml backup/model_configs/

   # 删除已迁移的文件
   rm backend/conf/model/template/model_gpt4o.yaml
   ```

**批量迁移脚本**（参考）：
```bash
#!/bin/bash
# migrate_models.sh

API_BASE="http://localhost:8888/api/admin/config/model"
TOKEN="admin-token"

for yaml_file in backend/conf/model/template/*.yaml; do
  echo "Migrating $yaml_file..."

  # 解析 YAML 并转换为 JSON（需要 yq 工具）
  json_data=$(yq eval -o=json "$yaml_file")

  # 调用创建 API
  curl -X POST "$API_BASE/create" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$json_data"

  echo "✓ Migrated $yaml_file"
done
```

## 配置文件详解

### 基本信息

```yaml
id: 69010                          # 模型 ID，必须唯一
name: GPT-4o                       # 显示名称
icon_uri: default_icon/openai_v2.png  # 图标路径
icon_url: ""                       # 外部图标 URL（可选）

description:                       # 模型描述（支持多语言）
  zh: GPT-4o 是一个多模态模型，支持文本和图像输入
  en: GPT-4o is a multi-modal model supporting text and image inputs
```

### 模型参数

```yaml
default_parameters:
  - name: temperature              # 参数名称
    label:                         # 显示标签
      zh: 生成随机性
      en: Temperature
    desc:                          # 参数说明
      zh: 控制输出的多样性和创造性
      en: Controls output diversity and creativity
    type: float                    # 参数类型：float | int | string
    min: "0"                       # 最小值
    max: "1"                       # 最大值
    default_val:                   # 默认值（支持预设）
      balance: "0.8"               # 平衡模式
      creative: "1"                # 创造模式
      default_val: "1.0"           # 默认值
      precise: "0.3"               # 精确模式
    precision: 1                   # 小数精度
    options: []                    # 选项列表（用于枚举类型）
    style:                         # 前端UI样式
      widget: slider               # 组件类型：slider | input | radio_buttons
      label:                       # 组件分组标签
        zh: 生成多样性
        en: Generation diversity
```

### 模型能力

```yaml
meta:
  protocol: openai                 # 协议类型
  capability:
    function_call: true            # 是否支持函数调用
    input_modal:                   # 输入模态
      - text                       # 支持文本
      - image                      # 支持图像
    input_tokens: 128000           # 输入 Token 上限
    json_mode: false               # 是否支持 JSON 模式
    max_tokens: 128000             # 总 Token 上限
    output_modal:                  # 输出模态
      - text
    output_tokens: 16384           # 输出 Token 上限
    prefix_caching: false          # 是否支持前缀缓存
    reasoning: false               # 是否支持推理模式
    prefill_response: false        # 是否支持预填充响应
```

### 连接配置

```yaml
meta:
  conn_config:
    base_url: "https://api.openai.com/v1"  # API 端点
    api_key: ""                    # API 密钥（敏感信息）
    timeout: 0s                    # 超时时间（0 表示使用默认）
    model: ""                      # 模型名称（如 gpt-4o）
    temperature: 0.7               # 默认温度
    frequency_penalty: 0           # 频率惩罚
    presence_penalty: 0            # 存在惩罚
    max_tokens: 4096               # 最大输出 Token
    top_p: 1                       # Top P 采样
    top_k: 0                       # Top K 采样
    stop: []                       # 停止词列表

    # OpenAI 特定配置
    openai:
      by_azure: false              # 是否使用 Azure OpenAI
      api_version: ""              # API 版本（Azure 需要）
      response_format:             # 响应格式
        type: text                 # text | json_object
        jsonschema: null           # JSON Schema（可选）

    custom: {}                     # 自定义配置
  status: 0                        # 状态：0-正常 1-禁用
```

## 配置不同提供商

### OpenAI / Azure OpenAI

#### 标准 OpenAI

```yaml
id: 69010
name: GPT-4o
meta:
  protocol: openai
  conn_config:
    base_url: "https://api.openai.com/v1"
    api_key: "sk-..."
    model: "gpt-4o"
    openai:
      by_azure: false
```

#### Azure OpenAI

```yaml
id: 69020
name: GPT-4o (Azure)
meta:
  protocol: openai
  conn_config:
    base_url: "https://your-resource.openai.azure.com"
    api_key: "azure-api-key"
    model: "gpt-4o-deployment-name"
    openai:
      by_azure: true
      api_version: "2024-02-01"
```

### Claude (Anthropic)

#### 标准 Claude API

```yaml
id: 65010
name: Claude-3.5-Sonnet
meta:
  protocol: claude
  capability:
    function_call: true
    input_modal: [text, image]
    input_tokens: 200000
    output_tokens: 8192
    prefix_caching: true           # Claude 支持前缀缓存
    prefill_response: true         # Claude 支持预填充
  conn_config:
    base_url: "https://api.anthropic.com/v1/"
    api_key: "sk-ant-..."
    model: "claude-3-5-sonnet-20241022"
    claude:
      by_bedrock: false
```

#### AWS Bedrock Claude

```yaml
id: 65020
name: Claude-3.5-Sonnet (Bedrock)
meta:
  protocol: claude
  conn_config:
    base_url: ""
    api_key: ""
    model: "anthropic.claude-3-5-sonnet-20241022-v2:0"
    claude:
      by_bedrock: true
      access_key: "AWS_ACCESS_KEY_ID"
      secret_access_key: "AWS_SECRET_ACCESS_KEY"
      session_token: ""            # 可选
      region: "us-west-2"
```

### Google Gemini

```yaml
id: 67010
name: Gemini-Pro
meta:
  protocol: gemini
  capability:
    function_call: true
    input_modal: [text, image, audio, video]
    input_tokens: 1000000          # 1M 上下文
    output_tokens: 8192
  conn_config:
    base_url: "https://generativelanguage.googleapis.com/v1"
    api_key: "your-google-api-key"
    model: "gemini-1.5-pro"
    temperature: 0.7
```

### DeepSeek

#### DeepSeek V3

```yaml
id: 62010
name: DeepSeek-V3
meta:
  protocol: deepseek
  capability:
    function_call: true
    input_modal: [text]
    input_tokens: 64000
    output_tokens: 8192
  conn_config:
    base_url: "https://api.deepseek.com/v1"
    api_key: "sk-..."
    model: "deepseek-chat"
```

#### DeepSeek-R1 (推理模式)

```yaml
id: 62020
name: DeepSeek-R1
meta:
  protocol: deepseek
  capability:
    function_call: false
    input_modal: [text]
    input_tokens: 64000
    output_tokens: 8192
    reasoning: true                # 支持 Chain-of-Thought 推理
  conn_config:
    base_url: "https://api.deepseek.com/v1"
    api_key: "sk-..."
    model: "deepseek-reasoner"
```

### Alibaba Qwen (通义千问)

```yaml
id: 64010
name: Qwen-Max
meta:
  protocol: qwen
  capability:
    function_call: true
    input_modal: [text]
    input_tokens: 32000
    output_tokens: 8192
  conn_config:
    base_url: "https://dashscope.aliyuncs.com/api/v1"
    api_key: "sk-..."
    model: "qwen-max"
```

### Ollama (本地部署)

```yaml
id: 68010
name: Llama-3.3-70B
meta:
  protocol: ollama
  capability:
    function_call: true
    input_modal: [text]
    input_tokens: 128000
    output_tokens: 4096
  conn_config:
    base_url: "http://host.docker.internal:11434"  # Docker 环境
    # base_url: "http://localhost:11434"           # 本地环境
    api_key: ""                    # Ollama 不需要 API Key
    model: "llama3.3:70b"
    temperature: 0.6
    top_k: 20
```

**注意事项**：
- Docker 环境使用 `host.docker.internal` 访问宿主机
- 本地环境使用 `localhost` 或 `127.0.0.1`
- 确保 Ollama 服务已启动：`ollama serve`

### ByteDance Ark (字节豆包)

```yaml
id: 60010
name: Doubao-1.5-Pro
meta:
  protocol: ark
  capability:
    function_call: true
    input_modal: [text, image]
    input_tokens: 128000
    output_tokens: 8192
  conn_config:
    base_url: "https://ark.cn-beijing.volces.com/api/v3"
    api_key: "your-ark-api-key"
    model: "doubao-pro-128k"
```

## 参数UI组件

Coze Plus 支持多种前端UI组件来展示和调整模型参数：

### 1. Slider（滑块）

适用于连续数值参数，如 temperature、top_p 等：

```yaml
- name: temperature
  type: float
  min: "0"
  max: "1"
  default_val:
    default_val: "0.7"
  precision: 1
  style:
    widget: slider
    label:
      zh: 生成多样性
      en: Generation diversity
```

**前端效果**：
```
生成多样性
Temperature [0.7]
|----●-----|
0         1
```

### 2. Input（输入框）

适用于整数参数，如 max_tokens：

```yaml
- name: max_tokens
  type: int
  min: "1"
  max: "4096"
  default_val:
    default_val: "4096"
  style:
    widget: input
```

**前端效果**：
```
Max Tokens
┌─────────┐
│  4096   │
└─────────┘
```

### 3. Radio Buttons（单选按钮）

适用于枚举类型参数，如 response_format：

```yaml
- name: response_format
  type: int
  default_val:
    default_val: "0"
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

**前端效果**：
```
Response Format
○ Text   ● Markdown   ○ JSON
```

### 4. Select（下拉选择）

适用于较多选项的枚举：

```yaml
- name: model_variant
  type: string
  default_val:
    default_val: "standard"
  options:
    - label: Standard
      value: "standard"
    - label: Turbo
      value: "turbo"
    - label: Premium
      value: "premium"
  style:
    widget: select
```

## 管理 API Key

### 环境变量方式（推荐）

在 `.env` 文件或系统环境变量中配置：

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEEPSEEK_API_KEY=sk-...
QWEN_API_KEY=sk-...
```

在配置文件中引用：

```yaml
conn_config:
  api_key: "${OPENAI_API_KEY}"  # 引用环境变量
```

**优点**：
- 敏感信息不提交到代码仓库
- 便于不同环境切换
- 符合安全最佳实践

### 配置文件方式

直接在 YAML 文件中填写（仅开发测试使用）：

```yaml
conn_config:
  api_key: "sk-..."
```

**注意**：
- ⚠️ 不要将包含真实 API Key 的配置文件提交到 Git
- ⚠️ 生产环境必须使用环境变量

### 数据库加密存储

通过管理界面创建的模型实例，API Key 会自动加密存储在数据库中：

```sql
SELECT id, provider, display_info
FROM model_instance
WHERE id = 1;

-- connection 字段中的 api_key 已加密
-- {"api_key": "AES加密后的密文"}
```

## 测试模型配置

### 方法 1：命令行测试

```bash
# 进入后端目录
cd backend

# 运行测试命令
go run cmd/test/model_test.go \
  --model-id=69010 \
  --prompt="你好，请介绍一下自己"
```

### 方法 2：API 测试

```bash
curl -X POST http://localhost:8888/api/conversation/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-access-token" \
  -d '{
    "bot_id": "your-bot-id",
    "user_id": "test-user",
    "additional_messages": [
      {
        "role": "user",
        "content": "什么是大语言模型？",
        "content_type": "text"
      }
    ],
    "stream": false
  }'
```

### 方法 3：前端测试

1. 打开 Coze Plus 前端界面
2. 创建一个新的智能体
3. 在模型选择下拉框中选择新配置的模型
4. 发送测试消息
5. 验证响应是否正常

## 常见问题

### Q1: 模型配置后不显示怎么办？

**可能原因**：
1. 配置文件格式错误
2. ID 重复
3. 服务未重启

**解决方案**：
```bash
# 1. 验证 YAML 格式
yamllint model_gpt4o.yaml

# 2. 检查 ID 唯一性
grep -r "^id: 69010" backend/conf/model/template/

# 3. 重启服务
make server

# 4. 查看日志
tail -f logs/coze-plus.log | grep "model"
```

### Q2: API Key 无效错误

**错误信息**：
```
Error: Incorrect API key provided
```

**解决方案**：
1. 确认 API Key 格式正确
2. 检查 API Key 是否过期
3. 验证 API Key 权限
4. 确认 base_url 正确

### Q3: 模型响应超时

**错误信息**：
```
Error: Request timeout after 60s
```

**解决方案**：

调整超时配置：
```yaml
conn_config:
  timeout: 120s  # 延长到 120 秒
```

或在代码中设置：
```go
client := &http.Client{
    Timeout: 120 * time.Second,
}
```

### Q4: 本地 Ollama 连接失败

**错误信息**：
```
Error: dial tcp 127.0.0.1:11434: connect: connection refused
```

**解决方案**：

1. 检查 Ollama 服务状态：
```bash
# 检查服务是否运行
ps aux | grep ollama

# 启动 Ollama 服务
ollama serve
```

2. Docker 环境修改 URL：
```yaml
conn_config:
  base_url: "http://host.docker.internal:11434"
```

3. 拉取模型：
```bash
ollama pull llama3.3:70b
```

### Q5: Token 超限错误

**错误信息**：
```
Error: This model's maximum context length is 8192 tokens
```

**解决方案**：

1. 减少输入内容长度
2. 调整 max_tokens：
```yaml
conn_config:
  max_tokens: 2000  # 减小输出长度
```
3. 切换到支持更长上下文的模型

### Q6: 多模态输入不生效

**问题**：发送图片后模型无法识别

**解决方案**：

1. 确认模型支持多模态：
```yaml
capability:
  input_modal: [text, image]  # 必须包含 image
```

2. 启用 Base64 URL 支持（部分模型需要）：
```yaml
meta:
  enable_base64_url: true
```

3. 确认图片格式和大小符合限制

## 高级配置

### 自定义 HTTP Headers

某些模型提供商需要额外的 HTTP Headers：

```yaml
conn_config:
  custom:
    headers:
      X-Custom-Header: "value"
      User-Agent: "CozeP lus/1.0"
```

### 代理配置

通过代理访问模型 API：

```bash
# 设置环境变量
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
export NO_PROXY=localhost,127.0.0.1
```

或在配置中指定：

```yaml
conn_config:
  custom:
    proxy: "http://proxy.example.com:8080"
```

### 重试策略

配置请求失败重试：

```yaml
conn_config:
  custom:
    retry:
      max_attempts: 3
      initial_interval: 1s
      max_interval: 10s
      multiplier: 2
```

### 日志级别

调整模型调用日志级别：

```yaml
conn_config:
  custom:
    log_level: "debug"  # debug | info | warn | error
```

## 批量配置

如果需要配置多个同类型模型，可以使用脚本批量生成：

```bash
#!/bin/bash
# generate_models.sh

MODELS=("gpt-4o" "gpt-4o-mini" "gpt-4-turbo")
BASE_ID=69000

for i in "${!MODELS[@]}"; do
  MODEL_NAME="${MODELS[$i]}"
  MODEL_ID=$((BASE_ID + i + 10))

  cat > "model_${MODEL_NAME}.yaml" << EOF
id: ${MODEL_ID}
name: ${MODEL_NAME}
icon_uri: default_icon/openai_v2.png
description:
  zh: ${MODEL_NAME} 模型
  en: ${MODEL_NAME} model

meta:
  protocol: openai
  conn_config:
    base_url: "https://api.openai.com/v1"
    api_key: "\${OPENAI_API_KEY}"
    model: "${MODEL_NAME}"
    temperature: 0.7
    max_tokens: 4096
EOF

  echo "Generated model_${MODEL_NAME}.yaml"
done
```

运行脚本：

```bash
chmod +x generate_models.sh
./generate_models.sh
```

## 最佳实践

### DO（推荐做法）

✅ **使用环境变量管理敏感信息**
```yaml
api_key: "${OPENAI_API_KEY}"
```

✅ **为不同环境使用不同配置**
```
- model_gpt4o_dev.yaml    # 开发环境
- model_gpt4o_prod.yaml   # 生产环境
```

✅ **配置合理的超时时间**
```yaml
conn_config:
  timeout: 60s  # 根据实际网络情况调整
```

✅ **启用详细日志便于排查问题**
```yaml
conn_config:
  custom:
    log_level: "debug"
```

✅ **定期更新模型配置**
```bash
# 检查新版本
curl https://api.openai.com/v1/models

# 更新配置
vim model_gpt4o.yaml
```

### DON'T（避免做法）

❌ **硬编码 API Key**
```yaml
# 不要这样
api_key: "sk-1234567890abcdef"
```

❌ **忽略模型能力声明**
```yaml
# 不要忘记配置
capability:
  function_call: true  # 如果不支持，设为 false
```

❌ **使用错误的 model 名称**
```yaml
# 不要这样
model: "gpt4"  # 错误，应该是 "gpt-4o"
```

❌ **忽略 Token 限制**
```yaml
# 不要超过实际限制
max_tokens: 999999  # 会导致错误
```

❌ **混用不同协议的配置**
```yaml
# 不要这样（claude 模型使用 openai 协议）
protocol: openai
model: "claude-3-5-sonnet"  # 错误
```

## 参考资源

### 官方文档

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic Claude Docs](https://docs.anthropic.com/)
- [Google Gemini Docs](https://ai.google.dev/docs)
- [DeepSeek API Docs](https://platform.deepseek.com/docs)
- [Qwen API Docs](https://help.aliyun.com/zh/dashscope/)
- [Ollama Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)

### 相关文档

- [模型技术架构](./model-architecture.md)
- [智能体开发指南](./getting-started.md)

---

**最后更新时间**：2025-10-27

**文档版本**：v1.0.0

如有任何疑问或需要帮助，请联系：
- 📧 邮箱：support@coze-plus.cn
- 💬 交流群：参见[项目概述](./overview.md)
