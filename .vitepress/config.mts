import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Coze Plus',
  description: 'Coze Plus 技术文档 - 开源 AI 智能体开发平台',
  lang: 'zh-CN',

  // Ignore dead links during build to allow localhost URLs and work-in-progress docs
  ignoreDeadLinks: true,

  // 百度统计
  head: [
    [
      'script',
      {},
      `
      var _hmt = _hmt || [];
      (function() {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?5b1e3eef9eaa41262b6e05e923d47fd1";
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(hm, s);
      })();
      `
    ]
  ],

  themeConfig: {
    logo: '/logo.png',

    nav: [
      { text: '首页', link: '/' },
      { text: '服务详情', link: '/services' },
      { text: '联系我们', link: '/contact' },
      { text: '技术文档', link: '/guide/overview' }
    ],

    sidebar: {
      '/': [
        {
          text: '概述',
          items: [
            { text: '项目概述', link: '/guide/overview' }
          ]
        },
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '环境配置', link: '/guide/environment-setup' },
            { text: '开发流程', link: '/guide/development-workflow' }
          ]
        },
        {
          text: '架构设计',
          items: [
            { text: '总体架构', link: '/architecture/' },
            { text: '代码结构', link: '/architecture/code-structure' },
            { text: '前端架构', link: '/architecture/frontend' },
            { text: '后端架构', link: '/architecture/backend' },
            { text: 'DDD 设计', link: '/architecture/ddd' }
          ]
        },
        {
          text: '智能体开发',
          items: [
            { text: '智能体技术架构', link: '/guide/agent-architecture' },
            { text: '智能体功能开发流程', link: '/guide/agent-development' }
          ]
        },
        {
          text: '工作流开发',
          items: [
            { text: '工作流开发指南', link: '/guide/workflow-development' },
            { text: '节点开发教程', link: '/guide/workflow-node-development' },
            { text: '会话管理节点', link: '/guide/conversation-management' }
          ]
        },
        {
          text: '知识库系统',
          items: [
            { text: '知识库架构', link: '/architecture/knowledge/knowledge-base-architecture' },
            { text: '文档处理', link: '/architecture/knowledge/knowledge-document-processing' },
            { text: '存储系统', link: '/architecture/knowledge/knowledge-storage-system' },
            { text: '检索系统', link: '/architecture/knowledge/knowledge-retrieval-system' },
            { text: '前端架构', link: '/architecture/knowledge/knowledge-frontend-architecture' }
          ]
        },
        {
          text: '模型',
          items: [
            { text: '模型技术架构', link: '/guide/model-architecture' },
            { text: '模型配置指南', link: '/guide/model-configuration' }
          ]
        },
        {
          text: '节点',
          items: [
            { text: '节点技术架构', link: '/guide/node-architecture' },
            { text: '节点开发教程', link: '/guide/workflow-node-development' },
            { text: '插件与节点集成', link: '/guide/plugin-node-integration' }
          ]
        },
        {
          text: '插件',
          items: [
            { text: '插件技术架构', link: '/guide/plugin-architecture' },
            { text: '插件开发指南', link: '/guide/plugin-development' }
          ]
        },
        {
          text: '发布',
          items: [
            { text: '发布智能体为 API 服务', link: '/guide/api-publishing' },
            { text: '发布智能体到 Chat SDK', link: '/guide/chat-sdk-publishing' }
          ]
        },
        {
          text: '空间与权限',
          items: [
            { text: '工作空间设计', link: '/guide/space-design' },
            { text: '权限系统开发指南', link: '/guide/permission-system' }
          ]
        },
        {
          text: '集成指南',
          items: [
            { text: 'OceanBase 集成', link: '/guide/integration/oceanbase-integration-guide' },
            { text: 'Pulsar 事件总线集成', link: '/guide/integration/pulsar-eventbus-integration-guide' }
          ]
        },
        {
          text: 'API 参考',
          items: [
            { text: '概览', link: '/api/' },
            { text: 'API 鉴权方式', link: '/api/authentication' },
            { text: '智能体API', link: '/api/agent' },
            { text: '工作流API', link: '/api/workflow' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/coze-plus-dev/coze-plus' }
    ],

    footer: {
      message: '飞视数字技术｜AI智能技术服务商',
      copyright: 'Copyright © 2025 Coze Plus Team'
    }
  }
})
