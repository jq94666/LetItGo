// 页码表达式解析：支持「1,3,5-9」「1、3、5~9」「8-」「all」等写法
const ALL_WORDS = /^(all|全部|\*)$/i

function allPages(total) {
  return Array.from({ length: total }, (_, i) => i + 1)
}

/**
 * @param {string} input 用户输入的页码表达式
 * @param {number} total 文档总页数
 * @returns {{ pages: number[], invalid: string[], error: string | null }}
 */
export function parsePageSpec(input, total) {
  if (!total) return { pages: [], invalid: [], error: null }

  const raw = String(input ?? '').trim()
  if (!raw) return { pages: [], invalid: [], error: null }

  const normalized = raw
    .replace(/[，、；;|]+/g, ',')
    .replace(/\s+/g, '')
    .replace(/[~–—−]+/g, '-')
    .replace(/\.\.+/g, '-')

  if (ALL_WORDS.test(normalized)) return { pages: allPages(total), invalid: [], error: null }

  const set = new Set()
  const invalid = []

  for (const part of normalized.split(',')) {
    if (!part) continue
    const m = /^(\d+)(?:-(\d*))?$/.exec(part)
    if (!m) {
      invalid.push(part)
      continue
    }
    let start = Number(m[1])
    // 「8-」表示从第 8 页到最后
    let end = m[2] === undefined ? start : m[2] === '' ? total : Number(m[2])
    if (start > end) [start, end] = [end, start]
    if (end < 1 || start > total) {
      invalid.push(part)
      continue
    }
    start = Math.max(1, start)
    end = Math.min(total, end)
    for (let p = start; p <= end; p++) set.add(p)
  }

  const pages = Array.from(set).sort((x, y) => x - y)
  return {
    pages,
    invalid,
    error: invalid.length
      ? `无法识别或超出范围的页码：${invalid.join('、')}（共 ${total} 页）`
      : null
  }
}

/** 把页码列表压缩成易读的连续区间，如 1,2,3,7 → 1-3,7 */
export function formatPageRanges(pages) {
  if (!pages.length) return ''
  const sorted = [...new Set(pages)].sort((a, b) => a - b)
  const out = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const p = sorted[i]
    if (p === prev + 1) {
      prev = p
      continue
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = p
    prev = p
  }
  out.push(start === prev ? `${start}` : `${start}-${prev}`)
  return out.join(',')
}
