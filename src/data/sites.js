/* 站点数据中心：网站页所有网址统一定义在此，
   scripts/fetch-favicons.mjs 也会读取本文件自动抓取 favicon */
import { compareByLabel } from '../utils/folderNameSort.js'

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
      { name: 'Syncthing', href: 'https://syncthing.net/' },
      { name: 'freefilesync', href: 'https://freefilesync.org/' }
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
    id: 'ime',
    label: '输入法',
    sites: [
      { name: '微信输入法', href: 'https://z.weixin.qq.com/' },
      { name: '豆包输入法', href: 'https://shurufa.doubao.com/pc' }
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
      { name: 'dbx', href: 'https://github.com/t8y2/dbx' },
      { name: 'ARDM', href: 'https://github.com/qishibo/AnotherRedisDesktopManager' },
      { name: 'Navicat', href: 'https://www.navicat.com.cn/products/navicat-premium-lite' },
      { name: 'ES-Client', href: 'https://gitee.com/q2316367743/es-client' }
    ]
  },
  {
    id: 'database-libs',
    label: '数据库',
    sites: [{ name: 'duckdb', href: 'https://github.com/duckdb/duckdb' }]
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
      { name: '沉浸式翻译', href: 'https://github.com/immersive-translate/immersive-translate' },
      { name: 'AdGuard', href: 'https://github.com/AdguardTeam/AdguardBrowserExtension' }
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
      { name: 'Linux网页模拟器', href: 'https://bellard.org/jslinux/' },
      { name: 'warp', href: 'https://github.com/warpdotdev/warp' }
    ]
  },
  {
    id: 'server',
    label: '建站',
    sites: [
      { name: 'FileZilla', href: 'https://filezilla-project.org/' },
      { name: 'Nginx', href: 'https://nginx.org/' },
      { name: 'Caddy', href: 'https://caddyserver.com/' },
      { name: 'CFP', href: 'https://www.cloudflare-cn.com/developer-platform/products/pages/' },
      { name: 'SafeLine', href: 'https://github.com/chaitin/SafeLine' }
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
      { name: '中国大学MOOC', href: 'https://www.icourse163.org/' },
      { name: 'WPS学堂', href: 'https://www.wps.cn/learning?chan=pc_web_official' },
      { name: 'Qwerty', href: 'https://qwerty.kaiyi.cool/' },
      { name: 'w3schools', href: 'https://www.w3schools.com/' },
      { name: 'photoshop', href: 'https://helpx.adobe.com/cn/photoshop/desktop.html' },
      { name: 'WebDev', href: 'https://web.dev/learn/css' },
      { name: 'WangDoc', href: 'https://wangdoc.com/' },
      { name: 'Oracle', href: 'https://docs.oracle.com/en/database/oracle/oracle-database/index.html' },
      { name: 'SQLServer', href: 'https://learn.microsoft.com/zh-cn/sql' },
      { name: '力扣', href: 'https://leetcode.cn/' },
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
  },
  {
    id: 'regex',
    label: '正则表达式',
    sites: [
      { name: 'JsRegexMiniBook', href: 'https://github.com/qdlaoyao/js-regex-mini-book' },
      { name: 'Regulex', href: 'https://github.com/CJex/regulex' }
    ]
  },
  {
    id: 'code-image',
    label: '编程：代码图片',
    legacyLabel: '代码图片',
    sites: [
      { name: 'chalk', href: 'https://chalk.ist/' },
      { name: 'ray', href: 'https://ray.so' },
      { name: 'carbon', href: 'https://carbon.now.sh/' }
    ]
  },
  {
    id: 'java',
    label: '编程：JAVA库',
    legacyLabel: ['JAVA', '编程：JAVA'],
    sites: [
      { name: 'fesod', href: 'https://github.com/apache/fesod' },
      { name: 'mybatis-plus', href: 'https://github.com/baomidou/mybatis-plus' },
      { name: 'mybatis-flex', href: 'https://gitee.com/mybatis-flex/mybatis-flex' },
      { name: 'hutool', href: 'https://github.com/dromara/hutool' },
      { name: 'sa-token', href: 'https://gitee.com/dromara/sa-token' },
      { name: 'xxl-job', href: 'https://github.com/xuxueli/xxl-job' },
      { name: 'dom4j', href: 'https://github.com/dom4j/dom4j' }
    ]
  },
  {
    id: 'frontend',
    label: '编程：前端库',
    legacyLabel: ['前端', '前端库'],
    sites: [
      { name: 'aieditor', href: 'https://gitee.com/aieditor-team/aieditor' },
      { name: 'EmbedPDF', href: 'https://github.com/embedpdf/embed-pdf-viewer' },
      { name: 'uiverse', href: 'https://uiverse.io/' },
      { name: 'element-plus', href: 'https://github.com/element-plus/element-plus' },
      { name: 'naive-ui', href: 'https://github.com/tusen-ai/naive-ui' },
      { name: 'varlet', href: 'https://github.com/varletjs/varlet' },
      { name: 'AntV', href: 'https://antv-2018.alipay.com/zh-cn/index.html' },
      { name: 'anime', href: 'https://github.com/juliangarnier/anime' },
      { name: 'vue', href: 'https://cn.vuejs.org/' },
      { name: 'vite', href: 'https://cn.vitejs.dev/' },
      { name: 'echarts', href: 'https://github.com/apache/echarts' },
      { name: 'tailwindcss', href: 'https://github.com/tailwindlabs/tailwindcss' },
      { name: 'axios', href: 'https://github.com/axios/axios' },
      { name: 'dayjs', href: 'https://github.com/iamkun/dayjs/' },
      { name: 'sheetjs', href: 'https://docs.sheetjs.com/' },
      { name: 'DPlayer', href: 'https://github.com/MoePlayer/DPlayer' },
      { name: 'snapdom', href: 'https://github.com/zumerlab/snapdom' },
      { name: 'nutui', href: 'https://github.com/jd-opensource/nutui' },
      { name: 'vant', href: 'https://github.com/youzan/vant' },
      { name: 'decimal.js', href: 'https://github.com/MikeMcl/decimal.js' },
      { name: 'lodash', href: 'https://github.com/lodash/lodash' },
      { name: 'puppeteer', href: 'https://github.com/puppeteer/puppeteer' },
      { name: 'nestjs', href: 'https://github.com/nestjs/nest' }
    ]
  },
  {
    id: 'frontend-design',
    label: '编程：前端设计',
    legacyLabel: '前端设计',
    sites: [
      { name: 'Acro', href: 'https://arco.design/' },
      { name: 'Ant', href: 'https://4x.ant.design/index-cn' },
      { name: 'TDesign', href: 'https://tdesign.tencent.com/' },
      { name: 'Fluent2', href: 'https://fluent2.microsoft.design/' },
      { name: 'material', href: 'https://m3.material.io/' }
    ]
  },
  {
    id: 'api-test',
    label: '接口测试',
    sites: [
      { name: 'Apifox', href: 'https://apifox.com/' },
      { name: 'Apipost', href: 'https://www.apipost.cn/' },
      { name: 'Postman', href: 'https://www.postman.com/' }
    ]
  },
  {
    id: 'python-libs',
    label: '编程：Python库',
    sites: [
      { name: 'openpyxl', href: 'https://foss.heptapod.net/openpyxl/openpyxl' },
      { name: 'polars', href: 'https://github.com/pola-rs/polars' },
      { name: 'uv', href: 'https://github.com/astral-sh/uv' },
      { name: 'fastapi', href: 'https://github.com/fastapi/fastapi' },
      { name: 'sqlmodel', href: 'https://github.com/fastapi/sqlmodel' },
      { name: 'pandas', href: 'https://github.com/pandas-dev/pandas' },
      { name: 'matplotlib', href: 'https://github.com/matplotlib/matplotlib' }
    ]
  },
  {
    id: 'fullstack',
    label: '编程：全栈知识库',
    sites: [
      { name: 'pdai', href: 'https://www.pdai.tech/' },
      { name: '凤凰架构', href: 'https://github.com/fenixsoft/awesome-fenix' },
      { name: '现代 JavaScript 教程', href: 'https://github.com/javascript-tutorial/zh.javascript.info' },
      { name: '小白Python教程', href: 'https://github.com/walter201230/Python' }
    ]
  },
  {
    id: 'government',
    label: '政务',
    sites: [
      { name: '中国庭审公开网', href: 'https://tingshen.court.gov.cn/' },
      { name: '国家法律法规数据库', href: 'https://flk.npc.gov.cn/index' },
      { name: '国情', href: 'https://www.gov.cn/guoqing/index.htm' },
      { name: '标准地图服务系统', href: 'http://bzdt.ch.mnr.gov.cn/index.html' },
      { name: '省市县', href: 'https://github.com/ruiduobao/shengshixian.com' }
    ]
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

// 文件夹默认顺序：按名称首字母排列（英文 A-Z 在前，中文按拼音在后），网站页默认布局与应用显隐面板共用
siteFolders.sort((a, b) => compareByLabel(a.label, b.label))