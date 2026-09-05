<script setup>
import { computed, ref, watch } from 'vue'
import { allChineseColors, chineseColorGroups } from '../../../data/chineseColors.js'

/* 中国传统色：按 红/黄/绿/蓝·紫/苍/水/灰白/黑/金银 分类取色。
   支持分类筛选与名称搜索，点击色卡复制 HEX。 */
const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })
watch(open, (v) => {
  if (!v) {
    group.value = 'all'
    query.value = ''
    copiedName.value = ''
  }
})

const group = ref('all')
const query = ref('')
const copiedName = ref('')

const filtered = computed(() => {
  const base = group.value === 'all' ? allChineseColors : chineseColorGroups.find((g) => g.id === group.value)?.colors ?? []
  const q = query.value.trim().toLowerCase()
  const list = q ? base.filter((c) => c.name.toLowerCase().includes(q) || c.hex.includes(q)) : base
  return list.map((c) => ({ ...c, group: group.value === 'all' ? c.group ?? '' : chineseColorGroups.find((g) => g.id === group.value)?.label ?? '' }))
})

function textOn(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 170 ? '#3a3a3c' : '#ffffff'
}

async function copy(c) {
  try {
    await navigator.clipboard.writeText(c.hex)
    copiedName.value = c.name
    setTimeout(() => {
      if (copiedName.value === c.name) copiedName.value = ''
    }, 1400)
  } catch {
    /* 剪贴板不可用则静默 */
  }
}
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
          aria-label="中国传统色"
          class="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product"
        >
          <!-- 头部 -->
          <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
            <div>
              <p class="text-body-strong text-ink">中国传统色</p>
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
            <!-- 搜索 -->
            <input
              v-model="query"
              type="search"
              aria-label="搜索传统色"
              placeholder="搜索色名或 HEX，例如：胭脂、#d6ecf0"
              class="mb-apple-sm w-full rounded-pill border border-hairline bg-canvas-parchment px-apple-md py-apple-sm text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
            />

            <!-- 分类 chips -->
            <div class="mb-apple-md flex flex-wrap gap-apple-xs" role="group" aria-label="传统色分类">
              <button
                v-for="g in [{ id: 'all', label: '全部' }, ...chineseColorGroups]"
                :key="g.id"
                type="button"
                :aria-pressed="group === g.id"
                class="rounded-pill px-apple-md py-[5px] text-fine-print transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.96]"
                :class="group === g.id ? 'bg-primary text-on-primary' : 'bg-black/[0.05] text-ink-muted-80 hover:bg-black/[0.09]'"
                @click="group = g.id"
              >
                {{ g.label }}
              </button>
            </div>

            <!-- 色卡网格 -->
            <div v-if="filtered.length" class="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-apple-xs sm:gap-apple-sm">
              <button
                v-for="c in filtered"
                :key="c.name + c.hex"
                type="button"
                :aria-label="`${c.name} ${c.hex}，点击复制`"
                class="group relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-apple-md p-1.5 shadow-sm transition hover:scale-[1.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.96]"
                :style="{ background: c.hex }"
                @click="copy(c)"
              >
                <span class="pointer-events-none w-full truncate rounded-[6px] bg-black/10 px-1 py-[1px] text-center font-mono text-[11px] leading-4 backdrop-blur-[2px]" :style="{ color: textOn(c.hex) }">{{ c.name }}</span>
                <span class="pointer-events-none mt-[2px] font-mono text-[10px] leading-none opacity-90" :style="{ color: textOn(c.hex) }">{{ copiedName === c.name ? '✓ 已复制' : c.hex }}</span>
              </button>
            </div>
            <p v-else class="py-apple-lg text-center text-fine-print text-ink-muted-48">没有匹配的颜色，换个关键词试试。</p>

            <p class="mt-apple-md text-fine-print text-ink-muted-48">共 {{ filtered.length }} 色 · 点击色卡即复制 HEX · 数据来自开源 chinese-colors 项目</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
