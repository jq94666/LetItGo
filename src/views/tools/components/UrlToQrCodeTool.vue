<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import QRCode from 'qrcode'

/* ---------- 输入与选项 ---------- */
const input = ref('')
const content = computed(() => input.value) // 直接编码用户输入，支持任意文本

// 若内容为网址，返回可直接跳转的链接（缺协议时补 https://）；否则为 null
const urlInfo = computed(() => {
  const text = input.value.trim()
  if (!text) return null
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return text
  if (/^\S+$/.test(text) && /^[\w-]+(\.[\w-]+)+([\w./?=&%#+-]*)?$/.test(text)) return `https://${text}`
  return null
})
const level = ref('M')
const size = ref(512)
const dataUrl = ref('')
const error = ref('')
const generating = ref(false)

const levels = [
  { value: 'L', label: 'L', desc: '7%' },
  { value: 'M', label: 'M', desc: '15%' },
  { value: 'Q', label: 'Q', desc: '25%' },
  { value: 'H', label: 'H', desc: '30%' }
]

const sizes = [256, 512, 1024]

// 文件名：取输入做安全化裁剪，最长 40 个字符；空输入回退为 qrcode
const fileName = computed(() => {
  const raw = input.value.trim().replace(/[\\/:*?"<>|]+/g, '_').slice(0, 40)
  return `${raw || 'qrcode'}-${size.value}.png`
})

/* ---------- 生成二维码 ---------- */
async function generate() {
  const text = content.value
  if (!text) {
    dataUrl.value = ''
    error.value = ''
    generating.value = false
    return
  }

  error.value = ''
  generating.value = true
  try {
    dataUrl.value = await QRCode.toDataURL(text, {
      errorCorrectionLevel: level.value,
      type: 'image/png',
      margin: 2,
      width: size.value,
      color: { dark: '#1d1d1f', light: '#ffffff' }
    })
  } catch (e) {
    dataUrl.value = ''
    error.value = `生成失败：${e?.message ?? '未知错误'}`
  } finally {
    generating.value = false
  }
}

// 输入/选项变化后防抖重新生成
let timer = null
watch([content, level, size], () => {
  clearTimeout(timer)
  timer = setTimeout(generate, 260)
})
onBeforeUnmount(() => clearTimeout(timer))

/* ---------- 操作 ---------- */
function clearInput() {
  input.value = ''
  dataUrl.value = ''
  error.value = ''
}

function download() {
  if (!dataUrl.value) return
  const link = document.createElement('a')
  link.href = dataUrl.value
  link.download = fileName.value
  document.body.appendChild(link)
  link.click()
  link.remove()
}

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })
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
          aria-label="二维码生成"
          class="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product"
        >
          <!-- 头部 -->
          <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
            <div>
              <p class="text-body-strong text-ink">二维码生成</p>
              <p class="text-fine-print text-ink-muted-48">输入文本或网址生成二维码 · 支持下载图片</p>
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
            <div class="grid grid-cols-1 gap-apple-lg lg:grid-cols-[minmax(0,1fr)_320px]">
              <!-- 左：输入与选项 -->
              <section class="flex flex-col gap-apple-md">
                <div>
                  <label for="qr-url-input" class="text-caption-strong text-ink-muted-80">文本或网址</label>
                  <div class="mt-apple-xs flex gap-apple-sm">
                    <input
                      id="qr-url-input"
                      v-model="input"
                      type="text"
                      autocomplete="off"
                      spellcheck="false"
                      placeholder="例如：一段文字，或 https://www.apple.com"
                      class="min-w-0 flex-1 rounded-apple-md border border-hairline bg-surface-pearl px-apple-md py-apple-sm text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
                      @keyup.enter="generate"
                    />
                    <button
                      type="button"
                      class="shrink-0 rounded-apple-md border border-hairline px-apple-md text-button-utility text-ink-muted-80 transition hover:bg-surface-pearl hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
                      @click="clearInput"
                    >
                      清空
                    </button>
                  </div>
                  <p v-if="error" class="mt-apple-xs text-fine-print text-red-600">{{ error }}</p>
                </div>

                <div>
                  <p class="text-caption-strong text-ink-muted-80">纠错级别</p>
                  <div class="mt-apple-xs flex flex-wrap gap-apple-xs" role="group" aria-label="纠错级别">
                    <button
                      v-for="item in levels"
                      :key="item.value"
                      type="button"
                      :aria-pressed="level === item.value"
                      class="flex items-baseline gap-1 rounded-apple-md px-apple-md py-apple-sm text-button-utility transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
                      :class="
                        level === item.value
                          ? 'bg-primary text-on-primary'
                          : 'bg-canvas-parchment text-ink-muted-80 hover:bg-surface-pearl hover:text-ink'
                      "
                      @click="level = item.value"
                    >
                      <span>{{ item.label }}</span>
                      <span class="text-fine-print opacity-70">{{ item.desc }}</span>
                    </button>
                  </div>
                  <p class="mt-apple-xs text-fine-print text-ink-muted-48">
                    纠错级别越高，二维码被遮挡后仍可识别的能力越强，图形也越密集。
                  </p>
                </div>

                <div>
                  <p class="text-caption-strong text-ink-muted-80">下载尺寸</p>
                  <div class="mt-apple-xs flex flex-wrap gap-apple-xs" role="group" aria-label="下载尺寸">
                    <button
                      v-for="item in sizes"
                      :key="item"
                      type="button"
                      :aria-pressed="size === item"
                      class="rounded-apple-md px-apple-md py-apple-sm text-button-utility transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
                      :class="
                        size === item
                          ? 'bg-primary text-on-primary'
                          : 'bg-canvas-parchment text-ink-muted-80 hover:bg-surface-pearl hover:text-ink'
                      "
                      @click="size = item"
                    >
                      {{ item }} px
                    </button>
                  </div>
                </div>
              </section>

              <!-- 右：预览与下载 -->
              <section class="flex flex-col items-center gap-apple-md">
                <div
                  class="flex h-[300px] w-full max-w-[320px] items-center justify-center rounded-apple-md border border-divider-soft bg-canvas-parchment p-apple-md"
                >
                  <img
                    v-if="dataUrl"
                    :src="dataUrl"
                    :alt="`${input} 的二维码`"
                    class="h-full w-full object-contain"
                  />
                  <div v-else class="flex flex-col items-center gap-apple-xs text-center">
                    <span class="text-[28px] opacity-40">🔳</span>
                    <p class="text-fine-print text-ink-muted-48">
                      {{ generating ? '生成中…' : '输入文本或网址后自动生成二维码' }}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  :disabled="!dataUrl"
                  class="w-full max-w-[320px] rounded-apple-md bg-primary px-apple-md py-apple-sm text-button-utility text-on-primary transition hover:bg-primary-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  @click="download"
                >
                  下载二维码图片
                </button>
                <a
                  v-if="urlInfo"
                  :href="urlInfo"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full max-w-[320px] rounded-apple-md border border-hairline px-apple-md py-apple-sm text-center text-button-utility text-ink-muted-80 transition hover:bg-surface-pearl hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
                >打开链接</a>
                <p class="text-fine-print text-ink-muted-48">{{ fileName }}</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
