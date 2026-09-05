/* 抓取 src/data/sites.js 中所有站点的 favicon，
   保存到 src/assets/icons/，并重新生成 favicon-manifest.js
   用法：npm run fetch:favicons */
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { designSiteGroups, directoryGroups, pdfSites } from '../src/data/sites.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = path.join(__dirname, '../src/assets/icons')
const MANIFEST = path.join(ICONS_DIR, 'favicon-manifest.js')

const UA = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
}

function collectSites() {
  const all = [
    ...pdfSites,
    ...directoryGroups.flatMap((g) => g.sites),
    ...Object.values(designSiteGroups).flat()
  ]
  const seen = new Set()
  // 站点配置了 icon（emoji 图标）时不需要抓取 favicon
  return all.filter((s) => !s.icon && !seen.has(s.name) && seen.add(s.name))
}

// 按站点域名生成文件名（对中文 name 也更稳定，避免出现乱码文件名）
const slug = (site) => {
  try {
    return new URL(site.href)
      .hostname.replace(/^www\./, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
  } catch {
    return site.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }
}

async function fetchBuffer(url, timeoutMs = 12000) {
  const res = await fetch(url, {
    headers: UA,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

function extFrom(buf, url, contentType = '') {
  // 优先按真实字节魔数判断，避免「URL 以 .svg 结尾但内容其实是 JPEG/PNG」导致存错扩展名
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (
    buf.length > 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  ) return 'png'
  if (buf.length > 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return 'ico'
  if (buf.length > 2 && buf[0] === 0x42 && buf[1] === 0x4d) return 'bmp'
  const ascii6 = buf.slice(0, 6).toString('ascii')
  if (ascii6 === 'GIF89a' || ascii6 === 'GIF87a') return 'gif'
  const head = buf.slice(0, 16).toString('utf8').toLowerCase()
  if (
    contentType.includes('svg') ||
    url.toLowerCase().endsWith('.svg') ||
    head.startsWith('<?xml') ||
    head.startsWith('<svg')
  ) {
    return 'svg'
  }
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('ico') || url.toLowerCase().includes('.ico')) return 'ico'
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50) return 'png'
  // 兜底：非 png/ico 的内容（多为 xml/svg）按 svg 处理，浏览器 <img> 可正常显示
  return 'svg'
}

async function grab(site) {
  const origin = new URL(site.href).origin

  // 1) 首页 HTML 中的 <link rel="icon">（兼容带引号与不带引号属性）
  try {
    const html = (await fetchBuffer(origin)).toString('utf8')
    const linkTags = [...html.matchAll(/<link[^>]+>/gi)]
      .map((m) => m[0])
      .filter((t) => /rel=["']?[^"'\s>]*icon[^"'\s>]*["']?/i.test(t))
    for (const tag of linkTags.reverse()) {
      const href = tag.match(/href=["']?([^"'\s>]+)["']?/i)?.[1]
      if (!href) continue
      try {
        const url = new URL(href, origin).href
        const buf = await fetchBuffer(url)
        if (buf.length < 64) continue
        return { buf, ext: extFrom(buf, url) }
      } catch {}
    }
  } catch {}

  // 2) 兜底 /favicon.ico
  try {
    const url = origin + '/favicon.ico'
    const buf = await fetchBuffer(url)
    if (buf.length >= 64) return { buf, ext: extFrom(buf, url, 'image/x-icon') }
  } catch {}

  return null
}

// 读取现有清单：对本次无法抓到的站点，沿用已保存的图标，
// 避免丢失像「金山云文档」这种需手动补的图标
let prev = {}
try {
  const txt = await readFile(MANIFEST, 'utf8')
  for (const m of txt.matchAll(/'([^']+)':\s*new URL\('\.\/([^']+)'/g)) {
    prev[m[1]] = './' + m[2]
  }
} catch {}

const sites = collectSites()
await mkdir(ICONS_DIR, { recursive: true })

const entries = []
for (const site of sites) {
  // 已抓取过且本地图标文件仍在：直接沿用，不再重复下载
  if (prev[site.name]) {
    const existing = path.join(ICONS_DIR, path.basename(prev[site.name]))
    try {
      await stat(existing)
      entries.push([site.name, prev[site.name]])
      console.log(`==  ${site.name}: 已存在，跳过`)
      continue
    } catch {}
  }
  try {
    const r = await grab(site)
    if (r) {
      const file = `favicon-${slug(site)}.${r.ext}`
      await writeFile(path.join(ICONS_DIR, file), r.buf)
      entries.push([site.name, `./${file}`])
      console.log(`ok  ${site.name} -> ${file} (${(r.buf.length / 1024).toFixed(1)} KB)`)
    } else if (prev[site.name]) {
      entries.push([site.name, prev[site.name]])
      console.log(`~~  ${site.name}: 未抓到，沿用已有图标 ${prev[site.name]}`)
    } else {
      console.warn(`--  ${site.name}: 未找到 favicon，页面将使用占位图标`)
    }
  } catch (e) {
    if (prev[site.name]) {
      entries.push([site.name, prev[site.name]])
      console.log(`~~  ${site.name}: 抓取出错，沿用已有图标 ${prev[site.name]}`)
    } else {
      console.warn(`--  ${site.name}: ${e.message}`)
    }
  }
}

const lines = entries.map(([n, f]) => `  '${n}': new URL('${f}', import.meta.url).href,`)
const content = `/* 自动生成 by scripts/fetch-favicons.mjs — 请勿手动编辑
   运行 npm run fetch:favicons 重新抓取并更新本清单 */
export const favicons = {
${lines.join('\n')}
}
`
await writeFile(MANIFEST, content, 'utf8')
console.log(`\n完成：${entries.length}/${sites.length} 个图标已保存，favicon-manifest.js 已更新。`)
