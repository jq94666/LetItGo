<script setup>
import { computed, ref } from 'vue'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })
const images = ref([]) // { id, name, type, size, file, img, crop, thumbUrl, fullUrl }
const cropId = ref(null) // 当前裁剪中的图片 id
const sel = ref(null) // 拖选区域 {x0,y0,x1,y1}（归一化坐标）
const dragging = ref(false)
const dragOver = ref(false)
const compressing = ref(false)
const errors = ref([])
const results = ref([]) // { id, name, url, originalSize, size, width, height, fallback }
const fileInput = ref(null)

// 压缩设置
const targetKb = ref(200)
const format = ref('auto')
const maxDim = ref(0) // 0 = 保持原始尺寸

const formats = [
  { value: 'auto', label: '自动' },
  { value: 'image/jpeg', label: 'JPEG' },
  { value: 'image/png', label: 'PNG' },
  { value: 'image/webp', label: 'WebP' }
]

const dimOptions = [
  { value: 0, label: '原始' },
  { value: 2560, label: '2560px' },
  { value: 1920, label: '1920px' },
  { value: 1280, label: '1280px' }
]

const quickSizes = [50, 100, 200, 500, 1024]

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

const targetBytes = computed(() => Math.min(20480, Math.max(1, Number(targetKb.value) || 1)) * 1024)
const cropItem = () => images.value.find((i) => i.id === cropId.value) ?? null

function fmt(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/* ---------- 画布渲染 ---------- */

// 按缩放比例生成新画布
function resize(canvas, scale) {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(canvas.width * scale))
  c.height = Math.max(1, Math.round(canvas.height * scale))
  const ctx = c.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0, 0, c.width, c.height)
  return c
}

// 裁剪（+可选最长边限制）后的画布
function renderProcessed(item, max) {
  const { img, crop } = item
  const sx = crop ? crop.x * img.naturalWidth : 0
  const sy = crop ? crop.y * img.naturalHeight : 0
  const sw = crop ? crop.w * img.naturalWidth : img.naturalWidth
  const sh = crop ? crop.h * img.naturalHeight : img.naturalHeight
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(sw))
  c.height = Math.max(1, Math.round(sh))
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
  if (max && Math.max(c.width, c.height) > max) return resize(c, max / Math.max(c.width, c.height))
  return c
}

function refreshUrls(item) {
  item.thumbUrl = renderProcessed(item, 400).toDataURL('image/jpeg', 0.8)
  item.fullUrl = renderProcessed(item, 900).toDataURL('image/jpeg', 0.85)
}

/* ---------- 上传 ---------- */

let uid = 0

function loadImages(list) {
  errors.value = []
  for (const f of list) {
    if (!f.type.startsWith('image/')) continue
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      const item = { id: ++uid, name: f.name, type: f.type, size: f.size, file: f, img, crop: null, thumbUrl: '', fullUrl: '' }
      refreshUrls(item)
      images.value.push(item)
      results.value = results.value.filter((r) => r.id !== item.id)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      errors.value.push(`无法读取 ${f.name}`)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }
}

function pick(e) {
  loadImages([...e.target.files])
  e.target.value = ''
}

function onDrop(e) {
  dragOver.value = false
  loadImages([...(e.dataTransfer?.files ?? [])])
}

/* ---------- 裁剪 ---------- */

const clamp01 = (v) => Math.min(1, Math.max(0, v))

function startCrop(item) {
  cropId.value = item.id
  sel.value = item.crop
    ? { x0: item.crop.x, y0: item.crop.y, x1: item.crop.x + item.crop.w, y1: item.crop.y + item.crop.h }
    : null
}

function cancelCrop() {
  cropId.value = null
  sel.value = null
}

function cropDown(e) {
  const box = e.currentTarget.getBoundingClientRect()
  const x = clamp01((e.clientX - box.left) / box.width)
  const y = clamp01((e.clientY - box.top) / box.height)
  sel.value = { x0: x, y0: y, x1: x, y1: y }
  dragging.value = true
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function cropMove(e) {
  if (!dragging.value) return
  const box = e.currentTarget.getBoundingClientRect()
  sel.value = {
    ...sel.value,
    x1: clamp01((e.clientX - box.left) / box.width),
    y1: clamp01((e.clientY - box.top) / box.height)
  }
}

function cropUp() {
  dragging.value = false
}

function confirmCrop() {
  const item = cropItem()
  if (!item || !sel.value) return cancelCrop()
  const { x0, y0, x1, y1 } = sel.value
  const x = Math.min(x0, x1)
  const y = Math.min(y0, y1)
  const w = Math.abs(x1 - x0)
  const h = Math.abs(y1 - y0)
  item.crop = w > 0.02 && h > 0.02 ? { x, y, w, h } : null
  refreshUrls(item)
  cancelCrop()
}

function clearCrop(item) {
  item.crop = null
  refreshUrls(item)
}

function removeImage(id) {
  images.value = images.value.filter((i) => i.id !== id)
  const hit = results.value.find((r) => r.id === id)
  if (hit) {
    URL.revokeObjectURL(hit.url)
    results.value = results.value.filter((r) => r.id !== id)
  }
  if (cropId.value === id) cancelCrop()
}

/* ---------- 压缩 ---------- */

// JPEG 无透明通道，导出前铺白底
function toBlob(canvas, mime, quality) {
  let src = canvas
  if (mime === 'image/jpeg') {
    src = document.createElement('canvas')
    src.width = canvas.width
    src.height = canvas.height
    const ctx = src.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, src.width, src.height)
    ctx.drawImage(canvas, 0, 0)
  }
  return new Promise((resolve) => src.toBlob(resolve, mime, quality))
}

// 在固定尺寸下二分查找可满足目标大小的画质
async function qualitySearch(canvas, target, mime) {
  let lo = 0.05
  let hi = 0.95
  let best = null
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2
    const blob = await toBlob(canvas, mime, mid)
    if (!blob) break
    if (blob.size <= target) {
      best = { blob, quality: mid }
      lo = mid + 0.03
    } else {
      hi = mid - 0.03
    }
    if (lo > hi) break
  }
  return best
}

// PNG 无画质参数，二分查找可满足目标大小的缩放比例
async function scaleSearch(canvas, target, mime) {
  let lo = 0.1
  let hi = 0.95
  let best = null
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2
    const c = resize(canvas, mid)
    const blob = await toBlob(c, mime)
    if (!blob) break
    if (blob.size <= target) {
      best = { blob, canvas: c }
      lo = mid + 0.02
    } else {
      hi = mid - 0.02
    }
    if (lo > hi) break
  }
  return best
}

async function compressCanvas(canvas, target, mime) {
  const lossy = mime !== 'image/png'
  const first = await toBlob(canvas, mime, lossy ? 0.92 : undefined)
  if (!first) return null
  if (first.size <= target) return { blob: first, canvas }

  if (!lossy) {
    const scaled = await scaleSearch(canvas, target, mime)
    return scaled ?? { blob: first, canvas, fallback: true }
  }

  let scale = 0.85
  for (let round = 0; round < 8; round++) {
    const c = resize(canvas, scale)
    const best = await qualitySearch(c, target, mime)
    if (best) return { ...best, canvas: c }
    scale *= 0.85
  }
  const tiny = resize(canvas, scale)
  return { blob: await toBlob(tiny, mime, 0.05), canvas: tiny, fallback: true }
}

function outputMime(item) {
  if (format.value !== 'auto') return format.value
  if (item.type === 'image/png') return 'image/png'
  if (item.type === 'image/webp') return 'image/webp'
  return 'image/jpeg'
}

function outputName(item, mime) {
  const base = item.name.replace(/\.[^.]+$/, '') || 'image'
  return `${base}-compressed.${EXT[mime] ?? 'jpg'}`
}

function clearResults() {
  for (const r of results.value) URL.revokeObjectURL(r.url)
  results.value = []
}

async function compress() {
  if (!images.value.length || compressing.value) return
  compressing.value = true
  errors.value = []
  clearResults()
  try {
    for (const item of images.value) {
      const mime = outputMime(item)
      const target = targetBytes.value

      // 原图已小于目标且未裁剪、未缩放、格式不变时直接沿用原文件
      if (!item.crop && !maxDim.value && format.value === 'auto' && item.size <= target) {
        results.value.push({
          id: item.id,
          name: item.name,
          url: URL.createObjectURL(item.file),
          originalSize: item.size,
          size: item.size,
          width: item.img.naturalWidth,
          height: item.img.naturalHeight,
          unchanged: true
        })
        continue
      }

      const canvas = renderProcessed(item, maxDim.value)
      const r = await compressCanvas(canvas, target, mime)
      if (!r?.blob) {
        errors.value.push(`${item.name}：当前浏览器不支持导出 ${mime === 'image/webp' ? 'WebP' : mime}，请更换输出格式`)
        continue
      }
      results.value.push({
        id: item.id,
        name: outputName(item, mime),
        url: URL.createObjectURL(r.blob),
        originalSize: item.size,
        size: r.blob.size,
        width: r.canvas.width,
        height: r.canvas.height,
        fallback: !!r.fallback
      })
    }
  } catch (e) {
    errors.value.push(`压缩失败：${e?.message ?? '未知错误'}`)
  }
  compressing.value = false
}

const totalOriginal = computed(() => images.value.reduce((s, i) => s + i.size, 0))
const savedPercent = (r) => (r.originalSize ? Math.max(0, Math.round((1 - r.size / r.originalSize) * 100)) : 0)
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="图片压缩" class="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">图片压缩</p>
                <p class="text-fine-print text-ink-muted-48">上传图片 · 裁剪取景 · 设定目标大小后压缩导出</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="pick" />

              <!-- 上传区 -->
              <button
                v-if="!cropItem()"
                type="button"
                class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-dashed py-apple-lg text-caption-strong transition active:scale-[0.99]"
                :class="dragOver ? 'border-primary bg-primary/5 text-ink' : 'border-black/15 text-ink-muted-80 hover:border-primary hover:bg-primary/5 hover:text-ink'"
                @click="fileInput.click()"
                @dragover.prevent="dragOver = true"
                @dragleave="dragOver = false"
                @drop.prevent="onDrop"
              >
                <span class="text-2xl">📥</span>
                点击选择图片，或将图片拖拽到此处（可多选）
              </button>

              <p v-for="(err, i) in errors" :key="i" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ err }}</p>

              <!-- 压缩设置 -->
              <div v-if="images.length && !cropItem()" class="flex flex-col gap-apple-md rounded-apple-lg bg-canvas-parchment p-apple-md">
                <div>
                  <label for="target-size" class="text-caption-strong text-ink-muted-80">压缩后大小（每张图片的上限）</label>
                  <div class="mt-apple-xs flex flex-wrap items-center gap-apple-sm">
                    <input
                      id="target-size"
                      v-model.number="targetKb"
                      type="number"
                      min="1"
                      max="20480"
                      step="10"
                      inputmode="numeric"
                      class="w-[120px] rounded-apple-md border border-hairline bg-surface-pearl px-apple-md py-apple-sm text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
                    />
                    <span class="text-caption text-ink-muted-80">KB</span>
                    <div class="flex flex-wrap gap-apple-xs">
                      <button
                        v-for="q in quickSizes"
                        :key="q"
                        type="button"
                        class="rounded-pill px-apple-sm py-apple-xs text-fine-print transition active:scale-[0.95]"
                        :class="targetKb === q ? 'bg-primary text-on-primary' : 'bg-canvas text-ink-muted-80 hover:text-ink'"
                        @click="targetKb = q"
                      >{{ q >= 1024 ? `${q / 1024}MB` : `${q}KB` }}</button>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap gap-apple-lg">
                  <div>
                    <p class="text-caption-strong text-ink-muted-80">输出格式</p>
                    <div class="mt-apple-xs flex flex-wrap gap-apple-xs" role="group" aria-label="输出格式">
                      <button
                        v-for="f in formats"
                        :key="f.value"
                        type="button"
                        :aria-pressed="format === f.value"
                        class="rounded-pill px-apple-md py-apple-xs text-fine-print transition active:scale-[0.95]"
                        :class="format === f.value ? 'bg-primary text-on-primary' : 'bg-canvas text-ink-muted-80 hover:text-ink'"
                        @click="format = f.value"
                      >{{ f.label }}</button>
                    </div>
                  </div>

                  <div>
                    <p class="text-caption-strong text-ink-muted-80">最长边限制</p>
                    <div class="mt-apple-xs flex flex-wrap gap-apple-xs" role="group" aria-label="最长边限制">
                      <button
                        v-for="d in dimOptions"
                        :key="d.value"
                        type="button"
                        :aria-pressed="maxDim === d.value"
                        class="rounded-pill px-apple-md py-apple-xs text-fine-print transition active:scale-[0.95]"
                        :class="maxDim === d.value ? 'bg-primary text-on-primary' : 'bg-canvas text-ink-muted-80 hover:text-ink'"
                        @click="maxDim = d.value"
                      >{{ d.label }}</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 图片列表 -->
              <div v-if="images.length && !cropItem()" class="grid grid-cols-2 gap-apple-md sm:grid-cols-3 lg:grid-cols-4">
                <div v-for="item in images" :key="item.id" class="flex flex-col gap-apple-xs rounded-apple-lg border border-divider-soft bg-canvas p-apple-sm shadow-hairline">
                  <div class="flex h-[130px] items-center justify-center overflow-hidden rounded-apple-md bg-canvas-parchment">
                    <img :src="item.thumbUrl" :alt="item.name" class="max-h-full max-w-full object-contain" />
                  </div>
                  <p class="truncate text-fine-print text-ink-muted-48" :title="item.name">{{ item.name }}</p>
                  <p class="text-fine-print text-ink-muted-48">
                    {{ fmt(item.size) }} · {{ item.img.naturalWidth }}×{{ item.img.naturalHeight }}
                  </p>
                  <div class="flex items-center justify-between">
                    <button
                      type="button"
                      class="rounded-pill bg-canvas-parchment px-apple-sm py-apple-xs text-fine-print text-ink transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.95]"
                      @click="startCrop(item)"
                    >裁剪</button>
                    <button
                      type="button"
                      aria-label="移除"
                      class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink-muted-48 transition hover:bg-red-50 hover:text-red-500 active:scale-[0.9]"
                      @click="removeImage(item.id)"
                    >✕</button>
                  </div>
                  <span v-if="item.crop" class="text-fine-print text-emerald-600">
                    已裁剪 · <button type="button" class="underline" @click="clearCrop(item)">还原</button>
                  </span>
                </div>
              </div>

              <!-- 裁剪模式 -->
              <div v-if="cropItem()" class="flex flex-col items-center gap-apple-md">
                <p class="text-caption-strong text-ink">裁剪：在图上按住拖动选取保留区域</p>
                <div
                  class="relative cursor-crosshair touch-none select-none overflow-hidden rounded-apple-md"
                  @pointerdown="cropDown"
                  @pointermove="cropMove"
                  @pointerup="cropUp"
                  @pointercancel="cropUp"
                >
                  <img :src="cropItem().fullUrl" alt="裁剪预览" class="pointer-events-none block max-h-[46vh]" />
                  <div
                    v-if="sel"
                    class="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                    :style="{
                      left: Math.min(sel.x0, sel.x1) * 100 + '%',
                      top: Math.min(sel.y0, sel.y1) * 100 + '%',
                      width: Math.abs(sel.x1 - sel.x0) * 100 + '%',
                      height: Math.abs(sel.y1 - sel.y0) * 100 + '%'
                    }"
                  />
                </div>
                <div class="flex gap-apple-sm">
                  <button type="button" class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition hover:opacity-90 active:scale-[0.97]" @click="confirmCrop">确认裁剪</button>
                  <button type="button" class="rounded-pill bg-canvas-parchment px-apple-lg py-apple-sm text-caption-strong text-ink transition hover:text-ink-muted-80 active:scale-[0.97]" @click="cancelCrop">取消</button>
                </div>
              </div>

              <!-- 压缩结果 -->
              <div v-if="results.length" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                <p class="text-caption-strong text-ink">压缩结果（目标 ≤ {{ targetKb }}KB）</p>
                <div
                  v-for="r in results"
                  :key="r.id"
                  class="flex flex-wrap items-center justify-between gap-apple-sm rounded-apple-md bg-canvas p-apple-sm shadow-hairline"
                >
                  <div class="min-w-0">
                    <p class="truncate text-caption-strong text-ink" :title="r.name">{{ r.name }}</p>
                    <p class="text-fine-print text-ink-muted-48">
                      {{ fmt(r.originalSize) }} → {{ fmt(r.size) }} · {{ r.width }}×{{ r.height }}
                      <span v-if="!r.unchanged"> · 省 {{ savedPercent(r) }}%</span>
                      <span v-else> · 原图已满足目标，未重编码</span>
                    </p>
                    <p v-if="r.fallback" class="text-fine-print text-amber-600">已尽力压缩，仍略大于目标大小</p>
                  </div>
                  <a
                    :href="r.url"
                    :download="r.name"
                    class="shrink-0 rounded-pill bg-primary px-apple-md py-apple-xs text-fine-print text-on-primary transition hover:opacity-90 active:scale-[0.97]"
                  >下载</a>
                </div>
              </div>
            </div>

            <!-- 底部操作 -->
            <div v-if="!cropItem()" class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span class="text-fine-print text-ink-muted-48">
                {{ images.length ? `共 ${images.length} 张 · 原图 ${fmt(totalOriginal)}` : '支持 JPG / PNG / WebP 等常见格式' }}
              </span>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!images.length || compressing"
                @click="compress"
              >{{ compressing ? '压缩中…' : '开始压缩' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
