/* 抓取 src/data/sites.js 中所有站点的 favicon，
   保存到 src/assets/icons/，并重新生成 favicon-manifest.js
   用法：npm run fetch:favicons */
import { mkdir, writeFile } from 'node:fs/promises'
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
  return all.filter((s) => !seen.has(s.name) && seen.add(s.name))
}

const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

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
  if (contentType.includes('svg') || url.endsWith('.svg')) return 'svg'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg'
  if (contentType.includes('ico') || url.includes('.ico')) return 'ico'
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50) return 'png'
  return 'png'
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

const sites = collectSites()
await mkdir(ICONS_DIR, { recursive: true })

const entries = []
for (const site of sites) {
  try {
    const r = await grab(site)
    if (r) {
      const file = `favicon-${slug(site.name)}.${r.ext}`
      await writeFile(path.join(ICONS_DIR, file), r.buf)
      entries.push([site.name, `./${file}`])
      console.log(`ok  ${site.name} -> ${file} (${(r.buf.length / 1024).toFixed(1)} KB)`)
    } else {
      console.warn(`--  ${site.name}: 未找到 favicon，页面将使用占位图标`)
    }
  } catch (e) {
    console.warn(`--  ${site.name}: ${e.message}`)
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
