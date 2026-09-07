/* 本地搜索索引：主页搜索框优先在本应用的「文件夹 / 应用 / 网站 / 主页自定义内容」里找名字相近的项，
   命中即可直接弹出文件夹内容或进入应用；本地搜不到才回落到搜索引擎。
   静态数据（网站页文件夹 / 站点、工具）在模块加载时建好索引；
   主页自定义内容（自定义应用 / 文件夹，存于 localStorage）由主页实时构建后经 extraItems 传入。 */

import { siteFolders } from './sites.js'
import { toolGroups } from './tools.js'
import { favicons } from '../assets/icons/favicon-manifest.js'

export const TYPE_LABEL = {
  folder: '文件夹',
  'custom-folder': '文件夹',
  tool: '应用',
  custom: '应用',
  site: '网站'
}

// 排序时的类型优先级：文件夹（含主页自定义文件夹）> 应用（含主页自定义应用）> 网站
const TYPE_ORDER = { folder: 0, 'custom-folder': 0, tool: 1, custom: 1, site: 2 }

// 文件夹：名称直接匹配，其下站点名作为次级关键词（搜 VSCode 也能命中「文本编辑器」）
const folderIndex = siteFolders.map((f) => ({
  type: 'folder',
  key: `folder:${f.id}`,
  id: f.id,
  label: f.label,
  sub: `${f.sites.length} 个网站`,
  icon: '📁',
  iconSrc: null,
  names: [f.label],
  extra: f.sites.map((s) => s.name)
}))

// 网站：名称匹配，所属文件夹名作为次级关键词（groupId 供显隐过滤用）
const siteIndex = siteFolders.flatMap((f) =>
  f.sites.map((s) => ({
    type: 'site',
    key: `site:${f.id}:${s.name}`,
    id: s.name,
    groupId: f.id,
    label: s.name,
    sub: f.label,
    icon: s.icon ?? null,
    iconSrc: s.icon ? null : (favicons[s.name] ?? null),
    href: s.href,
    names: [s.name],
    extra: [f.label]
  }))
)

// 应用（工具）：名称匹配，所属分组名作为次级关键词
const toolIndex = toolGroups.flatMap((g) =>
  g.tools.map((t) => ({
    type: 'tool',
    key: `tool:${t.id}`,
    id: t.id,
    label: t.label,
    sub: g.label,
    icon: t.icon,
    iconSrc: null,
    names: [t.label],
    extra: [g.label]
  }))
)

const INDEX = [...folderIndex, ...toolIndex, ...siteIndex]

/* 打分：越小越靠前
   0 名称完全相等 > 1 名称前缀 > 2 名称包含 > 3 次级关键词包含；-1 表示不命中 */
function scoreItem(item, q) {
  if (item.names.some((n) => n.toLowerCase() === q)) return 0
  if (item.names.some((n) => n.toLowerCase().startsWith(q))) return 1
  if (item.names.some((n) => n.toLowerCase().includes(q))) return 2
  if (item.extra.some((n) => n.toLowerCase().includes(q))) return 3
  return -1
}

/* 把一段文本按查询词切成「命中 / 未命中」片段，供下拉里把部分字符高亮。
   名称里查不到查询词时整段算未命中（此时该项是靠次级关键词命中的）。 */
export function highlightParts(text, rawQuery) {
  const t = String(text ?? '')
  const q = String(rawQuery ?? '').trim()
  if (!q || !t) return [{ text: t, hit: false }]

  const lowerT = t.toLowerCase()
  const lowerQ = q.toLowerCase()
  const parts = []
  let i = 0
  while (i < t.length) {
    const at = lowerT.indexOf(lowerQ, i)
    if (at < 0) {
      parts.push({ text: t.slice(i), hit: false })
      break
    }
    if (at > i) parts.push({ text: t.slice(i, at), hit: false })
    parts.push({ text: t.slice(at, at + lowerQ.length), hit: true })
    i = at + lowerQ.length
  }
  return parts.length ? parts : [{ text: t, hit: false }]
}

export function searchLocal(rawQuery, limit = 8, excludeGroupIds = null, extraItems = []) {
  const q = String(rawQuery ?? '').trim().toLowerCase()
  if (!q) return []

  // 显隐联动：被隐藏文件夹本身及其下站点都不再参与搜索
  const hidden = Array.isArray(excludeGroupIds) && excludeGroupIds.length ? excludeGroupIds : null

  const pool = extraItems.length ? INDEX.concat(extraItems) : INDEX
  const hits = []
  for (const item of pool) {
    if (hidden) {
      if (item.type === 'folder' && hidden.includes(item.id)) continue
      if (item.type === 'site' && hidden.includes(item.groupId)) continue
    }
    const score = scoreItem(item, q)
    if (score >= 0) hits.push({ item, score })
  }

  hits.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    const byType = TYPE_ORDER[a.item.type] - TYPE_ORDER[b.item.type]
    if (byType !== 0) return byType
    return a.item.label.length - b.item.label.length
  })

  return hits.slice(0, limit).map((h) => h.item)
}
