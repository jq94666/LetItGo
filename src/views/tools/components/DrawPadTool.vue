<script setup>
import { nextTick, ref, watch } from 'vue'

/* ---------- 工具弹窗 ---------- */
const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

/* ---------- 画布 ---------- */
// 内部分辨率固定，保证导出清晰；CSS 缩放到弹窗宽度
const W = 1600
const H = 1000
const canvasEl = ref(null)
const drawing = ref(false)
const hasInk = ref(false) // 是否有笔迹，控制「下载」可用
let ctx = null

function prepare() {
  const cv = canvasEl.value
  if (!cv) return
  cv.width = W
  cv.height = H
  ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 9
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  hasInk.value = false
}

// 把指针坐标换算成画布内部坐标（画布可能被 CSS 缩放）
function toLocal(e) {
  const cv = canvasEl.value
  const r = cv.getBoundingClientRect()
  return {
    x: ((e.clientX - r.left) * W) / r.width,
    y: ((e.clientY - r.top) * H) / r.height
  }
}

function onDown(e) {
  if (!ctx) return
  e.preventDefault()
  const p = toLocal(e)
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  drawing.value = true
  hasInk.value = true
  try {
    canvasEl.value?.setPointerCapture?.(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onMove(e) {
  if (!drawing.value || !ctx) return
  const p = toLocal(e)
  ctx.lineTo(p.x, p.y)
  ctx.stroke()
}

function onUp() {
  drawing.value = false
}

function clearPad() {
  if (!ctx) return
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  hasInk.value = false
}

function download() {
  const cv = canvasEl.value
  if (!cv || !hasInk.value) return
  const a = document.createElement('a')
  const stamp = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  a.href = cv.toDataURL('image/png')
  a.download = `画板-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}${pad(stamp.getSeconds())}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// 画布随弹窗 v-if 挂载：打开并渲染后再准备空白画板；再次打开自动重置为新板
watch(open, async (v) => {
  if (!v) {
    ctx = null
    return
  }
  await nextTick()
  requestAnimationFrame(prepare)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-md backdrop-blur-sm sm:p-apple-xl"
        @click.self="open = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="简易画板"
          class="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product"
        >
          <!-- 头部 -->
          <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
            <div class="min-w-0">
              <p class="text-body-strong text-ink">简易画板</p>
            </div>
            <button
              type="button"
              aria-label="关闭"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
              @click="open = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="flex min-h-0 flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
            <div class="flex items-center gap-apple-sm">
              <button
                type="button"
                class="rounded-apple-md bg-canvas-parchment px-apple-md py-apple-xs text-button-utility text-ink-muted-80 transition hover:bg-surface-pearl hover:text-ink active:scale-[0.98]"
                @click="clearPad"
              >清空</button>
              <button
                type="button"
                :disabled="!hasInk"
                class="ml-auto rounded-apple-md bg-primary px-apple-md py-apple-xs text-button-utility text-on-primary transition hover:bg-primary-focus active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                @click="download"
              >下载 PNG</button>
            </div>

            <!-- 画布 -->
            <div
              class="w-full overflow-hidden rounded-apple-md bg-white shadow-hairline ring-1 ring-black/10"
            >
              <canvas
                ref="canvasEl"
                class="block w-full touch-none cursor-crosshair select-none"
                aria-label="画板，用鼠标或手指书写"
                @pointerdown="onDown"
                @pointermove="onMove"
                @pointerup="onUp"
                @pointercancel="onUp"
                @contextmenu.prevent
              />
            </div>

            <p class="text-fine-print text-ink-muted-48">在白色区域按住书写黑色笔迹，完成后点击「下载 PNG」保存图片。</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
