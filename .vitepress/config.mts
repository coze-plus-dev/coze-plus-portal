import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Coze Plus',
  description: 'Coze Plus Documentation - Open source AI Agent development platform',

  // Ignore dead links during build to allow localhost URLs and work-in-progress docs
  ignoreDeadLinks: true,

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/overview' },
      { text: 'API', link: '/api/' },
      { text: 'Architecture', link: '/architecture/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/guide/overview' },
            { text: 'Environment Setup', link: '/guide/environment-setup' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Development Workflow', link: '/guide/development-workflow' }
          ]
        },
        {
          text: 'Development',
          items: [
            { text: 'Agent Development', link: '/guide/agent-development' },
            { text: 'Workflow Development', link: '/guide/workflow-development' },
            { text: 'Plugin Development', link: '/guide/plugin-development' },
            { text: 'Model Configuration', link: '/guide/model-configuration' }
          ]
        },
        {
          text: 'Architecture',
          items: [
            { text: 'Agent Architecture', link: '/guide/agent-architecture' },
            { text: 'Model Architecture', link: '/guide/model-architecture' },
            { text: 'Plugin Architecture', link: '/guide/plugin-architecture' },
            { text: 'Permission System', link: '/guide/permission-system' }
          ]
        },
        {
          text: 'Publishing',
          items: [
            { text: 'API Publishing', link: '/guide/api-publishing' },
            { text: 'Chat SDK Publishing', link: '/guide/chat-sdk-publishing' }
          ]
        },
        {
          text: 'Integration',
          items: [
            { text: 'OceanBase Integration', link: '/guide/integration/oceanbase-integration-guide' },
            { text: 'Pulsar EventBus Integration', link: '/guide/integration/pulsar-eventbus-integration-guide' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Authentication', link: '/api/authentication' },
            { text: 'Agent API', link: '/api/agent' },
            { text: 'Workflow API', link: '/api/workflow' }
          ]
        }
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/' },
            { text: 'DDD Architecture', link: '/architecture/ddd' },
            { text: 'Project Architecture', link: '/architecture/project-architecture' },
            { text: 'Backend', link: '/architecture/backend' },
            { text: 'Frontend', link: '/architecture/frontend' },
            { text: 'Code Structure', link: '/architecture/code-structure' }
          ]
        },
        {
          text: 'Knowledge Base',
          items: [
            { text: 'Architecture', link: '/architecture/knowledge/knowledge-base-architecture' },
            { text: 'Document Processing', link: '/architecture/knowledge/knowledge-document-processing' },
            { text: 'Retrieval System', link: '/architecture/knowledge/knowledge-retrieval-system' },
            { text: 'Storage System', link: '/architecture/knowledge/knowledge-storage-system' },
            { text: 'Frontend Architecture', link: '/architecture/knowledge/knowledge-frontend-architecture' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/coze-plus-dev/coze-plus' }
    ],

    footer: {
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Copyright © 2025 Coze Plus Team'
    }
  }
})
