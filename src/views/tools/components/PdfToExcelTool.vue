<script setup>
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const open = ref(false)
const files = ref([]) // { id, name, doc, tables:[{page, rows}], pageCount }
const activeFileId = ref(null)
const extracting = ref(false)
const progress = ref('')
const results = ref([]) // { name, url, tableCount }
const errors = ref([])
const fileInput = ref(null)
let uid = 0

const activeFile = () => files.value.find((f) => f.id === activeFileId.value) ?? null

/* ---------- 表格提取（文本坐标聚类启发式） ---------- */

// 单页：文本项 -> 行 -> 单元格 -> 表格块
async function extractPageTables(doc, pageNum) {
  const page = await doc.getPage(pageNum)
  const tc = await page.getTextContent()
  const items = tc.items
    .filter((i) => i.str && i.str.trim())
    .map((i) => ({ x: i.transform[4], y: i.transform[5], h: i.height, s: i.str }))
  if (!items.length) return []

  const avgH = items.reduce((s, i) => s + i.h, 0) / items.length
  const GAP = Math.max(8, avgH * 1.5) // 列间距阈值：超过视为分列

  // 按 y 聚类成行（PDF y 向上，先按 y 降序）
  items.sort((a, b) => b.y - a.y || a.x - b.x)
  const lines = []
  let cur = [items[0]]
  for (let i = 1; i < items.length; i++) {
    if (Math.abs(items[i].y - cur[0].y) <= Math.max(2, avgH * 0.5)) cur.push(items[i])
    else { lines.push(cur); cur = [items[i]] }
  }
  lines.push(cur)

  // 行内按 x 切分单元格
  const rows = lines.map((line) => {
    line.sort((a, b) => a.x - b.x)
    const cells = []
    let x1 = line[0].x + (line[0].s.length * avgH) / 2
    let text = line[0].s
    for (let i = 1; i < line.length; i++) {
      const gap = line[i].x - x1
      if (gap > GAP) { cells.push(text.trim()); text = line[i].s }
      else text += line[i].s
      x1 = Math.max(x1, line[i].x + (line[i].s.length * avgH) / 2)
    }
    cells.push(text.trim())
    return cells
  })

  // 连续的多列行合并为表格块
  const tables = []
  let run = []
  const flush = () => {
    if (run.length >= 2 && run.some((r) => r.filter(Boolean).length >= 2)) {
      const cols = Math.max(...run.map((r) => r.length))
      tables.push(run.map((r) => { const c = [...r]; while (c.length < cols) c.push(''); return c }))
    }
    run = []
  }
  for (const r of rows) {
    if (r.filter(Boolean).length >= 2) run.push(r)
    else flush()
  }
  flush()
  return tables
}

async function extractAll(f) {
  const tables = []
  for (let p = 1; p <= f.pageCount; p++) {
    progress.value = `${f.name}：第 ${p}/${f.pageCount} 页`
    for (const rows of await extractPageTables(f.doc, p)) tables.push({ page: p, rows })
  }
  return tables
}

/* ---------- 上载与导出 ---------- */

async function loadPdfList(list) {
  errors.value = []
  extracting.value = true
  for (const f of list) {
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) continue
    try {
      const buf = await f.arrayBuffer()
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
      const item = { id: ++uid, name: f.name.replace(/\.pdf$/i, ''), doc, pageCount: doc.numPages, tables: [] }
      item.tables = await extractAll(item)
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

function sheetName(base, used) {
  let name = base.replace(/[\\/?*[\]:]/g, '').slice(0, 28) || 'Sheet'
  let n = 1
  while (used.has(name)) name = `${base.slice(0, 26)}(${n++})`
  used.add(name)
  return name
}

async function exportExcel(f) {
  if (!f.tables.length) return
  const wb = XLSX.utils.book_new()
  const used = new Set()
  f.tables.forEach((t, i) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(t.rows), sheetName(`第${t.page}页-表${i + 1}`, used))
  })
  const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  results.value.push({ name: `${f.name}-表格.xlsx`, url, tableCount: f.tables.length })
}

async function exportAll() {
  results.value.forEach((r) => URL.revokeObjectURL(r.url))
  results.value = []
  for (const f of files.value) await exportExcel(f)
}

function removeFile(id) {
  const idx = files.value.findIndex((f) => f.id === id)
  if (idx >= 0) files.value.splice(idx, 1)
  if (activeFileId.value === id) activeFileId.value = files.value[0]?.id ?? null
}
</script>

<template>
  <button
    type="button"
    class="flex flex-col items-start gap-apple-sm rounded-apple-lg border border-divider-soft bg-canvas p-apple-md text-left shadow-hairline transition-all duration-200 hover:-translate-y-px hover:shadow-product focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
    :aria-haspopup="'dialog'"
    @click="open = true"
  >
    <span class="flex h-11 w-11 items-center justify-center rounded-apple-md bg-linear-to-br from-emerald-400 to-teal-400 text-xl">📊</span>
    <p class="text-body-strong text-ink">PDF转Excel</p>
  </button>

  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="PDF转Excel" class="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">PDF转Excel</p>
                <p class="text-fine-print text-ink-muted-48">提取 PDF 中所有表格 · 每个表格存入一个工作表</p>
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
                    <span class="text-fine-print" :class="f.tables.length ? 'text-emerald-600' : 'text-ink-muted-48'">
                      {{ f.tables.length ? `发现 ${f.tables.length} 个表格` : '未发现表格' }}
                    </span>
                    <span class="text-fine-print text-ink-muted-48 opacity-60 hover:text-red-500" title="移除" @click.stop="removeFile(f.id)">✕</span>
                  </span>
                </div>
              </div>

              <!-- 选中文件的表格预览 -->
              <div v-if="activeFile() && activeFile().tables.length" class="flex flex-col gap-apple-sm rounded-apple-lg bg-canvas-parchment p-apple-md">
                <p class="text-caption-strong text-ink">预览：第 1 个表格（{{ activeFile().tables[0].page }} 页，最多显示 5 行）</p>
                <div class="overflow-x-auto">
                  <table class="border-collapse text-fine-print text-ink">
                    <tbody>
                      <tr v-for="(row, ri) in activeFile().tables[0].rows.slice(0, 5)" :key="ri">
                        <td v-for="(cell, ci) in row.slice(0, 6)" :key="ci" class="max-w-[160px] truncate border border-black/[0.06] bg-canvas px-apple-xs py-1">{{ cell || ' ' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p class="text-fine-print text-ink-muted-48">完整内容以导出的 Excel 为准</p>
              </div>
              <p v-else-if="activeFile() && !extracting" class="text-fine-print text-ink-muted-48">
                该文件未发现表格（扫描件无文本层无法提取，可先用「PDF转扫描件」处理）
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
                >⬇️ {{ r.name }}（{{ r.tableCount }} 个工作表）</a>
              </div>
            </div>

            <!-- 底部操作 -->
            <div class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span v-if="extracting" class="text-fine-print text-ink-muted-48">{{ progress }}</span>
              <span v-else class="text-fine-print text-ink-muted-48">启发式提取：按文本坐标聚类识别表格</span>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="extracting || !files.some((f) => f.tables.length)"
                @click="exportAll"
              >{{ extracting ? '提取中…' : '导出 Excel' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>