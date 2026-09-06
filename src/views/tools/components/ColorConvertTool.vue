<script setup>
import { computed, ref } from 'vue'

// 颜色 → 颜色编码转换：RGB/RGBA 与 HEX 互转，任一输入框输入即实时联动并预览颜色
const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

// 当前颜色 {r,g,b,a}；输入未完成/非法时保持不变
const color = ref({ r: 99, g: 102, b: 241, a: 1 })
const rgbText = ref('99, 102, 241')
const hexText = ref('#6366F1')

const copiedKey = ref('')
let copyTimer = null

function toHex2(n) {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0').toUpperCase()
}

function rgbToHex(c) {
  const base = `#${toHex2(c.r)}${toHex2(c.g)}${toHex2(c.b)}`
  // 不透明时省略 alpha 两位，保持常见六位写法
  return c.a < 1 ? base + toHex2(c.a * 255) : base
}

function fmtAlpha(a) {
  return Number(a.toFixed(3)).toString()
}

function fmtRgb(c) {
  return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`
}

function fmtRgba(c) {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${fmtAlpha(c.a)})`
}

function fmtCss(c) {
  return c.a < 1 ? fmtRgba(c) : fmtRgb(c)
}

const rgbaCss = computed(() => `rgba(${color.value.r}, ${color.value.g}, ${color.value.b}, ${color.value.a})`)
const hexCss = computed(() => rgbToHex(color.value))

// 解析 rgb/rgba 文本：兼容「255,99,71」「255, 99, 71, 0.5」「rgb(...)」「rgba(...)」
function parseRgbText(text) {
  const inner = text.trim().replace(/^rgba?\(\s*/i, '').replace(/\)\s*$/, '')
  if (!inner) return null
  const parts = inner.split(/[\s,]+/).filter(Boolean)
  if (parts.length !== 3 && parts.length !== 4) return null
  const nums = []
  for (const p of parts) {
    if (!/^\d+(\.\d+)?$/.test(p)) return null
    nums.push(Number(p))
  }
  if (nums.slice(0, 3).some((n) => n > 255)) return null
  return {
    r: Math.round(nums[0]),
    g: Math.round(nums[1]),
    b: Math.round(nums[2]),
    a: parts.length === 4 ? clamp(nums[3], 0, 1) : 1
  }
}

// 解析 HEX：#RGB / #RGBA / #RRGGBB / #RRGGBBAA（# 可省略）
function parseHexText(text) {
  let s = text.trim().replace(/^#/, '')
  if (!s || !/^[0-9A-Fa-f]+$/.test(s)) return null
  if (s.length === 3 || s.length === 4) s = [...s].map((ch) => ch + ch).join('')
  if (s.length !== 6 && s.length !== 8) return null
  const n = (i) => parseInt(s.slice(i, i + 2), 16)
  return { r: n(0), g: n(2), b: n(4), a: s.length === 8 ? n(6) / 255 : 1 }
}

function onRgbInput(e) {
  rgbText.value = e.target.value
  const c = parseRgbText(rgbText.value)
  if (!c) return
  color.value = c
  hexText.value = rgbToHex(c)
}

function onHexInput(e) {
  hexText.value = e.target.value
  const c = parseHexText(hexText.value)
  if (!c) return
  color.value = c
  rgbText.value = `${c.r}, ${c.g}, ${c.b}${c.a < 1 ? `, ${fmtAlpha(c.a)}` : ''}`
}

const invalidRgb = computed(() => !!rgbText.value.trim() && !parseRgbText(rgbText.value))
const invalidHex = computed(() => !!hexText.value.trim() && !parseHexText(hexText.value))

// 取色器只支持不透明色：选定后 alpha 复位为 1
const pickerHex = computed(() => rgbToHex({ ...color.value, a: 1 }).slice(0, 7))
function onPick(e) {
  const c = parseHexText(e.target.value)
  if (!c) return
  color.value = { ...c, a: 1 }
  rgbText.value = `${c.r}, ${c.g}, ${c.b}`
  hexText.value = rgbToHex(color.value)
}

// 预览文字颜色按背景亮度自适应
const previewInk = computed(() => {
  const c = color.value
  const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255
  return lum > 0.6 ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.9)'
})

// 透明棋盘格底：让 alpha 可见
const checkerStyle = {
  backgroundImage:
    'linear-gradient(45deg,#e2e2e2 25%,transparent 25%),linear-gradient(-45deg,#e2e2e2 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e2e2 75%),linear-gradient(-45deg,transparent 75%,#e2e2e2 75%)',
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
  backgroundColor: '#fff'
}

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

function resetAll() {
  color.value = { r: 99, g: 102, b: 241, a: 1 }
  rgbText.value = '99, 102, 241'
  hexText.value = '#6366F1'
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="颜色编码转换" class="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">颜色编码转换</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <div class="grid gap-apple-md sm:grid-cols-[minmax(0,240px)_1fr]">
                <!-- 颜色预览：棋盘格透出透明度 -->
                <div class="relative min-h-28 overflow-hidden rounded-apple-lg border border-hairline">
                  <div class="absolute inset-0" :style="checkerStyle"></div>
                  <div class="absolute inset-0 transition-colors" :style="{ backgroundColor: rgbaCss }"></div>
                  <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-apple-xs p-apple-sm">
                    <p class="min-w-0 truncate font-mono text-fine-print" :style="{ color: previewInk }">{{ hexCss }} · {{ fmtCss(color) }}</p>
                    <label class="shrink-0 cursor-pointer rounded-full bg-white/70 p-1 leading-none shadow-sm backdrop-blur-sm" title="取色器">
                      <input type="color" :value="pickerHex" class="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" aria-label="取色器" @input="onPick" />
                    </label>
                  </div>
                </div>

                <!-- 输入区 -->
                <div class="flex flex-col gap-apple-md">
                  <div class="flex flex-col gap-apple-xs rounded-apple-lg border border-divider-soft bg-canvas-parchment p-apple-md">
                    <div class="flex items-center justify-between gap-apple-xs">
                      <label for="cc-rgb" class="min-w-0 truncate text-caption-strong text-ink-muted-80">
                        RGB / RGBA
                        <span class="ml-1 hidden text-fine-print text-ink-muted-48 sm:inline">0-255，alpha 0-1</span>
                      </label>
                      <button
                        type="button"
                        aria-label="复制 RGBA"
                        class="shrink-0 rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-ink active:scale-[0.95]"
                        @click="copy('rgb', fmtCss(color))"
                      >{{ copiedKey === 'rgb' ? '已复制' : '复制' }}</button>
                    </div>
                    <input
                      id="cc-rgb"
                      :value="rgbText"
                      placeholder="如 255, 99, 71 或 255, 99, 71, 0.5"
                      spellcheck="false"
                      autocomplete="off"
                      autocapitalize="off"
                      class="w-full min-w-0 rounded-apple-md border bg-surface-pearl px-apple-md py-apple-sm font-mono text-apple-body text-ink placeholder:text-ink-muted-48 focus:outline-none focus:ring-2"
                      :class="invalidRgb ? 'border-red-400 focus:ring-red-400/30' : 'border-hairline focus:border-primary-focus focus:ring-primary-focus/30'"
                      @input="onRgbInput"
                    />
                  </div>

                  <div class="flex flex-col gap-apple-xs rounded-apple-lg border border-divider-soft bg-canvas-parchment p-apple-md">
                    <div class="flex items-center justify-between gap-apple-xs">
                      <label for="cc-hex" class="min-w-0 truncate text-caption-strong text-ink-muted-80">
                        HEX
                        <span class="ml-1 hidden text-fine-print text-ink-muted-48 sm:inline">3/6 位，可带 alpha 共 4/8 位</span>
                      </label>
                      <button
                        type="button"
                        aria-label="复制 HEX"
                        class="shrink-0 rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-ink active:scale-[0.95]"
                        @click="copy('hex', hexCss)"
                      >{{ copiedKey === 'hex' ? '已复制' : '复制' }}</button>
                    </div>
                    <input
                      id="cc-hex"
                      :value="hexText"
                      placeholder="如 #FF6347 或 #FF634780"
                      spellcheck="false"
                      autocomplete="off"
                      autocapitalize="off"
                      class="w-full min-w-0 rounded-apple-md border bg-surface-pearl px-apple-md py-apple-sm font-mono text-apple-body text-ink placeholder:text-ink-muted-48 focus:outline-none focus:ring-2"
                      :class="invalidHex ? 'border-red-400 focus:ring-red-400/30' : 'border-hairline focus:border-primary-focus focus:ring-primary-focus/30'"
                      @input="onHexInput"
                    />
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between gap-apple-sm">
                <p class="min-w-0 text-fine-print text-ink-muted-48">输入任一格式实时联动；透明时 HEX 为 8 位、复制为 rgba，不透明时为 6 位、rgb。</p>
                <button
                  type="button"
                  class="shrink-0 rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-fine-print text-ink transition hover:bg-black/5 active:scale-[0.95]"
                  @click="resetAll"
                >重置</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
