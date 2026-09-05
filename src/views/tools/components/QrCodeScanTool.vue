<script setup>
import { onBeforeUnmount, ref } from 'vue'
import jsQR from 'jsqr'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

const imageUrl = ref('') // 预览图
const fileName = ref('')
const result = ref('') // 解码结果
const error = ref('')
const loading = ref(false)
const copied = ref(false)

/* 拖拽高亮：用深度计数避免子元素进出导致闪烁 */
const dragDepth = ref(0)
const dragActive = ref(false)

const fileInput = ref(null)
function pickFile() {
  fileInput.value?.click()
}
function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) loadFile(file)
  e.target.value = '' // 允许重复选择同一文件
}

function onDragEnter() {
  dragDepth.value++
  dragActive.value = true
}
function onDragOver() {
  dragActive.value = true
}
function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) dragActive.value = false
}
function onDrop(e) {
  dragDepth.value = 0
  dragActive.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

function loadFile(file) {
  error.value = ''
  result.value = ''
  copied.value = false
  if (!file.type.startsWith('image/')) {
    error.value = '请上传图片文件（如 PNG / JPG）'
    return
  }
  fileName.value = file.name
  loading.value = true
  const reader = new FileReader()
  reader.onload = () => {
    imageUrl.value = reader.result
    const img = new Image()
    img.onload = () => {
      try {
        const decoded = decodeImage(img)
        if (decoded) result.value = decoded
        else error.value = '未能识别二维码，请换一张更清晰、完整的图片'
      } catch (err) {
        error.value = `识别失败：${err?.message ?? '未知错误'}`
      } finally {
        loading.value = false
      }
    }
    img.onerror = () => {
      loading.value = false
      error.value = '图片加载失败，请重试'
    }
    img.src = reader.result
  }
  reader.onerror = () => {
    loading.value = false
    error.value = '读取文件失败，请重试'
  }
  reader.readAsDataURL(file)
}

/* 将图片绘制到离屏 canvas，取出 RGBA 像素交给 jsQR 解码 */
function decodeImage(img) {
  const maxDim = 1600
  let { width, height } = img
  const scale = Math.min(1, maxDim / Math.max(width, height))
  width = Math.round(width * scale)
  height = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' })
  return code?.data ?? null
}

function isUrl(text) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(text.trim())
}

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    /* 剪贴板不可用时静默 */
  }
}

function reset() {
  imageUrl.value = ''
  fileName.value = ''
  result.value = ''
  error.value = ''
  loading.value = false
  copied.value = false
}

onBeforeUnmount(() => { imageUrl.value = '' })
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl"
        @click.self="open = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="扫描二维码"
          class="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product"
        >
          <!-- 头部 -->
          <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
            <div>
              <p class="text-body-strong text-ink">扫描二维码</p>
            </div>
            <button
              type="button"
              aria-label="关闭"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
              @click="open = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="min-h-0 flex-1 overflow-y-auto p-apple-md sm:p-apple-lg">
            <div class="grid grid-cols-1 gap-apple-lg lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <!-- 左：上传与预览 -->
              <section class="flex flex-col gap-apple-md">
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onFileChange"
                />

                <!-- 拖放 / 点击上传区 -->
                <div
                  class="relative flex min-h-[240px] flex-col items-center justify-center gap-apple-sm rounded-apple-md border border-dashed p-apple-lg text-center transition"
                  :class="dragActive ? 'border-primary bg-primary/5' : 'border-hairline bg-surface-pearl'"
                  @click="!imageUrl && pickFile()"
                  @dragenter.prevent="onDragEnter"
                  @dragover.prevent="onDragOver"
                  @dragleave.prevent="onDragLeave"
                  @drop.prevent="onDrop"
                >
                  <template v-if="imageUrl">
                    <img
                      :src="imageUrl"
                      :alt="fileName"
                      class="max-h-[300px] w-auto max-w-full rounded-apple-md object-contain ring-1 ring-black/5"
                    />
                    <p class="mt-apple-xs break-all text-fine-print text-ink-muted-48">{{ fileName }}</p>
                  </template>
                  <template v-else>
                    <span class="text-[32px] opacity-50">📷</span>
                    <p class="text-caption text-ink-muted-80">点击选择图片，或将二维码图片拖拽到此处</p>
                    <p class="text-fine-print text-ink-muted-48">支持 PNG / JPG 等常见格式</p>
                  </template>

                  <div
                    v-if="dragActive"
                    class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-apple-md bg-primary/10 text-caption-strong text-primary"
                  >
                    松开以上传图片
                  </div>
                </div>

                <div class="flex gap-apple-sm">
                  <button
                    type="button"
                    class="flex-1 rounded-apple-md bg-primary px-apple-md py-apple-sm text-button-utility text-on-primary transition hover:bg-primary-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
                    @click="pickFile"
                  >
                    {{ imageUrl ? '重新选择' : '选择图片' }}
                  </button>
                  <button
                    v-if="imageUrl"
                    type="button"
                    class="rounded-apple-md border border-hairline px-apple-md py-apple-sm text-button-utility text-ink-muted-80 transition hover:bg-surface-pearl hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
                    @click="reset"
                  >
                    清除
                  </button>
                </div>

                <p v-if="loading" class="text-fine-print text-ink-muted-48">识别中…</p>
                <p v-if="error" class="text-fine-print text-red-600">{{ error }}</p>
              </section>

              <!-- 右：识别结果 -->
              <section class="flex flex-col gap-apple-md">
                <p class="text-caption-strong text-ink-muted-80">识别结果</p>

                <div
                  class="flex min-h-[240px] flex-col gap-apple-sm rounded-apple-md border border-divider-soft bg-canvas-parchment p-apple-md"
                >
                  <p v-if="result" class="min-h-0 flex-1 whitespace-pre-wrap break-all font-mono text-caption leading-relaxed text-ink">
                    {{ result }}
                  </p>
                  <div v-else class="flex flex-1 flex-col items-center justify-center gap-apple-xs text-center">
                    <span class="text-[28px] opacity-40">🔎</span>
                    <p class="text-fine-print text-ink-muted-48">上传二维码后，识别内容将显示在这里</p>
                  </div>
                </div>

                <template v-if="result">
                  <a
                    v-if="isUrl(result)"
                    :href="result"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block w-full rounded-apple-md bg-primary px-apple-md py-apple-sm text-center text-button-utility text-on-primary transition hover:bg-primary-focus active:scale-[0.98]"
                  >打开链接</a>
                  <button
                    type="button"
                    class="w-full rounded-apple-md border border-hairline px-apple-md py-apple-sm text-button-utility text-ink-muted-80 transition hover:bg-surface-pearl hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
                    @click="copyResult"
                  >
                    {{ copied ? '已复制 ✓' : '复制内容' }}
                  </button>
                </template>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
