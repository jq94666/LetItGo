// 按色相把颜色归类为「色阶/色系」，用于色卡类工具按色相组织的展示。
// 无彩色（灰/黑/白）归入 neutral。

export const FAMILIES = [
  { key: 'red', zh: '红', en: 'Red' },
  { key: 'redOrange', zh: '红橙', en: 'Red-Orange' },
  { key: 'orange', zh: '橙', en: 'Orange' },
  { key: 'brown', zh: '棕', en: 'Brown' },
  { key: 'yellow', zh: '黄', en: 'Yellow' },
  { key: 'yellowGreen', zh: '黄绿', en: 'Yellow-Green' },
  { key: 'green', zh: '绿', en: 'Green' },
  { key: 'cyan', zh: '青', en: 'Blue-Green' },
  { key: 'blue', zh: '蓝', en: 'Blue' },
  { key: 'blueViolet', zh: '蓝紫', en: 'Blue-Violet' },
  { key: 'purple', zh: '紫', en: 'Purple' },
  { key: 'magenta', zh: '品红', en: 'Magenta/Pink' },
  { key: 'neutral', zh: '灰', en: 'Neutral' }
]

export const familyByKey = Object.fromEntries(FAMILIES.map((f) => [f.key, f]))

function parseRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

/** hex -> { h, s, l }（h 0~360，s/l 0~1） */
export function hexToHsl(hex) {
  const p = parseRgb(hex)
  if (!p) return { h: 0, s: 0, l: 0 }
  const { r, g, b } = p
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / d + 2) * 60
  else h = ((r - g) / d + 4) * 60
  return { h, s, l }
}

/** 返回 colorFamily 中的 key */
export function classifyFamily(hex) {
  const { h, s, l } = hexToHsl(hex)
  if (s < 0.12 || l < 0.06 || l > 0.94) return 'neutral'

  if (h >= 345 || h < 10) return 'red'
  if (h < 24) return 'redOrange'
  // 较暗的暖色（橙黄区间低明度）归为棕色
  if (l < 0.5 && h < 56) return 'brown'
  if (h < 46) return 'orange'
  if (h < 70) return 'yellow'
  if (h < 85) return 'yellowGreen'
  if (h < 165) return 'green'
  if (h < 200) return 'cyan'
  if (h < 250) return 'blue'
  if (h < 285) return 'blueViolet'
  if (h < 305) return 'purple'
  return 'magenta'
}
