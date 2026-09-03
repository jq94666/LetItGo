<script setup>
import { computed, ref, watch } from 'vue'
import { colorSeries } from '../../../data/basicColors.js'
import { classifyFamily, FAMILIES, familyByKey } from '../../../utils/colorFamily.js'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

const seriesId = ref('c')
const query = ref('')
const familyFilter = ref('') // 为空 = 全部色系；否则只看该色系
const budget = ref(450) // 「全部」模式下每批最多展示的色块数（按整条色系凑）
const detail = ref(null) // { code, hex, series }
const copied = ref('')

const CHUNK = 450

const series = computed(() => colorSeries.find((s) => s.id === seriesId.value) ?? colorSeries[0])

const activeColors = computed(() => {
  const list = series.value.colors
  const q = query.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return q ? list.filter((c) => c.code.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q)) : list
})

/** 按色阶分组（顺序按色环排列），空组不展示 */
const familyGroups = computed(() => {
  const map = new Map()
  for (const c of activeColors.value) {
    const key = classifyFamily(c.hex)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(c)
  }
  return FAMILIES.map((f) => ({ ...f, colors: map.get(f.key) ?? [] })).filter((g) => g.colors.length)
})

const familyNav = computed(() =>
  familyGroups.value.map((g) => ({
    key: g.key,
    zh: g.zh,
    en: g.en,
    count: g.colors.length,
    mid: g.colors[Math.floor(g.colors.length / 2)]?.hex ?? '#ccc'
  }))
)

/** 分组模式的展示列表：搜索中展示全部命中组；浏览模式按整条色系分批 */
const visibleGroups = computed(() => {
  if (query.value.trim()) return familyGroups.value
  if (familyFilter.value) {
    const g = familyGroups.value.find((x) => x.key === familyFilter.value)
    return g ? [g] : []
  }
  const out = []
  let sum = 0
  for (const g of familyGroups.value) {
    if (out.length && sum + g.colors.length > budget.value) break
    out.push(g)
    sum += g.colors.length
  }
  return out
})

const hasMore = computed(() => {
  if (query.value.trim() || familyFilter.value) return false
  return familyGroups.value.some((g) => !visibleGroups.value.includes(g))
})

const totalShown = computed(() => visibleGroups.value.reduce((n, g) => n + g.colors.length, 0))

function loadMore() {
  budget.value += CHUNK
}

function pickFamily(key) {
  familyFilter.value = familyFilter.value === key ? '' : key
  budget.value = CHUNK
}

function clearQuery() {
  query.value = ''
}

watch([seriesId, query, familyFilter], () => {
  budget.value = CHUNK
  if (detail.value) {
    const still = series.value.colors.some((c) => c === detail.value)
    if (!still) detail.value = null
  }
})

/* ---------- 取色与复制 ---------- */

function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

const format = {
  hex: (c) => c.hex,
  rgb: (c) => {
    const p = parseHex(c.hex)
    return p ? `rgb(${p.r}, ${p.g}, ${p.b})` : ''
  },
  rgba: (c) => {
    const p = parseHex(c.hex)
    return p ? `rgba(${p.r}, ${p.g}, ${p.b}, 1)` : ''
  }
}

function textOn(hex) {
  const p = parseHex(hex)
  if (!p) return '#1d1d1f'
  const lum = 0.299 * p.r + 0.587 * p.g + 0.114 * p.b
  return lum > 150 ? '#1d1d1f' : '#ffffff'
}

async function copyText(text, key) {
  let ok = false
  try {
    await navigator.clipboard.writeText(text)
    ok = true
  } catch (e) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;top:-9999px;opacity:0;'
    document.body.appendChild(ta)
    ta.select()
    try {
      ok = document.execCommand('copy')
    } catch (e2) {
      ok = false
    }
    ta.remove()
  }
  if (ok) {
    copied.value = key
    setTimeout(() => {
      if (copied.value === key) copied.value = ''
    }, 1500)
  }
}

function openDetail(c) {
  detail.value = { ...c, series: series.value.label }
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="基础色卡" class="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">基础色卡</p>
                <p class="text-fine-print text-ink-muted-48">按色阶分组的色卡条 · 点击色块查看详情，可复制 HEX / RGB / RGBA</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <!-- 系列切换 + 搜索 -->
              <div class="flex flex-wrap items-center gap-apple-xs">
                <button
                  v-for="s in colorSeries"
                  :key="s.id"
                  type="button"
                  class="rounded-pill px-apple-md py-apple-sm text-caption-strong transition-all duration-200 active:scale-[0.97]"
                  :class="seriesId === s.id ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="seriesId = s.id"
                >
                  {{ s.label }}
                  <span class="ml-0.5 text-fine-print" :class="seriesId === s.id ? 'text-on-primary/70' : 'text-ink-muted-48'">{{ s.colors.length }}</span>
                </button>
                <input
                  v-model="query"
                  type="search"
                  placeholder="按色号搜索，如 185、13-0758"
                  class="ml-auto h-[40px] min-w-[180px] max-w-full flex-1 rounded-pill border border-black/[0.08] bg-canvas px-apple-md text-caption text-ink placeholder:text-ink-muted-48 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus sm:max-w-[260px]"
                />
              </div>

              <p class="text-fine-print text-ink-muted-48">
                {{ series.hint }} · {{ query ? `${activeColors.length} 色命中「${query}」` : familyFilter ? `${familyByKey[familyFilter]?.zh || ''} 色系` : `共 ${activeColors.length} 色` }}
                · 色值来自社区公开近似数据，仅供参考
              </p>

              <!-- 色系导航条 -->
              <div v-if="!query && familyGroups.length" class="flex flex-wrap gap-apple-xs">
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-pill px-apple-md py-apple-xs text-fine-print transition active:scale-[0.97]"
                  :class="familyFilter === '' ? 'bg-ink text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="familyFilter = ''"
                >全部</button>
                <button
                  v-for="f in familyNav"
                  :key="f.key"
                  type="button"
                  class="flex items-center gap-1.5 rounded-pill px-apple-md py-apple-xs text-fine-print transition active:scale-[0.97]"
                  :class="familyFilter === f.key ? 'bg-ink text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="pickFamily(f.key)"
                >
                  <span class="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" :style="{ backgroundColor: f.mid }" />
                  {{ f.zh }} {{ f.en }}
                  <span class="opacity-60">{{ f.count }}</span>
                </button>
              </div>

              <!-- 色卡条：按色阶分组 -->
              <div class="flex flex-col gap-apple-lg">
                <section v-for="g in visibleGroups" :key="g.key" class="flex flex-col gap-apple-sm">
                  <header class="flex items-baseline gap-apple-sm border-b border-divider-soft pb-apple-xs">
                    <h3 class="text-caption-strong text-ink">{{ g.zh }} <span class="font-normal text-ink-muted-48">{{ g.en }}</span></h3>
                    <span class="text-fine-print text-ink-muted-48">{{ g.colors.length }} 色</span>
                    <span class="ml-auto text-fine-print text-ink-muted-48">{{ series.label }}</span>
                  </header>
                  <div class="grid grid-cols-5 gap-apple-xs sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                    <button
                      v-for="c in g.colors"
                      :key="g.key + c.code"
                      type="button"
                      class="flex aspect-[4/3] w-full flex-col items-center justify-end rounded-apple-md p-[2px] shadow-hairline ring-1 ring-black/5 transition hover:scale-[1.08] hover:ring-2 hover:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
                      :style="{ backgroundColor: c.hex }"
                      :title="`${c.code} · ${c.hex}`"
                      @click="openDetail(c)"
                    >
                      <span class="w-full truncate text-center text-[8px] font-medium leading-[1.15]" :style="{ color: textOn(c.hex) }">{{ c.code }}</span>
                    </button>
                  </div>
                </section>

                <!-- 加载更多 -->
                <div v-if="hasMore" class="flex flex-col items-center gap-apple-sm py-apple-xs">
                  <span class="text-fine-print text-ink-muted-48">已显示 {{ totalShown }} / {{ activeColors.length }} 色</span>
                  <button type="button" class="rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-caption-strong text-ink transition hover:text-primary active:scale-[0.97]" @click="loadMore">加载更多色系</button>
                </div>
                <p v-if="!hasMore && !query && !familyFilter && familyGroups.length" class="py-apple-xs text-center text-fine-print text-ink-muted-48">已展示全部 {{ activeColors.length }} 色</p>
                <p v-if="query && !activeColors.length" class="py-apple-lg text-center text-caption text-ink-muted-48">
                  没有匹配「{{ query }}」的色号<button v-if="query" type="button" class="ml-apple-xs text-primary underline" @click="clearQuery">清除搜索</button>
                </p>
              </div>
            </div>

            <!-- 颜色详情 -->
            <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
              <div v-if="detail" class="absolute inset-0 z-10 flex flex-col bg-black/60 backdrop-blur-sm" @click.self="detail = null">
                <div class="flex items-center justify-between gap-apple-md p-apple-md text-white">
                  <span class="text-caption-strong">色卡详情</span>
                  <button type="button" aria-label="关闭详情" class="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-[0.95]" @click="detail = null">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>
                <div class="flex min-h-0 flex-1 items-center justify-center p-apple-md">
                  <div class="flex w-full max-w-md flex-col gap-apple-md overflow-hidden rounded-apple-lg bg-canvas shadow-product">
                    <div class="flex aspect-[4/3] w-full flex-col items-center justify-center gap-apple-xs" :style="{ backgroundColor: detail.hex }">
                      <p class="text-body-strong" :style="{ color: textOn(detail.hex) }">{{ detail.code }}</p>
                      <p class="text-fine-print" :style="{ color: textOn(detail.hex), opacity: 0.8 }">{{ detail.series }} · {{ detail.hex }}</p>
                    </div>
                    <div class="flex flex-col gap-apple-sm p-apple-md">
                      <p class="text-fine-print text-ink-muted-48">点击即可复制：</p>
                      <div v-for="fmt in ['hex', 'rgb', 'rgba']" :key="fmt" class="flex items-center gap-apple-sm rounded-apple-md bg-canvas-parchment p-apple-sm">
                        <span class="w-[52px] shrink-0 text-fine-print text-ink-muted-48">{{ fmt.toUpperCase() }}</span>
                        <code class="min-w-0 flex-1 truncate font-mono text-caption text-ink">{{ format[fmt](detail) }}</code>
                        <button
                          type="button"
                          class="shrink-0 rounded-pill px-apple-md py-apple-xs text-fine-print transition active:scale-[0.95]"
                          :class="copied === fmt ? 'bg-emerald-500 text-white' : 'bg-primary text-on-primary hover:opacity-90'"
                          @click="copyText(format[fmt](detail), fmt)"
                        >{{ copied === fmt ? '已复制 ✓' : '复制' }}</button>
                      </div>
                      <p class="text-fine-print text-ink-muted-48">色值源自公开社区近似数据，印刷请以官方色卡实物为准。</p>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
