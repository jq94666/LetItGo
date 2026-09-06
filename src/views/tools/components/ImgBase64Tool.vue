<script setup>
import { computed, ref } from 'vue'

// 图片 → 图片Base64互转：图片文件转 base64（dataURL），或 base64 反解回图片预览/下载
const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

// 方向：toB64 = 图片转 base64；toImg = base64 转图片
const mode = ref('toB64')

const copiedKey = ref('')
let copyTimer = null
async function copy(key, text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copiedKey.value = ''), 1400)
  } catch {
    /* 剪贴板不可用时静默忽略 */
  }
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/* ---------- 图片 → Base64 ---------- */
const fileInput = ref(null)
const dragOver = ref(false)
const fileError = ref('')
const picked = ref(null) // { name, type, size, dataURL }

function pickFile(file) {
  fileError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    fileError.value = '请选择图片文件'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    picked.value = { name: file.name, type: file.type, size: file.size, dataURL: String(reader.result || '') }
  }
  reader.onerror = () => {
    fileError.value = '读取文件失败'
  }
  reader.readAsDataURL(file)
}
function onPick(e) {
  pickFile(e.target.files?.[0])
  e.target.value = '' // 允许再次选择同一文件
}
function onDrop(e) {
  dragOver.value = false
  pickFile(e.dataTransfer?.files?.[0])
}

// 纯 base64 载荷（去掉 dataURL 前缀）
const b64Payload = computed(() => {
  const s = picked.value?.dataURL ?? ''
  const i = s.indexOf(',')
  return i >= 0 ? s.slice(i + 1) : s
})

/* ---------- Base64 → 图片 ---------- */
const b64Input = ref('')
const imgError = ref('')
const imgMeta = ref(null) // { mime, ext, bytes, w, h }

// 常见图片格式的 base64 头部特征，用于无 dataURL 前缀时识别类型
const SNIFFERS = [
  ['iVBORw0KGgo', 'image/png', 'png'],
  ['/9j/', 'image/jpeg', 'jpg'],
  ['R0lGOD', 'image/gif', 'gif'],
  ['UklGR', 'image/webp', 'webp']
]

const cleanB64 = computed(() => b64Input.value.replace(/\s+/g, ''))

const result = computed(() => {
  imgError.value = ''
  imgMeta.value = null
  const s = cleanB64.value
  if (!s) return null
  let payload = s
  let mime = ''
  // 带 dataURL 前缀时按声明取类型，否则按头部特征嗅探
  const m = s.match(/^data:([^;,]+);base64,(.*)$/)
  if (m) {
    ;[, mime, payload] = m
  } else {
    const hit = SNIFFERS.find(([head]) => s.startsWith(head))
    mime = hit?.[1] ?? (s.startsWith('PHN2Zw') || s.startsWith('PD94bWw') ? 'image/svg+xml' : '')
  }
  if (!mime) {
    imgError.value = '无法识别图片格式（支持 PNG / JPEG / GIF / WebP / SVG）'
    return null
  }
  if (!/^[A-Za-z0-9+/\-_]+=*$/.test(payload)) {
    imgError.value = '不是有效的 base64 内容'
    return null
  }
  let bytes = 0
  try {
    // URL-safe base64 兼容：-_ 转回 +/
    bytes = atob(payload.replace(/-/g, '+').replace(/_/g, '/')).length
  } catch {
    imgError.value = 'base64 解码失败，请检查内容是否完整'
    return null
  }
  const ext = mime === 'image/svg+xml' ? 'svg' : (SNIFFERS.find(([, mm]) => mm === mime)?.[2] ?? (mime.split('/')[1] || 'img'))
  return { url: `data:${mime};base64,${payload}`, mime, ext, bytes }
})

function onImgLoad(e) {
  imgMeta.value = { w: e.target.naturalWidth, h: e.target.naturalHeight }
}
function onImgError() {
  if (result.value) imgError.value = '内容不是有效图片，无法渲染'
}

const downloadName = computed(() => `base64-图片.${result.value?.ext ?? 'png'}`)

function clearB64() {
  b64Input.value = ''
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="图片Base64互转" class="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">图片Base64互转</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <!-- 方向切换 -->
              <div class="flex flex-wrap gap-apple-xs" role="group" aria-label="转换方向">
                <button
                  type="button"
                  :aria-pressed="mode === 'toB64'"
                  class="rounded-pill px-apple-md py-apple-xs text-fine-print transition active:scale-[0.95]"
                  :class="mode === 'toB64' ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="mode = 'toB64'"
                >图片 → Base64</button>
                <button
                  type="button"
                  :aria-pressed="mode === 'toImg'"
                  class="rounded-pill px-apple-md py-apple-xs text-fine-print transition active:scale-[0.95]"
                  :class="mode === 'toImg' ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="mode = 'toImg'"
                >Base64 → 图片</button>
              </div>

              <!-- 图片 → Base64 -->
              <template v-if="mode === 'toB64'">
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPick" />
                <button
                  v-if="!picked"
                  type="button"
                  class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-dashed py-apple-lg text-caption-strong transition active:scale-[0.99]"
                  :class="dragOver ? 'border-primary bg-primary/5 text-ink' : 'border-black/15 text-ink-muted-80 hover:border-primary hover:bg-primary/5 hover:text-ink'"
                  @click="fileInput.click()"
                  @dragover.prevent="dragOver = true"
                  @dragleave="dragOver = false"
                  @drop.prevent="onDrop"
                >
                  <span class="text-2xl">📥</span>
                  点击选择图片，或将图片拖拽到此处
                </button>
                <p v-if="fileError" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ fileError }}</p>

                <template v-if="picked">
                  <div class="flex gap-apple-md rounded-apple-lg bg-canvas-parchment p-apple-md">
                    <img :src="picked.dataURL" alt="预览" class="h-20 w-20 shrink-0 rounded-apple-md border border-hairline object-contain" />
                    <div class="flex min-w-0 flex-col justify-center gap-apple-xs">
                      <p class="truncate text-caption-strong text-ink">{{ picked.name }}</p>
                      <p class="text-fine-print text-ink-muted-48">{{ picked.type || '未知类型' }} · 原始 {{ fmtSize(picked.size) }} · base64 约 {{ fmtSize(Math.floor((b64Payload.length * 3) / 4)) }}</p>
                      <div class="flex gap-apple-xs">
                        <button type="button" class="rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-ink active:scale-[0.95]" @click="fileInput.click()">换一张</button>
                        <button type="button" class="rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-ink active:scale-[0.95]" @click="picked = null">清除</button>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-col gap-apple-xs rounded-apple-lg border border-divider-soft bg-canvas-parchment p-apple-md">
                    <div class="flex items-center justify-between gap-apple-xs">
                      <label for="b64-out" class="min-w-0 text-caption-strong text-ink-muted-80">Base64 结果</label>
                      <div class="flex shrink-0 gap-apple-xs">
                        <button
                          type="button"
                          class="rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-ink active:scale-[0.95]"
                          @click="copy('raw', b64Payload)"
                        >{{ copiedKey === 'raw' ? '已复制' : '复制纯 base64' }}</button>
                        <button
                          type="button"
                          class="rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-ink active:scale-[0.95]"
                          @click="copy('url', picked.dataURL)"
                        >{{ copiedKey === 'url' ? '已复制' : '复制 dataURL' }}</button>
                      </div>
                    </div>
                    <textarea
                      id="b64-out"
                      :value="picked.dataURL"
                      readonly
                      rows="6"
                      class="w-full resize-none rounded-apple-md border border-hairline bg-surface-pearl p-apple-md font-mono text-fine-print leading-relaxed text-ink focus:outline-none"
                    ></textarea>
                  </div>
                </template>
              </template>

              <!-- Base64 → 图片 -->
              <template v-else>
                <div class="flex flex-col gap-apple-xs rounded-apple-lg border border-divider-soft bg-canvas-parchment p-apple-md">
                  <div class="flex items-center justify-between gap-apple-xs">
                    <label for="b64-in" class="min-w-0 text-caption-strong text-ink-muted-80">粘贴 base64 或 dataURL</label>
                    <button
                      v-if="b64Input"
                      type="button"
                      class="shrink-0 rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-ink active:scale-[0.95]"
                      @click="clearB64"
                    >清空</button>
                  </div>
                  <textarea
                    id="b64-in"
                    v-model="b64Input"
                    rows="6"
                    placeholder="data:image/png;base64,iVBORw0KGgo… 或纯 base64（自动识别 PNG / JPEG / GIF / WebP / SVG）"
                    spellcheck="false"
                    autocomplete="off"
                    class="w-full resize-none rounded-apple-md border border-hairline bg-surface-pearl p-apple-md font-mono text-fine-print leading-relaxed text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
                  ></textarea>
                </div>

                <p v-if="imgError" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ imgError }}</p>

                <div v-if="result && !imgError" class="flex gap-apple-md rounded-apple-lg bg-canvas-parchment p-apple-md">
                  <img :src="result.url" alt="预览" class="h-20 w-20 shrink-0 rounded-apple-md border border-hairline object-contain" @load="onImgLoad" @error="onImgError" />
                  <div class="flex min-w-0 flex-col justify-center gap-apple-xs">
                    <p class="text-caption-strong text-ink">{{ result.mime }}</p>
                    <p class="text-fine-print text-ink-muted-48">
                      解码后 {{ fmtSize(result.bytes) }}<template v-if="imgMeta"> · {{ imgMeta.w }}×{{ imgMeta.h }}</template>
                    </p>
                    <a
                      :href="result.url"
                      :download="downloadName"
                      class="w-fit rounded-pill bg-primary px-apple-md py-apple-xs text-fine-print text-on-primary transition active:scale-[0.95]"
                    >下载图片</a>
                  </div>
                </div>
              </template>

              <p class="text-fine-print text-ink-muted-48">纯 base64 会按文件头自动识别格式；带换行的内容会自动去除空白字符。</p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
