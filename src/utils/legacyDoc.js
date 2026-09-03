import { Document, Packer, Paragraph, TextRun } from 'docx'

/**
 * 旧版 .doc（Word 97-2003）尽力解析
 *
 * 二进制格式没有段落字号 / 行距等排版信息可供前端直接使用，完整还原需要解析
 * PAPX / CHPX / 样式表，代价过大。这里采取「够用」策略：
 *  1. 解析 OLE 复合文档（CFB）→ WordDocument 流与 0Table/1Table 流
 *  2. 读 FIB → CLX → piece table，还原正文文本（Word 只会把纯 ASCII 片段压缩成 8 位，
 *     中文通常以 UTF-16 片段存放，因此中文文档基本可完整还原）
 *  3. \f（0x0C / 0x0E）视为分页符；其余按默认五号宋体在离屏 DOM 里量高估算分页
 *  4. 导出为 .docx
 *
 * 准确度不如 .docx，UI 上会明确提示。
 */

const FONT_PX = 14 // 五号 = 10.5pt
const LINE_RATIO = 1.4 // 中文文档常见行距，取折中值
const LINE_PX = Math.round(FONT_PX * LINE_RATIO)
// A4：上下 2.54cm、左右 3.17cm
const CONTENT_W = Math.round((8.268 - 1.248 * 2) * 96)
const CONTENT_H = Math.round((11.693 - 2) * 96)

/* ---------------- OLE 复合文档（CFB） ---------------- */

class Cfb {
  constructor(u8) {
    this.u8 = u8
    this.dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
    const dv = this.dv
    if (dv.getUint32(0, true) !== 0xe011cfd0) throw new Error('不是 OLE 复合文档，无法解析该 .doc')

    this.sectorSize = 1 << dv.getUint16(0x1e, true)
    this.miniSize = 1 << dv.getUint16(0x20, true)
    this.miniCutoff = dv.getUint32(0x38, true) || 4096
    this.firstDir = dv.getUint32(0x30, true)
    this.firstMiniFat = dv.getUint32(0x3c, true)
    this.numMiniFat = dv.getUint32(0x40, true)
    this.firstDifat = dv.getUint32(0x44, true)
    this.numDifat = dv.getUint32(0x48, true)

    this.difat = []
    for (let i = 0; i < 109; i++) this.difat.push(dv.getUint32(0x4c + i * 4, true))
    let next = this.firstDifat
    let remain = this.numDifat
    const perDifatSector = this.sectorSize / 4 - 1
    let guard = 0
    while (remain > 0 && next < 0xfffffff0 && guard++ < 4096) {
      const base = (next + 1) * this.sectorSize
      for (let i = 0; i < perDifatSector; i++) this.difat.push(dv.getUint32(base + i * 4, true))
      next = dv.getUint32(base + perDifatSector * 4, true)
      remain--
    }

    this.entries = this.readDirectory()
    this.rootStart = this.entries.length ? this.entries[0].start : 0
    this.miniFatSectors = this.chain(this.firstMiniFat, this.numMiniFat)
    this.miniStreamSectors = this.chain(this.rootStart)
  }

  secOffset(n) {
    return (n + 1) * this.sectorSize
  }

  fatEntry(s) {
    if (s == null || s >= 0xfffffff0) return 0xfffffffe
    const per = this.sectorSize / 4
    const fs = this.difat[Math.floor(s / per)]
    if (fs == null || fs >= 0xfffffff0) return 0xfffffffe
    const off = this.secOffset(fs) + (s % per) * 4
    if (off + 4 > this.u8.length) return 0xfffffffe
    return this.dv.getUint32(off, true)
  }

  chain(start, maxLen = Infinity) {
    const out = []
    let s = start
    let guard = 0
    while (s != null && s < 0xfffffff0 && out.length < maxLen && guard++ < 1000000) {
      out.push(s)
      s = this.fatEntry(s)
    }
    return out
  }

  readDirectory() {
    const entries = []
    let guard = 0
    for (const s of this.chain(this.firstDir)) {
      if (guard++ > 4096) break
      const count = this.sectorSize / 128
      for (let i = 0; i < count; i++) {
        const off = this.secOffset(s) + i * 128
        if (off + 128 > this.u8.length) break
        const nameLen = Math.max(0, this.dv.getUint16(off + 64, true) - 2) / 2
        const type = this.dv.getUint8(off + 66)
        const start = this.dv.getUint32(off + 116, true)
        const size = this.dv.getUint32(off + 120, true)
        let name = ''
        for (let j = 0; j < nameLen && j < 32; j++) {
          name += String.fromCharCode(this.dv.getUint16(off + j * 2, true))
        }
        entries.push({ name, type, start, size })
      }
    }
    return entries
  }

  find(name) {
    const target = name.toLowerCase()
    return this.entries.find((e) => e.type === 2 && e.name.toLowerCase() === target) ?? null
  }

  miniOffset(k) {
    const per = this.sectorSize / this.miniSize
    const si = this.miniStreamSectors[Math.floor(k / per)]
    if (si == null) return -1
    return this.secOffset(si) + (k % per) * this.miniSize
  }

  miniFatEntry(k) {
    const per = this.sectorSize / 4
    const fs = this.miniFatSectors[Math.floor(k / per)]
    if (fs == null) return 0xfffffffe
    const off = this.secOffset(fs) + (k % per) * 4
    if (off + 4 > this.u8.length) return 0xfffffffe
    return this.dv.getUint32(off, true)
  }

  readMini(start, size) {
    const out = new Uint8Array(size)
    let k = start
    let w = 0
    let guard = 0
    while (w < size && k < 0xfffffff0 && guard++ < 1000000) {
      const off = this.miniOffset(k)
      if (off < 0) break
      const n = Math.min(this.miniSize, size - w)
      out.set(this.u8.subarray(off, off + n), w)
      w += n
      k = this.miniFatEntry(k)
    }
    return out
  }

  readBig(start, size) {
    const out = new Uint8Array(size)
    let w = 0
    for (const s of this.chain(start, Math.ceil(size / this.sectorSize))) {
      if (w >= size) break
      const off = this.secOffset(s)
      const n = Math.min(this.sectorSize, size - w, Math.max(0, this.u8.length - off))
      if (n <= 0) break
      out.set(this.u8.subarray(off, off + n), w)
      w += n
    }
    return w >= size ? out : out.subarray(0, w)
  }

  readStream(entry) {
    if (!entry || !entry.size) return new Uint8Array(0)
    return entry.size < this.miniCutoff ? this.readMini(entry.start, entry.size) : this.readBig(entry.start, entry.size)
  }
}

/* ---------------- 文本还原 ---------------- */

function decodeCompressed(bytes) {
  const win = new TextDecoder('windows-1252').decode(bytes)
  // 若字节序列整体符合 GBK 双字节结构，改用 GBK 解码（中文 Windows 生成的 .doc 常见）
  if (looksLikeGbk(bytes)) {
    try {
      const gbk = new TextDecoder('gbk').decode(bytes)
      if (!gbk.includes('�')) return gbk
    } catch (e) {
      /* 环境不支持 GBK 时回退 */
    }
  }
  return win
}

function looksLikeGbk(bytes) {
  let i = 0
  while (i < bytes.length) {
    const b = bytes[i]
    if (b < 0x80) {
      i++
      continue
    }
    if (b >= 0x81 && b <= 0xfe && i + 1 < bytes.length) {
      const t = bytes[i + 1]
      if ((t >= 0x40 && t <= 0x7e) || (t >= 0x80 && t <= 0xfe)) {
        i += 2
        continue
      }
    }
    return false
  }
  return true
}

const u16 = new TextDecoder('utf-16le')

function extractMainText(cfb) {
  const wdEntry = cfb.find('WordDocument')
  if (!wdEntry) throw new Error('未找到 WordDocument 流，文件可能已损坏')
  const wd = cfb.readStream(wdEntry)
  if (wd.length < 100) throw new Error('WordDocument 流过短，无法解析')

  const dv = new DataView(wd.buffer, wd.byteOffset, wd.byteLength)
  if (dv.getUint16(0, true) !== 0xa5ec) throw new Error('FIB 标识不正确，可能不是 Word 二进制文档')

  const flags = dv.getUint16(0x0a, true)
  const whichTable = (flags & 0x0200) !== 0

  const csw = dv.getUint16(0x20, true)
  const rgLw = 0x24 + csw * 2 // cslw(2) 之后即 FibRgLw97 起点
  const ccpText = dv.getUint32(rgLw, true)
  const cslw = dv.getUint16(0x22 + csw * 2, true)
  const rgFcLcb = 0x26 + csw * 2 + cslw * 4
  const fcClxPos = rgFcLcb + 66 * 4
  if (fcClxPos + 8 > wd.length) throw new Error('FIB 结构异常，无法定位 CLX')

  const fcClx = dv.getUint32(fcClxPos, true)
  const lcbClx = dv.getUint32(fcClxPos + 4, true)

  const tableEntry = cfb.find(whichTable ? '1Table' : '0Table') ?? cfb.find('0Table') ?? cfb.find('1Table')
  if (!tableEntry) throw new Error('未找到 Table 流，无法解析文本')

  const table = cfb.readStream(tableEntry)
  if (fcClx + lcbClx > table.length) throw new Error('CLX 越界，文件可能已损坏')
  const clx = table.subarray(fcClx, fcClx + lcbClx)

  // CLX：若干 Prc（0x01）+ 一个 Pcdt（0x02）
  let i = 0
  let pcdt = null
  while (i < clx.length) {
    const tag = clx[i]
    if (tag === 1) {
      const cbGrpprl = new DataView(clx.buffer, clx.byteOffset + i + 1, 2).getUint16(0, true)
      i += 3 + cbGrpprl
    } else if (tag === 2) {
      const lcb = new DataView(clx.buffer, clx.byteOffset + i + 1, 4).getUint32(0, true)
      pcdt = clx.subarray(i + 5, Math.min(clx.length, i + 5 + lcb))
      break
    } else {
      break
    }
  }
  if (!pcdt || pcdt.length < 8) throw new Error('未找到 piece table，无法解析文本')

  return readPieces(pcdt, wd, ccpText)
}

function readPieces(pcdt, wd, ccpText) {
  const dvp = new DataView(pcdt.buffer, pcdt.byteOffset, pcdt.byteLength)
  const n = Math.floor((pcdt.length - 4) / 12)
  if (n <= 0) return ''

  const cps = new Array(n + 1)
  for (let k = 0; k <= n; k++) cps[k] = dvp.getUint32(k * 4, true)
  const pcdStart = (n + 1) * 4

  let text = ''
  for (let k = 0; k < n; k++) {
    const cpStart = cps[k]
    const cpEnd = cps[k + 1]
    if (cpStart >= ccpText) break
    const cch = Math.min(cpEnd, ccpText) - cpStart
    if (cch <= 0) continue

    const off = pcdStart + k * 8
    if (off + 8 > pcdt.length) break
    const fc = dvp.getUint32(off + 2, true)
    const compressed = (fc & 0x40000000) !== 0
    const fcVal = fc & 0x3fffffff

    if (compressed) {
      const start = Math.floor(fcVal / 2)
      if (start + cch > wd.length) continue
      text += decodeCompressed(wd.subarray(start, start + cch))
    } else {
      const start = fcVal
      if (start + cch * 2 > wd.length) continue
      text += u16.decode(wd.subarray(start, start + cch * 2))
    }
  }
  return text
}

/** 处理域代码、单元格/行结束符、分页符等控制字符 */
function cleanDocText(raw) {
  let out = ''
  let i = 0
  while (i < raw.length) {
    const c = raw.charCodeAt(i)
    if (c === 0x13) {
      // 域起始：丢弃域代码，保留域结果
      i++
      while (i < raw.length) {
        const t = raw.charCodeAt(i)
        if (t === 0x14 || t === 0x15 || t === 0x0d) break
        i++
      }
      continue
    }
    if (c === 0x14 || c === 0x15) {
      i++
      continue
    }
    if (c === 0x07) {
      out += ' '
      i++
      continue
    }
    if (c === 0x0b) {
      out += '\n'
      i++
      continue
    }
    if (c === 0x0c || c === 0x0e) {
      out += '\f'
      i++
      continue
    }
    if (c === 0x09 || c === 0x0d) {
      out += raw[i]
      i++
      continue
    }
    if (c < 0x20) {
      i++
      continue
    }
    out += raw[i]
    i++
  }
  return out
}

function splitParagraphs(cleaned) {
  return cleaned.split('\r').map((p) => {
    const pageBreak = p.indexOf('\f') >= 0
    return { text: p.replace(/\f/g, '').replace(/\s+$/, ''), pageBreak }
  })
}

/* ---------------- 量高 ---------------- */

function measureParagraphs(list) {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText =
    'position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;z-index:-1;'
  document.body.appendChild(host)

  const nodes = list.map((p) => {
    const div = document.createElement('div')
    div.style.cssText = `box-sizing:content-box;margin:0;padding:0;white-space:pre-wrap;overflow-wrap:break-word;width:${CONTENT_W}px;line-height:${LINE_PX}px;font-size:${FONT_PX}px;font-family:"宋体","SimSun",serif;`
    div.textContent = p.text || '​'
    host.appendChild(div)
    return div
  })

  void host.offsetHeight
  const heights = nodes.map((n) => n.getBoundingClientRect().height)
  host.remove()
  return heights
}

/* ---------------- 对外入口 ---------------- */

export async function loadLegacyDocModel(arrayBuffer, baseName) {
  const u8 = new Uint8Array(arrayBuffer)
  const cfb = new Cfb(u8)
  const raw = extractMainText(cfb)
  const paragraphs = splitParagraphs(cleanDocText(raw))
  const heights = measureParagraphs(paragraphs)

  const blocks = paragraphs.map((p, i) => ({
    kind: 'p',
    index: i,
    height: heights[i] ?? LINE_PX,
    forceBreak: p.pageBreak,
    sectionIndex: 0,
    text: p.text
  }))

  const sections = [{ contentW: CONTENT_W, contentH: CONTENT_H, cols: 1 }]

  return {
    kind: 'doc',
    blocks,
    sections,
    destroy() {},
    async build(selected, outName) {
      const set = new Set(selected)
      const picked = blocks.filter((b) => set.has(b.index))
      const children = []
      let prevIndex = null
      for (const b of picked) {
        const newGroup = prevIndex !== null && b.index !== prevIndex + 1
        children.push(makeParagraph(b.text, (newGroup || b.forceBreak) && children.length > 0))
        prevIndex = b.index
      }
      if (!children.length) children.push(makeParagraph('', false))

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: { width: 11906, height: 16838 },
                margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 }
              }
            },
            children
          }
        ]
      })
      const blob = await Packer.toBlob(doc)
      return { name: outName, url: URL.createObjectURL(blob) }
    }
  }
}

function makeParagraph(text, pageBreakBefore) {
  const lines = String(text ?? '').split('\n')
  const runs = lines.map((line, i) =>
    i === 0
      ? new TextRun({ text: line, font: '宋体', size: 21 })
      : new TextRun({ text: line, font: '宋体', size: 21, break: 1 })
  )
  return new Paragraph({
    children: runs.length ? runs : [new TextRun({ text: '', font: '宋体', size: 21 })],
    spacing: { line: Math.round(LINE_RATIO * 240), lineRule: 'auto' },
    pageBreakBefore: !!pageBreakBefore
  })
}

export function legacyDocBaseName(name) {
  return String(name ?? '').replace(/\.(docx?|dotx?)$/i, '') || '文档'
}
