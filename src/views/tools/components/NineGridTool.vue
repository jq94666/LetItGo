<script setup>
import { computed, ref, watch } from 'vue'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

/* 转九宫格图：上传一张图 → 选比例出现等比裁剪框（可拖动移动、右下手柄缩放）
   → 按框选区域 3×3 等分切 9 张 JPEG，供朋友圈按 1→9 顺序上传。 */

const item = ref(null) // { name, img, url }
const busy = ref(false)
const error = ref('')
const tiles = ref([]) // [{ index, url, name }]
const generated = ref(false)
const dragOver = ref(false)
const fileInput = ref(null)

const RATIOS = [
  { value: '1:1', w: 1, h: 1, label: '1:1 方图' },
  { value: '3:4', w: 3, h: 4, label: '3:4 竖' },
  { value: '4:3', w: 4, h: 3, label: '4:3 横' },
  { value: '9:16', w: 9, h: 16, label: '9:16 竖长' },
  { value: '16:9', w: 16, h: 9, label: '16:9 横长' }
]
const ratio = ref('1:1')
const ratioObj = computed(() => RATIOS.find((r) => r.value === ratio.value) ?? RATIOS[0])

/* ---------- 比例裁剪框：归一化坐标 {x, y, w}，高度由比例与图片宽高比推导 ---------- */

const frame = ref(null) // null = 未初始化
const imgBox = ref(null)
const dragMode = ref(null) // 'move' | 'resize' | null
let dragStart = null

const imgAspect = computed(() =>
  item.value ? item.value.img.naturalWidth / item.value.img.naturalHeight : 1
)
const frameRatio = computed(() => ratioObj.value.w / ratioObj.value.h)

// 框宽为 w（归一化）时的高（归一化）：像素高 = w*imgW/frameRatio
function frameHOf(w) {
  return (w * imgAspect.value) / frameRatio.value
}
const frameH = computed(() => (frame.value ? frameHOf(frame.value.w) : 0))

// 框宽上限：不超出图片（w ≤ 1 且推导高 ≤ 1）
const frameWMax = computed(() => Math.min(1, frameRatio.value / imgAspect.value))
// 框宽下限：像素宽度至少 48px，保证可操作
const frameWMin = computed(() =>
  item.value ? Math.min(frameWMax.value, 48 / item.value.img.naturalWidth) : 0.05
)

// 把框重置为当前比例下「最大且居中」
function fitFrame() {
  if (!item.value) return
  const w = frameWMax.value
  frame.value = { x: (1 - w) / 2, y: (1 - frameHOf(w)) / 2, w }
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function onFrameDown(e) {
  if (!frame.value) return
  dragMode.value = 'move'
  dragStart = { px: e.clientX, py: e.clientY, f: { ...frame.value } }
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId)
  } catch {
    /* 指针已释放等场景忽略 */
  }
}
function onHandleDown(e) {
  if (!frame.value) return
  e.stopPropagation() // 不触发外层选框的移动
  dragMode.value = 'resize'
  dragStart = { px: e.clientX, py: e.clientY, f: { ...frame.value } }
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId)
  } catch {
    /* 指针已释放等场景忽略 */
  }
}
function onPointerMove(e) {
  if (!dragMode.value || !item.value || !frame.value) return
  const rect = imgBox.value?.getBoundingClientRect()
  if (!rect?.width) return
  const dxN = (e.clientX - dragStart.px) / rect.width
  const dyN = (e.clientY - dragStart.py) / rect.height
  const f = dragStart.f
  if (dragMode.value === 'move') {
    frame.value.x = clamp(f.x + dxN, 0, 1 - f.w)
    frame.value.y = clamp(f.y + dyN, 0, 1 - frameHOf(f.w))
  } else {
    // 右下角手柄：取横向/纵向位移中对应出的更大缩放，保持比例
    const imgW = item.value.img.naturalWidth
    const startWpx = f.w * imgW
    const startHpx = (f.w * imgW) / frameRatio.value
    const newWpx = Math.max(startWpx + (e.clientX - dragStart.px), (startHpx + (e.clientY - dragStart.py)) * frameRatio.value)
    frame.value.w = clamp(newWpx / imgW, frameWMin.value, frameWMax.value)
    // 左上角锚定：位置夹回图片范围内
    frame.value.x = clamp(f.x, 0, 1 - frame.value.w)
    frame.value.y = clamp(f.y, 0, 1 - frameHOf(frame.value.w))
  }
}
function onPointerUp() {
  if (!dragMode.value) return
  dragMode.value = null
  dragStart = null
  // 已生成过预览时，拖完自动重新切图，保持预览与选框一致
  if (generated.value) generate()
}

const frameStyle = computed(() =>
  frame.value
    ? {
        left: frame.value.x * 100 + '%',
        top: frame.value.y * 100 + '%',
        width: frame.value.w * 100 + '%',
        height: frameH.value * 100 + '%'
      }
    : {}
)

/* ---------- 切图 ---------- */

const TILE_CAP = 1080 // 单块最长边上限，避免超大图切出内存爆炸的画布

function generate() {
  const it = item.value
  if (!it || !frame.value || busy.value) return
  busy.value = true
  error.value = ''
  try {
    const img = it.img
    const cw = Math.floor(frame.value.w * img.naturalWidth / 3)
    const ch = Math.floor(frameH.value * img.naturalHeight / 3)
    if (cw < 8 || ch < 8) {
      error.value = '裁剪区域太小，请放大选框'
      busy.value = false
      return
    }
    const sx0 = Math.round(frame.value.x * img.naturalWidth)
    const sy0 = Math.round(frame.value.y * img.naturalHeight)
    const scale = Math.min(1, TILE_CAP / Math.max(cw, ch))
    const tw = Math.max(1, Math.round(cw * scale))
    const th = Math.max(1, Math.round(ch * scale))
    const base = it.name.replace(/\.[^.]+$/, '') || 'image'
    const list = []
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const c = document.createElement('canvas')
        c.width = tw
        c.height = th
        const ctx = c.getContext('2d')
        ctx.fillStyle = '#ffffff' // JPEG 无透明通道
        ctx.fillRect(0, 0, tw, th)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, sx0 + col * cw, sy0 + row * ch, cw, ch, 0, 0, tw, th)
        const index = row * 3 + col + 1
        list.push({ index, w: tw, h: th, url: c.toDataURL('image/jpeg', 0.92), name: `${base}-九宫格-${index}.jpg` })
      }
    }
    tiles.value = list
    generated.value = true
  } catch (e) {
    error.value = `生成失败：${e?.message ?? '未知错误'}`
  }
  busy.value = false
}

// 切换比例 → 选框换成该比例的最大居中形状；已生成过则自动重切
watch(ratio, () => {
  fitFrame()
  if (item.value && generated.value) generate()
})

const tileInfo = computed(() => {
  if (!tiles.value[0]) return ''
  return `每张 ${tiles.value[0].w} × ${tiles.value[0].h} px`
})

/* ---------- 上传 ---------- */

function pick(e) {
  if (e.target.files?.[0]) loadFile(e.target.files[0])
  e.target.value = ''
}

function onDrop(e) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) loadFile(f)
}

function loadFile(f) {
  if (!f.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  error.value = ''
  if (item.value?.url) URL.revokeObjectURL(item.value.url)
  const url = URL.createObjectURL(f)
  const img = new Image()
  img.onload = () => {
    // 注意：url 不能在此处 revoke——裁剪预览的 <img :src="item.url"> 还要用它
    item.value = { name: f.name, size: f.size, img, url }
    tiles.value = []
    generated.value = false
    fitFrame()
  }
  img.onerror = () => {
    error.value = '无法读取该图片'
    URL.revokeObjectURL(url)
  }
  img.src = url
}

/* ---------- 下载 ---------- */

function downloadTile(t) {
  const a = document.createElement('a')
  a.href = t.url
  a.download = t.name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function downloadAll() {
  // 连续触发下载：间隔给浏览器留出弹窗/队列时间，保持 1→9 顺序
  tiles.value.forEach((t, i) => {
    setTimeout(() => downloadTile(t), i * 250)
  })
}

function reset() {
  if (item.value?.url) URL.revokeObjectURL(item.value.url)
  item.value = null
  tiles.value = []
  generated.value = false
  frame.value = null
  error.value = ''
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="转九宫格图" class="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">转九宫格图</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="pick" />

              <!-- 上传区 -->
              <button
                v-if="!item"
                type="button"
                class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-dashed py-apple-lg text-caption-strong transition active:scale-[0.99]"
                :class="dragOver ? 'border-primary bg-primary/5 text-ink' : 'border-black/15 text-ink-muted-80 hover:border-primary hover:bg-primary/5 hover:text-ink'"
                @click="fileInput.click()"
                @dragover.prevent="dragOver = true"
                @dragleave="dragOver = false"
                @drop.prevent="onDrop"
              >
                <span class="text-2xl">🧩</span>
                点击选择图片，或拖拽到此处
              </button>

              <p v-if="error" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ error }}</p>

              <template v-if="item">
                <!-- 比例选择：决定裁剪框形状 -->
                <div class="flex flex-wrap items-center gap-apple-sm rounded-apple-lg bg-canvas-parchment p-apple-md">
                  <div class="min-w-0 flex-1">
                    <p class="text-caption-strong text-ink-muted-80">选框比例</p>
                    <div class="mt-apple-xs flex flex-wrap gap-apple-xs" role="group" aria-label="选框比例">
                      <button
                        v-for="r in RATIOS"
                        :key="r.value"
                        type="button"
                        :aria-pressed="ratio === r.value"
                        class="rounded-pill px-apple-md py-apple-xs text-fine-print transition active:scale-[0.95]"
                        :class="ratio === r.value ? 'bg-primary text-on-primary' : 'bg-canvas text-ink-muted-80 hover:text-ink'"
                        @click="ratio = r.value"
                      >{{ r.label }}</button>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 rounded-pill bg-canvas px-apple-md py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-ink active:scale-[0.95]"
                    @click="reset"
                  >重新选图</button>
                </div>

                <!-- 图片 + 比例裁剪框 -->
                <div class="flex flex-col items-center gap-apple-sm">
                  <div
                    ref="imgBox"
                    class="relative inline-block max-w-full select-none overflow-hidden touch-none"
                  >
                    <img :src="item.url" alt="裁剪原图" draggable="false" class="pointer-events-none block max-h-[46vh] max-w-full" />
                    <div
                      v-if="frame"
                      class="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                      :class="dragMode === 'move' ? 'cursor-grabbing' : 'cursor-move'"
                      :style="frameStyle"
                      @pointerdown="onFrameDown"
                      @pointermove="onPointerMove"
                      @pointerup="onPointerUp"
                      @pointercancel="onPointerUp"
                    >
                      <!-- 右下角缩放手柄 -->
                      <span
                        class="absolute -right-1.5 -bottom-1.5 flex h-6 w-6 cursor-nwse-resize touch-none items-center justify-center rounded-full bg-white text-[10px] text-ink-muted-80 shadow-hairline ring-1 ring-black/10"
                        title="拖动缩放选框"
                        @pointerdown="onHandleDown"
                        @pointermove="onPointerMove"
                        @pointerup="onPointerUp"
                        @pointercancel="onPointerUp"
                      >⤡</span>
                    </div>
                  </div>
                  <p class="text-fine-print text-ink-muted-48">拖动选框调整位置，拖动右下角手柄缩放大小</p>
                </div>

                <!-- 九宫格预览 -->
                <div v-if="generated" class="flex flex-col items-center gap-apple-sm">
                  <div class="grid grid-cols-3 gap-[3px] rounded-apple-md bg-white p-[3px] shadow-hairline">
                    <button
                      v-for="t in tiles"
                      :key="t.index"
                      type="button"
                      class="relative overflow-hidden bg-canvas-parchment"
                      :aria-label="`下载第 ${t.index} 张`"
                      :title="`点击下载：${t.name}`"
                      @click="downloadTile(t)"
                    >
                      <img :src="t.url" :alt="`九宫格第 ${t.index} 张`" class="block aspect-square w-[26vw] max-w-[150px] object-cover sm:w-[140px]" />
                      <span class="absolute left-1 top-1 rounded-pill bg-black/35 px-1.5 py-[1px] text-[10px] leading-normal text-white">{{ t.index }}</span>
                    </button>
                  </div>
                  <p class="text-fine-print text-ink-muted-48">点击任意一格可单独下载 · {{ tileInfo }} · JPEG</p>
                </div>
              </template>
            </div>

            <!-- 底部操作 -->
            <div v-if="item" class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span class="text-fine-print text-ink-muted-48">
                {{ item.img.naturalWidth }}×{{ item.img.naturalHeight }} 原图 · {{ ratio }} 选框
              </span>
              <div class="flex gap-apple-sm">
                <button
                  v-if="generated"
                  type="button"
                  class="rounded-pill bg-canvas-parchment px-apple-lg py-apple-sm text-caption-strong text-ink transition hover:text-ink-muted-80 active:scale-[0.97]"
                  @click="downloadAll"
                >下载全部（9 张）</button>
                <button
                  type="button"
                  class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="busy"
                  @click="generate"
                >{{ busy ? '切图中…' : generated ? '重新生成' : '生成九宫格' }}</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
