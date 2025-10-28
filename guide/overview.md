# 概述

欢迎使用 Coze Plus 技术文档！

## 关于 Coze Plus

Coze Plus 是基于字节跳动团队开源的 [Coze Studio](https://github.com/coze-dev/coze-studio) 项目进行二次开发的企业级 AI Agent 开发平台。我们在保持与上游项目同步更新的同时，针对企业实际应用场景进行了深度优化和功能增强。

**项目地址**：[https://github.com/coze-plus-dev/coze-plus](https://github.com/coze-plus-dev/coze-plus)

## 文档定位

本技术文档旨在为开发者提供全方位的技术指导，帮助您：

- **快速上手**：通过详细的部署指南和快速开始教程，快速搭建开发环境
- **深入理解**：了解 Coze Plus 的架构设计、核心概念和技术实现
- **高效开发**：掌握工作流开发、节点开发、插件开发等核心技能
- **AI 辅助编程**：为 AI 编程助手（如 Claude、Cursor）提供准确的技术上下文，提升开发效率

## 核心特性

### 🚀 企业级增强

在 Coze Studio 的基础上，Coze Plus 增加了以下企业级功能：

- **多渠道客服接入**：支持微信、企业微信、钉钉、飞书等主流平台的智能客服接入
- **完善的权限体系**：组织架构、部门管理、角色权限、员工管理等企业级权限控制
- **API 服务发布**：一键将智能体发布为 API 服务，支持 API Key 鉴权
- **知识库增强**：优化的文档处理和向量检索能力
- **工作流扩展**：新增多种企业级工作流节点和功能

### 🔄 持续同步

Coze Plus 团队保持**每周**从 [Coze Studio](https://github.com/coze-dev/coze-studio) 同步最新功能和改进，确保您始终享受到最新的技术能力和安全更新。

### 🌟 开源开放

Coze Plus 采用 Apache 2.0 开源协议，完全开源、免费使用。我们鼓励社区贡献，共同打造更优秀的 AI Agent 开发平台。

## 技术栈

### 前端技术

- **框架**：React 18 + TypeScript
- **构建工具**：Rsbuild (基于 Rspack)
- **UI 库**：Semi Design + Tailwind CSS
- **状态管理**：Zustand
- **Monorepo**：Rush.js (240 包)

### 后端技术

- **语言**：Go 1.24
- **框架**：Hertz (字节跳动高性能 HTTP 框架)
- **架构**：DDD (领域驱动设计)
- **数据库**：MySQL 8.4+ / OceanBase
- **缓存**：Redis 8.0
- **搜索**：Elasticsearch 8.18
- **向量数据库**：Milvus v2.5.10
- **消息队列**：NSQ / Pulsar

## 文档结构

本文档按照以下结构组织，方便您快速找到所需内容：

### 📖 指南

- **快速开始**：最快 15 分钟部署运行
- **环境配置**：详细的开发环境配置指南
- **开发流程**：标准的开发工作流程
- **权限系统**：企业级权限体系使用指南

### 🏗️ 架构设计

- **总体架构**：系统整体架构和技术选型
- **前端架构**：Rush.js Monorepo 架构详解
- **后端架构**：DDD 分层架构和模块划分
- **代码结构**：目录结构和代码组织

### ⚡ 工作流开发

- **工作流开发指南**：44+ 节点类型的使用说明
- **节点开发教程**：自定义节点开发完整流程
- **会话管理节点**：会话相关节点的使用

### 📚 知识库系统

- **知识库架构**：文档处理和检索架构
- **文档处理**：多格式文档解析和分片
- **存储系统**：向量存储和混合检索
- **检索系统**：语义检索和重排序

### 🚀 发布

- **发布智能体为 API 服务**：API Key 鉴权和接口调用

### 🔌 集成指南

- **OceanBase 集成**：国产数据库集成方案
- **Pulsar 事件总线集成**：消息队列集成

### 📡 API 参考

- **Agent API**：智能体相关接口
- **Workflow API**：工作流相关接口
- **Channel API**：渠道接入相关接口

## 适用人群

本文档面向以下技术人员：

- **全栈工程师**：希望了解完整的前后端技术实现
- **后端工程师**：专注于 Go 后端开发和 DDD 架构
- **前端工程师**：专注于 React + TypeScript 大型 Monorepo 项目
- **DevOps 工程师**：负责系统部署、运维和监控
- **产品经理**：了解产品能力和技术边界
- **架构师**：学习和参考系统架构设计

## 如何使用本文档

### 💡 新手推荐路径

如果您是第一次接触 Coze Plus，建议按照以下顺序阅读：

1. [快速开始](./getting-started.md) - 快速部署和体验
2. [环境配置](./environment-setup.md) - 配置开发环境
3. [总体架构](../architecture/README.md) - 理解系统架构
4. [工作流开发指南](./workflow-development.md) - 学习核心功能

### 🔍 问题查找

- 使用页面右上角的**搜索功能**快速查找关键词
- 查看左侧**目录导航**定位到具体章节
- 通过页面内的**大纲**快速跳转

### 🤖 AI 辅助开发

本文档特别优化了对 AI 编程助手的支持：

- **结构化内容**：清晰的代码示例和架构说明
- **完整的上下文**：详细的技术实现和设计决策
- **代码文件索引**：准确的文件路径和代码位置

在使用 AI 助手（如 Claude、Cursor、GitHub Copilot）时，可以直接引用本文档作为技术上下文。

## 社区与支持

### 💬 加入交流群

欢迎加入 Coze Plus 专业版交流群，与其他开发者交流技术、分享经验：

<div style="text-align: center; margin: 30px 0;">
  <img src="/chat_group.jpg" alt="Coze Plus 交流群" style="width: 300px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
  <p style="margin-top: 10px; color: #666; font-size: 14px;">扫码加入 Coze Plus 专业版交流群</p>
</div>

**群内你可以：**
- 💡 获取最新版本更新和功能预告
- 🤝 与其他开发者交流技术问题
- 📣 反馈 Bug 和提出功能建议
- 🎓 参与技术分享和最佳实践讨论

### 🐛 问题反馈

遇到问题或发现 Bug？欢迎通过以下方式反馈：

- **GitHub Issues**：[https://github.com/coze-plus-dev/coze-plus/issues](https://github.com/coze-plus-dev/coze-plus/issues)
- **交流群**：加入微信群直接反馈
- **邮件支持**：support@coze-plus.cn

### 🤝 贡献指南

Coze Plus 是开源项目，我们欢迎各种形式的贡献：

- 🐛 提交 Bug 报告
- 💡 提出新功能建议
- 📝 改进文档
- 💻 提交代码 PR
- 🌍 帮助翻译文档

贡献指南请参考：[CONTRIBUTING.md](https://github.com/coze-plus-dev/coze-plus/blob/main/CONTRIBUTING.md)

## 版本信息

- **当前文档版本**：v1.0
- **Coze Plus 版本**：v1.0.0
- **基于 Coze Studio**：v1.x
- **最后更新时间**：2025-10-27

## 许可证

- **项目许可证**：Apache License 2.0
- **文档许可证**：CC BY 4.0

## 下一步

现在您已经了解了 Coze Plus 的基本信息，可以开始探索：

- 👉 [快速开始](./getting-started.md) - 10 分钟部署运行
- 👉 [总体架构](../architecture/README.md) - 理解系统设计
- 👉 [工作流开发](./workflow-development.md) - 学习核心功能

---

**提示**：文档持续更新中，如有任何问题或建议，欢迎反馈！
