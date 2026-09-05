<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { PDFDocument } from 'pdf-lib'
import { formatPageRanges, parsePageSpec } from '../../../utils/pageSpec.js'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

// files: { id, name, bytes, pageCount }
const files = ref([])
const generating = ref(false)
const progress = ref('')
const spec = ref('')
const results = ref([]) // { name, url }
const errors = ref([])
const fileInput = ref(null)
const dragOver = ref(false)
let uid = 0

const totalPages = computed(() => files.value.reduce((n, f) => n + f.pageCount, 0))
const parsed = computed(() => parsePageSpec(spec.value, Math.max(...files.value.map((f) => f.pageCount), 0)))
const canGenerate = computed(() => files.value.length > 0 && parsed.value.pages.length > 0 && !generating.value)

const baseName = (name) => String(name).replace(/\.pdf$/i, '') || '文档'

function revokeAll() {
  results.value.forEach((r) => URL.revokeObjectURL(r.url))
  results.value = []
}

function clearErrors() {
  errors.value = []
}

/* ---------- 上传 ---------- */

async function addFiles(list) {
  clearErrors()
  for (const f of list) {
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) {
      errors.value.push(`已跳过 ${f.name}（仅支持 PDF）`)
      continue
    }
    try {
      const bytes = new Uint8Array(await f.arrayBuffer())
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: false })
      files.value.push({ id: ++uid, name: f.name, bytes, pageCount: doc.getPageCount() })
    } catch (e) {
      errors.value.push(`无法解析 ${f.name}（可能已加密或损坏）`)
    }
  }
}

function pick(e) {
  if (e.target.files?.length) {
    revokeAll()
    addFiles([...e.target.files])
  }
  e.target.value = ''
}

function onDrop(e) {
  dragOver.value = false
  const list = [...(e.dataTransfer?.files ?? [])]
  if (list.length) {
    revokeAll()
    addFiles(list)
  }
}

function removeFile(id) {
  const idx = files.value.findIndex((f) => f.id === id)
  if (idx < 0) return
  files.value.splice(idx, 1)
  revokeAll()
  // 页码输入保留；文件清空时重置
  if (!files.value.length) spec.value = ''
}

/* ---------- 页码操作 ---------- */

function selectAll() {
  spec.value = 'all'
}

/* ---------- 生成 ---------- */

async function generate() {
  if (!canGenerate.value) return
  generating.value = true
  clearErrors()
  revokeAll()
  const picks = parsed.value.pages
  try {
    for (const f of files.value) {
      progress.value = `正在处理 ${f.name}…`
      try {
        const out = await PDFDocument.create()
        const src = await PDFDocument.load(f.bytes.slice(), { ignoreEncryption: false })
        const indices = picks.filter((p) => p <= f.pageCount).map((p) => p - 1)
        if (indices.length) {
          const pages = await out.copyPages(src, indices)
          pages.forEach((p) => out.addPage(p))
        }
        const bytes = await out.save()
        const name = `${baseName(f.name)}-第${formatPageRanges(picks.filter((p) => p <= f.pageCount))}页.pdf`
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
        const item = { name, url }
        results.value.push(item)
        if (results.value.length === 1) triggerDownload(item)
      } catch (e) {
        errors.value.push(`${f.name} 生成失败：${e.message}`)
      }
    }
  } catch (e) {
    errors.value.push(`生成失败：${e.message}`)
  }
  progress.value = ''
  generating.value = false
}

function triggerDownload(item) {
  const a = document.createElement('a')
  a.href = item.url
  a.download = item.name
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function downloadAll() {
  results.value.forEach((r) => triggerDownload(r))
}

onUnmounted(revokeAll)
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="PDF拆分" class="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">PDF拆分</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <!-- 上传 -->
              <input ref="fileInput" type="file" accept="application/pdf,.pdf" multiple class="hidden" @change="pick" />
              <button
                type="button"
                class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-dashed py-apple-lg text-caption-strong transition active:scale-[0.99]"
                :class="dragOver ? 'border-primary bg-primary/5 text-ink' : 'border-black/15 text-ink-muted-80 hover:border-primary hover:bg-primary/5 hover:text-ink'"
                @click="fileInput.click()"
                @dragover.prevent="dragOver = true"
                @dragenter.prevent="dragOver = true"
                @dragleave.prevent="dragOver = false"
                @drop.prevent="onDrop"
              >
                <span class="text-2xl">📄</span>
                点击选择 PDF 文件（可多选），或拖拽到此处
              </button>

              <p v-for="(err, i) in errors" :key="i" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ err }}</p>

              <!-- 文件列表 -->
              <div v-if="files.length" class="flex flex-wrap gap-apple-xs">
                <span
                  v-for="f in files"
                  :key="f.id"
                  class="flex items-center gap-apple-xs rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-caption-strong text-ink"
                >
                  📄 {{ f.name }}
                  <span class="text-fine-print text-ink-muted-48">{{ f.pageCount }}页</span>
                  <span class="ml-0.5 text-fine-print opacity-60 hover:text-red-500" title="移除" @click="removeFile(f.id)">✕</span>
                </span>
              </div>

              <!-- 页码输入 -->
              <template v-if="files.length">
                <div class="flex flex-col gap-apple-xs">
                  <label class="flex flex-col gap-apple-xs sm:flex-row sm:items-center sm:gap-apple-md">
                    <span class="whitespace-nowrap text-fine-print text-ink-muted-80">提取页码</span>
                    <input
                      v-model="spec"
                      type="text"
                      inputmode="text"
                      placeholder="例如：1,3,5-9（8- 表示到最后）"
                      class="h-[44px] w-full flex-1 rounded-apple-md border border-black/[0.08] bg-canvas px-apple-md text-apple-body text-ink placeholder:text-ink-muted-48 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
                    />
                  </label>
                  <div class="flex flex-wrap items-center gap-apple-xs">
                    <button type="button" class="rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-fine-print text-ink transition hover:text-primary active:scale-[0.97]" @click="selectAll">全选</button>
                    <button type="button" class="rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-fine-print text-ink transition hover:text-primary active:scale-[0.97]" @click="spec = '1'">仅第 1 页</button>
                    <button type="button" class="rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-fine-print text-ink transition hover:text-primary active:scale-[0.97]" @click="spec = ''">清空</button>
                    <span v-if="parsed.error" class="text-fine-print text-red-600">{{ parsed.error }}</span>
                    <span v-else-if="parsed.pages.length" class="text-fine-print text-ink-muted-48">
                      将提取 {{ parsed.pages.length }} 页：{{ formatPageRanges(parsed.pages) }}
                    </span>
                    <span v-else class="text-fine-print text-ink-muted-48">输入页码后自动生效</span>
                  </div>
                </div>

                <!-- 生成结果 -->
                <div v-if="results.length" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                  <div class="flex items-center justify-between gap-apple-xs">
                    <p class="text-caption-strong text-ink">已生成 {{ results.length }} 个文件</p>
                    <button v-if="results.length > 1" type="button" class="rounded-pill bg-canvas px-apple-md py-apple-xs text-fine-print text-primary shadow-hairline transition hover:text-ink active:scale-[0.97]" @click="downloadAll">全部下载</button>
                  </div>
                  <a
                    v-for="r in results"
                    :key="r.name"
                    :href="r.url"
                    :download="r.name"
                    class="flex items-center gap-apple-xs rounded-apple-md bg-canvas px-apple-md py-apple-sm text-caption-strong text-primary shadow-hairline transition hover:text-ink active:scale-[0.99]"
                  >⬇️ {{ r.name }}</a>
                </div>
              </template>
            </div>

            <!-- 底部操作 -->
            <div class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span class="text-fine-print text-ink-muted-48">
                {{ files.length ? `${files.length} 个文件 · 共 ${totalPages} 页` : '支持多页 PDF，页码超出范围的部分会被忽略' }}
              </span>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canGenerate"
                @click="generate"
              >{{ generating ? (progress || '生成中…') : '拆分并下载' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
