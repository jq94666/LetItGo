<script setup>
import { ref } from 'vue'
import { Document, Packer, Paragraph, PageBreak, TextRun } from 'docx'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })
const files = ref([]) // { id, name, pageCount, paragraphs: String[][], lineCount }
const activeFileId = ref(null)
const extracting = ref(false)
const progress = ref('')
const results = ref([]) // { name, url }
const errors = ref([])
const fileInput = ref(null)
let uid = 0

const activeFile = () => files.value.find((f) => f.id === activeFileId.value) ?? null

/* 单页文本 -> 行（按 y 聚类、按 x 排序、大间隙补空格） */
async function extractLines(doc, pageNum) {
  const page = await doc.getPage(pageNum)
  const tc = await page.getTextContent()
  const items = tc.items
    .filter((i) => i.str && i.str.trim())
    .map((i) => ({ x: i.transform[4], y: i.transform[5], h: i.height, s: i.str }))
  if (!items.length) return []

  const avgH = items.reduce((s, i) => s + i.h, 0) / items.length
  items.sort((a, b) => b.y - a.y || a.x - b.x)
  const lines = []
  let cur = [items[0]]
  for (let i = 1; i < items.length; i++) {
    if (Math.abs(items[i].y - cur[0].y) <= Math.max(2, avgH * 0.5)) cur.push(items[i])
    else { lines.push(cur); cur = [items[i]] }
  }
  lines.push(cur)

  return lines.map((line) => {
    line.sort((a, b) => a.x - b.x)
    let out = ''
    let prevEnd = null
    for (const it of line) {
      if (prevEnd !== null && it.x - prevEnd > avgH * 0.25 && !/\s$/.test(out)) out += ' '
      out += it.s
      prevEnd = it.x + (it.s.length * avgH) / 2
    }
    return out.trim()
  }).filter(Boolean)
}

async function loadPdfList(list) {
  errors.value = []
  extracting.value = true
  for (const f of list) {
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) continue
    try {
      const buf = await f.arrayBuffer()
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
      const pages = []
      let lineCount = 0
      for (let p = 1; p <= doc.numPages; p++) {
        progress.value = `${f.name}：第 ${p}/${doc.numPages} 页`
        const lines = await extractLines(doc, p)
        lineCount += lines.length
        pages.push(lines)
      }
      const item = { id: ++uid, name: f.name.replace(/\.pdf$/i, ''), pageCount: doc.numPages, paragraphs: pages, lineCount }
      files.value.push(item)
      if (!activeFileId.value) activeFileId.value = item.id
    } catch (e) {
      errors.value.push(`无法解析 ${f.name}（可能已加密或损坏）`)
    }
  }
  progress.value = ''
  extracting.value = false
}

function pick(e) {
  loadPdfList([...e.target.files])
  e.target.value = ''
}

async function exportWord(f) {
  if (!f.lineCount) return
  const children = []
  f.paragraphs.forEach((lines, pi) => {
    if (pi > 0) children.push(new Paragraph({ children: [new PageBreak()] }))
    for (const line of lines) {
      children.push(new Paragraph({ children: [new TextRun({ text: line, font: 'Microsoft YaHei', size: 24 })] }))
    }
  })
  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  results.value.push({ name: `${f.name}.docx`, url })
}

async function exportAll() {
  results.value.forEach((r) => URL.revokeObjectURL(r.url))
  results.value = []
  for (const f of files.value) await exportWord(f)
}

function removeFile(id) {
  const idx = files.value.findIndex((f) => f.id === id)
  if (idx >= 0) files.value.splice(idx, 1)
  if (activeFileId.value === id) activeFileId.value = files.value[0]?.id ?? null
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="PDF转Word" class="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">PDF转Word</p>
                <p class="text-fine-print text-ink-muted-48">提取 PDF 文本内容 · 生成 .docx 下载</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <input ref="fileInput" type="file" accept="application/pdf,.pdf" multiple class="hidden" @change="pick" />
              <button
                type="button"
                class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-dashed border-black/15 py-apple-lg text-caption-strong text-ink-muted-80 transition hover:border-primary hover:bg-primary/5 hover:text-ink active:scale-[0.99]"
                @click="fileInput.click()"
              >
                <span class="text-2xl">📥</span>
                点击选择 PDF 文件（可多选，需含文本层）
              </button>

              <p v-for="(err, i) in errors" :key="i" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ err }}</p>

              <!-- 文件列表 -->
              <div v-if="files.length" class="flex flex-col gap-apple-xs">
                <div
                  v-for="f in files"
                  :key="f.id"
                  class="flex cursor-pointer items-center justify-between gap-apple-md rounded-apple-md px-apple-md py-apple-sm transition"
                  :class="activeFileId === f.id ? 'bg-canvas-parchment ring-1 ring-primary/30' : 'hover:bg-canvas-parchment'"
                  @click="activeFileId = f.id"
                >
                  <span class="truncate text-caption-strong text-ink">📄 {{ f.name }}</span>
                  <span class="flex shrink-0 items-center gap-apple-md">
                    <span class="text-fine-print" :class="f.lineCount ? 'text-emerald-600' : 'text-ink-muted-48'">
                      {{ f.lineCount ? `${f.pageCount} 页 · ${f.lineCount} 行文本` : '未发现文本' }}
                    </span>
                    <span class="text-fine-print text-ink-muted-48 opacity-60 hover:text-red-500" title="移除" @click.stop="removeFile(f.id)">✕</span>
                  </span>
                </div>
              </div>

              <!-- 选中文件内容预览 -->
              <div v-if="activeFile() && activeFile().lineCount" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                <p class="text-caption-strong text-ink">预览（最多 8 行）</p>
                <p v-for="(line, i) in activeFile().paragraphs.flat().slice(0, 8)" :key="i" class="line-clamp-1 text-fine-print text-ink">{{ line }}</p>
                <p class="text-fine-print text-ink-muted-48">完整内容以导出的 Word 为准，页与页之间保留分页</p>
              </div>
              <p v-else-if="activeFile() && !extracting" class="text-fine-print text-ink-muted-48">
                该文件未发现文本（扫描件无文本层无法提取，可先用「PDF转扫描件」处理）
              </p>

              <!-- 导出结果 -->
              <div v-if="results.length" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                <p class="text-caption-strong text-ink">导出完成</p>
                <a
                  v-for="r in results"
                  :key="r.name"
                  :href="r.url"
                  :download="r.name"
                  class="flex items-center gap-apple-xs rounded-apple-md bg-canvas px-apple-md py-apple-sm text-caption-strong text-primary shadow-hairline transition hover:text-ink active:scale-[0.99]"
                >⬇️ {{ r.name }}</a>
              </div>
            </div>

            <!-- 底部操作 -->
            <div class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span v-if="extracting" class="text-fine-print text-ink-muted-48">{{ progress }}</span>
              <span v-else class="text-fine-print text-ink-muted-48">按行提取文本，页间自动分页</span>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="extracting || !files.some((f) => f.lineCount)"
                @click="exportAll"
              >{{ extracting ? '提取中…' : '导出 Word' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>