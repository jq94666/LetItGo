<script setup>
import { markRaw, ref } from 'vue'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })
const files = ref([]) // { id, name, doc, pageCount, pages:[{rotation}], thumbs:[dataURL] }
const activeFileId = ref(null)
const grayscale = ref(true) // 扫描滤镜：灰度 + 提对比
const scanning = ref(false)
const progress = ref('')
const results = ref([]) // { name, url }
const errors = ref([])
const fileInput = ref(null)
let uid = 0

const activeFile = () => files.value.find((f) => f.id === activeFileId.value) ?? null

/* 渲染某页到 canvas：按目标宽度缩放、应用旋转与扫描滤镜 */
async function renderPage(doc, pageNum, rotation, targetW, isGray) {
  const page = await doc.getPage(pageNum)
  const base = page.getViewport({ scale: 1 })
  const vp = page.getViewport({ scale: targetW / base.width })
  const rot = ((rotation % 360) + 360) % 360
  const swap = rot === 90 || rot === 270
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(swap ? vp.height : vp.width)
  canvas.height = Math.round(swap ? vp.width : vp.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rot * Math.PI) / 180)
  ctx.filter = isGray ? 'grayscale(1) contrast(1.12) brightness(1.04)' : 'none'
  await page.render({ canvasContext: ctx, viewport: vp }).promise
  ctx.restore()
  return canvas
}

async function loadPdfList(list) {
  errors.value = []
  for (const f of list) {
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) continue
    try {
      const buf = await f.arrayBuffer()
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
      const pages = []
      const thumbs = []
      for (let i = 1; i <= doc.numPages; i++) {
        pages.push({ rotation: 0 })
        const c = await renderPage(doc, i, 0, 220, false)
        thumbs.push(c.toDataURL('image/jpeg', 0.75))
      }
      const id = ++uid
      files.value.push({
        id,
        name: f.name.replace(/\.pdf$/i, ''),
        // markRaw：pdf.js 的文档对象带有私有字段，被 Vue 代理后读写私有成员会报错
        doc: markRaw(doc),
        pageCount: doc.numPages,
        pages,
        thumbs
      })
      if (!activeFileId.value) activeFileId.value = id
    } catch (e) {
      errors.value.push(`无法解析 ${f.name}（可能已加密或损坏）`)
    }
  }
}

function pick(e) {
  loadPdfList([...e.target.files])
  e.target.value = '' // 允许重复选择同一文件
}

async function rotatePage(f, idx) {
  const p = f.pages[idx]
  p.rotation = (p.rotation + 90) % 360
  const c = await renderPage(f.doc, idx + 1, p.rotation, 220, false)
  f.thumbs[idx] = c.toDataURL('image/jpeg', 0.75)
}

async function generateAll() {
  if (!files.value.length || scanning.value) return
  scanning.value = true
  errors.value = []
  results.value.forEach((r) => URL.revokeObjectURL(r.url))
  results.value = []
  try {
    for (const f of files.value) {
      const out = await PDFDocument.create()
      for (let i = 0; i < f.pageCount; i++) {
        progress.value = `${f.name}：第 ${i + 1}/${f.pageCount} 页`
        const canvas = await renderPage(f.doc, i + 1, f.pages[i].rotation, 1240, grayscale.value)
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
        const jpg = await out.embedJpg(await blob.arrayBuffer())
        const w = 595
        const h = (w * canvas.height) / canvas.width
        out.addPage([w, h]).drawImage(jpg, { x: 0, y: 0, width: w, height: h })
      }
      const bytes = await out.save()
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
      results.value.push({ name: `${f.name}-扫描件.pdf`, url })
    }
  } catch (e) {
    errors.value.push(`生成失败：${e.message}`)
  }
  progress.value = ''
  scanning.value = false
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
          <div role="dialog" aria-modal="true" aria-label="PDF转扫描件" class="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">PDF转扫描件</p>
                <p class="text-fine-print text-ink-muted-48">上传 PDF → 查看每页 → 旋转 → 生成扫描件</p>
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
                class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-dashed border-black/15 py-apple-lg text-caption-strong text-ink-muted-80 transition hover:border-primary hover:bg-primary/5 hover:text-ink active:scale-[0.99]"
                @click="fileInput.click()"
              >
                <span class="text-2xl">📥</span>
                点击选择 PDF 文件（可多选）
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
                  @click="activeFileId = f.id"
                >
                  📄 {{ f.name }}
                  <span class="text-fine-print" :class="activeFileId === f.id ? 'text-on-primary/70' : 'text-ink-muted-48'">{{ f.pageCount }}页</span>
                  <span class="ml-0.5 text-fine-print opacity-60 hover:text-red-500" title="移除" @click.stop="removeFile(f.id)">✕</span>
                </button>
              </div>

              <!-- 页面网格：查看 + 旋转 -->
              <div v-if="activeFile()" class="grid grid-cols-2 gap-apple-md sm:grid-cols-3 lg:grid-cols-4">
                <div v-for="(p, idx) in activeFile().pages" :key="idx" class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-divider-soft bg-canvas p-apple-sm shadow-hairline">
                  <div class="flex h-[180px] w-full items-center justify-center overflow-hidden rounded-apple-md bg-canvas-parchment">
                    <img :src="activeFile().thumbs[idx]" :alt="`第 ${idx + 1} 页`" class="max-h-full max-w-full object-contain" />
                  </div>
                  <div class="flex w-full items-center justify-between">
                    <span class="text-fine-print text-ink-muted-48">第 {{ idx + 1 }} 页</span>
                    <span class="text-fine-print text-ink-muted-48">{{ p.rotation }}°</span>
                    <button
                      type="button"
                      class="flex items-center gap-apple-xs rounded-pill bg-canvas-parchment px-apple-sm py-apple-xs text-fine-print text-ink transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.95]"
                      title="顺时针旋转 90°"
                      @click="rotatePage(activeFile(), idx)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v5h-5" /></svg>
                      旋转
                    </button>
                  </div>
                </div>
              </div>

              <!-- 生成结果 -->
              <div v-if="results.length" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                <p class="text-caption-strong text-ink">扫描件已生成</p>
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
              <label class="flex cursor-pointer items-center gap-apple-xs text-caption text-ink-muted-80">
                <input v-model="grayscale" type="checkbox" class="h-4 w-4 accent-[#0066cc]" />
                灰度扫描效果
              </label>
              <div class="flex items-center gap-apple-md">
                <span v-if="scanning" class="text-fine-print text-ink-muted-48">{{ progress }}</span>
                <button
                  type="button"
                  class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!files.length || scanning"
                  @click="generateAll"
                >{{ scanning ? '生成中…' : '生成扫描件' }}</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>