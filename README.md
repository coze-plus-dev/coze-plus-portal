# Coze Plus 文档

本目录包含 Coze Plus 项目的完整文档，使用 VitePress 构建。

## 🚀 快速启动

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run docs:dev
```

访问 **http://localhost:5173** 查看文档。

### 构建生产版本

```bash
npm run docs:build
```

### 预览生产构建

```bash
npm run docs:preview
```

## 📁 文档结构

```
docs/
├── .vitepress/          # VitePress 配置
│   └── config.mts       # 站点配置文件
├── guide/               # 指南文档
│   └── getting-started.md
├── architecture/        # 架构文档
│   └── index.md
├── api/                 # API 文档
│   └── index.md
├── public/              # 静态资源
│   ├── logo.png         # 网站 Logo
│   ├── coze-logo.png    # Coze Logo
│   └── contact-me.jpg   # 企业微信二维码
├── index.md             # 首页（商业版）
├── services.md          # 服务详情
└── README.md            # 本文件
```

## 📝 内容说明

### 商业化内容

- **首页 (index.md)**: 展示服务方案、客户案例、联系方式
- **服务详情 (services.md)**: 详细的商业化变现方案和收入预测

### 技术文档

- **快速开始**: 环境配置和安装指南
- **架构设计**: 系统架构说明
- **API 文档**: 接口使用说明

## 🎨 自定义

### 修改配置

编辑 `.vitepress/config.mts` 可以修改：
- 网站标题和描述
- 导航菜单
- 侧边栏
- 主题样式

### 添加页面

在对应目录下创建 `.md` 文件，例如：

```bash
# 创建新的服务案例页面
touch case-studies.md
```

### 更新 Logo

替换 `public/logo.png` 文件即可。

### 更新联系方式

修改 `public/contact-me.jpg` 替换企业微信二维码。

## 🌐 部署

### GitHub Pages

1. 在仓库设置中启用 GitHub Pages
2. 设置部署分支为 `gh-pages`
3. 推送代码后自动部署

### Vercel

1. 导入 GitHub 仓库
2. 设置构建命令: `npm run docs:build`
3. 设置输出目录: `docs/.vitepress/dist`
4. 部署

### Netlify

1. 连接 GitHub 仓库
2. Build command: `npm run docs:build`
3. Publish directory: `docs/.vitepress/dist`
4. 部署

## 💡 技巧

### Markdown 扩展

```markdown
::: tip 提示
这是一个提示框
:::

::: warning 警告
这是一个警告框
:::

::: danger 危险
这是一个危险提示框
:::
```

### 代码块高亮

支持多种语言的语法高亮：

\`\`\`typescript
const hello = 'world'
\`\`\`

### 锚点链接

使用 `{#id}` 添加自定义锚点：

```markdown
## 标题 {#custom-id}
```

## 📞 联系方式

如需技术支持或商务合作，请联系：

- **企业微信**: 扫描首页二维码
- **邮箱**: support@coze-plus.cn
- **电话**: 13160120289

## 📚 更多资源

- [VitePress 官方文档](https://vitepress.dev)
- [Markdown 指南](https://www.markdownguide.org)
- [GitHub 仓库](https://github.com/coze-plus-dev/coze-plus)
