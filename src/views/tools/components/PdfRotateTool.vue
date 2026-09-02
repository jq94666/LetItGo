<script setup>
import { computed, markRaw, ref } from 'vue'
import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const THUMB_W = 260 // 缩略图宽度（按未旋转宽度计算）
const PREVIEW_W = 1100 // 大图预览宽度

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

// files: { id, name, bytes, doc, pageCount, pages:[{ base, delta }], thumbs:[dataURL] }
// base  = PDF 原有的 /Rotate；delta = 用户新增的旋转量（0/90/180/270）
const files = ref([])
const activeFileId = ref(null)
const generating = ref(false)
const progress = ref('')
const results = ref([]) // { name, url }
const errors = ref([])
const fileInput = ref(null)
const dragOver = ref(false)
const previewIdx = ref(null) // 当前大图预览的页序号
const previewUrl = ref('')
let uid = 0

const activeFile = () => files.value.find((f) => f.id === activeFileId.value) ?? null

const totalPages = computed(() => files.value.reduce((n, f) => n + f.pageCount, 0))
const changedPages = computed(() =>
  files.value.reduce((n, f) => n + f.pages.filter((p) => p.delta !== 0).length, 0)
)

function norm(deg) {
  return (((deg % 360) + 360) % 360)
}

/* ---------- 渲染 ---------- */

// 按绝对角度渲染某页到 dataURL；targetW 以页面未旋转时的宽度为准
async function renderToUrl(doc, pageNum, absRotation, targetW, quality) {
  const page = await doc.getPage(pageNum)
  const flat = page.getViewport({ scale: 1, rotation: 0 })
  const scale = targetW / Math.max(1, flat.width)
  const vp = page.getViewport({ scale, rotation: norm(absRotation) })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(vp.width))
  canvas.height = Math.max(1, Math.round(vp.height))
  await page.render({ canvas, viewport: vp }).promise
  const url = canvas.toDataURL('image/jpeg', quality)
  page.cleanup()
  return url
}

// 并发受限地跑一批任务，避免一次性渲染上百页卡死主线程
async function runPool(items, limit, worker) {
  const queue = [...items]
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) await worker(queue.shift())
  })
  await Promise.all(runners)
}

const absAngle = (f, i) => norm(f.pages[i].base + f.pages[i].delta)

async function renderThumbs(f, indices = null) {
  const list = indices ?? f.pages.map((_, i) => i)
  await runPool(list, 4, async (i) => {
    f.thumbs[i] = await renderToUrl(f.doc, i + 1, absAngle(f, i), THUMB_W, 0.8)
  })
}

/* ---------- 上传 ---------- */

async function loadPdfList(list) {
  errors.value = []
  for (const f of list) {
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) continue
    try {
      const bytes = new Uint8Array(await f.arrayBuffer())
      // pdf.js 会接管传入的 TypedArray，这里给它一份副本，原件留给 pdf-lib
      const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise
      const pages = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        pages.push({ base: norm(page.rotate), delta: 0 })
      }
      const id = ++uid
      files.value.push({
        id,
        name: f.name.replace(/\.pdf$/i, ''),
        // markRaw：pdf.js 的文档对象带有私有字段，被 Vue 代理后读写私有成员会报错
        bytes: markRaw(bytes),
        doc: markRaw(doc),
        pageCount: doc.numPages,
        pages,
        thumbs: pages.map(() => '')
      })
      activeFileId.value = id
      // 取响应式代理来填充缩略图，直接改原始对象不会触发更新
      renderThumbs(files.value[files.value.length - 1])
    } catch (e) {
      errors.value.push(`无法解析 ${f.name}（可能已加密或损坏）`)
    }
  }
}

function pick(e) {
  if (e.target.files?.length) {
    results.value.forEach((r) => URL.revokeObjectURL(r.url))
    results.value = []
    loadPdfList([...e.target.files])
  }
  e.target.value = '' // 允许重复选择同一文件
}

function onDrop(e) {
  dragOver.value = false
  const list = [...(e.dataTransfer?.files ?? [])]
  if (!list.length) return
  results.value.forEach((r) => URL.revokeObjectURL(r.url))
  results.value = []
  loadPdfList(list)
}

function selectFile(id) {
  if (id === activeFileId.value) return
  closePreview()
  activeFileId.value = id
}

function removeFile(id) {
  const idx = files.value.findIndex((f) => f.id === id)
  if (idx < 0) return
  try { files.value[idx].doc.destroy() } catch (e) { /* 忽略销毁异常 */ }
  files.value.splice(idx, 1)
  if (activeFileId.value === id) {
    activeFileId.value = files.value[0]?.id ?? null
    closePreview()
  }
}

/* ---------- 旋转 ---------- */

async function rotatePage(f, i, deg) {
  f.pages[i].delta = norm(f.pages[i].delta + deg)
  f.thumbs[i] = await renderToUrl(f.doc, i + 1, absAngle(f, i), THUMB_W, 0.8)
  if (previewIdx.value === i) await refreshPreview(f)
}

// filter 为 null 表示全部页；否则传入 (i) => boolean
async function applyRotation(deg, filter = null) {
  const f = activeFile()
  if (!f) return
  const targets = f.pages.map((_, i) => i).filter((i) => (filter ? filter(i) : true))
  if (!targets.length) return
  targets.forEach((i) => { f.pages[i].delta = norm(f.pages[i].delta + deg) })
  await renderThumbs(f, targets)
  if (previewIdx.value !== null) await refreshPreview(f)
}

async function resetPage(f, i) {
  f.pages[i].delta = 0
  f.thumbs[i] = await renderToUrl(f.doc, i + 1, absAngle(f, i), THUMB_W, 0.8)
  if (previewIdx.value === i) await refreshPreview(f)
}

function resetAll() {
  const f = activeFile()
  if (!f) return
  f.pages.forEach((p) => { p.delta = 0 })
  renderThumbs(f)
  if (previewIdx.value !== null) refreshPreview(f)
}

/* ---------- 大图预览 ---------- */

async function refreshPreview(f) {
  const i = previewIdx.value
  previewUrl.value = await renderToUrl(f.doc, i + 1, absAngle(f, i), PREVIEW_W, 0.9)
}

async function openPreview(i) {
  const f = activeFile()
  if (!f) return
  previewIdx.value = i
  previewUrl.value = ''
  await refreshPreview(f)
}

function closePreview() {
  previewIdx.value = null
  previewUrl.value = ''
}

function stepPreview(step) {
  const f = activeFile()
  if (!f || previewIdx.value === null) return
  const next = previewIdx.value + step
  if (next < 0 || next >= f.pageCount) return
  openPreview(next)
}

/* ---------- 生成 ---------- */

async function generate() {
  if (!changedPages.value || generating.value) return
  generating.value = true
  errors.value = []
  results.value.forEach((r) => URL.revokeObjectURL(r.url))
  results.value = []
  try {
    for (const f of files.value) {
      progress.value = `正在处理 ${f.name}…`
      try {
        const out = await PDFDocument.load(f.bytes.slice())
        out.getPages().forEach((page, i) => {
          const target = norm(page.getRotation().angle + (f.pages[i]?.delta ?? 0))
          page.setRotation(degrees(target))
        })
        const bytes = await out.save()
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
        results.value.push({ name: `${f.name}-已旋转.pdf`, url })
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
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="PDF旋转" class="relative flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">PDF旋转</p>
                <p class="text-fine-print text-ink-muted-48">上传 PDF → 逐页旋转 → 生成新 PDF（无损，保留文字与矢量）</p>
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
                <span class="text-2xl">📥</span>
                点击选择 PDF 文件（可多选），或拖拽到此处
              </button>

              <p v-for="(err, i) in errors" :key="i" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ err }}</p>

              <!-- 文件切换 -->
              <div v-if="files.length" class="flex flex-wrap gap-apple-xs">
                <button
                  v-for="f in files"
                  :key="f.id"
                  type="button"
                  class="flex items-center gap-apple-xs rounded-pill px-apple-md py-apple-xs text-caption-strong transition-all duration-200 active:scale-[0.97]"
                  :class="activeFileId === f.id ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="selectFile(f.id)"
                >
                  📄 {{ f.name }}
                  <span class="text-fine-print" :class="activeFileId === f.id ? 'text-on-primary/70' : 'text-ink-muted-48'">{{ f.pageCount }}页</span>
                  <span class="ml-0.5 text-fine-print opacity-60 hover:text-red-500" title="移除" @click.stop="removeFile(f.id)">✕</span>
                </button>
              </div>

              <!-- 批量旋转 -->
              <div v-if="activeFile()" class="flex flex-wrap items-center gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-sm">
                <span class="mr-apple-xs text-fine-print text-ink-muted-48">批量</span>
                <button type="button" class="flex items-center gap-apple-xs rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink shadow-hairline transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.95]" @click="applyRotation(-90)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v5h5" /></svg>
                  全部左转 90°
                </button>
                <button type="button" class="flex items-center gap-apple-xs rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink shadow-hairline transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.95]" @click="applyRotation(90)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v5h-5" /></svg>
                  全部右转 90°
                </button>
                <button type="button" class="rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink shadow-hairline transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.95]" @click="applyRotation(180)">全部 180°</button>
                <button type="button" class="rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink shadow-hairline transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.95]" @click="applyRotation(180, (i) => i % 2 === 0)">奇数页 180°</button>
                <button type="button" class="rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink shadow-hairline transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.95]" @click="applyRotation(180, (i) => i % 2 === 1)">偶数页 180°</button>
                <button type="button" class="rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 shadow-hairline transition hover:text-red-500 active:scale-[0.95]" @click="resetAll">全部还原</button>
              </div>

              <!-- 页面网格 -->
              <div v-if="activeFile()" class="grid grid-cols-2 gap-apple-md sm:grid-cols-3 lg:grid-cols-4">
                <div
                  v-for="(p, idx) in activeFile().pages"
                  :key="idx"
                  class="flex flex-col gap-apple-xs rounded-apple-lg border bg-canvas p-apple-sm shadow-hairline transition"
                  :class="p.delta ? 'border-primary/60' : 'border-divider-soft'"
                >
                  <button
                    type="button"
                    class="flex h-[170px] w-full items-center justify-center overflow-hidden rounded-apple-md bg-canvas-parchment"
                    :aria-label="`放大预览第 ${idx + 1} 页`"
                    @click="openPreview(idx)"
                  >
                    <img v-if="activeFile().thumbs[idx]" :src="activeFile().thumbs[idx]" :alt="`第 ${idx + 1} 页`" class="max-h-full max-w-full object-contain" />
                    <span v-else class="text-fine-print text-ink-muted-48">渲染中…</span>
                  </button>
                  <div class="flex w-full items-center justify-between gap-apple-xs">
                    <span class="text-fine-print text-ink-muted-48">第 {{ idx + 1 }} 页</span>
                    <span class="text-fine-print" :class="p.delta ? 'text-primary' : 'text-ink-muted-48'">{{ p.delta }}°</span>
                  </div>
                  <div class="flex w-full items-center justify-between gap-apple-xs">
                    <button type="button" aria-label="逆时针旋转 90°" title="逆时针旋转 90°" class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.9]" @click="rotatePage(activeFile(), idx, -90)">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v5h5" /></svg>
                    </button>
                    <button type="button" class="rounded-pill bg-canvas-parchment px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-red-500 active:scale-[0.95]" :disabled="!p.delta" :class="p.delta ? '' : 'opacity-40'" @click="resetPage(activeFile(), idx)">还原</button>
                    <button type="button" aria-label="顺时针旋转 90°" title="顺时针旋转 90°" class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.9]" @click="rotatePage(activeFile(), idx, 90)">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v5h-5" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 生成结果 -->
              <div v-if="results.length" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                <p class="text-caption-strong text-ink">已生成，点击下载</p>
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
              <span class="text-fine-print text-ink-muted-48">
                {{ files.length ? `共 ${totalPages} 页 · 已调整 ${changedPages} 页` : '支持多页 PDF，旋转不会重新压缩内容' }}
              </span>
              <div class="flex items-center gap-apple-md">
                <span v-if="generating" class="text-fine-print text-ink-muted-48">{{ progress }}</span>
                <button
                  type="button"
                  class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!changedPages || generating"
                  @click="generate"
                >{{ generating ? '生成中…' : '生成并下载' }}</button>
              </div>
            </div>

            <!-- 大图预览 -->
            <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
              <div v-if="previewIdx !== null && activeFile()" class="absolute inset-0 z-10 flex flex-col bg-black/70 backdrop-blur-sm" @click.self="closePreview">
                <div class="flex items-center justify-between gap-apple-md p-apple-md text-white">
                  <span class="text-caption-strong">第 {{ previewIdx + 1 }} / {{ activeFile().pageCount }} 页 · {{ activeFile().pages[previewIdx].delta }}°</span>
                  <button type="button" aria-label="关闭预览" class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-[0.95]" @click="closePreview">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>
                <div class="flex min-h-0 flex-1 items-center justify-center px-apple-md">
                  <img v-if="previewUrl" :src="previewUrl" alt="页面预览" class="max-h-full max-w-full rounded-apple-md bg-white object-contain shadow-product" />
                  <span v-else class="text-caption text-white/80">渲染中…</span>
                </div>
                <div class="flex flex-wrap items-center justify-center gap-apple-sm p-apple-md">
                  <button type="button" class="rounded-pill bg-white/15 px-apple-md py-apple-xs text-caption-strong text-white transition hover:bg-white/25 active:scale-[0.97] disabled:opacity-40" :disabled="previewIdx === 0" @click="stepPreview(-1)">上一页</button>
                  <button type="button" aria-label="逆时针旋转 90°" class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-[0.9]" @click="rotatePage(activeFile(), previewIdx, -90)">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v5h5" /></svg>
                  </button>
                  <button type="button" aria-label="顺时针旋转 90°" class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-[0.9]" @click="rotatePage(activeFile(), previewIdx, 90)">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v5h-5" /></svg>
                  </button>
                  <button type="button" class="rounded-pill bg-white/15 px-apple-md py-apple-xs text-caption-strong text-white transition hover:bg-white/25 active:scale-[0.97] disabled:opacity-40" :disabled="previewIdx === activeFile().pageCount - 1" @click="stepPreview(1)">下一页</button>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
