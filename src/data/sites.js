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
  },
  {
    id: 'cloud-docs',
    label: '云文档',
    sites: [
      { name: '金山云文档', href: 'https://www.kdocs.cn/' },
      { name: '语雀', href: 'https://www.yuque.com/' },
      { name: '有道云笔记', href: 'https://note.youdao.com/' }
    ]
  },
  {
    id: 'ocr',
    label: 'OCR',
    sites: [{ name: 'MinerU', href: 'https://mineru.net' }]
  },
  {
    id: 'install',
    label: '装机',
    sites: [{ name: '傲梅分区助手', href: 'https://www.disktool.cn/feature.html' }]
  },
  {
    id: 'draw',
    label: '画图',
    sites: [
      { name: 'Excalidraw', href: 'https://excalidraw.com/' },
      { name: 'Drawio', href: 'https://app.diagrams.net/' }
    ]
  }
]

// 设计：按子菜单分组
export const designSiteGroups = {
  icons: [
    { name: 'iconfont', href: 'https://www.iconfont.cn/' },
    { name: 'iconpark', href: 'https://iconpark.oceanengine.com/home' }
  ]
}