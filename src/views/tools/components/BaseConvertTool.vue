<script setup>
import { computed, reactive, ref } from 'vue'

// 网络 → 进制转换：先勾选需要参与的进制（最多 4 种），再在对应输入框输入，其余实时联动
const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

const allBases = [
  { key: 'bin', label: '二进制', radix: 2, hint: '0、1', placeholder: '如 1101' },
  { key: 'oct', label: '八进制', radix: 8, hint: '0-7', placeholder: '如 15' },
  { key: 'dec', label: '十进制', radix: 10, hint: '0-9', placeholder: '如 13' },
  { key: 'hex', label: '十六进制', radix: 16, hint: '0-9、A-F', placeholder: '如 D' }
]

// 默认展示十进制与十六进制，其余按需勾选
const selected = ref(['dec', 'hex'])
const activeBases = computed(() => allBases.filter((b) => selected.value.includes(b.key)))

function toggle(key) {
  if (selected.value.includes(key)) {
    // 至少要保留一种进制
    if (selected.value.length > 1) selected.value = selected.value.filter((k) => k !== key)
  } else {
    selected.value = [...selected.value, key]
  }
}

const values = reactive({ bin: '', oct: '', dec: '', hex: '' })
const copiedKey = ref('')
let copyTimer = null

function sanitize(text, radix) {
  const set = radix === 16 ? '0-9A-Fa-f' : radix === 10 ? '0-9' : radix === 8 ? '0-7' : '01'
  return text.replace(new RegExp(`[^${set}]`, 'g'), '')
}

function parse(s, radix) {
  if (!s) return null
  const clean = s.trim()
  if (!/^[0-9A-Fa-f]+$/.test(clean)) return null
  // BigInt 仅原生支持 0b / 0o / 0x 前缀或纯十进制
  const prefixed = radix === 2 ? '0b' + clean : radix === 8 ? '0o' + clean : radix === 16 ? '0x' + clean : clean
  return BigInt(prefixed)
}

function fmt(n, radix) {
  const s = n.toString(radix)
  return radix === 16 ? s.toUpperCase() : s
}

function onInput(key, raw) {
  const conf = allBases.find((b) => b.key === key)
  // 先只保留该进制允许的字符
  const clean = sanitize(raw, conf.radix)
  values[key] = clean
  const n = parse(clean, conf.radix)
  // 空输入：其它进制同步清空；无法解析时保留本框原文、其它不动
  if (n == null) {
    if (!clean) for (const b of allBases) if (b.key !== key) values[b.key] = ''
    return
  }
  for (const b of allBases) {
    if (b.key === key) continue
    values[b.key] = fmt(n, b.radix)
  }
}

function resetAll() {
  for (const b of allBases) values[b.key] = ''
}

async function copy(key) {
  const v = values[key]
  if (!v) return
  try {
    await navigator.clipboard.writeText(v)
    copiedKey.value = key
    clearTimeout(copyTimer)
    copyTimer = setTimeout(() => (copiedKey.value = ''), 1400)
  } catch {
    /* 剪贴板不可用时静默忽略 */
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="进制转换" class="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">进制转换</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <!-- 进制选择 -->
              <div class="flex flex-wrap items-center gap-x-apple-md gap-y-apple-xs">
                <p class="shrink-0 text-[20px] font-semibold text-ink">选择进制</p>
                <div class="flex flex-wrap gap-apple-xs" role="group" aria-label="选择进制">
                  <button
                    v-for="b in allBases"
                    :key="b.key"
                    type="button"
                    :aria-pressed="selected.includes(b.key)"
                    class="rounded-pill px-apple-md py-apple-xs text-fine-print transition active:scale-[0.95]"
                    :class="selected.includes(b.key) ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                    @click="toggle(b.key)"
                  >{{ b.label }}</button>
                </div>
              </div>

              <!-- 输入网格：最多 2 列 × 2 行 -->
              <div class="grid grid-cols-2 gap-apple-md">
                <div
                  v-for="b in activeBases"
                  :key="b.key"
                  class="flex flex-col gap-apple-xs rounded-apple-lg border border-divider-soft bg-canvas-parchment p-apple-md"
                >
                  <div class="flex items-center justify-between gap-apple-xs">
                    <label :for="`base-${b.key}`" class="min-w-0 truncate text-caption-strong text-ink-muted-80">
                      {{ b.label }}
                      <span class="ml-1 hidden text-fine-print text-ink-muted-48 sm:inline">{{ b.hint }}</span>
                    </label>
                    <button
                      type="button"
                      aria-label="复制"
                      class="shrink-0 rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-ink active:scale-[0.95]"
                      :disabled="!values[b.key]"
                      @click="copy(b.key)"
                    >{{ copiedKey === b.key ? '已复制' : '复制' }}</button>
                  </div>
                  <input
                    :id="`base-${b.key}`"
                    :value="values[b.key]"
                    :placeholder="b.placeholder"
                    spellcheck="false"
                    autocomplete="off"
                    autocapitalize="off"
                    class="w-full min-w-0 rounded-apple-md border border-hairline bg-surface-pearl px-apple-md py-apple-sm font-mono text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
                    @input="onInput(b.key, $event.target.value)"
                  />
                </div>
              </div>

              <div v-if="activeBases.length < 2" class="rounded-apple-md bg-amber-50 p-apple-sm text-fine-print text-amber-600">
                至少勾选两种进制才能互相转换。
              </div>

              <div class="flex items-center justify-between gap-apple-sm">
                <p class="text-fine-print text-ink-muted-48">支持任意位数大整数，输入即自动换算；非法字符会被自动忽略。</p>
                <button
                  type="button"
                  class="shrink-0 rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-fine-print text-ink transition hover:bg-black/5 active:scale-[0.95]"
                  @click="resetAll"
                >清空</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
