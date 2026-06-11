import { defineConfig } from 'vitepress'

// 导入主题的配置
import { blogTheme } from './blog-theme'

// GitHub Pages 项目页需要使用“/仓库名/”作为 base。
// 如果仓库名是 lava.github.io 这类用户/组织站点，请把 REPOSITORY_NAME 改成空字符串。
const repositoryName = process.env.REPOSITORY_NAME || 'blog'
const base = process.env.GITHUB_ACTIONS === 'true' && repositoryName
  ? `/${repositoryName}/`
  : '/'

// Vitepress 默认配置
// 详见文档：https://vitepress.dev/reference/site-config
export default defineConfig({
  // 继承博客主题(@sugarat/theme)
  extends: blogTheme,
  base,
  lang: 'zh-CN',
  title: 'Lava Blog',
  description: 'Lava 的个人博客，记录技术、生活与思考。',
  lastUpdated: true,
  // 详见：https://vitepress.dev/zh/reference/site-config#head
  head: [
    // 配置网站的图标（显示在浏览器的 tab 上）
    ['link', { rel: 'icon', href: `${base}favicon.ico` }]
  ],
  themeConfig: {
    outline: {
      level: [2, 3],
      label: '目录'
    },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '相关文章',
    lastUpdatedText: '上次更新于',
    logo: `${base}logo.png`,
    editLink: {
      pattern: 'https://github.com/Superyunkai/blog/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },
    nav: [
      { text: '首页', link: '/' },
      { text: '文章', link: '/sop/quickStart' },
      { text: '关于', link: '/about' }
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/Superyunkai/blog'
      }
    ]
  }
})
