/* 工具（应用）数据中心：工具页渲染与本地搜索共用同一份元数据。
   工具组件本身仍由 views/tools/index.vue 按需动态 import，
   这里只保留 id / 名称 / 图标等展示信息，避免搜索时拉取全部工具代码。 */
import { compareByLabel } from '../utils/folderNameSort.js'

export const toolGroups = [
  {
    id: 'network',
    label: '网络',
    tools: [
      { id: 'publicIp', label: '我的公网IP', icon: '🌐', tint: 'from-sky-400 to-indigo-500' },
      { id: 'baseConvert', label: '进制转换', icon: '🔢', tint: 'from-slate-500 to-cyan-600' }
    ]
  },
  {
    id: 'family',
    label: '家庭',
    tools: [{ id: 'relatives', label: '亲戚计算', icon: '👨‍👩‍👧', tint: 'from-violet-400 to-fuchsia-400' }]
  },
  {
    id: 'finance',
    label: '财务',
    tools: [
      { id: 'uppercase', label: '大写金额', icon: '¥', tint: 'from-emerald-400 to-teal-400' },
      { id: 'calculator', label: '计算器', icon: '🧮', tint: 'from-sky-400 to-cyan-500' }
    ]
  },
  {
    id: 'excel',
    label: 'Excel',
    tools: [{ id: 'excelMerge', label: '合并', icon: '📗', tint: 'from-green-400 to-emerald-400' }]
  },
  {
    id: 'word',
    label: 'Word',
    tools: [
      { id: 'wordDraft', label: '草稿纸', icon: '📘', tint: 'from-sky-400 to-blue-500' },
      { id: 'wordExtract', label: '提取页面', icon: '✂️', tint: 'from-blue-400 to-indigo-500' }
    ]
  },
  {
    id: 'pdf',
    label: 'PDF',
    tools: [
      { id: 'pdfRotate', label: '旋转', icon: '🔄', tint: 'from-cyan-400 to-sky-400' },
      { id: 'pdfSplit', label: '拆分', icon: '📑', tint: 'from-slate-400 to-cyan-500' },
      { id: 'pdfMerge', label: '合并', icon: '📚', tint: 'from-teal-400 to-cyan-400' },
      { id: 'pdfScan', label: '转扫描件', icon: '🖨️', tint: 'from-orange-400 to-rose-400' },
      { id: 'pdfToExcel', label: '转Excel', icon: '📊', tint: 'from-emerald-400 to-teal-400' },
      { id: 'pdfToWord', label: '转Word', icon: '📝', tint: 'from-blue-400 to-indigo-400' },
      { id: 'imgToPdf', label: '图片转PDF', icon: '🖼️', tint: 'from-fuchsia-400 to-pink-400' }
    ]
  },
  {
    id: 'qrcode',
    label: '二维码',
    tools: [
      { id: 'urlToQrCode', label: '二维码生成', icon: '🔳', tint: 'from-indigo-400 to-blue-500' },
      { id: 'qrCodeScan', label: '扫描识码', icon: '📷', tint: 'from-violet-400 to-indigo-500' }
    ]
  },
  {
    id: 'image',
    label: '图片',
    tools: [
      { id: 'imageCompress', label: '图片压缩', icon: '🗜️', tint: 'from-amber-400 to-orange-400' },
      { id: 'drawPad', label: '简易画板', icon: '✏️', tint: 'from-emerald-400 to-teal-500' },
      { id: 'nineGrid', label: '转九宫格', icon: '🧩', tint: 'from-violet-400 to-fuchsia-500' },
      { id: 'imgBase64', label: '图片Base64互转', icon: '🔁', tint: 'from-sky-400 to-blue-500' }
    ]
  },
  {
    id: 'color',
    label: '颜色',
    tools: [
      { id: 'basicColor', label: '基础色卡', icon: '🎨', tint: 'from-fuchsia-500 to-purple-600' },
      { id: 'chineseColors', label: '中国传统色', icon: '🏮', tint: 'from-rose-500 to-red-500' },
      { id: 'colorConvert', label: '颜色编码转换', icon: '🔀', tint: 'from-pink-400 to-rose-500' }
    ]
  },
  {
    id: 'simulate',
    label: '模拟',
    tools: [
      { id: 'analogClock', label: '模拟时钟', icon: '🕰️', tint: 'from-amber-400 to-orange-500' },
      { id: 'bsod', label: '模拟蓝屏', icon: '💻', tint: 'from-sky-400 to-blue-600' }
    ]
  },
  {
    id: 'fullscreen',
    label: '全屏',
    tools: [
      { id: 'textMarquee', label: '文字跑马灯', icon: '📣', tint: 'from-rose-400 to-orange-400' },
      { id: 'textShow', label: '文字展示', icon: '📺', tint: 'from-sky-400 to-indigo-500' }
    ]
  }
]

// 分组默认顺序：按名称首字母排列（英文 A-Z 在前，中文按拼音在后）
toolGroups.sort((a, b) => compareByLabel(a.label, b.label))

// 扁平化的工具列表（供搜索与跨页启动按 id 查找）
export const allTools = toolGroups.flatMap((g) =>
  g.tools.map((t) => ({ ...t, groupLabel: g.label, groupId: g.id }))
)
