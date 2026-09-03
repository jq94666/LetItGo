/**
 * 贪心分页：按块高度往页面里装，装不下就换页。
 * 块的高度由各解析模块预先算好（docx 用 DOM 量高，旧版 .doc 用默认字体估算）。
 *
 * block: { height, forceBreak, sectionIndex }
 * section: { contentW, contentH, cols }
 * forcedBreaks: Set<number>，用户手动指定的分页点（块的全局序号）
 */
export function paginateBlocks(blocks, sections, forcedBreaks = new Set()) {
  const pages = []
  const fallback = sections[0] ?? { contentH: 931, cols: 1 }
  let cur = null

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const sec = sections[b.sectionIndex] ?? fallback
    const limit = Math.max(1, sec.contentH) * Math.max(1, sec.cols || 1)

    if (!cur) {
      cur = { secIndex: b.sectionIndex, blocks: [], height: 0 }
      pages.push(cur)
    }

    const force = b.forceBreak || forcedBreaks.has(i)
    if (cur.blocks.length && (force || (b.height > 0 && cur.height + b.height > limit + 0.5))) {
      cur = { secIndex: b.sectionIndex, blocks: [], height: 0 }
      pages.push(cur)
    }

    cur.blocks.push(i)
    cur.height += b.height
  }

  if (!pages.length) pages.push({ secIndex: 0, blocks: [], height: 0 })
  return pages
}
