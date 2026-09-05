<script setup>
import { ref } from 'vue'
import { PDFDocument } from 'pdf-lib'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })
const images = ref([]) // { id, name, img, rotation, crop, rotUrl, thumbUrl }
const cropId = ref(null) // 当前裁剪中的图片 id
const sel = ref(null) // 拖选区域 {x0,y0,x1,y1}（相对旋转后显示图）
const dragging = ref(false)
const generating = ref(false)
const result = ref(null) // { name, url }
const errors = ref([])
const fileInput = ref(null)
let uid = 0

const cropItem = () => images.value.find((i) => i.id === cropId.value) ?? null

/* ---------- 画布渲染 ---------- */

// 旋转（+可选裁剪）后的画布；maxDim 限制最大边长
function renderProcessed(item, maxDim) {
  const { img, rotation, crop } = item
  const swap = rotation % 180 !== 0
  const rot = document.createElement('canvas')
  rot.width = swap ? img.naturalHeight : img.naturalWidth
  rot.height = swap ? img.naturalWidth : img.naturalHeight
  const ctx = rot.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, rot.width, rot.height)
  ctx.translate(rot.width / 2, rot.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
  let out = rot
  if (crop) {
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(crop.w * rot.width))
    c.height = Math.max(1, Math.round(crop.h * rot.height))
    c.getContext('2d').drawImage(rot, crop.x * rot.width, crop.y * rot.height, c.width, c.height, 0, 0, c.width, c.height)
    out = c
  }
  if (maxDim && Math.max(out.width, out.height) > maxDim) {
    const s = maxDim / Math.max(out.width, out.height)
    const c = document.createElement('canvas')
    c.width = Math.round(out.width * s)
    c.height = Math.round(out.height * s)
    c.getContext('2d').drawImage(out, 0, 0, c.width, c.height)
    out = c
  }
  return out
}

function refreshUrls(item) {
  item.rotUrl = renderProcessed({ ...item, crop: null }, 900).toDataURL('image/jpeg', 0.85)
  item.thumbUrl = renderProcessed(item, 400).toDataURL('image/jpeg', 0.8)
}

/* ---------- 上传 / 旋转 / 裁剪 ---------- */

function loadImages(list) {
  errors.value = []
  for (const f of list) {
    if (!f.type.startsWith('image/')) continue
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => {
      const item = { id: ++uid, name: f.name, img, rotation: 0, crop: null, rotUrl: '', thumbUrl: '' }
      refreshUrls(item)
      images.value.push(item)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => errors.value.push(`无法读取 ${f.name}`)
    img.src = url
  }
}

function pick(e) {
  loadImages([...e.target.files])
  e.target.value = ''
}

/* ---------- 拖拽上传 ---------- */
const dragActive = ref(false)
let dragDepth = 0

function onDragEnter(e) {
  e.preventDefault()
  if (cropItem()) return
  dragDepth += 1
  dragActive.value = true
}
function onDragOver(e) {
  e.preventDefault()
}
function onDragLeave(e) {
  e.preventDefault()
  if (cropItem()) return
  dragDepth -= 1
  if (dragDepth <= 0) {
    dragDepth = 0
    dragActive.value = false
  }
}
function onDrop(e) {
  e.preventDefault()
  dragDepth = 0
  dragActive.value = false
  if (cropItem()) return
  const files = e.dataTransfer ? [...e.dataTransfer.files] : []
  if (files.length) loadImages(files)
}

// 裁剪区域随显示旋转变换（归一化坐标）
function rotateRect(r, dir) {
  if (dir > 0) return { x: 1 - r.y - r.h, y: r.x, w: r.h, h: r.w }
  return { x: r.y, y: 1 - r.x - r.w, w: r.h, h: r.w }
}

function rotate(item, dir) {
  item.rotation = (item.rotation + dir + 360) % 360
  if (item.crop) item.crop = rotateRect(item.crop, dir)
  refreshUrls(item)
}

function startCrop(item) {
  cropId.value = item.id
  sel.value = item.crop ? { x0: item.crop.x, y0: item.crop.y, x1: item.crop.x + item.crop.w, y1: item.crop.y + item.crop.h } : null
}

function cancelCrop() {
  cropId.value = null
  sel.value = null
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))

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
  sel.value = { ...sel.value, x1: clamp01((e.clientX - box.left) / box.width), y1: clamp01((e.clientY - box.top) / box.height) }
}
function cropUp() {
  dragging.value = false
}

function confirmCrop() {
  const item = cropItem()
  if (!item || !sel.value) { cancelCrop(); return }
  const { x0, y0, x1, y1 } = sel.value
  const x = Math.min(x0, x1), y = Math.min(y0, y1)
  const w = Math.abs(x1 - x0), h = Math.abs(y1 - y0)
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
  if (cropId.value === id) cancelCrop()
}

/* ---------- 生成 PDF ---------- */

async function generate() {
  if (!images.value.length || generating.value) return
  generating.value = true
  errors.value = []
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = null
  try {
    const pdf = await PDFDocument.create()
    for (const item of images.value) {
      const canvas = renderProcessed(item, 2400)
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9))
      const jpg = await pdf.embedJpg(await blob.arrayBuffer())
      const w = 595
      const h = (w * canvas.height) / canvas.width
      pdf.addPage([w, h]).drawImage(jpg, { x: 0, y: 0, width: w, height: h })
    }
    const bytes = await pdf.save()
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
    result.value = { name: '图片转PDF.pdf', url }
  } catch (e) {
    errors.value.push(`生成失败：${e.message}`)
  }
  generating.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="图片转PDF" class="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">图片转PDF</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div
              class="relative flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg"
              @dragenter="onDragEnter"
              @dragover="onDragOver"
              @dragleave="onDragLeave"
              @drop="onDrop"
            >
              <!-- 拖拽上传高亮 -->
              <div
                v-if="dragActive"
                class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-apple-lg border-2 border-dashed border-primary bg-primary/10"
              >
                <span class="text-caption-strong text-primary">松开以上传图片</span>
              </div>
              <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="pick" />
              <button
                v-if="!cropItem()"
                type="button"
                class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-dashed border-black/15 py-apple-lg text-caption-strong text-ink-muted-80 transition hover:border-primary hover:bg-primary/5 hover:text-ink active:scale-[0.99]"
                @click="fileInput.click()"
              >
                <span class="text-2xl">📥</span>
                点击选择图片，或将图片拖拽到此处（可多选，顺序即页面顺序）
              </button>

              <p v-for="(err, i) in errors" :key="i" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ err }}</p>

              <!-- 图片列表：旋转 / 裁剪 / 删除 -->
              <div v-if="images.length && !cropItem()" class="grid grid-cols-2 gap-apple-md sm:grid-cols-3 lg:grid-cols-4">
                <div v-for="item in images" :key="item.id" class="flex flex-col gap-apple-xs rounded-apple-lg border border-divider-soft bg-canvas p-apple-sm shadow-hairline">
                  <div class="flex h-[130px] items-center justify-center overflow-hidden rounded-apple-md bg-canvas-parchment">
                    <img :src="item.thumbUrl" :alt="item.name" class="max-h-full max-w-full object-contain" />
                  </div>
                  <p class="truncate text-fine-print text-ink-muted-48" :title="item.name">{{ item.name }}</p>
                  <div class="flex items-center justify-between">
                    <span class="text-fine-print text-ink-muted-48">{{ item.rotation }}°</span>
                    <span class="flex items-center gap-apple-xs">
                      <button type="button" aria-label="逆时针旋转" class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.9]" title="逆时针旋转 90°" @click="rotate(item, -90)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v5h5" /></svg>
                      </button>
                      <button type="button" aria-label="顺时针旋转" class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.9]" title="顺时针旋转 90°" @click="rotate(item, 90)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v5h-5" /></svg>
                      </button>
                      <button type="button" class="rounded-pill bg-canvas-parchment px-apple-sm py-apple-xs text-fine-print text-ink transition hover:bg-surface-tile-1 hover:text-on-primary active:scale-[0.95]" @click="startCrop(item)">裁剪</button>
                      <button type="button" aria-label="移除" class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink-muted-48 transition hover:bg-red-50 hover:text-red-500 active:scale-[0.9]" @click="removeImage(item.id)">✕</button>
                    </span>
                  </div>
                  <span v-if="item.crop" class="text-fine-print text-emerald-600">已裁剪 · <button type="button" class="underline" @click="clearCrop(item)">还原</button></span>
                </div>
              </div>

              <!-- 裁剪模式：拖选区域 -->
              <div v-if="cropItem()" class="flex flex-col items-center gap-apple-md">
                <p class="text-caption-strong text-ink">裁剪：在图上按住拖动选取区域</p>
                <div
                  class="relative cursor-crosshair touch-none select-none overflow-hidden rounded-apple-md"
                  @pointerdown="cropDown"
                  @pointermove="cropMove"
                  @pointerup="cropUp"
                  @pointercancel="cropUp"
                >
                  <img :src="cropItem().rotUrl" alt="裁剪预览" class="block max-h-[46vh] pointer-events-none" />
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

              <!-- 生成结果 -->
              <div v-if="result" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                <p class="text-caption-strong text-ink">已生成（{{ images.length }} 页）</p>
                <a
                  :href="result.url"
                  :download="result.name"
                  class="flex items-center gap-apple-xs rounded-apple-md bg-canvas px-apple-md py-apple-sm text-caption-strong text-primary shadow-hairline transition hover:text-ink active:scale-[0.99]"
                >⬇️ {{ result.name }}</a>
              </div>
            </div>

            <!-- 底部操作 -->
            <div v-if="!cropItem()" class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span class="text-fine-print text-ink-muted-48">{{ images.length ? `共 ${images.length} 张图片` : '支持 JPG / PNG / WebP 等常见格式' }}</span>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!images.length || generating"
                @click="generate"
              >{{ generating ? '生成中…' : '生成 PDF' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>