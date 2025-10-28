# 智能体功能开发流程

本文档提供 Coze Plus 智能体（Agent）从创建到发布的完整开发流程，包括配置模型、添加工具、调试测试、版本发布等内容。

## 快速开始

### 5 分钟创建你的第一个智能体

#### 步骤 1：创建智能体

1. 登录 Coze Plus
2. 进入工作空间
3. 点击 **"创建智能体"** 按钮
4. 填写基本信息：
   - **名称**：客户服务助手
   - **描述**：专业的客户服务智能体，可以回答产品问题
   - **图标**：选择或上传图标

#### 步骤 2：配置模型

1. 在 **"模型配置"** 区域
2. 选择模型：**GPT-4o**
3. 设置参数：
   - Temperature：`0.7`
   - Max Tokens：`2000`

#### 步骤 3：编写人设提示词

在 **"人设提示词"** 区域输入：

```
你是一个专业的客户服务助手，负责回答用户关于产品的问题。

你的特点：
- 友好、耐心、专业
- 回答简洁明了
- 遇到不确定的问题会主动引导用户联系人工客服

你的职责：
1. 回答产品功能问题
2. 解决常见技术问题
3. 引导用户找到正确的资源
```

#### 步骤 4：测试智能体

1. 点击右侧的 **"调试"** 面板
2. 输入测试问题：`你好，请介绍一下你自己`
3. 查看智能体回复

#### 步骤 5：发布智能体

1. 测试无误后，点击 **"发布"** 按钮
2. 系统自动生成版本号
3. 发布成功，现在可以对外提供服务

**恭喜！** 你已经创建了第一个智能体。

## 完整开发流程

### 1. 需求分析

在开始开发前，明确智能体的需求：

```
需求分析清单：

□ 智能体的目标用户是谁？
□ 需要解决什么问题？
□ 需要哪些能力？
  □ 文本对话
  □ 知识检索
  □ 工具调用
  □ 数据库操作
  □ 工作流编排
□ 对话风格要求？
  □ 正式/轻松
  □ 专业/亲切
  □ 详细/简洁
□ 性能要求？
  □ 响应时间
  □ 并发量
  □ 准确率
```

**示例需求**：

> **智能体名称**：HR 招聘助手
>
> **目标用户**：HR 和候选人
>
> **核心功能**：
> 1. 回答候选人关于职位的问题
> 2. 收集候选人信息并存储到数据库
> 3. 根据 JD 匹配候选人
> 4. 安排面试流程
>
> **所需能力**：
> - 知识库：存储所有职位 JD
> - 数据库：存储候选人信息
> - 插件：日历插件（安排面试）
> - 工作流：简历筛选流程

### 2. 创建智能体

#### 2.1 基本信息配置

**前端操作**：
1. 进入工作空间
2. 点击 **"创建" > "智能体"**
3. 填写表单

**API 方式**：

```bash
POST /api/draftbot/create
Content-Type: application/json
Authorization: Bearer <your-api-key>

{
  "space_id": "1",
  "name": "HR 招聘助手",
  "description": "专业的 HR 招聘智能体，帮助筛选候选人和安排面试",
  "icon_uri": "default_icon/hr_assistant.png"
}
```

**响应**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "bot_id": "7434343434343434",
    "check_not_pass": false
  }
}
```

#### 2.2 配置模型

**前端操作**：
1. 在智能体编辑页面
2. 找到 **"模型配置"** 区域
3. 点击 **"选择模型"**
4. 选择模型并配置参数

**API 方式**：

```bash
POST /api/draftbot/update_display_info
Content-Type: application/json

{
  "bot_id": "7434343434343434",
  "display_info": {
    "model_info": {
      "model_id": "69010",
      "llm_params": {
        "temperature": 0.7,
        "max_tokens": 2000,
        "top_p": 0.9,
        "frequency_penalty": 0.0,
        "presence_penalty": 0.0
      }
    }
  }
}
```

**模型选择建议**：

| 用途 | 推荐模型 | 原因 |
|------|----------|------|
| 通用对话 | GPT-4o, Claude-3.5 | 能力均衡，响应快 |
| 专业领域 | GPT-4, Claude-3-Opus | 推理能力强，准确度高 |
| 简单问答 | GPT-4o-mini | 成本低，速度快 |
| 代码生成 | Claude-3.5, DeepSeek-Coder | 代码能力强 |
| 多语言 | Qwen-Max, Gemini-Pro | 多语言支持好 |

### 3. 编写人设提示词

人设提示词（Prompt）是智能体的核心，定义了智能体的性格、能力和行为。

#### 3.1 提示词结构

**推荐结构**：

```markdown
# 角色定义
你是 [角色名称]，[简短描述]。

## 你的特点
- [特点 1]
- [特点 2]
- [特点 3]

## 你的职责
1. [职责 1]
2. [职责 2]
3. [职责 3]

## 对话规则
- [规则 1]
- [规则 2]
- [规则 3]

## 注意事项
- [注意事项 1]
- [注意事项 2]
```

#### 3.2 提示词示例

**示例 1：客户服务助手**

```markdown
# 角色定义
你是一个专业的客户服务助手，名叫小智，负责为用户提供产品咨询和技术支持。

## 你的特点
- 友好、耐心、专业
- 善于倾听，能准确理解用户问题
- 回答简洁明了，避免冗长
- 遇到不确定的问题会如实告知

## 你的职责
1. 回答用户关于产品功能、价格、使用方法的问题
2. 帮助用户解决技术问题和使用障碍
3. 收集用户反馈并记录到系统中
4. 在必要时引导用户联系人工客服

## 对话规则
- 始终保持礼貌和耐心
- 每次回复前先确认理解了用户的问题
- 如果问题复杂，分步骤解答
- 提供具体的解决方案而不是泛泛而谈
- 主动询问用户是否还有其他问题

## 注意事项
- 不要臆测用户的问题，有疑问时主动询问
- 不要承诺无法兑现的内容
- 遇到投诉或负面情绪，保持冷静和理解
- 敏感问题（如退款、账号安全）引导用户联系人工
```

**示例 2：代码助手**

```markdown
# 角色定义
你是一个资深的编程助手，精通多种编程语言和框架，能够帮助开发者解决代码问题。

## 你的特点
- 技术专业，经验丰富
- 解释清晰，注重细节
- 提供可运行的代码示例
- 关注代码质量和最佳实践

## 你的职责
1. 回答编程相关问题
2. 帮助调试代码错误
3. 提供代码示例和最佳实践
4. 解释技术概念和原理
5. 推荐合适的工具和库

## 对话规则
- 提供代码时必须包含注释
- 解释技术概念时使用类比和例子
- 指出代码的潜在问题和改进空间
- 鼓励开发者思考而不是直接给答案

## 技术栈
- 前端：React, Vue, TypeScript
- 后端：Node.js, Python, Go
- 数据库：MySQL, PostgreSQL, MongoDB
- 工具：Git, Docker, CI/CD

## 注意事项
- 确保代码示例可以直接运行
- 注明代码的运行环境和依赖
- 考虑安全性和性能问题
- 不要生成恶意代码
```

#### 3.3 变量注入

提示词支持 **Jinja2** 模板变量，可以动态注入用户信息、上下文等：

```markdown
# 角色定义
你是 {{company_name}} 的客服助手，负责回答用户问题。

## 用户信息
- 用户名：{{user_name}}
- 会员等级：{{user_level}}
- 注册时间：{{register_date}}

## 上下文信息
- 当前时间：{{current_time}}
- 用户位置：{{user_location}}
```

**API 配置**：

```bash
POST /api/draftbot/update_display_info

{
  "bot_id": "7434343434343434",
  "display_info": {
    "prompt": {
      "prompt": "你是 {{company_name}} 的客服...",
      "variables": {
        "company_name": "Coze Plus",
        "user_name": "张三",
        "user_level": "VIP",
        "register_date": "2024-01-01"
      }
    }
  }
}
```

### 4. 添加工具能力

智能体可以集成多种工具来扩展能力。

#### 4.1 添加插件工具

**步骤**：
1. 进入智能体编辑页面
2. 点击 **"添加工具" > "插件"**
3. 选择已有插件或创建新插件
4. 配置插件参数

**API 方式**：

```bash
POST /api/draftbot/update_display_info

{
  "bot_id": "7434343434343434",
  "display_info": {
    "plugin": [
      {
        "plugin_id": "1234",
        "api_id": "5678",
        "plugin_from": "product",
        "enabled": true
      }
    ]
  }
}
```

**插件示例**：

```yaml
# 天气查询插件
plugin_id: 1001
name: 天气查询
description: 查询指定城市的天气信息
tools:
  - name: get_weather
    description: 获取城市天气
    parameters:
      city:
        type: string
        description: 城市名称
        required: true
```

**使用场景**：
- 调用外部 API（如天气、地图、快递）
- 集成第三方服务（如支付、短信）
- 访问内部系统（如 CRM、ERP）

#### 4.2 添加知识库

**步骤**：
1. 创建知识库并上传文档
2. 在智能体编辑页面点击 **"添加工具" > "知识库"**
3. 选择知识库
4. 配置检索参数

**API 方式**：

```bash
POST /api/draftbot/update_display_info

{
  "bot_id": "7434343434343434",
  "display_info": {
    "knowledge": {
      "knowledge_ids": ["101", "102", "103"],
      "recall_config": {
        "top_k": 5,
        "score_threshold": 0.7,
        "rerank_enabled": true
      }
    }
  }
}
```

**知识库配置**：

| 参数 | 说明 | 推荐值 |
|------|------|--------|
| `top_k` | 返回文档数量 | 3-5 |
| `score_threshold` | 相似度阈值 | 0.6-0.8 |
| `rerank_enabled` | 是否启用重排序 | true |

**最佳实践**：
- 文档分段不要太长（建议 500-1000 字）
- 定期更新知识库内容
- 使用语义分段而不是固定长度
- 为重要文档设置更高权重

#### 4.3 添加数据库工具

**步骤**：
1. 创建数据库并定义表结构
2. 在智能体编辑页面点击 **"添加工具" > "数据库"**
3. 选择数据库和表
4. 配置操作权限

**API 方式**：

```bash
POST /api/draftbot/update_display_info

{
  "bot_id": "7434343434343434",
  "display_info": {
    "database": [
      {
        "database_id": "201",
        "table_name": "candidates",
        "enabled_operations": ["query", "insert", "update"],
        "description": "候选人信息表"
      }
    ]
  }
}
```

**数据库表示例**：

```sql
CREATE TABLE candidates (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '姓名',
  email VARCHAR(100) COMMENT '邮箱',
  phone VARCHAR(20) COMMENT '电话',
  position VARCHAR(100) COMMENT '应聘职位',
  resume_url VARCHAR(500) COMMENT '简历链接',
  status VARCHAR(20) COMMENT '状态: pending/interviewed/offered/rejected',
  created_at BIGINT COMMENT '创建时间'
);
```

**操作示例**：

智能体可以执行的数据库操作：

```sql
-- 查询
SELECT * FROM candidates WHERE position = '前端工程师' AND status = 'pending';

-- 插入
INSERT INTO candidates (name, email, phone, position, status)
VALUES ('张三', 'zhangsan@example.com', '13800138000', '后端工程师', 'pending');

-- 更新
UPDATE candidates SET status = 'interviewed' WHERE id = 123;
```

**安全建议**：
- 限制智能体的数据库权限
- 不允许 DROP、TRUNCATE 等危险操作
- 敏感字段设置访问限制
- 记录所有数据库操作日志

#### 4.4 添加工作流

**步骤**：
1. 创建工作流并配置节点
2. 在智能体编辑页面点击 **"添加工具" > "工作流"**
3. 选择工作流
4. 配置工作流参数

**API 方式**：

```bash
POST /api/draftbot/update_display_info

{
  "bot_id": "7434343434343434",
  "display_info": {
    "workflow": [
      {
        "workflow_id": "301",
        "workflow_name": "简历筛选流程",
        "enabled": true,
        "return_directly": false
      }
    ]
  }
}
```

**工作流示例**：

```yaml
# 简历筛选工作流
name: 简历筛选流程
description: 自动筛选候选人简历

nodes:
  - id: start
    type: input
    output: resume_text

  - id: extract
    type: llm
    input: resume_text
    prompt: 从以下简历中提取关键信息...
    output: candidate_info

  - id: score
    type: code
    input: candidate_info
    code: |
      score = calculate_match_score(candidate_info, job_requirements)
      return {"score": score, "passed": score >= 70}
    output: score_result

  - id: save
    type: database
    input: candidate_info, score_result
    operation: insert
    table: candidates

  - id: notify
    type: plugin
    input: score_result
    plugin: email_service
    condition: score_result.passed == true
```

**使用场景**：
- 复杂业务流程自动化
- 多步骤数据处理
- 条件分支逻辑
- 集成多个工具

#### 4.5 添加变量工具

变量工具用于存储和读取会话级别的数据。

**步骤**：
1. 在智能体编辑页面点击 **"变量管理"**
2. 定义变量
3. 智能体可以通过工具调用读写变量

**API 方式**：

```bash
POST /api/draftbot/update_display_info

{
  "bot_id": "7434343434343434",
  "display_info": {
    "variables_meta_id": "401"
  }
}
```

**变量定义**：

```yaml
variables:
  - name: user_preference
    type: json
    description: 用户偏好设置
    default: {}

  - name: conversation_summary
    type: text
    description: 对话摘要
    default: ""

  - name: interaction_count
    type: integer
    description: 交互次数
    default: 0
```

**变量操作**：

智能体可以通过工具调用操作变量：

```json
// 读取变量
{
  "tool": "get_variable",
  "parameters": {
    "variable_name": "user_preference"
  }
}

// 写入变量
{
  "tool": "set_variable",
  "parameters": {
    "variable_name": "user_preference",
    "value": {"theme": "dark", "language": "zh-CN"}
  }
}
```

### 5. 配置开场白和推荐回复

#### 5.1 开场白配置

开场白是用户首次与智能体对话时的欢迎语。

**示例**：

```json
{
  "onboarding_info": {
    "prologue": "你好！我是 HR 招聘助手 👋\n\n我可以帮助你：\n• 了解职位信息\n• 提交简历\n• 安排面试\n• 查询招聘进度\n\n请问有什么可以帮助你的？",
    "suggested_questions": [
      "有哪些前端工程师职位？",
      "如何提交简历？",
      "面试流程是怎样的？"
    ]
  }
}
```

**配置 API**：

```bash
POST /api/draftbot/update_display_info

{
  "bot_id": "7434343434343434",
  "display_info": {
    "onboarding_info": {
      "prologue": "你好！我是...",
      "suggested_questions": [...]
    }
  }
}
```

#### 5.2 推荐回复配置

推荐回复会根据对话上下文动态生成建议。

**配置**：

```json
{
  "suggest_reply_info": {
    "enabled": true,
    "mode": "auto",  // auto: 自动生成, manual: 手动配置
    "max_suggestions": 3,
    "trigger_rules": [
      {
        "condition": "user_question",
        "suggestions": ["更多细节", "举个例子", "换个方式"]
      }
    ]
  }
}
```

### 6. 调试与测试

#### 6.1 本地调试

**调试面板**：
1. 在智能体编辑页面右侧
2. 输入测试消息
3. 查看智能体回复
4. 查看调试信息（工具调用、提示词、Token 消耗）

**调试选项**：

```
┌────────────────────────────────────────┐
│  调试面板                              │
├────────────────────────────────────────┤
│  □ 显示提示词                          │
│  □ 显示工具调用详情                    │
│  □ 显示 Token 消耗                     │
│  □ 显示执行时间                        │
│  □ 保存调试日志                        │
└────────────────────────────────────────┘
```

**调试信息示例**：

```json
{
  "request_id": "req_123456",
  "agent_id": 7434343434343434,
  "user_input": "有哪些前端职位？",

  "execution_flow": [
    {
      "step": 1,
      "node": "persona_render",
      "duration_ms": 10,
      "output": "渲染后的提示词..."
    },
    {
      "step": 2,
      "node": "llm_thinking",
      "duration_ms": 1500,
      "model": "gpt-4o",
      "tokens": {
        "prompt": 800,
        "completion": 150,
        "total": 950
      },
      "output": "我需要查询数据库中的职位信息..."
    },
    {
      "step": 3,
      "node": "tool_call",
      "tool": "database_query",
      "duration_ms": 50,
      "parameters": {
        "table": "jobs",
        "query": "SELECT * FROM jobs WHERE category = '前端' AND status = 'open'"
      },
      "output": [
        {"id": 1, "title": "前端工程师", "location": "北京"},
        {"id": 2, "title": "高级前端工程师", "location": "上海"}
      ]
    },
    {
      "step": 4,
      "node": "llm_answer",
      "duration_ms": 1200,
      "output": "我们目前有 2 个前端职位开放..."
    }
  ],

  "total_duration_ms": 2760,
  "total_tokens": 1100
}
```

#### 6.2 测试用例

**推荐测试场景**：

| 测试类型 | 测试内容 | 预期结果 |
|----------|----------|----------|
| **基础对话** | 简单问答 | 回答准确、流畅 |
| **工具调用** | 触发工具调用 | 工具正确执行 |
| **多轮对话** | 上下文理解 | 保持上下文连贯 |
| **边界情况** | 无效输入、超长输入 | 妥善处理 |
| **并发测试** | 多用户同时使用 | 性能稳定 |
| **错误处理** | 工具失败、超时 | 优雅降级 |

**测试用例示例**：

```yaml
test_cases:
  - name: 基础问答
    input: "你好，你是谁？"
    expected_keywords: ["HR", "招聘", "助手"]

  - name: 工具调用
    input: "有哪些前端职位？"
    expected_tools: ["database_query"]
    expected_output_contains: ["前端工程师"]

  - name: 多轮对话
    conversations:
      - input: "有哪些后端职位？"
        expected: "...后端工程师..."
      - input: "第一个职位的详细信息是什么？"
        expected: "...{第一个职位的详情}..."

  - name: 错误处理
    input: "删除所有数据"
    expected: "抱歉，我没有权限执行删除操作"
```

#### 6.3 API 测试

**测试接口**：

```bash
# 1. 调试模式执行
POST /api/v1/chat
Content-Type: application/json
Authorization: Bearer <api-key>

{
  "bot_id": 7434343434343434,
  "conversation_id": "conv_test_001",
  "query": "有哪些前端职位？",
  "draft_mode": true,  # 使用草稿版本
  "stream": true
}

# 2. 查看执行日志
GET /api/bot/execute/logs?agent_id=7434343434343434&limit=20

# 3. 查看 Token 消耗
GET /api/bot/stats/tokens?agent_id=7434343434343434&start_date=2025-01-01
```

### 7. 优化与调整

#### 7.1 提示词优化

**优化策略**：

1. **A/B 测试**：
   ```yaml
   version_a:
     prompt: "你是专业的客服助手..."
     test_cases: 100
     satisfaction: 85%

   version_b:
     prompt: "你是友好的客服助手..."
     test_cases: 100
     satisfaction: 92%  # 胜出

   decision: 采用 version_b
   ```

2. **Few-shot 示例**：
   ```markdown
   # 角色定义
   你是 HR 招聘助手...

   ## 对话示例

   用户：有哪些前端职位？
   助手：我们目前有 3 个前端职位开放：
   1. 前端工程师（北京）- 3-5年经验
   2. 高级前端工程师（上海）- 5-8年经验
   3. 前端技术专家（深圳）- 8年以上经验
   您对哪个职位感兴趣？

   用户：第一个职位的要求是什么？
   助手：前端工程师（北京）的岗位要求如下...
   ```

3. **Chain of Thought**：
   ```markdown
   在回答问题前，请按以下步骤思考：
   1. 理解用户的问题
   2. 确定需要哪些信息
   3. 调用必要的工具
   4. 组织答案
   5. 检查答案的准确性
   ```

#### 7.2 模型参数调优

**参数调优表**：

| 参数 | 作用 | 调优建议 |
|------|------|----------|
| **Temperature** | 控制随机性 | 问答类：0.3-0.5<br>创意类：0.7-0.9<br>代码类：0.1-0.3 |
| **Max Tokens** | 输出长度限制 | 简答：500-1000<br>详细解答：1500-2500<br>长文本：3000+ |
| **Top P** | 核采样概率 | 通常保持 0.9-1.0 |
| **Frequency Penalty** | 降低重复 | 0.0-0.5，避免重复表达 |
| **Presence Penalty** | 鼓励新话题 | 0.0-0.5，避免话题循环 |

**调优示例**：

```json
{
  "model_info": {
    "model_id": 69010,
    "llm_params": {
      "temperature": 0.4,        // 降低随机性，提高准确度
      "max_tokens": 1500,        // 适中的回复长度
      "top_p": 0.95,
      "frequency_penalty": 0.3,  // 减少重复
      "presence_penalty": 0.2    // 鼓励多样性
    }
  }
}
```

#### 7.3 工具调用优化

**优化策略**：

1. **工具描述优化**：
   ```json
   // 不好的描述
   {
     "name": "query_db",
     "description": "查询数据库"
   }

   // 好的描述
   {
     "name": "query_jobs",
     "description": "查询职位信息。用于回答用户关于职位列表、职位详情、职位要求等问题。参数 category 可以是：前端、后端、测试、产品等。"
   }
   ```

2. **减少工具数量**：
   - 合并相似功能的工具
   - 移除不常用的工具
   - 使用工作流替代多个独立工具

3. **工具调用缓存**：
   ```go
   // 缓存查询结果
   func QueryJobs(category string) ([]Job, error) {
       cacheKey := "jobs:" + category

       // 尝试从缓存读取
       if cached, ok := cache.Get(cacheKey); ok {
           return cached.([]Job), nil
       }

       // 查询数据库
       jobs, err := db.Query("SELECT * FROM jobs WHERE category = ?", category)
       if err != nil {
           return nil, err
       }

       // 缓存结果（5 分钟）
       cache.Set(cacheKey, jobs, 5*time.Minute)

       return jobs, nil
   }
   ```

### 8. 版本管理与发布

#### 8.1 版本命名规范

**推荐规范**：

```
v<major>.<minor>.<patch>

major: 重大功能更新
minor: 新增功能
patch: Bug 修复和小优化
```

**示例**：
- `v1.0.0`：初始版本
- `v1.1.0`：新增知识库功能
- `v1.1.1`：修复提示词问题
- `v2.0.0`：重构智能体架构

#### 8.2 发布流程

**步骤**：

1. **测试验证**：
   ```bash
   # 运行测试用例
   npm run test:agent -- --agent-id=7434343434343434

   # 检查配置
   npm run validate:agent -- --agent-id=7434343434343434
   ```

2. **创建版本**：
   ```bash
   POST /api/draftbot/publish
   {
     "bot_id": "7434343434343434",
     "space_id": "1",
     "version": "v1.2.0",
     "description": "新增简历筛选工作流"
   }
   ```

3. **灰度发布**（可选）：
   ```json
   {
     "bot_id": "7434343434343434",
     "space_id": "1",
     "version": "v1.2.0",
     "rollout_strategy": {
       "type": "percentage",
       "percentage": 10
     }
   }
   ```

4. **全量发布**：
   ```bash
   POST /api/draftbot/publish
   {
     "bot_id": "7434343434343434",
     "space_id": "1",
     "version": "v1.2.0",
     "percentage": 100
   }
   ```

#### 8.3 版本回滚

如果发现问题，可以快速回滚：

```bash
POST /api/draftbot/publish
{
  "bot_id": "7434343434343434",
  "space_id": "1",
  "version": "v1.1.1",
  "rollback": true
}
```

### 9. 监控与维护

#### 9.1 性能监控

**关键指标**：

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| **响应时间** | 平均响应时长 | > 3s |
| **Token 消耗** | 每次对话 Token 数 | > 5000 |
| **工具调用次数** | 每次对话工具调用次数 | > 10 |
| **错误率** | 对话失败比例 | > 5% |
| **用户满意度** | 用户评分 | < 4.0 |

**监控面板**：

```
┌──────────────────────────────────────────────┐
│  智能体监控面板 - HR 招聘助手                 │
├──────────────────────────────────────────────┤
│                                              │
│  今日数据（2025-10-27）                      │
│  ────────────────────────────────────────   │
│  对话次数：1,234                             │
│  平均响应时间：2.3s                          │
│  Token 消耗：2,345,678                       │
│  用户满意度：4.5/5.0                         │
│                                              │
│  趋势图                                      │
│  ────────────────────────────────────────   │
│  对话次数  ▁▂▃▅▇█▇▅▃▂▁                     │
│  响应时间  ▃▃▂▂▃▄▃▂▂▃▃                     │
│  错误率    ▁▁▁▁▂▁▁▁▁▁▁                     │
│                                              │
│  热门问题 Top 5                              │
│  ────────────────────────────────────────   │
│  1. 有哪些前端职位？              (345次)   │
│  2. 如何提交简历？                (234次)   │
│  3. 面试流程是怎样的？            (189次)   │
│  4. 薪资范围是多少？              (156次)   │
│  5. 工作地点在哪？                (134次)   │
│                                              │
└──────────────────────────────────────────────┘
```

#### 9.2 日志分析

**日志查询**：

```bash
# 查询错误日志
GET /api/bot/logs?agent_id=7434343434343434&level=error&limit=50

# 查询慢查询
GET /api/bot/logs?agent_id=7434343434343434&duration_gt=3000&limit=20

# 查询特定用户的对话
GET /api/bot/logs?agent_id=7434343434343434&user_id=user_001
```

**日志示例**：

```json
{
  "timestamp": "2025-10-27T10:30:45Z",
  "level": "error",
  "agent_id": 7434343434343434,
  "conversation_id": "conv_123456",
  "user_id": "user_001",
  "error": {
    "code": "TOOL_CALL_FAILED",
    "message": "数据库查询超时",
    "details": {
      "tool": "query_jobs",
      "parameters": {"category": "前端"},
      "duration_ms": 5000
    }
  }
}
```

#### 9.3 持续优化

**优化循环**：

```
监控数据
   │
   ▼
分析问题
   │
   ├─────────────────────┐
   │                     │
   ▼                     ▼
提示词优化          工具优化
   │                     │
   └─────────┬───────────┘
             │
             ▼
        A/B 测试
             │
             ▼
        全量发布
             │
             ▼
        监控数据
```

## 最佳实践

### DO（推荐做法）

✅ **清晰的人设定义**
```markdown
好的示例：
你是专业的财务顾问，有 10 年从业经验...

不好的示例：
你是一个助手...
```

✅ **渐进式开发**
```
第一版：基础问答功能
第二版：添加知识库
第三版：集成工具调用
第四版：优化提示词
```

✅ **充分测试**
```yaml
测试覆盖：
- 基础功能测试
- 边界情况测试
- 压力测试
- A/B 测试
```

✅ **版本控制**
```
使用语义化版本号
每次发布记录变更日志
保留历史版本便于回滚
```

✅ **监控告警**
```
设置关键指标告警
定期查看监控面板
分析用户反馈
持续优化
```

### DON'T（避免做法）

❌ **模糊的提示词**
```markdown
不要这样：
你是一个助手，帮助用户解决问题。

应该这样：
你是客户服务助手，专门回答产品使用问题...
```

❌ **过多的工具**
```
不要添加超过 15 个工具
避免功能重复的工具
移除不常用的工具
```

❌ **跳过测试**
```
不要直接发布到生产环境
不要忽略边界情况
不要忽视性能测试
```

❌ **硬编码配置**
```javascript
// 不要这样
const API_KEY = "sk-1234567890";

// 应该这样
const API_KEY = process.env.API_KEY;
```

❌ **忽视监控**
```
不要发布后不管
不要忽略错误日志
不要忽视用户反馈
```

## 常见问题

### Q1: 智能体回复不准确怎么办？

**原因分析**：
- 提示词不够清晰
- 缺少 Few-shot 示例
- 模型选择不合适
- 知识库内容不完整

**解决方案**：
1. 优化提示词，增加具体要求
2. 添加 Few-shot 示例
3. 尝试更强大的模型
4. 补充知识库内容

### Q2: 工具调用失败怎么处理？

**排查步骤**：
1. 检查工具配置是否正确
2. 查看工具描述是否清晰
3. 检查工具权限
4. 查看错误日志

**优化建议**：
- 添加工具调用的错误处理
- 提供备选方案
- 记录失败日志

### Q3: 响应时间过长怎么优化？

**优化方法**：
1. 减少工具数量
2. 优化数据库查询
3. 启用缓存
4. 使用更快的模型
5. 减少提示词长度

### Q4: Token 消耗过高怎么办？

**优化策略**：
1. 精简提示词
2. 减少历史消息长度
3. 使用更高效的模型
4. 启用前缀缓存

### Q5: 如何实现多语言支持？

**实现方案**：

方案 1：提示词切换
```markdown
English Version:
You are a professional customer service assistant...

中文版本：
你是专业的客户服务助手...
```

方案 2：动态注入
```markdown
你是专业的客户服务助手，使用 {{language}} 语言与用户交流。
```

方案 3：多个智能体
```
- agent_en: 英文智能体
- agent_zh: 中文智能体
- agent_ja: 日文智能体
```

## 参考资源

### 官方文档

- [智能体技术架构](./agent-architecture.md)
- [工作流开发指南](./workflow-development.md)
- [插件开发指南](./plugin-development.md)
- [知识库架构](../architecture/knowledge/knowledge-base-architecture.md)

### 源码示例

- **智能体创建**：`backend/domain/agent/singleagent/service/single_agent_impl.go`
- **Agent Flow 构建**：`backend/domain/agent/singleagent/internal/agentflow/agent_flow_builder.go`
- **工具集成**：`backend/domain/agent/singleagent/internal/agentflow/node_tool_*.go`

---

**最后更新时间**：2025-10-27

**文档版本**：v1.0.0

如有任何疑问或需要帮助，请联系：
- 📧 邮箱：support@coze-plus.cn
- 💬 交流群：参见[项目概述](./overview.md)
