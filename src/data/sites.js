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
    sites: [
      { name: 'anytxt', href: 'https://anytxt.net/' },
      { name: 'everything', href: 'https://www.voidtools.com/zh-cn/' }
    ]
  },
  {
    id: 'file-transfer',
    label: '文件传输',
    sites: [
      { name: 'localsend', href: 'https://localsend.org/zh-CN/download' },
      { name: 'Syncthing', href: 'https://syncthing.net/' }
    ]
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
    sites: [
      { name: 'MinerU', href: 'https://mineru.net' },
      { name: 'Paddleocr', href: 'https://aistudio.baidu.com/paddleocr' },
      { name: 'Umi-OCR', href: 'https://github.com/hiroi-sora/Umi-OCR' }
    ]
  },
  {
    id: 'install',
    label: '装机',
    sites: [
      { name: '傲梅分区助手', href: 'https://www.disktool.cn/feature.html' },
      { name: '老毛桃', href: 'https://www.laomaotao.net/' },
      { name: 'I Tell You', href: 'https://next.itellyou.cn' },
      { name: 'DLL-FILES', href: 'https://www.dll-files.com/n/' },
      { name: '向日葵', href: 'https://sunlogin.oray.com/download' },
      { name: '360（认准极速）', href: 'https://www.360.cn/download/' },
      { name: 'PotPlayer', href: 'https://potplayer.tv/?lang=zh_CN' }
    ]
  },
  {
    id: 'mirror',
    label: '镜像站',
    sites: [
      { name: '华为云镜像', href: 'https://mirrors.huaweicloud.com/home' },
      { name: 'NPM Mirror', href: 'https://npmmirror.com/' }
    ]
  },
  {
    id: 'draw',
    label: '画图',
    sites: [
      { name: 'Excalidraw', href: 'https://excalidraw.com/' },
      { name: 'Drawio', href: 'https://app.diagrams.net/' }
    ]
  },
  {
    id: 'famous-painting',
    label: '名画',
    sites: [{ name: '故宫名画记', href: 'https://minghuaji.dpm.org.cn/' }]
  },
  {
    id: 'database',
    label: '数据库',
    sites: [
      { name: 'dbeaver', href: 'https://dbeaver.io/' },
      { name: 'HeidiSQL', href: 'https://www.heidisql.com/' }
    ]
  },
  {
    id: 'blog',
    label: '博客',
    sites: [
      { name: '阮一峰', href: 'https://www.ruanyifeng.com/blog/index.html' },
      { name: '廖雪峰', href: 'https://liaoxuefeng.com/index.html' },
      { name: '潮流周刊', href: 'https://weekly.tw93.fun/' }
    ]
  },
  {
    id: 'editor',
    label: '文本编辑器',
    sites: [
      { name: 'VSCode', href: 'https://code.visualstudio.com/' },
      { name: 'Sublime', href: 'https://www.sublimetext.com/' }
    ]
  },
  {
    id: 'game',
    label: '游戏',
    sites: [
      { name: '游民星空', href: 'https://www.gamersky.com/' },
      { name: '3DM', href: 'https://www.3dmgame.com/' },
      { name: '奇趣电玩', href: 'https://www.qqarc.com/' },
      { name: '畅玩空间', href: 'https://www.wo1wan.com/' },
      { name: '游聚', href: 'https://www.gotvg.com/' },
      { name: 'Emu666', href: 'https://www.emu666.com/' },
      { name: '网页红警', href: 'https://www.ra2web.com/' }
    ]
  },
  {
    id: 'video',
    label: '视频',
    sites: [
      { name: '央视片库', href: 'https://tv.cctv.com/yxg' },
      { name: 'bilibili', href: 'https://www.bilibili.com/' },
      { name: '斗鱼', href: 'https://www.douyu.com/' }
    ]
  },
  {
    id: 'video-record',
    label: '视频录制',
    sites: [
      { name: 'OBS', href: 'https://obsproject.com/' },
      { name: 'EV录屏', href: 'https://www.ieway.cn/evcapture.html' }
    ]
  },
  {
    id: 'forum',
    label: '论坛',
    sites: [
      { name: '豆瓣电影', href: 'https://movie.douban.com/' },
      { name: '知乎', href: 'https://www.zhihu.com/' }
    ]
  },
  {
    id: 'git',
    label: 'Git',
    sites: [
      { name: 'Gitee', href: 'https://gitee.com/' },
      { name: 'GitHub', href: 'https://github.com/' }
    ]
  },
  {
    id: 'terminal',
    label: 'Terminal',
    sites: [
      { name: 'XShell', href: 'https://www.xshell.com/zh/xshell-download/' },
      { name: 'MobaXterm', href: 'https://mobaxterm.mobatek.net/' },
      { name: 'Linux网页模拟器', href: 'https://bellard.org/jslinux/' }
    ]
  },
  {
    id: 'server',
    label: '服务器',
    sites: [
      { name: 'FileZilla', href: 'https://filezilla-project.org/' },
      { name: 'Nginx', href: 'https://nginx.org/' },
      { name: 'Caddy', href: 'https://caddyserver.com/' }
    ]
  },
  {
    id: 'newspaper',
    label: '电子报刊',
    sites: [{ name: '人民日报', href: 'https://paper.people.com.cn/' }]
  },
  {
    id: 'compress',
    label: '压缩软件',
    sites: [
      { name: '7-Zip', href: 'https://sparanoid.com/lab/7z/' },
      { name: '360压缩', href: 'https://yasuo.360.cn/' }
    ]
  },
  {
    id: 'edu',
    label: '学习平台',
    sites: [
      { name: '国家中小学教育平台', href: 'https://basic.smartedu.cn/' },
      { name: '终身教育平台', href: 'https://le.ouchn.cn/home' },
      { name: '学堂在线', href: 'https://www.xuetangx.com/' },
      { name: '中国大学MOOC', href: 'https://www.icourse163.org/' },
      { name: 'WPS学堂', href: 'https://www.wps.cn/learning?chan=pc_web_official' },
      { name: 'Qwerty', href: 'https://qwerty.kaiyi.cool/' },
      { name: '全历史', href: 'https://www.allhistory.com/' },
      { name: 'PDF教材', href: 'https://github.com/TapXWorld/ChinaTextbook?tab=readme-ov-file' }
    ]
  },
  {
    id: 'office',
    label: 'Office',
    sites: [{ name: 'WPS', href: 'https://www.wps.cn/' }]
  }
]

// 设计：按子菜单分组
export const designSiteGroups = {
  icons: [
    { name: 'iconfont', href: 'https://www.iconfont.cn/' },
    { name: 'iconpark', href: 'https://iconpark.oceanengine.com/home' }
  ]
}