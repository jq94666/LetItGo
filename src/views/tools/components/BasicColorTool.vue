<script setup>
import { computed, ref } from 'vue'
import { colorSeries } from '../../../data/basicColors.js'
import { classifyFamily, FAMILIES, hexToHsl } from '../../../utils/colorFamily.js'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

const familyFilter = ref('') // 为空 = 全部色系；否则只看该色系
const detail = ref(null)
const copied = ref('')

/* 底库：不再按纸张类型切换，统一用一套（C 光面）近似色 */
const allColors = colorSeries[0].colors
const MAX_SHADES = 12 // 每族精选的浓度档位数，保证格子够宽、梯度够明显

function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** 感知亮度（YIQ 加权），数值大 = 看起来更浅 */
function lumaOf(hex) {
  const p = parseHex(hex)
  return p ? 0.299 * p.r + 0.587 * p.g + 0.114 * p.b : 0
}

/** 按浓度排序：由浅到深（亮度降序）；同亮度时饱和度低者更淡，放前面 */
function sortByDepth(list) {
  return list.slice().sort((a, b) => {
    const la = lumaOf(a.hex)
    const lb = lumaOf(b.hex)
    if (Math.abs(la - lb) > 0.5) return lb - la
    return hexToHsl(a.hex).s - hexToHsl(b.hex).s
  })
}

/** 每族等距抽 MAX_SHADES 档，首尾（最浅/最深）必保留 */
function pickShades(list) {
  if (list.length <= MAX_SHADES) return list
  const out = []
  for (let i = 0; i < MAX_SHADES; i++) {
    out.push(list[Math.round((i * (list.length - 1)) / (MAX_SHADES - 1))])
  }
  return out
}

function groupByFamily(list) {
  const map = new Map()
  for (const c of list) {
    const key = classifyFamily(c.hex)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(c)
  }
  return FAMILIES.map((f) => ({ ...f, colors: sortByDepth(map.get(f.key) ?? []) })).filter((g) => g.colors.length)
}

/** 全量按色系排好（含未被精选的色号），搜索基于它保证能找到任意色号 */
const fullGroups = groupByFamily(allColors)

/** 浏览用：每色系精选出的浓度梯度档位 */
const paletteGroups = fullGroups.map((g) => ({ ...g, colors: pickShades(g.colors) }))

/** 色系导航（浏览/筛选模式下可见） */
const familyNav = computed(() =>
  paletteGroups.map((g) => ({
    key: g.key,
    zh: g.zh,
    mid: g.colors[Math.floor(g.colors.length / 2)]?.hex ?? '#ccc'
  }))
)

const visibleGroups = computed(() => {
  if (familyFilter.value) return paletteGroups.filter((g) => g.key === familyFilter.value)
  return paletteGroups
})

function pickFamily(key) {
  familyFilter.value = familyFilter.value === key ? '' : key
}

/* ---------- 取色与复制 ---------- */

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
  return lumaOf(hex) > 150 ? '#1d1d1f' : '#ffffff'
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
  const key = classifyFamily(c.hex)
  const fam = FAMILIES.find((f) => f.key === key)
  detail.value = { ...c, family: fam ? fam.zh : '' }
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
                <p class="text-fine-print text-ink-muted-48">长条形色卡 · 每条由浅到深，点击查看详情，可复制色值</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <!-- 色系导航条 -->
              <div v-if="familyNav.length" class="flex flex-wrap gap-apple-xs">
                <button
                  type="button"
                  class="rounded-pill px-apple-md py-1 text-caption transition active:scale-[0.97]"
                  :class="familyFilter === '' ? 'bg-ink text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="familyFilter = ''"
                >全部</button>
                <button
                  v-for="f in familyNav"
                  :key="f.key"
                  type="button"
                  class="flex items-center gap-1.5 rounded-pill px-apple-md py-1 text-caption transition active:scale-[0.97]"
                  :class="familyFilter === f.key ? 'bg-ink text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="pickFamily(f.key)"
                >
                  <span class="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" :style="{ backgroundColor: f.mid }" />
                  {{ f.zh }}
                </button>
              </div>

              <!-- 色卡：每色系一条长条 -->
              <div class="flex flex-col gap-apple-xl">
                <section v-for="g in visibleGroups" :key="g.key" class="flex flex-col gap-apple-xs">
                  <header class="flex items-baseline gap-apple-sm">
                    <h3 class="text-caption-strong text-ink">{{ g.zh }}</h3>
                  </header>
                  <div class="flex h-12 w-full overflow-hidden rounded-apple-lg shadow-hairline ring-1 ring-black/5">
                    <button
                      v-for="c in g.colors"
                      :key="g.key + c.code"
                      type="button"
                      class="group relative h-full min-w-[2px] flex-1 transition hover:z-10 hover:ring-2 hover:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
                      :style="{ backgroundColor: c.hex }"
                      :title="`${c.code} · ${c.hex}`"
                      @click="openDetail(c)"
                    >
                      <span class="pointer-events-none absolute inset-x-0 bottom-1 hidden truncate px-0.5 text-center text-[9px] font-medium leading-none group-hover:block" :style="{ color: textOn(c.hex) }">{{ c.code }}</span>
                    </button>
                  </div>
                </section>
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
                      <p class="text-fine-print" :style="{ color: textOn(detail.hex), opacity: 0.8 }">{{ detail.family }} · {{ detail.hex }}</p>
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
