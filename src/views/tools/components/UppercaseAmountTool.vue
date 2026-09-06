<script setup>
import { ref, computed, watch } from 'vue'

/* ---------- 大写金额工具 ---------- */
const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })
const amountInput = ref('')

// 关闭主弹窗时同步收起知识点弹窗
const knowOpen = ref(false)
watch(open, (v) => {
  if (!v) knowOpen.value = false
})

const cnDigit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const cnSmallUnit = ['', '拾', '佰', '仟']
const cnBigUnit = ['', '万', '亿']

// 将 1~4 位数字分段转为中文（个位在右）
function cnIntSection(str) {
  let out = ''
  let needZero = false
  const startIdx = str.length - 1
  for (let i = 0; i < str.length; i++) {
    const d = Number(str[i])
    const pos = startIdx - i
    if (d === 0) {
      needZero = true
    } else {
      if (needZero && out) out += '零'
      needZero = false
      out += cnDigit[d] + cnSmallUnit[pos]
    }
  }
  return out
}

function toChineseUpperCase(raw) {
  const num = parseFloat(raw)
  if (isNaN(num)) return ''
  if (num < 0) return '暂不支持负数'

  const value = Math.round(num * 100) / 100
  const yuan = Math.floor(value)
  const jiao = Math.floor((value - yuan) * 10)
  const fen = Math.round(((value - yuan) * 100) % 10)

  let result = ''
  if (yuan === 0 && (jiao > 0 || fen > 0)) {
    // 不足 1 元
  } else {
    const s = String(yuan)
    const groups = []
    let remain = s
    while (remain.length > 4) {
      groups.unshift(remain.slice(-4))
      remain = remain.slice(0, -4)
    }
    groups.unshift(remain)

    let yuanStr = ''
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i]
      const part = cnIntSection(g)
      if (part) {
        yuanStr += part + cnBigUnit[groups.length - 1 - i]
      }
    }
    if (!yuanStr) yuanStr = cnDigit[0]
    result = yuanStr + '元'
  }

  let decStr = ''
  if (jiao > 0) decStr += cnDigit[jiao] + '角'
  if (fen > 0) decStr += cnDigit[fen] + '分'
  if (!decStr && jiao === 0 && fen > 0) {
    decStr = cnDigit[fen] + '分'
  }
  if (yuan > 0 && jiao === 0 && fen > 0) decStr = '零' + decStr

  result += decStr
  if (jiao === 0 && fen === 0) result += '整'

  return result || cnDigit[0] + '元整'
}

const converted = computed(() => {
  if (amountInput.value === '' || amountInput.value == null) return ''
  return toChineseUpperCase(amountInput.value)
})

/* ---------- 知识点：大写汉字一览（田字格）与转换规则 ---------- */
const charGroups = [
  { label: '数字', chars: '零壹贰叁肆伍陆柒捌玖' },
  { label: '位单位', chars: '拾佰仟' },
  { label: '大单位', chars: '万亿' },
  { label: '货币单位', chars: '元角分整' }
]

const ruleList = [
  '数字 0~9 分别对应：零壹贰叁肆伍陆柒捌玖',
  '个位无单位，十、百、千分别对应「拾」「佰」「仟」',
  '整数每四位为一组，组末以「万」「亿」为进位单位',
  '中间连续的多个 0 只读一个「零」，末尾的 0 不读出',
  '角位为 0 而分位非 0 时，补一个「零」',
  '没有角、分时，以「整」结尾'
]
</script>

<template>
  <Teleport to="body">
    <!-- 苹果风格弹窗 -->
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink/40 p-apple-md backdrop-blur-apple sm:p-apple-lg"
        @click.self="open = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="大写金额"
          class="modal-card flex max-h-[calc(100dvh-2*var(--spacing-apple-lg))] w-full max-w-[560px] flex-col rounded-apple-lg bg-canvas p-apple-lg shadow-hairline sm:p-apple-xl"
        >
          <!-- 头部（不随内容滚动） -->
          <div class="flex shrink-0 items-center justify-between gap-apple-sm">
            <h2 class="text-display-md text-ink">大写金额</h2>
            <button
              type="button"
              class="flex shrink-0 items-center gap-apple-xs rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-caption-strong text-ink transition hover:bg-hairline active:scale-[0.97] focus:outline-none"
              aria-label="打开知识点"
              @click="knowOpen = true"
            >
              <span aria-hidden="true">📖</span>
              知识点
            </button>
            <button
              type="button"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted-48 transition-colors hover:bg-canvas-parchment hover:text-ink focus:outline-none"
              aria-label="关闭"
              @click="open = false"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <!-- 内容区域：滚动限制在弹窗内部 -->
          <div class="mt-apple-lg min-h-0 flex-1 overflow-y-auto">
            <label for="amount-input" class="text-caption-strong text-ink-muted-80">
              金额（元，最多两位小数）
            </label>
            <input
              id="amount-input"
              v-model="amountInput"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              placeholder="请输入阿拉伯数字金额"
              class="mt-apple-xs w-full rounded-apple-md border border-hairline bg-surface-pearl px-apple-md py-apple-sm text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
            />

            <p class="mt-apple-md text-caption-strong text-ink-muted-80">中文大写</p>
            <div class="mt-apple-xs min-h-[72px] rounded-apple-md bg-canvas-parchment px-apple-md py-apple-md">
              <p class="break-all text-body-strong text-ink">
                {{ converted || '—' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 知识点弹窗：左侧大写汉字田字格，右侧转换规则 -->
    <Transition name="modal">
      <div
        v-if="knowOpen"
        class="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-ink/40 p-apple-md backdrop-blur-apple sm:p-apple-lg"
        @click.self="knowOpen = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="大写金额知识点"
          class="modal-card flex max-h-[calc(100dvh-2*var(--spacing-apple-lg))] w-full max-w-[860px] flex-col rounded-apple-lg bg-canvas p-apple-lg shadow-hairline sm:p-apple-xl"
        >
          <div class="flex shrink-0 items-center justify-between">
            <h2 class="text-display-md text-ink">知识点</h2>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted-48 transition-colors hover:bg-canvas-parchment hover:text-ink focus:outline-none"
              aria-label="关闭知识点"
              @click="knowOpen = false"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="mt-apple-lg grid min-h-0 flex-1 grid-cols-1 gap-apple-lg overflow-y-auto md:grid-cols-[minmax(0,470px)_1fr]">
            <!-- 左：大写汉字一览（田字格正楷） -->
            <div class="rounded-apple-md bg-canvas-parchment p-apple-md">
              <p class="text-caption-strong text-ink">大写汉字一览</p>
              <div v-for="group in charGroups" :key="group.label" class="mt-apple-sm">
                <p class="text-fine-print text-ink-muted-48">{{ group.label }}</p>
                <div class="mt-apple-xs flex flex-wrap gap-apple-xs">
                  <div v-for="ch in group.chars" :key="ch" class="tzg">
                    <span class="tzg-char">{{ ch }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右：转换规则 -->
            <div class="rounded-apple-md bg-canvas-parchment p-apple-md md:border-l md:border-divider-soft md:pl-apple-lg">
              <p class="text-caption-strong text-ink">转换规则</p>
              <ol class="mt-apple-xs list-decimal space-y-apple-sm pl-apple-md text-caption text-ink-muted-80">
                <li v-for="(rule, i) in ruleList" :key="i">{{ rule }}</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 苹果风格弹窗动画：遮罩淡入 + 卡片缩放上浮 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: scale(0.94) translateY(14px);
  opacity: 0;
}

/* 田字格：红虚线十字辅助格，正楷书写 */
.tzg {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: #fff;
  border: 1.5px solid rgba(214, 116, 116, 0.65);
  border-radius: 2px;
}
.tzg::before {
  content: '';
  position: absolute;
  left: 3px;
  right: 3px;
  top: 50%;
  border-top: 1px dashed rgba(214, 116, 116, 0.5);
}
.tzg::after {
  content: '';
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 50%;
  border-left: 1px dashed rgba(214, 116, 116, 0.5);
}
.tzg-char {
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', '楷体', 'AR PL UKai CN', serif;
  font-size: 36px;
  line-height: 1;
  color: var(--color-ink, #1c1c1e);
}
</style>
