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
    id: 'xinchuan',
    label: '打印机驱动',
    legacyLabel: '信创',
    sites: [
      { name: '统信打印机驱动', href: 'https://www.chinauos.com/resource/download-drivers' },
      { name: '立思辰', href: 'https://www.cgprintech.com/download_1/2.html' },
      { name: '惠普打印机', href: 'https://support.hp.com/cn-zh/drivers/printers' }
    ]
  },
  {
    id: 'mirror',
    label: '镜像仓库',
    legacyLabel: ['镜像站', '镜像'],
    sites: [
      { name: '华为云镜像', href: 'https://mirrors.huaweicloud.com/home' },
      { name: 'NPM Mirror', href: 'https://npmmirror.com/' },
      { name: '阿里云Maven', href: 'https://maven.aliyun.com/mvn/guide' }
    ]
  },
  {
    id: 'image',
    label: '图片',
    sites: [
      { name: '花瓣网', href: 'https://huaban.com/discovery' },
      { name: 'cocomaterial', href: 'https://cocomaterial.com/' },
      { name: 'pixabay', href: 'https://pixabay.com/' },
      { name: 'unsplash', href: 'https://unsplash.com/' },
      { name: 'pexels', href: 'https://www.pexels.com/zh-cn/' }
    ]
  },
  {
    id: 'wallpaper',
    label: '壁纸',
    sites: [
      { name: 'coolbackgrounds', href: 'https://coolbackgrounds.io/' }
    ]
  },
  {
    id: 'color',
    label: '色彩',
    sites: [
      { name: 'colorhunt', href: 'https://colorhunt.co/palettes/popular' },
      { name: 'mycolor', href: 'https://mycolor.space/' },
      { name: 'colordrop', href: 'https://colordrop.io/' }
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
    label: '数据库管理',
    legacyLabel: ['数据库', '数据库管理工具'],
    sites: [
      { name: 'dbeaver', href: 'https://dbeaver.io/' },
      { name: 'HeidiSQL', href: 'https://www.heidisql.com/' },
      { name: 'DataGrip', href: 'https://www.jetbrains.com/zh-cn/datagrip/' },
      { name: 'SSMS', href: 'https://learn.microsoft.com/zh-cn/ssms/release-history' },
      { name: 'dbx', href: 'https://github.com/t8y2/dbx' }
    ]
  },
  {
    id: 'data-viz',
    label: '数据可视化',
    sites: [
      { name: 'sive', href: 'https://sive.antv.antgroup.com/' }
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
      { name: 'Sublime', href: 'https://www.sublimetext.com/' },
      { name: 'NotePad--', href: 'https://gitee.com/cxasm/notepad--/releases' }
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
      { name: '斗鱼', href: 'https://www.douyu.com/' },
      { name: '抖音', href: 'https://www.douyin.com/' }
    ]
  },
  {
    id: 'video-record',
    label: '视频录制剪辑',
    legacyLabel: '视频录制',
    sites: [
      { name: 'OBS', href: 'https://obsproject.com/' },
      { name: 'EV录屏', href: 'https://www.ieway.cn/evcapture.html' },
      { name: 'OpenCut', href: 'https://github.com/OpenCut-app/OpenCut' },
      { name: '剪映', href: 'https://www.capcut.cn/' }
    ]
  },
  {
    id: 'file-convert',
    label: '文件格式转换',
    sites: [
      { name: 'Vert', href: 'https://github.com/VERT-sh/VERT' }
    ]
  },
  {
    id: 'browser-ext',
    label: '浏览器插件',
    sites: [
      { name: 'screenity', href: 'https://github.com/alyssaxuu/screenity' },
      { name: 'SingleFile', href: 'https://github.com/gildas-lormeau/SingleFile' },
      { name: '沉浸式翻译', href: 'https://github.com/immersive-translate/immersive-translate' }
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
    label: '建站',
    sites: [
      { name: 'FileZilla', href: 'https://filezilla-project.org/' },
      { name: 'Nginx', href: 'https://nginx.org/' },
      { name: 'Caddy', href: 'https://caddyserver.com/' },
      { name: 'CFP', href: 'https://www.cloudflare-cn.com/developer-platform/products/pages/' }
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
      { name: 'w3schools', href: 'https://www.w3schools.com/' },
      { name: 'photoshop', href: 'https://helpx.adobe.com/cn/photoshop/desktop.html' },
      { name: '全历史', href: 'https://www.allhistory.com/' },
      { name: 'PDF教材', href: 'https://github.com/TapXWorld/ChinaTextbook?tab=readme-ov-file' }
    ]
  },
  {
    id: 'excel',
    label: 'Excel',
    sites: [{ name: '方方格子', href: 'http://www.ffcell.com/home/ffcell.aspx' }]
  },
  {
    id: 'ppt',
    label: 'PPT',
    sites: [
      { name: '第一PPT', href: 'https://www.1ppt.com/' },
      { name: '2ppt', href: 'https://www.2ppt.com/' }
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
  design: [
    { name: '奇迹秀', href: 'https://www.qijishow.com/' },
    { name: '好拼', href: 'https://img.ops-coffee.com/' },
    { name: '鲜艺AI抠图', href: 'https://kt.94xy.com/' },
    { name: '物言卡片', href: 'https://mono.cards/zh-CN' }
  ],
  icons: [
    { name: 'iconfont', href: 'https://www.iconfont.cn/' },
    { name: 'iconpark', href: 'https://iconpark.oceanengine.com/home' },
    { name: 'iconstore', href: 'https://iconstore.co/' }
  ]
}

/* 网站页的完整文件夹列表：页面渲染与本地搜索共用同一份数据，
   新增分组时改这里即可，两边同步生效 */
export const siteFolders = [
  { id: 'pdf', label: 'PDF', sites: pdfSites },
  ...directoryGroups.map((g) => ({ id: g.id, label: g.label, legacyLabel: g.legacyLabel, sites: g.sites })),
  { id: 'design', label: '设计', sites: designSiteGroups.design },
  { id: 'icons', label: '图标', sites: designSiteGroups.icons },
  {
    id: 'emoji',
    label: 'Emoji',
    sites: [
      { name: 'getemoji', href: 'https://getemoji.com/', icon: '😋' },
      { name: 'emojiall', href: 'https://www.emojiall.com/zh-hans' }
    ]
  }
]