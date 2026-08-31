<script setup>
import { computed, ref } from 'vue'
import * as XLSX from 'xlsx'

const open = ref(false)
const files = ref([]) // { id, name, sheetName, headers:[], rows:[[]] }
const exporting = ref(false)
const result = ref(null) // { name, url }
const errors = ref([])
const fileInput = ref(null)
let uid = 0

// 标题行：首个含非空单元格的行；合并列 = 各文件标题按出现顺序去重取并集
const mergedHeaders = computed(() => {
  const out = []
  const seen = new Set()
  for (const f of files.value) {
    for (const h of f.headers) {
      const key = h.trim()
      if (key && !seen.has(key)) { seen.add(key); out.push(key) }
    }
  }
  return out
})

const mergedRows = computed(() => {
  const headers = mergedHeaders.value
  const rows = []
  for (const f of files.value) {
    const map = new Map()
    f.headers.forEach((h, i) => { if (!map.has(h.trim())) map.set(h.trim(), i) })
    for (const r of f.rows) rows.push(headers.map((h) => r[map.get(h) ?? -1] ?? ''))
  }
  return rows
})

/* 解析单个 Excel：取第一个工作表，首个非空行为标题行 */
function parseWorkbook(name, buf) {
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames[0]
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
  if (!aoa.length) throw new Error('空工作表')
  const headerIdx = aoa.findIndex((r) => r.some((c) => String(c).trim()))
  if (headerIdx < 0) throw new Error('未找到标题行')
  const headers = aoa[headerIdx].map((c) => String(c).trim())
  const rows = aoa.slice(headerIdx + 1).filter((r) => r.some((c) => String(c).trim()))
  return { sheetName, headers, rows }
}

async function pick(e) {
  errors.value = []
  for (const f of [...e.target.files]) {
    try {
      const parsed = parseWorkbook(f.name, await f.arrayBuffer())
      files.value.push({ id: ++uid, name: f.name, ...parsed })
    } catch (err) {
      errors.value.push(`解析失败 ${f.name}：${err.message}`)
    }
  }
  e.target.value = ''
}

function removeFile(id) {
  files.value = files.value.filter((f) => f.id !== id)
}

async function exportExcel() {
  if (!mergedRows.value.length || exporting.value) return
  exporting.value = true
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = null
  try {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([mergedHeaders.value, ...mergedRows.value]), '合并结果')
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    result.value = { name: 'Excel合并结果.xlsx', url }
  } catch (e) {
    errors.value.push(`导出失败：${e.message}`)
  }
  exporting.value = false
}
</script>

<template>
  <button
    type="button"
    class="flex flex-col items-start gap-apple-sm rounded-apple-lg border border-divider-soft bg-canvas p-apple-md text-left shadow-hairline transition-all duration-200 hover:-translate-y-px hover:shadow-product focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
    :aria-haspopup="'dialog'"
    @click="open = true"
  >
    <span class="flex h-11 w-11 items-center justify-center rounded-apple-md bg-linear-to-br from-green-400 to-emerald-400 text-xl">📗</span>
    <p class="text-body-strong text-ink">Excel合并</p>
  </button>

  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="Excel合并" class="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">Excel合并</p>
                <p class="text-fine-print text-ink-muted-48">上传多个 Excel · 按标题行对应合并（列名自动对齐）</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" multiple class="hidden" @change="pick" />
              <button
                type="button"
                class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-dashed border-black/15 py-apple-lg text-caption-strong text-ink-muted-80 transition hover:border-primary hover:bg-primary/5 hover:text-ink active:scale-[0.99]"
                @click="fileInput.click()"
              >
                <span class="text-2xl">📥</span>
                点击选择 Excel 文件（可多选，取每个文件第一个工作表）
              </button>

              <p v-for="(err, i) in errors" :key="i" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ err }}</p>

              <!-- 文件列表 -->
              <div v-if="files.length" class="flex flex-col gap-apple-xs">
                <div v-for="f in files" :key="f.id" class="flex items-center justify-between gap-apple-md rounded-apple-md bg-canvas-parchment px-apple-md py-apple-sm">
                  <span class="min-w-0 truncate text-caption-strong text-ink" :title="f.name">📗 {{ f.name }}</span>
                  <span class="flex shrink-0 items-center gap-apple-md">
                    <span class="text-fine-print text-ink-muted-48">{{ f.headers.length }} 列 · {{ f.rows.length }} 行</span>
                    <span class="text-fine-print text-ink-muted-48 opacity-60 hover:text-red-500" title="移除" @click="removeFile(f.id)">✕</span>
                  </span>
                </div>
              </div>

              <!-- 合并预览 -->
              <div v-if="files.length" class="flex flex-col gap-apple-sm rounded-apple-lg bg-canvas-parchment p-apple-md">
                <p class="text-caption-strong text-ink">合并列（{{ mergedHeaders.length }}）与数据预览</p>
                <div class="flex flex-wrap gap-apple-xs">
                  <span v-for="h in mergedHeaders" :key="h" class="rounded-pill bg-canvas px-apple-sm py-0.5 text-fine-print text-ink shadow-hairline">{{ h }}</span>
                </div>
                <div v-if="mergedRows.length" class="overflow-x-auto">
                  <table class="border-collapse text-fine-print text-ink">
                    <thead>
                      <tr>
                        <th v-for="h in mergedHeaders" :key="h" class="max-w-[160px] truncate border border-black/[0.06] bg-white px-apple-xs py-1 text-left font-semibold">{{ h }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, ri) in mergedRows.slice(0, 5)" :key="ri">
                        <td v-for="(cell, ci) in row" :key="ci" class="max-w-[160px] truncate border border-black/[0.06] bg-canvas px-apple-xs py-1">{{ cell || ' ' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p class="text-fine-print text-ink-muted-48">列名相同的列自动对齐，缺失的单元格留空</p>
              </div>
            </div>

            <!-- 底部操作 -->
            <div class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span class="text-fine-print text-ink-muted-48">{{ files.length ? `共 ${mergedRows.length} 行待导出` : '支持 xlsx / xls / csv' }}</span>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!mergedRows.length || exporting"
                @click="exportExcel"
              >{{ exporting ? '导出中…' : '合并并导出' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>