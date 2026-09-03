import JSZip from 'jszip'

/**
 * .docx 页面提取引擎（纯前端，无后端）
 *
 * 1. 解压 docx，解析 word/document.xml，把 w:body 拆成「块」（段落 / 表格 / 表格行）。
 * 2. 优先采用文档里的真实分页线索：w:br@w:type=page（手动分页符）、
 *    w:lastRenderedPageBreak（Word 上次渲染的分页位置）、非连续分节符。
 * 3. 线索不足时，用离屏 DOM 按节的页面宽度真实排版每个块量出高度，
 *    再按页面内容高度贪心切页 —— 换行、字号、缩进、表格行高全部交给浏览器算。
 * 4. 导出时整体复用原始压缩包，只重写 word/document.xml，
 *    样式、编号、图片关系、页眉页脚都原样保留。
 */

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const TWIP = 96 / 1440 // 1 twip = 1/1440 英寸
const EMU = 96 / 914400 // 1 EMU = 1/914400 英寸
const DEFAULT_HALF_PT = 21 // 五号 = 10.5pt
const CJK_RE = /[⺀-鿿　-〿＀-￯豈-﫿]/

/* ---------------- XML 基础工具 ---------------- */

const ln = (n) => n.localName || String(n.nodeName || '').split(':').pop()

function childEls(el) {
  const out = []
  if (!el) return out
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1) out.push(n)
  return out
}

const isEl = (n, name, ns) => !!n && n.nodeType === 1 && ln(n) === name && (!ns || n.namespaceURI === ns)

/** 直接子元素 */
const kids = (el, name, ns = W) => childEls(el).filter((c) => isEl(c, name, ns))
const kid = (el, name, ns = W) => kids(el, name, ns)[0] ?? null
/** 只看本地名、忽略命名空间（DrawingML / VML 用） */
const kidsL = (el, name) => childEls(el).filter((c) => ln(c) === name)
const kidL = (el, name) => kidsL(el, name)[0] ?? null

function findAll(root, name, ns = W) {
  const out = []
  const walk = (node) => {
    for (const c of childEls(node)) {
      if (isEl(c, name, ns)) out.push(c)
      walk(c)
    }
  }
  walk(root)
  return out
}

function findAllL(root, name) {
  const out = []
  const walk = (node) => {
    for (const c of childEls(node)) {
      if (ln(c) === name) out.push(c)
      walk(c)
    }
  }
  walk(root)
  return out
}

function a(el, name) {
  if (!el) return null
  return el.getAttribute('w:' + name) ?? el.getAttribute(name) ?? el.getAttributeNS(W, name)
}

function numOr(el, name) {
  const v = a(el, name)
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const rawAttr = (el, name) => (el ? el.getAttribute(name) : null)

const tw = (v) => (Number(v) || 0) * TWIP
const halfPtPx = (v) => ((Number(v) || 0) / 2) * (96 / 72)

function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (!doc || !doc.documentElement || ln(doc.documentElement) === 'parsererror') {
    throw new Error('XML 解析失败')
  }
  return doc
}

/* ---------------- 离屏量高容器 ---------------- */

class Measurer {
  constructor() {
    this.host = document.createElement('div')
    this.host.setAttribute('aria-hidden', 'true')
    this.host.style.cssText =
      'position:absolute;left:-99999px;top:0;width:3000px;visibility:hidden;pointer-events:none;z-index:-1;'
    document.body.appendChild(this.host)
    this.queue = []
    this.heights = new Map()
  }

  add(node) {
    this.queue.push(node)
    return node
  }

  /** 批量插入 + 单次读取，避免逐块触发重排 */
  flush() {
    if (!this.queue.length) return
    const nodes = this.queue
    this.queue = []
    const frag = document.createDocumentFragment()
    for (const n of nodes) frag.appendChild(n)
    this.host.appendChild(frag)
    void this.host.offsetHeight
    for (const n of nodes) this.heights.set(n, n.getBoundingClientRect().height)
    this.host.textContent = ''
  }

  /** 需要高度时才触发一次 flush，保证前后依赖的顺序正确 */
  heightOf(node) {
    if (!node) return 0
    if (!this.heights.has(node)) this.flush()
    return this.heights.get(node) ?? 0
  }

  destroy() {
    this.host.remove()
    this.heights.clear()
    this.queue = []
  }
}

/* ---------------- 样式解析 ---------------- */

function buildStyleEngine(stylesXml) {
  const map = new Map()
  let defPPr = null
  let defRPr = null

  if (stylesXml) {
    let doc = null
    try {
      doc = parseXml(stylesXml)
    } catch (e) {
      doc = null
    }
    if (doc) {
      const root = doc.documentElement
      const dd = kid(root, 'docDefaults')
      if (dd) {
        const rpd = kid(dd, 'rPrDefault')
        if (rpd) defRPr = kid(rpd, 'rPr')
        const ppd = kid(dd, 'pPrDefault')
        if (ppd) defPPr = kid(ppd, 'pPr')
      }
      for (const st of kids(root, 'style')) {
        const id = a(st, 'styleId')
        if (!id) continue
        const basedOnEl = kid(st, 'basedOn')
        map.set(id, {
          pPr: kid(st, 'pPr'),
          rPr: kid(st, 'rPr'),
          basedOn: basedOnEl ? a(basedOnEl, 'val') : null
        })
      }
    }
  }

  function chain(id) {
    const out = []
    const seen = new Set()
    let cur = id
    while (cur && !seen.has(cur)) {
      seen.add(cur)
      const st = map.get(cur)
      if (!st) break
      out.push(st)
      cur = st.basedOn
    }
    return out
  }

  return { chain, defPPr, defRPr }
}

function firstEl(sources, name) {
  for (const s of sources) {
    if (!s) continue
    const e = kid(s, name) ?? findAll(s, name)[0] ?? null
    if (e) return e
  }
  return null
}

/* ---------------- 文本 ---------------- */

function runText(rEl) {
  let s = ''
  for (const c of childEls(rEl)) {
    const name = ln(c)
    if (name === 't') s += c.textContent
    else if (name === 'tab') s += '\t'
    else if (name === 'br' || name === 'cr') s += '\n'
    else if (name === 'noBreakHyphen') s += '-'
    else if (name === 'instrText' || name === 'delText' || name === 'softHyphen') continue
  }
  return s
}

/** 收集参与正文排版的 run（跳过文本框，避免把浮动内容算进正文高度） */
function collectRuns(root) {
  const out = []
  const walk = (node) => {
    for (const c of childEls(node)) {
      const name = ln(c)
      if (name === 'txbxContent' || name === 'textbox') continue
      if (isEl(c, 'r', W)) {
        out.push(c)
        continue
      }
      walk(c)
    }
  }
  walk(root)
  return out
}

function elementText(el) {
  let s = ''
  for (const t of findAll(el, 't')) s += t.textContent
  return s.replace(/\s+/g, ' ').trim()
}

/* ---------------- 图形高度 ---------------- */

function vmlHeight(root) {
  let h = 0
  const walk = (node) => {
    for (const c of childEls(node)) {
      const style = rawAttr(c, 'style')
      if (style) {
        const m = /height:\s*([\d.]+)\s*(pt|px|in|cm|mm|em)?/i.exec(style)
        if (m) {
          const v = parseFloat(m[1])
          const unit = (m[2] || 'pt').toLowerCase()
          const px =
            unit === 'pt'
              ? v * (96 / 72)
              : unit === 'px'
                ? v
                : unit === 'in'
                  ? v * 96
                  : unit === 'cm'
                    ? (v * 96) / 2.54
                    : unit === 'mm'
                      ? (v * 96) / 25.4
                      : v * 16
          if (Number.isFinite(px)) h = Math.max(h, px)
        }
      }
      walk(c)
    }
  }
  walk(root)
  return h
}

function hasGraphic(root) {
  let found = false
  const walk = (node) => {
    if (found) return
    for (const c of childEls(node)) {
      const l = ln(c)
      if (l === 'drawing' || l === 'pict' || l === 'shape' || l === 'object') {
        found = true
        return
      }
      walk(c)
      if (found) return
    }
  }
  walk(root)
  return found
}

function drawingHeight(root) {
  if (!root || !hasGraphic(root)) return 0
  let h = 0
  for (const d of findAllL(root, 'drawing')) {
    const inline = kidL(d, 'inline')
    const anchor = kidL(d, 'anchor')
    if (!inline && anchor) {
      // 浮动图片：四周型 / 紧密型 / 穿越型环绕不占正文高度
      const wrapped = ['wrapSquare', 'wrapTight', 'wrapThrough'].some((n) => kidL(anchor, n))
      if (wrapped) continue
    }
    const holder = inline ?? anchor
    const extent = holder ? kidL(holder, 'extent') : null
    const cy = Number(rawAttr(extent, 'cy') || 0)
    if (cy) h = Math.max(h, cy * EMU)
  }
  if (findAllL(root, 'pict').length || findAllL(root, 'shape').length) h = Math.max(h, vmlHeight(root))
  return h
}

/* ---------------- 节的页面尺寸 ---------------- */

function sectionMetrics(sectPr) {
  let pw = 11906
  let ph = 16838
  const pgSz = sectPr ? kid(sectPr, 'pgSz') : null
  if (pgSz) {
    pw = numOr(pgSz, 'w') || pw
    ph = numOr(pgSz, 'h') || ph
  }
  // Word 2013+ 默认模板：上下 1 英寸、左右 1.25 英寸
  let top = 1440
  let bottom = 1440
  let left = 1800
  let right = 1800
  const mar = kid(sectPr, 'pgMar')
  if (mar) {
    top = numOr(mar, 'top') ?? top
    bottom = numOr(mar, 'bottom') ?? bottom
    left = numOr(mar, 'left') ?? left
    right = numOr(mar, 'right') ?? right
  }
  let cols = 1
  let colSpace = 0
  const colsEl = kid(sectPr, 'cols')
  if (colsEl) {
    cols = Math.max(1, numOr(colsEl, 'num') || 1)
    colSpace = tw(numOr(colsEl, 'space') || 0)
  }
  const usableW = Math.max(40, tw(pw) - tw(left) - tw(right) - colSpace * (cols - 1))
  return {
    contentW: usableW / cols,
    contentH: Math.max(40, tw(ph) - tw(top) - tw(bottom)),
    cols
  }
}

const DEFAULT_METRICS = sectionMetrics(null)

/* ---------------- 段落量高 ---------------- */

function fontFamilyOf(sources, text) {
  const fonts = firstEl(sources, 'rFonts')
  if (!fonts) return 'inherit'
  const ascii = rawAttr(fonts, 'w:ascii') ?? a(fonts, 'ascii')
  const eastAsia = rawAttr(fonts, 'w:eastAsia') ?? a(fonts, 'eastAsia')
  const hAnsi = rawAttr(fonts, 'w:hAnsi') ?? a(fonts, 'hAnsi')
  const cs = rawAttr(fonts, 'w:cs') ?? a(fonts, 'cs')
  const primary = CJK_RE.test(text) ? eastAsia || ascii || hAnsi : ascii || hAnsi || eastAsia
  const uniq = [...new Set([primary, eastAsia, ascii, hAnsi, cs].filter(Boolean))]
  if (!uniq.length) return 'inherit'
  return uniq.map((f) => `"${String(f).replace(/"/g, '')}"`).join(',')
}

function collectRunsFromItems(items) {
  const out = []
  for (const it of items) {
    if (isEl(it, 'r', W)) out.push(it)
    else for (const r of collectRuns(it)) out.push(r)
  }
  return out
}

function runLayout(rEl, ctx, paraRSources) {
  const rPr = kid(rEl, 'rPr')
  const rsId = rPr ? a(kid(rPr, 'rStyle'), 'val') : null
  const rChain = rsId ? ctx.styles.chain(rsId) : []
  const sources = [rPr, ...rChain.map((s) => s.rPr), ...paraRSources].filter(Boolean)

  const sz =
    numOr(firstEl(sources, 'sz'), 'val') ??
    numOr(firstEl(sources, 'szCs'), 'val') ??
    DEFAULT_HALF_PT
  const sizePx = halfPtPx(sz || DEFAULT_HALF_PT) || halfPtPx(DEFAULT_HALF_PT)

  const bEl = firstEl(sources, 'b')
  const iEl = firstEl(sources, 'i')
  const flag = (el) => {
    if (!el) return false
    const v = a(el, 'val') ?? '1'
    return v !== '0' && v !== 'false' && v !== 'off'
  }

  const text = runText(rEl)
  const spEl = firstEl(sources, 'spacing')
  let letterSpacing = tw(numOr(spEl, 'val') || 0)
  const scale = numOr(firstEl(sources, 'w'), 'val')
  if (scale && scale !== 100) letterSpacing += sizePx * (scale / 100 - 1)

  return {
    sizePx,
    bold: flag(bEl),
    italic: flag(iEl),
    uppercase: !!firstEl(sources, 'caps'),
    text,
    fontFamily: fontFamilyOf(sources, text),
    letterSpacing,
    imagePx: hasGraphic(rEl) ? drawingHeight(rEl) : 0
  }
}

/** 生成一个用于量高的 div；items 为空表示整段，否则只量指定片段 */
function buildParaNode(pEl, ctx, widthPx, items) {
  const pPr = kid(pEl, 'pPr')
  const styleId = pPr ? a(kid(pPr, 'pStyle'), 'val') : null
  const chain = styleId ? ctx.styles.chain(styleId) : []
  const pSources = [pPr, ...chain.map((s) => s.pPr), ctx.styles.defPPr].filter(Boolean)
  const rSources = [pPr ? kid(pPr, 'rPr') : null, ...chain.map((s) => s.rPr), ctx.styles.defRPr].filter(
    Boolean
  )

  const sourceItems = items ?? childEls(pEl).filter((c) => !isEl(c, 'pPr', W))
  const runs = collectRunsFromItems(sourceItems)

  let basePx = 0
  const infos = runs.map((rEl) => {
    const info = runLayout(rEl, ctx, rSources)
    if (info.sizePx > basePx) basePx = info.sizePx
    return info
  })
  if (!basePx) basePx = halfPtPx(DEFAULT_HALF_PT)

  const spEl = firstEl(pSources, 'spacing')
  const lineRule = spEl ? a(spEl, 'lineRule') : null
  const lineVal = numOr(spEl, 'line')
  let linePx
  if (lineVal != null && lineRule === 'exact') linePx = tw(lineVal)
  else if (lineVal != null && lineRule === 'atLeast') linePx = Math.max(tw(lineVal), basePx * 1.2)
  else if (lineVal != null) linePx = (lineVal / 240) * basePx
  else linePx = basePx * 1.2
  linePx = Math.max(4, linePx)

  let before = 0
  let after = 0
  if (spEl) {
    const bTw = numOr(spEl, 'before')
    const aTw = numOr(spEl, 'after')
    const bLines = numOr(spEl, 'beforeLines')
    const aLines = numOr(spEl, 'afterLines')
    before = bTw != null ? tw(bTw) : ((bLines || 0) / 100) * linePx
    after = aTw != null ? tw(aTw) : ((aLines || 0) / 100) * linePx
  }

  const indEl = firstEl(pSources, 'ind')
  const indLeft = tw(numOr(indEl, 'left') || 0)
  const indRight = tw(numOr(indEl, 'right') || 0)
  const firstLine = tw(numOr(indEl, 'firstLine') || 0)
  const hanging = tw(numOr(indEl, 'hanging') || 0)
  const jc = a(firstEl(pSources, 'jc'), 'val')

  const div = document.createElement('div')
  div.style.cssText =
    'box-sizing:content-box;margin:0;padding:0;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;'
  div.style.width = `${Math.max(20, widthPx - indLeft - indRight)}px`
  div.style.lineHeight = `${linePx}px`
  div.style.textIndent = `${firstLine - hanging}px`
  if (jc === 'center') div.style.textAlign = 'center'
  else if (jc === 'right') div.style.textAlign = 'right'
  else if (jc === 'both' || jc === 'distribute') div.style.textAlign = 'justify'

  for (const info of infos) {
    if (!info.text) continue
    const span = document.createElement('span')
    span.style.fontSize = `${info.sizePx}px`
    span.style.fontWeight = info.bold ? '700' : '400'
    span.style.fontStyle = info.italic ? 'italic' : 'normal'
    span.style.fontFamily = info.fontFamily
    if (info.uppercase) span.style.textTransform = 'uppercase'
    if (info.letterSpacing) span.style.letterSpacing = `${info.letterSpacing}px`
    span.textContent = info.text
    div.appendChild(span)
  }
  if (!div.textContent) div.appendChild(document.createTextNode('​'))

  return { node: ctx.measurer.add(div), before, after }
}

/* ---------------- 分页符拆分 ---------------- */

const isPageBreak = (brEl) => (a(brEl, 'type') || '').toLowerCase() === 'page'

function containsBreak(el) {
  if (findAll(el, 'lastRenderedPageBreak').length) return true
  return findAll(el, 'br').some(isPageBreak)
}

/** 按内部分页符拆分一个 w:r；返回数组，null 表示一个分页点，undefined 表示空片段 */
function splitRunAtBreaks(rEl) {
  const parts = []
  let buf = []
  let sawBreak = false

  for (const c of childEls(rEl)) {
    if ((isEl(c, 'br', W) && isPageBreak(c)) || isEl(c, 'lastRenderedPageBreak', W)) {
      sawBreak = true
      parts.push({ nodes: buf })
      buf = []
      parts.push(null)
      continue
    }
    buf.push(c)
  }
  parts.push({ nodes: buf })
  if (!sawBreak) return null

  return parts.map((p) => {
    if (p === null) return null
    if (!p.nodes.length) return undefined
    const clone = rEl.cloneNode(false)
    for (const n of p.nodes) clone.appendChild(n.cloneNode(true))
    return clone
  })
}

/**
 * 分析段落：segments 为按分页符切开的片段；无分页符时为 null
 * @returns {{ sectPr: Element|null, segments: Array<Array<Element>>|null, breakCount: number }}
 */
function analyzeParagraph(pEl) {
  const pPr = kid(pEl, 'pPr')
  const sectPr = pPr ? kid(pPr, 'sectPr') : null
  const items = childEls(pEl).filter((c) => !isEl(c, 'pPr', W))

  const segments = [[]]
  let breakCount = 0

  for (const it of items) {
    if (!isEl(it, 'r', W)) {
      if (containsBreak(it)) {
        breakCount++
        segments.push([])
      }
      segments[segments.length - 1].push(it)
      continue
    }
    const parts = splitRunAtBreaks(it)
    if (!parts) {
      segments[segments.length - 1].push(it)
      continue
    }
    for (const p of parts) {
      if (p === null) {
        breakCount++
        segments.push([])
      } else if (p) {
        segments[segments.length - 1].push(p)
      }
    }
  }

  return { sectPr, segments: breakCount ? segments : null, breakCount }
}

/* ---------------- 表格 ---------------- */

const DEFAULT_CELL_MAR = { top: 0, bottom: 0, left: tw(108), right: tw(108) }

function cellMargins(tcPr) {
  const mar = tcPr ? kid(tcPr, 'tcMar') : null
  if (!mar) return DEFAULT_CELL_MAR
  const read = (tag, def) => {
    const el = kid(mar, tag)
    const v = numOr(el, 'w')
    return v == null ? def : tw(v)
  }
  return {
    top: read('top', DEFAULT_CELL_MAR.top),
    bottom: read('bottom', DEFAULT_CELL_MAR.bottom),
    left: read('left', DEFAULT_CELL_MAR.left),
    right: read('right', DEFAULT_CELL_MAR.right)
  }
}

function tableRows(tblEl, ctx, availWidthPx) {
  const tblPr = kid(tblEl, 'tblPr')
  const grid = kids(kid(tblEl, 'tblGrid') ?? tblEl, 'gridCol').map((c) => tw(numOr(c, 'w') || 0))
  const indent = tw(numOr(kid(tblPr, 'tblInd'), 'w') || 0)
  const usable = Math.max(40, availWidthPx - indent)

  const sum = grid.reduce((x, y) => x + y, 0)
  const tblWEl = kid(tblPr, 'tblW')
  let tableWidthPx
  if (tblWEl) {
    const type = a(tblWEl, 'type')
    const v = numOr(tblWEl, 'w') || 0
    if (type === 'pct') tableWidthPx = (usable * v) / 5000
    else if (type === 'dxa') tableWidthPx = tw(v)
    else tableWidthPx = tw(sum)
  } else {
    tableWidthPx = tw(sum)
  }
  if (!tableWidthPx) tableWidthPx = tw(sum) || usable

  const scale = tableWidthPx / (tw(sum) || 1)
  const colWidths = grid.map((w) => Math.max(0, w * scale))
  if (!colWidths.length) colWidths.push(tableWidthPx)

  const rows = kids(tblEl, 'tr')
  const out = []

  for (const tr of rows) {
    const trPr = kid(tr, 'trPr')
    const hEl = trPr ? kid(trPr, 'trHeight') : null
    const hRule = a(hEl, 'hRule')
    const hVal = tw(numOr(hEl, 'val') || 0)

    let rowH = 0
    let colIdx = 0
    const cells = kids(tr, 'tc')
    for (const tc of cells) {
      const tcPr = kid(tc, 'tcPr')
      const span = Math.max(1, numOr(kid(tcPr, 'gridSpan'), 'val') || 1)
      let cellW = 0
      for (let k = 0; k < span; k++) cellW += colWidths[colIdx + k] ?? 0
      colIdx += span
      if (!cellW) cellW = tw(numOr(kid(tcPr, 'tcW'), 'w') || 0) || usable / Math.max(1, cells.length)

      const mar = cellMargins(tcPr)
      const inner = Math.max(10, cellW - mar.left - mar.right)
      let cellH = mar.top + mar.bottom
      const pending = []
      for (const p of kids(tc, 'p')) {
        const m = buildParaNode(p, ctx, inner, null)
        pending.push(m)
      }
      for (const m of pending) cellH += ctx.measurer.heightOf(m.node) + m.before + m.after
      rowH = Math.max(rowH, cellH)
    }

    if (hRule === 'exact' && hVal) rowH = hVal
    else if (hRule === 'atLeast') rowH = Math.max(rowH, hVal)
    else rowH = Math.max(rowH, 0)

    out.push({ tr, height: rowH, text: elementText(tr) })
  }

  return out
}

/* ---------------- 块构建 ---------------- */

function makeBlock(base) {
  return {
    kind: 'node',
    height: 0,
    forceBreak: false,
    sectionIndex: 0,
    text: '',
    extras: [],
    skip: false,
    ...base
  }
}

function buildBlocks(bodyEl, ctx) {
  const blocks = []
  const sections = []

  // 节属性顺序：各段落内的 sectPr（按出现顺序）+ body 末尾的 sectPr（最后一节）
  const sectionEls = []
  for (const el of childEls(bodyEl)) {
    if (!isEl(el, 'p', W)) continue
    const pPr = kid(el, 'pPr')
    const sp = pPr ? kid(pPr, 'sectPr') : null
    if (sp) sectionEls.push(sp)
  }
  sectionEls.push(kid(bodyEl, 'sectPr'))
  for (const sp of sectionEls) {
    sections.push({ sectPr: sp, ...(sp ? sectionMetrics(sp) : { ...DEFAULT_METRICS }) })
  }

  let secIdx = 0
  let pending = []
  let pendingSecBreak = false

  const flushPending = () => {
    if (!pending.length) return []
    const out = pending
    pending = []
    return out
  }

  const push = (block) => {
    if (pendingSecBreak) {
      block.forceBreak = true
      pendingSecBreak = false
    }
    blocks.push(makeBlock(block))
  }

  for (const el of childEls(bodyEl)) {
    if (isEl(el, 'sectPr', W)) continue

    if (isEl(el, 'p', W)) {
      const info = analyzeParagraph(el)
      const sec = sections[secIdx] ?? { ...DEFAULT_METRICS }

      if (!info.segments) {
        const m = buildParaNode(el, ctx, sec.contentW, null)
        push({
          kind: 'p',
          el,
          sectionIndex: secIdx,
          forceBreak: info.breakCount > 0,
          text: elementText(el),
          measure: { node: m.node, before: m.before, after: m.after, imgPx: 0 },
          imgPx: drawingHeight(el),
          extras: flushPending()
        })
      } else {
        const multi = info.segments.length > 1
        info.segments.forEach((seg, i) => {
          if (multi && !seg.length) {
            push({
              kind: 'p',
              el,
              segNodes: [],
              skip: true,
              sectionIndex: secIdx,
              forceBreak: i > 0,
              extras: i === 0 ? flushPending() : []
            })
            return
          }
          const m = buildParaNode(el, ctx, sec.contentW, seg)
          push({
            kind: 'p',
            el,
            segNodes: seg,
            sectionIndex: secIdx,
            forceBreak: i > 0,
            text: seg.reduce((s, n) => s + elementText(n), ''),
            measure: { node: m.node, before: m.before, after: m.after, imgPx: 0 },
            imgPx: seg.reduce((h, n) => Math.max(h, drawingHeight(n)), 0),
            extras: i === 0 ? flushPending() : []
          })
        })
      }

      if (info.sectPr) {
        const type = a(kid(info.sectPr, 'type'), 'val') || 'nextPage'
        if (type !== 'continuous') pendingSecBreak = true
        secIdx++
      }
      continue
    }

    if (isEl(el, 'tbl', W)) {
      const sec = sections[secIdx] ?? { ...DEFAULT_METRICS }
      const rows = tableRows(el, ctx, sec.contentW)
      const total = rows.reduce((n, r) => n + r.height, 0)
      const capacity = sec.contentH * Math.max(1, sec.cols || 1)
      if (total > capacity && rows.length > 1) {
        // 超高表格按行切块，允许跨页
        for (const r of rows) {
          push({ kind: 'row', tbl: el, tr: r.tr, height: r.height, sectionIndex: secIdx, text: r.text, extras: flushPending() })
        }
      } else {
        push({ kind: 'tbl', el, height: total, sectionIndex: secIdx, text: elementText(el), extras: flushPending() })
      }
      continue
    }

    if (isEl(el, 'sdt', W)) {
      const sec = sections[secIdx] ?? { ...DEFAULT_METRICS }
      const content = kid(el, 'sdtContent')
      let height = 0
      if (content) {
        for (const c of childEls(content)) {
          if (isEl(c, 'p', W)) {
            const m = buildParaNode(c, ctx, sec.contentW, null)
            height += ctx.measurer.heightOf(m.node) + m.before + m.after
          } else if (isEl(c, 'tbl', W)) {
            height += tableRows(c, ctx, sec.contentW).reduce((n, r) => n + r.height, 0)
          }
        }
      }
      push({ kind: 'node', el, height, sectionIndex: secIdx, text: elementText(el), extras: flushPending() })
      continue
    }

    pending.push(el)
  }

  if (pending.length) {
    const last = blocks[blocks.length - 1]
    if (last) last.extras.push(...pending)
    else blocks.push(makeBlock({ kind: 'node', el: null, skip: true, extras: pending }))
  }

  // 汇总高度（此时所有量高节点都已完成测量）
  for (const b of blocks) {
    if (!b.measure) continue
    const textH = ctx.measurer.heightOf(b.measure.node)
    b.height = Math.max(textH, b.imgPx || 0) + b.measure.before + b.measure.after
    b.measure = null
  }

  return { blocks, sections }
}

/* ---------------- 导出：重建 document.xml ---------------- */

function cleanClone(doc, src) {
  const clone = doc.importNode(src, true)
  for (const br of findAll(clone, 'br')) if (isPageBreak(br)) br.remove()
  for (const l of findAll(clone, 'lastRenderedPageBreak')) l.remove()
  for (const sp of findAll(clone, 'sectPr')) sp.remove()
  return clone
}

function makeSegmentParagraph(doc, srcP, segNodes) {
  const p = doc.createElementNS(W, 'w:p')
  const pPr = kid(srcP, 'pPr')
  if (pPr) p.appendChild(doc.importNode(pPr, true))
  for (const n of segNodes) p.appendChild(doc.importNode(n, true))
  return p
}

function rebuildDocument(workDoc, blocks, sections, selected) {
  const body = findAll(workDoc.documentElement, 'body')[0] ?? workDoc.documentElement
  while (body.firstChild) body.removeChild(body.firstChild)

  let lastTable = null
  let lastTableSrc = null
  let firstSecIdx = null

  const sorted = [...new Set(selected)].sort((x, y) => x - y)

  for (const i of sorted) {
    const b = blocks[i]
    if (!b) continue
    if (firstSecIdx === null && !b.skip) firstSecIdx = b.sectionIndex

    for (const e of b.extras) {
      if (e) body.appendChild(workDoc.importNode(e, true))
    }

    if (b.skip || (!b.el && !b.tr)) {
      lastTable = null
      lastTableSrc = null
      continue
    }

    if (b.kind === 'row') {
      if (lastTableSrc !== b.tbl) {
        const t = b.tbl.cloneNode(true)
        for (const tr of findAll(t, 'tr')) tr.remove()
        body.appendChild(cleanClone(workDoc, t))
        lastTable = body.lastChild
        lastTableSrc = b.tbl
      }
      if (lastTable) lastTable.appendChild(cleanClone(workDoc, b.tr))
      continue
    }

    lastTable = null
    lastTableSrc = null

    if (b.kind === 'p' && b.segNodes) {
      body.appendChild(cleanClone(workDoc, makeSegmentParagraph(workDoc, b.el, b.segNodes)))
    } else {
      body.appendChild(cleanClone(workDoc, b.el))
    }
  }

  const secIdx = firstSecIdx ?? 0
  const sectPr = sections[secIdx]?.sectPr ?? sections[sections.length - 1]?.sectPr
  if (sectPr) body.appendChild(workDoc.importNode(sectPr, true))

  const xml = new XMLSerializer().serializeToString(workDoc)
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + xml
}

/* ---------------- 对外入口 ---------------- */

/**
 * 载入 .docx，返回可供分页 / 导出的模型
 * @returns {Promise<{ kind:'docx', blocks: Array, sections: Array, build: Function, destroy: Function }>}
 */
export async function loadDocxModel(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('不是有效的 .docx 文件（缺少 word/document.xml）')

  const rawDocXml = await docFile.async('string')
  let stylesXml = null
  const stylesFile = zip.file('word/styles.xml')
  if (stylesFile) {
    try {
      stylesXml = await stylesFile.async('string')
    } catch (e) {
      stylesXml = null
    }
  }

  const xmlDoc = parseXml(rawDocXml)
  const styles = buildStyleEngine(stylesXml)
  const measurer = new Measurer()
  const ctx = { styles, measurer }

  const body = findAll(xmlDoc.documentElement, 'body')[0]
  if (!body) {
    measurer.destroy()
    throw new Error('document.xml 缺少 w:body')
  }

  const { blocks, sections } = buildBlocks(body, ctx)

  return {
    kind: 'docx',
    blocks,
    sections,
    destroy() {
      measurer.destroy()
    },
    async build(selected, outName) {
      const workDoc = parseXml(rawDocXml)
      const xml = rebuildDocument(workDoc, blocks, sections, selected)
      zip.file('word/document.xml', xml)
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE'
      })
      return { name: outName, url: URL.createObjectURL(blob) }
    }
  }
}
