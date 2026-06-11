// 主题独有配置
import { getThemeConfig } from '@sugarat/theme/node'

// 所有配置项，详见文档: https://theme.sugarat.top/
const blogTheme = getThemeConfig({
  // 搜索
  // 默认开启 pagefind 离线全文搜索支持（如使用其它的可以设置为 false）
  // search: false,

  // 默认关闭 markdown 图表支持（开启会增加一定的构建耗时）
  // mermaid: false,

  footer: {
    copyright: 'MIT License | Lava'
  },

  themeColor: 'el-blue',
  author: 'Lava',

  friend: [
    {
      nickname: 'VitePress',
      des: 'Vite & Vue Powered Static Site Generator',
      avatar: 'https://vitepress.dev/vitepress-logo-large.webp',
      url: 'https://vitepress.dev/'
    },
    {
      nickname: 'Sugarat Theme',
      des: '简约风的 VitePress 博客主题',
      avatar: 'https://img.cdn.sugarat.top/mdImg/MTY3NDk5NTE2NzAzMA==674995167030~fmt.webp',
      url: 'https://theme.sugarat.top/'
    }
  ],

  popover: {
    title: '欢迎',
    body: [
      { type: 'text', content: '这里是 Lava 的个人博客。' },
      { type: 'text', content: '记录技术实践、读书笔记与生活灵感。' },
      {
        type: 'button',
        content: '开始阅读',
        link: '/sop/quickStart'
      }
    ],
    duration: 0
  }
})

export { blogTheme }
