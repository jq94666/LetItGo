<script setup>
import { computed, ref, watch } from 'vue'

/* 计算器：上下两块显示屏——上屏完整算式、下屏当前输入/结果。
   运算只记录算式，不提前算中间值；按 = / 回车时才按优先级一次性求值。
   支持 + − × ÷、%、退格、C、00，以及键盘输入。
   未完成括号功能，四则按优先级（×÷ 先于 +−，同级从左到右）。 */
const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

const OP_LABEL = { '+': '+', '-': '−', '*': '×', '/': '÷' }
const MAX_LEN = 16
// 内部运算符用 ASCII（求值用），展示时映射为 × ÷ −
const tokensString = (ts) => ts.map((t) => OP_LABEL[t] || t).join(' ')

const tokens = ref([]) // 已确认的算式 token：数字与运算符交替
const cur = ref('') // 正在输入的数字（下屏）
const eqText = ref(null) // = 之后上屏保留的完整算式（如 "12 + 7 ="）
const resultVal = ref(null) // = 之后的结果（等待继续运算或另起算式）
const err = ref(false)

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 }

/* ---------- 格式化与基础运算 ---------- */
function fmt(v) {
  if (!isFinite(v)) return '0'
  const r = Math.round((v + Number.EPSILON) * 1e10) / 1e10
  return String(r)
}
function num(s) {
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : null
}
function applyOp(a, o, b) {
  switch (o) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return b === 0 ? null : a / b
  }
  return null
}
/* 四则优先级求值（×÷ 优先，同级从左到右） */
function evaluate(ts) {
  const nums = []
  const ops = []
  for (const t of ts) {
    if (t === '+' || t === '-' || t === '*' || t === '/') {
      while (ops.length && PREC[ops[ops.length - 1]] >= PREC[t]) {
        const b = nums.pop()
        const a = nums.pop()
        const r = applyOp(a, ops.pop(), b)
        if (r == null) return null
        nums.push(r)
      }
      ops.push(t)
    } else {
      const v = num(t)
      if (v == null) return null
      nums.push(v)
    }
  }
  while (ops.length) {
    const b = nums.pop()
    const a = nums.pop()
    const r = applyOp(a, ops.pop(), b)
    if (r == null) return null
    nums.push(r)
  }
  return nums.length === 1 ? nums[0] : null
}

/* ---------- 显示 ---------- */
// 上屏：算式区（含当前正在输入的数字）
const upperText = computed(() => {
  if (err.value) return ''
  if (eqText.value) return eqText.value
  const parts = tokensString(tokens.value)
  const typed = cur.value
  return [parts, typed].filter(Boolean).join(' ')
})
// 下屏：当前输入 / 结果
const lowerText = computed(() => {
  if (err.value) return '错误'
  if (resultVal.value != null) return String(resultVal.value)
  return cur.value === '' ? '0' : cur.value
})
const upperFontPx = computed(() => {
  const n = upperText.value.length
  return `${Math.max(13, Math.min(20, 24 - n * 0.75))}px`
})
const lowerFontPx = computed(() => {
  const n = lowerText.value.length
  return `${Math.max(20, Math.min(40, 46 - n * 1.8))}px`
})

function resetAll() {
  tokens.value = []
  cur.value = ''
  eqText.value = null
  resultVal.value = null
  err.value = false
}

/* ---------- 按键行为 ---------- */
function digit(d) {
  if (err.value) return resetAll()
  if (resultVal.value != null) resetAll() // 结果后输入数字 → 全新算式
  if (d === '.') {
    if (!cur.value.includes('.')) cur.value += cur.value ? '.' : '0.'
    return
  }
  if (cur.value === '' || cur.value === '0') {
    if (d === '00') return
    cur.value = d === '0' ? '0' : d
    return
  }
  if (cur.value.length + (d === '00' ? 2 : 1) <= MAX_LEN) cur.value += d
}
function back() {
  if (err.value) return resetAll()
  if (resultVal.value != null) return resetAll()
  if (cur.value.length > 0) cur.value = cur.value.length > 1 ? cur.value.slice(0, -1) : ''
}
function percent() {
  if (err.value) return
  if (resultVal.value != null) return resetAll()
  // 应用于正在输入的数；若无输入则应用于算式最后一个数
  if (cur.value) {
    const v = num(cur.value)
    if (v == null) return
    cur.value = fmt(v / 100)
    return
  }
  const last = tokens.value[tokens.value.length - 1]
  if (last != null && last !== '+' && last !== '-' && last !== '*' && last !== '/') {
    const v = num(last)
    if (v == null) return
    tokens.value[tokens.value.length - 1] = fmt(v / 100)
  }
}
function opPress(o) {
  if (err.value) return
  if (resultVal.value != null) {
    // 结果后按运算符 → 以结果继续运算
    tokens.value = [String(resultVal.value)]
    resultVal.value = null
    eqText.value = null
  }
  if (cur.value !== '') {
    tokens.value.push(cur.value)
    cur.value = ''
  } else if (tokens.value.length === 0) {
    // 首个运算符：0 作为左操作数（支持 0+... 与负数起点简化）
    if (o !== '-') tokens.value.push('0')
    else tokens.value.push('-0')
    cur.value = ''
    tokens.value.push(o)
    return
  }
  // 连按运算符：替换上一个（不提前计算）
  const last = tokens.value[tokens.value.length - 1]
  if (last === '+' || last === '-' || last === '*' || last === '/') {
    tokens.value[tokens.value.length - 1] = o
  } else {
    tokens.value.push(o)
  }
}
function equal() {
  if (err.value) return
  if (resultVal.value != null) return // 已出结果，重复 = 忽略
  const ts = tokens.value.slice()
  if (cur.value !== '') ts.push(cur.value)
  if (ts.length === 0) return
  // 以运算符结尾（如 12 + =）：重复左操作数
  const tail = ts[ts.length - 1]
  if (tail === '+' || tail === '-' || tail === '*' || tail === '/') {
    if (ts.length < 3) return
    ts.push(ts[ts.length - 2])
  }
  const r = evaluate(ts)
  if (r == null) {
    err.value = true
    cur.value = ''
    return
  }
  eqText.value = `${tokensString(ts)} =`
  resultVal.value = r
  cur.value = ''
  tokens.value = []
}

/* ---------- 键盘 ---------- */
function onKey(e) {
  if (!open.value) return
  const k = e.key
  if (/^[0-9]$/.test(k)) {
    digit(k)
    e.preventDefault()
  } else if (k === '.') {
    digit('.')
    e.preventDefault()
  } else if (k === '+' || k === '-' || k === '*' || k === '/') {
    opPress(k === '+' ? '+' : k === '-' ? '-' : k === '*' ? '*' : '/')
    e.preventDefault()
  } else if (k === 'Enter' || k === '=') {
    equal()
    e.preventDefault()
  } else if (k === 'Backspace') {
    back()
    e.preventDefault()
  } else if (k === 'Escape') {
    resetAll()
    e.preventDefault()
  } else if (k === '%') {
    percent()
    e.preventDefault()
  }
}
watch(open, (v) => {
  resetAll()
  if (v) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})
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
          aria-label="计算器"
          class="flex max-h-[88vh] w-full max-w-sm flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product"
        >
          <!-- 头部 -->
          <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md">
            <div>
              <p class="text-body-strong text-ink">计算器</p>
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
          <div class="min-h-0 flex-1 overflow-y-auto p-apple-md sm:p-apple-lg">
            <!-- 上下两块显示屏 -->
            <div class="mb-apple-md overflow-hidden rounded-apple-lg bg-canvas-parchment" :aria-live="'polite'">
              <!-- 上屏：完整算式 -->
              <div class="flex min-h-[34px] items-end justify-end border-b border-black/[0.05] bg-black/[0.04] px-apple-md py-apple-xs sm:px-apple-sm">
                <p class="break-all text-right font-mono leading-snug text-ink-muted-48" :style="{ fontSize: upperFontPx }">
                  {{ upperText || '\u00A0' }}
                </p>
              </div>
              <!-- 下屏：当前输入 / 结果 -->
              <div class="flex min-h-[56px] items-center justify-end px-apple-md py-apple-xs sm:px-apple-sm">
                <p
                  class="break-all text-right font-mono font-medium leading-snug tracking-tight"
                  :class="err ? 'text-red-600' : 'text-ink'"
                  :style="{ fontSize: lowerFontPx }"
                >
                  {{ lowerText }}
                </p>
              </div>
            </div>

            <!-- 键盘 -->
            <div class="grid grid-cols-4 gap-[10px]" role="group" aria-label="计算器按键">
              <button
                v-for="k in [{ k: 'C', act: () => resetAll() }, { k: '⌫', act: () => back() }, { k: '%', act: () => percent() }, { k: '÷', act: () => opPress('/') }]"
                :key="k.k"
                type="button"
                :aria-label="k.k"
                class="h-14 rounded-pill text-button-utility transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.94]"
                :class="k.k === 'C' ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/15' : 'bg-black/[0.04] text-ink-muted-80 hover:bg-black/[0.08]'"
                @click="k.act()"
              >
                {{ k.k }}
              </button>

              <button v-for="k in [['7', '7'], ['8', '8'], ['9', '9'], ['×', '*']]" :key="k[0]" type="button" :aria-label="k[0]" class="h-14 rounded-pill bg-black/[0.04] text-[20px] text-ink transition hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.94]" @click="k[1] === '*' ? opPress('*') : digit(k[1])">{{ k[0] }}</button>
              <button v-for="k in [['4', '4'], ['5', '5'], ['6', '6'], ['−', '-']]" :key="k[0]" type="button" :aria-label="k[0]" class="h-14 rounded-pill bg-black/[0.04] text-[20px] text-ink transition hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.94]" @click="k[1] === '-' ? opPress('-') : digit(k[1])">{{ k[0] }}</button>
              <button v-for="k in [['1', '1'], ['2', '2'], ['3', '3'], ['+', '+']]" :key="k[0]" type="button" :aria-label="k[0]" class="h-14 rounded-pill bg-black/[0.04] text-[20px] text-ink transition hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.94]" @click="k[1] === '+' ? opPress('+') : digit(k[1])">{{ k[0] }}</button>

              <!-- 末行：00 / 0 / 小数点 / = -->
              <button type="button" aria-label="00" class="h-14 rounded-pill bg-black/[0.04] text-[18px] text-ink transition hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.94]" @click="digit('00')">00</button>
              <button type="button" aria-label="0" class="h-14 rounded-pill bg-black/[0.04] text-[20px] text-ink transition hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.94]" @click="digit('0')">0</button>
              <button type="button" aria-label="." class="h-14 rounded-pill bg-black/[0.04] text-[20px] text-ink transition hover:bg-black/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.94]" @click="digit('.')">.</button>
              <button type="button" aria-label="=" class="h-14 rounded-pill bg-primary text-[22px] font-semibold text-on-primary shadow-sm transition hover:bg-primary-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.94]" @click="equal">=</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
