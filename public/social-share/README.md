# 社交平台分享图片

本目录包含 7 张专为微信、微博、小红书等社交平台设计的服务介绍图片。所有图片均已去除价格信息，适合直接分享。

## 📋 图片列表

### 1. SaaS 云服务 (1-saas-service.html)
**主题色**: 紫色渐变 (#667eea → #764ba2)
**内容**: 介绍三个版本（基础版、专业版、企业版）的核心功能和特点
**适用场景**: 向中小企业推广云服务

**亮点**:
- 三列卡片布局，清晰对比不同版本
- 突出"5分钟快速部署"、"按需付费"等核心优势
- 适合初次接触的潜在客户

---

### 2. 企业私有化部署 (2-private-deployment.html)
**主题色**: 粉红渐变 (#f093fb → #f5576c)
**内容**: 部署实施、技术支持、培训运维等服务内容
**适用场景**: 向大型企业、政府机构宣传私有化方案

**亮点**:
- 强调"数据安全可控"、"深度定制"
- 三大服务版块清晰展示
- 适合对数据安全有严格要求的客户

---

### 3. 技术培训与咨询 (3-training-consulting.html)
**主题色**: 蓝色渐变 (#4facfe → #00f2fe)
**内容**: AI 智能体开发培训、架构设计咨询、企业内训
**适用场景**: 向希望自建 AI 团队的企业推广培训服务

**亮点**:
- 三大培训课程详细介绍
- 强调"快速提升"、"降低成本"、"实战经验"
- 适合技术团队转型升级需求

---

### 4. 定制开发服务 (4-custom-development.html)
**主题色**: 橙黄渐变 (#fa709a → #fee140)
**内容**: 行业解决方案、系统集成、功能定制、项目流程
**适用场景**: 向有特殊需求的企业介绍定制开发能力

**亮点**:
- 四大解决方案领域
- 标准项目流程 6 步骤可视化
- 适合需要深度定制的客户

---

### 5. 为什么选择我们 (5-why-choose-us.html)
**主题色**: 紫色渐变 (#667eea → #764ba2)
**内容**: 技术领先、经验丰富、专业团队、持续创新四大优势
**适用场景**: 品牌宣传、建立信任

**亮点**:
- "100+ 企业客户"、"10+ 行业覆盖"等关键数据
- 四大优势模块化展示
- 适合首次接触的客户建立信任

---

### 6. 平台核心能力 (6-platform-features.html)
**主题色**: 青紫渐变 (#30cfd0 → #330867)
**内容**: 智能体开发、工作流引擎、知识库、插件生态等六大核心功能
**适用场景**: 产品功能介绍、技术能力展示

**亮点**:
- 6 大核心功能详细介绍
- 每个功能带标签突出特点
- 适合技术决策者了解平台能力

---

### 7. 合作伙伴计划 (7-partner-program.html)
**主题色**: 青粉渐变 (#a8edea → #fed6e3)
**内容**: 渠道合作、ISV 合作、技术合作三种模式
**适用场景**: 招募合作伙伴、生态建设

**亮点**:
- 三种合作模式清晰对比
- 6 大合作价值展示
- 适合向潜在合作伙伴介绍

---

## 🎨 使用方法

### 方法一：浏览器截图（推荐）

1. 用浏览器打开 HTML 文件
2. 按 `F11` 进入全屏模式（或 `Cmd + Shift + F` on Mac）
3. 使用截图工具截取整个卡片区域
4. 推荐分辨率：1080×1080 (正方形) 或 1080×1350 (竖版)

**推荐工具**:
- Windows: Snipping Tool / Snip & Sketch
- macOS: 系统截图 (Cmd + Shift + 4)
- Chrome: 开发者工具 → More tools → Capture screenshot

### 方法二：在线工具转换

1. 打开在线 HTML 转图片工具（如 htmlcsstoimage.com）
2. 上传 HTML 文件或复制代码
3. 设置尺寸为 1080×1080
4. 下载生成的 PNG/JPG 图片

### 方法三：Node.js 脚本批量生成

```bash
# 安装依赖
npm install puppeteer

# 创建转换脚本
node convert-to-images.js
```

转换脚本示例：
```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));

  for (const file of files) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080 });
    await page.goto(`file://${path.join(__dirname, file)}`);
    await page.screenshot({
      path: file.replace('.html', '.png'),
      fullPage: false
    });
    console.log(`Generated: ${file.replace('.html', '.png')}`);
  }

  await browser.close();
})();
```

---

## 📱 社交平台尺寸建议

| 平台 | 推荐尺寸 | 说明 |
|------|---------|------|
| **微信朋友圈** | 1080×1080 | 正方形，最大限度展示内容 |
| **微信公众号** | 1080×1350 | 竖版，适合长图文 |
| **微博** | 1080×1080 或 1200×628 | 正方形或横版 |
| **小红书** | 1080×1350 | 竖版，3:4 比例 |
| **抖音/视频号** | 1080×1920 | 竖版，9:16 比例 |

---

## ✏️ 自定义修改

所有 HTML 文件都是自包含的，可以直接在浏览器中打开编辑：

### 修改颜色主题

找到 `<style>` 标签中的渐变色定义：

```css
/* 原始 */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* 修改为你的品牌色 */
background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
```

### 修改文字内容

直接修改 HTML 中的文本即可：

```html
<!-- 原始 -->
<div class="title">SaaS 云服务</div>

<!-- 修改 -->
<div class="title">您的标题</div>
```

### 修改图标

使用 Emoji 或 Unicode 字符：

```html
<!-- 原始 -->
<div class="icon">🤖</div>

<!-- 修改为其他图标 -->
<div class="icon">✨</div>
```

---

## 🎯 使用场景建议

### 朋友圈/微博
- **单图**: 使用 5-why-choose-us.html 或 6-platform-features.html
- **多图**: 组合 1-7 全部图片，形成系列介绍

### 公众号文章
- **配图**: 在文章不同章节插入对应主题的图片
- **长图**: 将多张图片拼接成长图

### 小红书
- **封面**: 使用 5-why-choose-us.html 作为吸引眼球的封面
- **详情页**: 使用 1-4 详细介绍各项服务

### 商务 PPT
- **导出**: 截图后直接插入 PPT
- **动画**: 可以逐张展示不同服务方案

### 销售资料
- **打印**: 导出为高清 PNG，打印成传单或手册
- **PDF**: 合并成 PDF 电子版销售资料

---

## 📞 联系我们

如需定制图片或有其他需求，请联系：

- 📧 邮箱: support@coze-plus.cn
- 📱 电话: 13160120289
- 📍 地址: 苏州市吴中区南湖路71号天贸大厦西楼209室

---

## 📝 版权说明

- 这些图片基于 `/Users/aedan/workspace/coze-plus/docs/services.md` 生成
- 仅供 Coze Plus 官方营销使用
- 未经授权，请勿用于其他商业目的

---

## 🔄 更新日志

### 2025-10-27
- ✅ 创建 7 张社交分享图片
- ✅ 移除所有价格信息
- ✅ 优化移动端显示效果
- ✅ 添加使用说明文档
