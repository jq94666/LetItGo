/* 站点数据中心：网站页所有网址统一定义在此，
   scripts/fetch-favicons.mjs 也会读取本文件自动抓取 favicon */

// PDF 工具站
export const pdfSites = [
  { name: 'pdfgear', href: 'https://www.pdfgear.com/zh/' },
  { name: 'pdf24', href: 'https://tools.pdf24.org/zh/' }
]

// 文档：按部门分组
export const directoryGroups = [
  {
    id: 'document-search',
    label: '文档检索',
    sites: [{ name: 'anytxt', href: 'https://anytxt.net/' }]
  },
  {
    id: 'file-transfer',
    label: '文件传输',
    sites: [{ name: 'localsend', href: 'https://localsend.org/zh-CN/download' }]
  }
]

// 设计：按子菜单分组
export const designSiteGroups = {
  icons: [
    { name: 'iconfont', href: 'https://www.iconfont.cn/' },
    { name: 'iconpark', href: 'https://iconpark.oceanengine.com/home' }
  ]
}