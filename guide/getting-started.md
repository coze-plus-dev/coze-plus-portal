# 快速开始

本指南将帮助你快速搭建 Coze Plus 开发环境。

## 环境要求

### 系统要求
- **操作系统**: macOS / Linux / Windows (WSL2)
- **内存**: 最低 4GB，推荐 8GB+
- **磁盘空间**: 最低 10GB

### 软件依赖

#### 前端开发
- **Node.js**: 18.x 或更高版本
- **npm**: 8.x 或更高版本
- **Rush.js**: 用于 Monorepo 管理

#### 后端开发
- **Go**: 1.24.0 或更高版本
- **Make**: 构建工具

#### 数据库和中间件
- **Docker**: 20.x 或更高版本
- **Docker Compose**: 2.x 或更高版本

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/coze-plus-dev/coze-plus.git
cd coze-plus
```

### 2. 安装前端依赖

```bash
# 安装 Rush.js
npm install -g @microsoft/rush

# 安装所有前端依赖
rush update
```

### 3. 启动中间件服务

使用 Docker Compose 启动所有依赖的中间件服务：

```bash
make middleware
```

这将启动以下服务：
- MySQL 8.4.5
- Redis 8.0
- Elasticsearch 8.18.0
- Milvus v2.5.10 (向量数据库)
- MinIO (对象存储)
- NSQ (消息队列)
- etcd 3.5

### 4. 配置模型

在启动后端之前，需要配置 AI 模型。模型配置文件为 YAML 格式：

```bash
# 查看可用的模型模板
ls backend/conf/model/template/

# 复制并编辑模型配置（以 Volcengine Ark 为例）
cp backend/conf/model/template/model_template_ark.yaml backend/conf/model/my_model.yaml

# 编辑配置文件
vim backend/conf/model/my_model.yaml
```

配置示例（YAML 格式）：
```yaml
id: 60000                          # 模型 ID（唯一）
name: My GPT Model                  # 模型名称
icon_uri: default_icon/openai.png   # 图标路径
description:
  zh: GPT-4 模型
  en: GPT-4 Model
meta:
  conn_config:
    api_key: your-api-key-here      # ⚠️ 必须配置
    model: gpt-4                     # ⚠️ 必须配置
    base_url: https://api.openai.com/v1  # 可选
default_parameters:
  - name: temperature
    label:
      zh: 生成随机性
      en: Temperature
```

**重要配置项**：
- `id`: 模型唯一标识（整数）
- `meta.conn_config.api_key`: API 密钥（必填）
- `meta.conn_config.model`: 模型名称（必填）

**支持的模型提供商**：
模板文件位于 `backend/conf/model/template/` 目录：
- `model_template_ark*.yaml` - Volcengine Ark（豆包系列）
- OpenAI, Claude, Gemini, Qwen, DeepSeek, Ollama 等（可参考现有模板自行配置）

### 5. 启动后端服务

```bash
make server
```

后端服务将在 `http://localhost:8888` 启动。

### 6. 启动前端服务

```bash
cd frontend/apps/coze-studio
npm run dev
```

前端开发服务器将在 `http://localhost:3000` 启动（会自动打开浏览器）。

## 验证安装

访问 `http://localhost:8888`，你应该能看到 Coze Plus 的登录界面。

默认管理员账号：
- 用户名: `admin`
- 密码: 查看启动日志或配置文件

## 开发模式

### 完整开发环境

```bash
# 一键启动所有服务（中间件 + 后端 + 前端）
make debug
```

### 仅启动后端

```bash
make server
```

### 仅启动前端

```bash
cd frontend/apps/coze-studio
npm run dev
```

### 热重载

- **前端**: 自动热重载，修改代码后立即生效
- **后端**: 需要重启服务（可使用 `air` 等工具实现热重载）

## 常用命令

### 数据库管理

```bash
# 同步数据库结构
make sync_db

# 导出数据库 Schema
make dump_db

# 初始化 SQL 数据
make sql_init
```

### 构建

```bash
# 构建前端
make fe

# 构建后端
make build_server

# 构建 Docker 镜像
make web
```

### Rush Monorepo

```bash
# 更新所有依赖
rush update

# 构建所有包
rush build

# 重新构建特定包
rush rebuild -o @coze-studio/app

# 运行测试
rush test

# 代码检查
rush lint
```

## 故障排除

### 端口冲突

如果遇到端口被占用，检查以下端口：
- `8888`: 后端服务
- `3306`: MySQL
- `6379`: Redis
- `9200`: Elasticsearch
- `19530`: Milvus

### Docker 资源不足

确保 Docker 分配了足够的资源：
- CPU: 至少 2 核
- 内存: 至少 4GB

### 前端依赖问题

```bash
# 清理并重新安装
rush purge
rush update --full
```

### 后端编译错误

```bash
# 清理 Go 缓存
go clean -cache
go mod tidy
```

## 下一步

- [环境配置](/guide/environment-setup) - 详细的环境配置说明
- [开发流程](/guide/development-workflow) - 了解开发规范和流程
- [架构设计](/architecture/) - 深入理解项目架构
