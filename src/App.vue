<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Wallpaper from './components/Wallpaper.vue'
import DesktopSettings from './components/DesktopSettings.vue'
import { getDesktopSettings } from './composables/desktopStore.js'

const route = useRoute()
const router = useRouter()

// 底部按钮：与路由一一对应
const tabs = [
  { key: 'home', label: '主页', path: '/', icon: '🏠' },
  { key: 'sites', label: '网站', path: '/sites', icon: '🌐' },
  { key: 'tools', label: '工具', path: '/tools', icon: '🧰' }
]

// 面板按需加载：只挂载当前及相邻面板
const views = {
  home: defineAsyncComponent(() => import('./views/home/index.vue')),
  sites: defineAsyncComponent(() => import('./views/sites/index.vue')),
  tools: defineAsyncComponent(() => import('./views/tools/index.vue'))
}

const tabIndex = computed(() => {
  const i = tabs.findIndex((t) => t.path === route.path)
  return i < 0 ? 0 : i
})

const loaded = reactive({})
function markLoaded(i) {
  for (const n of [i - 1, i, i + 1]) {
    if (n >= 0 && n < tabs.length) loaded[n] = true
  }
}
markLoaded(tabIndex.value)
watch(tabIndex, markLoaded)

// smooth=false 用于底部按钮点击：直接切换，不做滑动动画
async function go(i, smooth = true) {
  if (i === tabIndex.value || i < 0 || i >= tabs.length) return
  if (smooth) {
    router.push(tabs[i].path)
    return
  }
  animate.value = false
  await router.push(tabs[i].path)
  await nextTick()
  // 强制一次样式计算，确保新位置在无过渡状态下生效后再恢复动画
  void viewportEl.value?.offsetWidth
  animate.value = true
}

/* ---------- 按住左键左右滑动切换面板 ---------- */
const viewportEl = ref(null)
const dragging = ref(false)
const dragX = ref(0)
const animate = ref(true) // 滑动/回弹需要动画，点击切换时临时关闭
let swipe = null

// 面板内部可拖动/可交互的元素不触发整屏滑动
const IGNORE = '[role="dialog"],input,textarea,select,a[href]'

function onDown(e) {
  if (e.button > 0 || !viewportEl.value) return
  if (e.target?.closest?.(IGNORE)) return
  swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, w: viewportEl.value.clientWidth, locked: false }
}

function onMove(e) {
  if (!swipe || e.pointerId !== swipe.id) return
  const dx = e.clientX - swipe.x
  const dy = e.clientY - swipe.y
  if (!swipe.locked) {
    // 横向位移超过阈值且以横向为主时，才判定为滑动（阈值调小，提升移动端灵敏度）
    if (Math.abs(dx) < 4 || Math.abs(dx) <= Math.abs(dy)) return
    swipe.locked = true
    dragging.value = true
    // 清掉按下时可能已经产生的选区
    window.getSelection()?.removeAllRanges()
    // 注意：此处不调用 setPointerCapture，否则指针会被 viewportEl 抢占，
    // 作为 viewportEl 后代的文件夹按钮将收不到 pointerup，导致移动端点击文件夹无法弹窗。
  }
  // 首尾面板加阻尼
  const atEdge = (tabIndex.value === 0 && dx > 0) || (tabIndex.value === tabs.length - 1 && dx < 0)
  dragX.value = atEdge ? dx * 0.32 : dx
}

function onUp(e) {
  if (!swipe || (e && e.pointerId !== swipe.id)) return
  const dx = dragX.value
  const w = swipe.w
  const locked = swipe.locked
  swipe = null
  dragging.value = false
  if (!locked) return
  dragX.value = 0
  const threshold = Math.max(40, w * 0.1)
  let next = tabIndex.value
  if (dx <= -threshold) next = tabIndex.value + 1
  else if (dx >= threshold) next = tabIndex.value - 1
  go(Math.min(tabs.length - 1, Math.max(0, next)))
}

/* 触摸守卫：横向滑动锁定后阻止浏览器纵向滚动，避免手势被取消导致「滑不动」。
   仅监听 touchmove（非被动），不影响鼠标拖拽与正常纵向滚动。 */
function onTouchMoveGuard(e) {
  if (swipe?.locked) e.preventDefault()
}
onMounted(() => {
  viewportEl.value?.addEventListener('touchmove', onTouchMoveGuard, { passive: false })
})
onBeforeUnmount(() => {
  viewportEl.value?.removeEventListener('touchmove', onTouchMoveGuard)
})

// 轨道盒宽 = 一个视口宽（面板是溢出撑开的），故每切换一屏位移 100%
const trackStyle = computed(() => ({
  transform: `translateX(calc(${tabIndex.value * -100}% + ${dragX.value}px))`
}))

// 底部导航右侧的设置按钮：主页 / 网站 / 工具 三页均显示，各自独立持久化
const settings = computed(() => {
  if (tabIndex.value === 0) return getDesktopSettings('workmate.home.screen')
  if (tabIndex.value === 1) return getDesktopSettings('workmate.sites.screen')
  if (tabIndex.value === 2) return getDesktopSettings('workmate.tools.screen')
  return null
})
</script>

<template>
  <!-- 整页即屏幕：不再有外框，内容铺满视口 -->
  <div
    class="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-canvas-parchment"
    :class="dragging ? 'swiping' : ''"
  >
    <!-- 毛玻璃几何壁纸：铺满整块屏幕，面板叠在其上 -->
    <Wallpaper />

    <!-- 可左右滑动的面板轨道 -->
    <div
      ref="viewportEl"
      class="relative min-h-0 flex-1 touch-pan-y overflow-hidden"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
      @dragstart.prevent
    >
      <div
        class="flex h-full"
        :class="dragging || !animate ? '' : 'transition-transform duration-[360ms] ease-[cubic-bezier(0.16,1,0.3,1)]'"
        :style="trackStyle"
      >
        <div
          v-for="(tab, i) in tabs"
          :key="tab.path"
          role="tabpanel"
          :aria-label="tab.label"
          :inert="i !== tabIndex"
          class="h-full w-full shrink-0 overflow-y-auto"
        >
          <component :is="views[tab.key]" v-if="loaded[i]" />
        </div>
      </div>
    </div>

    <!-- 屏幕底部：三个按钮 + 右侧设置 + Home 指示条 -->
    <nav class="relative z-20 shrink-0 px-apple-md pb-[16px] pt-apple-xs" role="tablist" aria-label="主导航">
      <div class="mx-auto flex max-w-[420px] items-center gap-apple-xs">
        <div class="flex flex-1 items-center gap-[2px] rounded-pill bg-white/70 p-[4px] shadow-hairline ring-1 ring-black/5 backdrop-blur-apple">
          <button
            v-for="(tab, i) in tabs"
            :key="tab.path"
            type="button"
            role="tab"
            :aria-selected="i === tabIndex"
            class="flex flex-1 flex-col items-center gap-[3px] rounded-pill px-apple-sm py-[7px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.96]"
            :class="i === tabIndex ? 'bg-primary text-on-primary' : 'text-ink-muted-80 hover:text-ink'"
            @click="go(i, false)"
          >
            <span class="text-[15px] leading-none">{{ tab.icon }}</span>
            <span class="text-[10px] leading-none">{{ tab.label }}</span>
          </button>
        </div>

        <!-- 设置按钮：与主页按钮同一排，位于最右侧，样式参考主页按钮 -->
        <DesktopSettings v-if="settings" :settings="settings" @reset="settings.resetLayout()" />
      </div>
      <span class="pointer-events-none absolute bottom-[7px] left-1/2 h-[4px] w-[104px] -translate-x-1/2 rounded-full bg-ink/25" />
    </nav>
  </div>
</template>

<style>
/* 滑动期间：全局显示抓手光标，且不允许选中任何内容（作用域需穿透到各面板内部，故不加 scoped） */
.swiping,
.swiping * {
  cursor: grabbing !important;
  user-select: none !important;
}
</style>
