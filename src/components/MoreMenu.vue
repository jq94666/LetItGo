<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import mainIcon from '../assets/images/main.webp'
import { SEARCH_ENGINES, useSettingsStore } from '../stores/settings.js'

// 底部导航的「更多」按钮：点击弹出上拉菜单，内含「壁纸 / 设置 / 关于」
const props = defineProps({
  settings: { type: Object, required: true }
})
const emit = defineEmits(['reset'])

const open = ref(false)
// 视图：menu 主菜单 → settings 设置分组 → wallpaper/search/layout 具体设置；about 由主菜单直接进入
const view = ref('menu') // menu | settings | wallpaper | search | layout | about

// 面板标题与无障碍标签：随 view 切换
const viewTitle = computed(() => {
  const t = { menu: '更多', settings: '设置', wallpaper: '壁纸', search: '搜索', layout: '自动排列', about: '关于' }
  return t[view.value] ?? '更多'
})
const viewAria = computed(() => {
  const t = { menu: '更多', settings: '设置', wallpaper: '壁纸设置', search: '搜索设置', layout: '自动排列设置', about: '关于' }
  return t[view.value] ?? '更多'
})

// 返回：壁纸/搜索/自动排列 从设置分组进入 → 回「设置」；设置分组与关于 → 回主菜单
function goBack() {
  go(view.value === 'settings' || view.value === 'about' ? 'menu' : 'settings')
}

// 全局偏好（默认搜索引擎、壁纸等），与传入的桌面布局设置相互独立
const settingsStore = useSettingsStore()
const engines = SEARCH_ENGINES

/* 自定义壁纸：选择本机图片 → canvas 压缩 → dataURL 存入全局偏好（localStorage） */
const fileInput = ref(null)
const uploading = ref(false)
const wallpaperError = ref('')

function pickWallpaper() {
  wallpaperError.value = ''
  fileInput.value?.click()
}

/* ---------- 壁纸预览编辑器：拖动平移 / 缩放（所见即所得映射到全屏） ---------- */
const vp = reactive({ w: 1200, h: 800 }) // 真实屏幕尺寸
const capH = 320 // 预览区最大高度
const previewWrap = ref(null) // 面板内容宽度容器（用于计算预览尺寸）
const previewBox = ref(null) // 预览交互区

function syncViewport() {
  vp.w = window.innerWidth || 1200
  vp.h = window.innerHeight || 800
}
onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

// 预览盒：按屏幕宽高比等比缩放到面板宽度内（高不超过 capH）
const previewSize = computed(() => {
  const cw = previewWrap.value?.clientWidth || 0
  if (!cw || !vp.h) return { w: 0, h: 0, k: 1 }
  let pw = cw
  let ph = Math.round((cw * vp.h) / vp.w)
  if (ph > capH) {
    ph = capH
    pw = Math.round((capH * vp.w) / vp.h)
  }
  return { w: pw, h: ph, k: pw / vp.w }
})

const zoom = computed(() => settingsStore.wallpaper?.zoom || 1)
const zoomPct = computed(() => `${Math.round(zoom.value * 100)}%`)
const panX = computed(() => settingsStore.wallpaper?.tx || 0)
const panY = computed(() => settingsStore.wallpaper?.ty || 0)

// 预览里的位移 = 全屏位移 × 预览缩放比例（k）
const previewTransform = computed(() => {
  const w = settingsStore.wallpaper
  if (!w) return {}
  const k = previewSize.value.k || 1
  return { transform: `translate(${(w.tx || 0) * k}px, ${(w.ty || 0) * k}px) scale(${w.zoom || 1})` }
})

// 平移量限制：100% 时允许自由摆放图片，放大后按比例放宽可移动范围
function clampWallPan(c, z) {
  const mx = z * vp.w * 0.55
  const my = z * vp.h * 0.55
  if ((c.tx || 0) !== 0) c.tx = Math.min(mx, Math.max(-mx, c.tx))
  if ((c.ty || 0) !== 0) c.ty = Math.min(my, Math.max(-my, c.ty))
}

function zoomImage(next) {
  const c = settingsStore.wallpaper
  if (!c) return
  const z = Math.min(8, Math.max(1, next))
  settingsStore.updateWallpaper({ zoom: z })
  clampWallPan(c, z)
  settingsStore.persistWallpaper()
}
function zoomBy(delta) {
  zoomImage(zoom.value + delta)
}
function onZoomRange(e) {
  zoomImage(Number(e.target.value))
}
function resetWallTransform() {
  settingsStore.updateWallpaper({ zoom: 1, tx: 0, ty: 0 })
  settingsStore.persistWallpaper()
}

let wallPan = null
function onWallPanDown(e) {
  if (!settingsStore.wallpaper || e.button > 0) return
  wallPan = { id: e.pointerId, x: e.clientX, y: e.clientY }
  previewBox.value?.setPointerCapture?.(e.pointerId)
}
function onWallPanMove(e) {
  if (!wallPan || e.pointerId !== wallPan.id) return
  const k = previewSize.value.k || 1
  const dx = (e.clientX - wallPan.x) / k
  const dy = (e.clientY - wallPan.y) / k
  if (!dx && !dy) return
  wallPan.x = e.clientX
  wallPan.y = e.clientY
  const w = settingsStore.wallpaper
  if (!w) return
  settingsStore.updateWallpaper({
    tx: (w.tx || 0) + dx,
    ty: (w.ty || 0) + dy
  })
  clampWallPan(w, w.zoom || 1)
}
function onWallPanUp(e) {
  if (!wallPan) return
  if (e && e.pointerId !== wallPan.id) return
  wallPan = null
  settingsStore.persistWallpaper()
}

async function onWallpaperFile(e) {
  const input = e.target
  const file = input?.files?.[0]
  if (input) input.value = '' // 允许重复选择同一文件
  if (!file) return
  if (!file.type.startsWith('image/')) {
    wallpaperError.value = '请选择图片文件'
    return
  }
  uploading.value = true
  wallpaperError.value = ''
  try {
    // 依次尝试：canvas 压缩 → 原图 dataURL → 仅本次会话的原始预览，保证尽可能设置成功
    let dataUrl = null
    let persist = true
    try {
      dataUrl = await compressImage(file, 1920, 0.82)
    } catch (e1) {
      // 个别图片在 canvas 压缩阶段失败（格式特殊/超大等）：降级为直接读取原图
      console.warn('[wallpaper] 压缩失败，尝试使用原图：', e1)
      try {
        dataUrl = await readAsDataURL(file)
      } catch (e2) {
        // FileReader 也失败（极少见）：直接用文件对象 URL，保证本页能看到壁纸
        console.error('[wallpaper] 原图读取失败，改为仅本次会话预览：', e2)
        dataUrl = URL.createObjectURL(file)
        persist = false
      }
    }
    const persisted = settingsStore.setWallpaper({ src: dataUrl, zoom: 1, tx: 0, ty: 0 }, persist)
    if (!persisted || !persist) {
      wallpaperError.value = persist
        ? '图片体积较大，本次已生效，刷新后可能丢失；建议改用较小的 JPG 或 PNG 图片'
        : '该图片未能保存到本机，已在本页生效，刷新后会恢复默认壁纸'
    }
  } catch (err) {
    console.error('[wallpaper] 设置壁纸失败：', err)
    wallpaperError.value = '无法读取该图片，请改用常见的 JPG 或 PNG 图片'
  } finally {
    uploading.value = false
  }
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('FileReader 读取失败'))
    reader.readAsDataURL(file)
  })
}

function compressImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
        const w = Math.max(1, Math.round(img.naturalWidth * scale))
        const h = Math.max(1, Math.round(img.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D 不可用')
        ctx.drawImage(img, 0, 0, w, h)
        // PNG 保留透明通道；其余统一转 JPEG（壁纸场景体积更小）
        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        resolve(canvas.toDataURL(mime, quality))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败'))
    }
    img.src = url
  })
}

function openMenu() {
  view.value = 'menu'
  open.value = true
}
function close() {
  open.value = false
}
function go(v) {
  view.value = v
}
function restoreOrder() {
  props.settings.resetOrder?.()
}
function resetLayout() {
  emit('reset')
  close()
}

// 「恢复默认设置」：二次点击确认后，重置全局偏好（搜索引擎/壁纸）与当前屏幕布局
const resetConfirm = ref(false)
let resetTimer = null
function onResetDefaults() {
  if (!resetConfirm.value) {
    resetConfirm.value = true
    clearTimeout(resetTimer)
    resetTimer = setTimeout(() => (resetConfirm.value = false), 3000)
    return
  }
  clearTimeout(resetTimer)
  resetConfirm.value = false
  settingsStore.resetDefaults()
  const s = props.settings
  s.auto = true
  s.resetOrder?.()
  s.resetLayout?.()
}

const aboutTitle = '随它导航'
const aboutText =
  '整理常用网站与日常小工具，让每一次打开都直抵目的地。全部在浏览器本地运行，数据保存在本机。'

// 弹窗内容区高度：随 menu/settings/about 内容平滑过渡（WAAPI 动画），
// 避免切换时弹窗忽大忽小；离场内容改为绝对定位，不再把布局塌缩到只剩标题栏。
// 注意：弹窗由 v-if="open" 控制，挂载时机晚于组件 onMounted，故在 open 变 true 后再初始化。
const contentWrap = ref(null)
const sheetBox = ref(null)
let resizeObs = null
let heightAnim = null

function setupSheetHeight() {
  const sb = sheetBox.value
  const cw = contentWrap.value
  if (!sb || !cw || resizeObs) return
  // 初始固定为当前内容高度，避免首次从 0 撑开
  sb.style.height = cw.offsetHeight + 'px'
  resizeObs = new ResizeObserver(() => {
    const s = sheetBox.value
    const c = contentWrap.value
    if (!s || !c) return
    const next = c.offsetHeight
    const start = s.getBoundingClientRect().height
    if (Math.abs(next - start) < 1) return
    heightAnim?.cancel()
    heightAnim = s.animate(
      [{ height: start + 'px' }, { height: next + 'px' }],
      { duration: 200, easing: 'ease-out' }
    )
    s.style.height = next + 'px'
    heightAnim.onfinish = () => {
      heightAnim = null
    }
  })
  resizeObs.observe(cw)
}

watch(open, async (v) => {
  if (v) {
    await nextTick()
    setupSheetHeight()
  } else {
    resizeObs?.disconnect()
    resizeObs = null
    heightAnim?.cancel()
    heightAnim = null
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
  clearTimeout(resetTimer)
  resizeObs?.disconnect()
})
</script>

<template>
  <div class="relative shrink-0">
    <button
      type="button"
      class="flex flex-col items-center gap-[3px] rounded-pill bg-white/70 px-apple-sm py-[7px] text-ink-muted-80 shadow-hairline ring-1 ring-black/5 backdrop-blur-apple transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.95]"
      aria-label="更多"
      @click="openMenu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-[15px] w-[15px] leading-none">
        <circle cx="5" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="19" cy="12" r="1.6" />
      </svg>
      <span class="text-[10px] leading-none">更多</span>
    </button>

    <!-- 上拉菜单 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          @click.self="close"
        >
          <Transition
            appear
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="translate-y-6 opacity-0 sm:translate-y-3 sm:scale-95"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="translate-y-6 opacity-0 sm:translate-y-3 sm:scale-95"
          >
            <div
              role="dialog"
              aria-modal="true"
              :aria-label="viewAria"
              class="mx-apple-sm block w-[calc(100%-2*var(--spacing-apple-sm))] max-w-md overflow-hidden rounded-apple-lg bg-canvas shadow-product ring-1 ring-black/5 pb-[max(10px,env(safe-area-inset-bottom))] sm:mx-0"
            >
              <!-- 顶部拖动指示条 -->
              <div class="mx-auto mt-apple-xs h-[4px] w-9 shrink-0 rounded-full bg-black/15" />

              <!-- 标题栏 -->
              <div class="flex items-center gap-apple-xs px-apple-md pt-apple-sm">
                <button
                  v-if="view !== 'menu'"
                  type="button"
                  aria-label="返回"
                  class="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted-80 transition hover:bg-black/5 hover:text-ink active:scale-[0.9]"
                  @click="goBack"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <p class="flex-1 text-[15px] font-semibold text-ink">
                  {{ viewTitle }}
                </p>
                <button
                  type="button"
                  aria-label="关闭"
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 hover:text-ink active:scale-[0.9]"
                  @click="close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>

              <!-- 主菜单 → 设置分组 → 壁纸 / 搜索 / 自动排列 具体设置；关于由主菜单直接进入（见底部 pane-* 命名过渡） -->
              <!-- 内容区：高度随内容平滑过渡（避免弹窗忽大忽小）；内层 contentWrap 用于测量自然高度 -->
              <div
                ref="sheetBox"
                class="sheet-box relative overflow-hidden"
              >
                <div ref="contentWrap" class="relative">
                  <Transition name="pane">
              <div v-if="view === 'menu'" key="menu" class="flex flex-col gap-apple-xs px-apple-md py-apple-md">
                <button
                  type="button"
                  class="flex w-full items-center gap-apple-sm rounded-apple-md bg-canvas-parchment p-apple-sm text-left transition hover:bg-hairline active:scale-[0.99]"
                  @click="go('settings')"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-apple-md bg-canvas text-ink shadow-hairline ring-1 ring-black/5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                  <span class="flex-1 text-[15px] font-semibold text-ink">设置</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0 text-ink-muted-48"><path d="m9 18 6-6-6-6" /></svg>
                </button>

                <button
                  type="button"
                  class="flex w-full items-center gap-apple-sm rounded-apple-md bg-canvas-parchment p-apple-sm text-left transition hover:bg-hairline active:scale-[0.99]"
                  @click="go('about')"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-apple-md bg-canvas text-ink shadow-hairline ring-1 ring-black/5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                  </span>
                  <span class="flex-1 text-[15px] font-semibold text-ink">关于</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0 text-ink-muted-48"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>

              <!-- 设置面板：分组入口，进入具体设置 -->
              <div v-else-if="view === 'settings'" key="settings" class="flex flex-col gap-apple-xs px-apple-md py-apple-md">
                <button
                  type="button"
                  class="flex w-full items-center gap-apple-sm rounded-apple-md bg-canvas-parchment p-apple-sm text-left transition hover:bg-hairline active:scale-[0.99]"
                  @click="go('wallpaper')"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-apple-md bg-canvas text-ink shadow-hairline ring-1 ring-black/5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-[15px] font-semibold text-ink">壁纸</span>
                    <span class="block truncate text-[12px] text-ink-muted-48">{{ settingsStore.wallpaper ? '自定义本机图片' : '内置默认壁纸' }}</span>
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0 text-ink-muted-48"><path d="m9 18 6-6-6-6" /></svg>
                </button>

                <button
                  type="button"
                  class="flex w-full items-center gap-apple-sm rounded-apple-md bg-canvas-parchment p-apple-sm text-left transition hover:bg-hairline active:scale-[0.99]"
                  @click="go('search')"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-apple-md bg-canvas text-ink shadow-hairline ring-1 ring-black/5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-[15px] font-semibold text-ink">搜索</span>
                    <span class="block truncate text-[12px] text-ink-muted-48">默认搜索引擎 · 当前「{{ settingsStore.currentEngine().label }}」</span>
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0 text-ink-muted-48"><path d="m9 18 6-6-6-6" /></svg>
                </button>

                <button
                  type="button"
                  class="flex w-full items-center gap-apple-sm rounded-apple-md bg-canvas-parchment p-apple-sm text-left transition hover:bg-hairline active:scale-[0.99]"
                  @click="go('layout')"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-apple-md bg-canvas text-ink shadow-hairline ring-1 ring-black/5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                      <rect width="7" height="7" x="3" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="3" rx="1" />
                      <rect width="7" height="7" x="14" y="14" rx="1" />
                      <rect width="7" height="7" x="3" y="14" rx="1" />
                    </svg>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-[15px] font-semibold text-ink">自动排列</span>
                    <span class="block truncate text-[12px] text-ink-muted-48">{{ settings.auto ? '按行列顺序紧凑排布' : '可拖动到任意位置' }}</span>
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0 text-ink-muted-48"><path d="m9 18 6-6-6-6" /></svg>
                </button>

                <!-- 恢复默认设置 -->
                <button
                  type="button"
                  class="mt-apple-xs flex w-full items-center justify-center gap-apple-xs rounded-apple-md bg-canvas-parchment py-apple-xs text-[14px] font-medium transition hover:bg-hairline active:scale-[0.98]"
                  :class="resetConfirm ? 'text-[#e11d48]' : 'text-ink-muted-80 hover:text-[#e11d48]'"
                  @click="onResetDefaults"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  {{ resetConfirm ? '再次点击确认恢复' : '恢复默认设置' }}
                </button>
                <p v-if="resetConfirm" class="text-center text-[12px] leading-normal text-[#e11d48]">将重置默认搜索引擎、壁纸与当前屏幕的图标布局</p>
              </div>

              <!-- 壁纸设置面板：设置 → 壁纸（壁纸为全局偏好），预览可拖动平移 / 缩放 -->
              <div v-else-if="view === 'wallpaper'" key="wallpaper" class="flex flex-col gap-apple-md px-apple-md py-apple-md">
                <div ref="previewWrap" class="flex flex-col gap-apple-sm">
                  <div class="min-w-0">
                    <p class="text-[14px] text-ink-muted-80">壁纸</p>
                    <p class="text-[12px] text-ink-muted-48">{{ settingsStore.wallpaper ? '拖动预览调整图片位置，缩放控制大小' : '使用内置默认壁纸' }}</p>
                  </div>

                  <!-- 预览区（与屏幕同宽高比）：拖动可上下左右移动图片 -->
                  <div
                    v-if="settingsStore.wallpaperSrc"
                    ref="previewBox"
                    class="relative mx-auto touch-none select-none overflow-hidden rounded-apple-md bg-black/10 ring-1 ring-black/10"
                    :style="{ width: previewSize.w + 'px', height: previewSize.h + 'px' }"
                    @pointerdown="onWallPanDown"
                    @pointermove="onWallPanMove"
                    @pointerup="onWallPanUp"
                    @pointercancel="onWallPanUp"
                  >
                    <img
                      :src="settingsStore.wallpaperSrc"
                      alt="壁纸预览"
                      draggable="false"
                      class="pointer-events-none absolute inset-0 h-full w-full max-w-none object-contain will-change-transform"
                      :style="previewTransform"
                    />
                    <span class="pointer-events-none absolute left-1.5 top-1.5 rounded-pill bg-black/35 px-2 py-[2px] text-[11px] leading-normal text-white">{{ zoomPct }}</span>
                    <span class="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill bg-black/25 px-2 py-[2px] text-[11px] leading-normal text-white/90">拖动移动图片，放大后可裁剪画面</span>
                  </div>

                  <div v-else class="flex h-28 w-full flex-col items-center justify-center gap-apple-xs rounded-apple-md bg-canvas-parchment text-ink-muted-48 ring-1 ring-black/10">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                    <span class="text-[12px]">选择图片后，可在此拖动与缩放调整</span>
                  </div>

                  <!-- 缩放控件 -->
                  <div class="flex items-center gap-apple-xs">
                    <button
                      type="button"
                      aria-label="缩小壁纸"
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas-parchment text-ink-muted-80 transition hover:text-ink active:scale-[0.9] disabled:cursor-default disabled:opacity-35"
                      :disabled="!settingsStore.wallpaper || zoom <= 1.01"
                      @click="zoomBy(-0.1)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="h-4 w-4"><path d="M5 12h14" /></svg>
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="0.01"
                      aria-label="缩放壁纸"
                      class="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
                      :value="zoom"
                      :disabled="!settingsStore.wallpaper"
                      @input="onZoomRange"
                    />
                    <button
                      type="button"
                      aria-label="放大壁纸"
                      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas-parchment text-ink-muted-80 transition hover:text-ink active:scale-[0.9] disabled:cursor-default disabled:opacity-35"
                      :disabled="!settingsStore.wallpaper || zoom >= 8"
                      @click="zoomBy(0.1)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" class="h-4 w-4"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                    </button>
                    <span class="w-11 shrink-0 text-right text-[12px] text-ink-muted-48">{{ zoomPct }}</span>
                  </div>

                  <div class="flex gap-apple-xs">
                    <button
                      type="button"
                      class="flex-1 rounded-apple-md bg-canvas-parchment py-apple-xs text-[14px] text-ink-muted-80 transition hover:text-ink active:scale-[0.98] disabled:opacity-50"
                      :disabled="uploading"
                      @click="pickWallpaper"
                    >
                      {{ uploading ? '处理中…' : '重新选择' }}
                    </button>
                    <button
                      v-if="settingsStore.wallpaper"
                      type="button"
                      class="flex-1 rounded-apple-md bg-canvas-parchment py-apple-xs text-[14px] text-ink-muted-80 transition hover:text-ink active:scale-[0.98] disabled:cursor-default disabled:opacity-35"
                      :disabled="zoom === 1 && panX === 0 && panY === 0"
                      @click="resetWallTransform"
                    >
                      重置位置
                    </button>
                    <button
                      v-if="settingsStore.wallpaper"
                      type="button"
                      class="flex-1 rounded-apple-md bg-canvas-parchment py-apple-xs text-[14px] text-ink-muted-80 transition hover:text-ink active:scale-[0.98]"
                      @click="settingsStore.setWallpaper(null)"
                    >
                      移除壁纸
                    </button>
                  </div>

                  <p class="text-[12px] leading-normal text-ink-muted-48">100% 时整张图片完整可见，可直接拖动摆放位置；放大后可继续拖动裁切画面。选择新图片会自动重置缩放与位置。</p>
                  <p v-if="wallpaperError" class="text-[12px] leading-normal text-[#e11d48]">{{ wallpaperError }}</p>
                  <input
                    ref="fileInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    aria-label="选择壁纸图片"
                    @change="onWallpaperFile"
                  />
                </div>
              </div>

              <!-- 搜索设置面板：默认搜索引擎（全局偏好） -->
              <div v-else-if="view === 'search'" key="search" class="flex flex-col gap-apple-md px-apple-md py-apple-md">
                <div class="min-w-0">
                  <p class="text-[14px] text-ink-muted-80">默认搜索引擎</p>
                  <p class="text-[12px] text-ink-muted-48">主页搜索框使用 · 全局偏好 · 当前「{{ settingsStore.currentEngine().label }}」</p>
                </div>
                <div class="flex gap-apple-sm">
                  <button
                    v-for="eng in engines"
                    :key="eng.id"
                    type="button"
                    class="flex-1 rounded-pill py-apple-xs text-[13px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97]"
                    :class="settingsStore.searchEngine === eng.id ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                    :aria-pressed="settingsStore.searchEngine === eng.id"
                    @click="settingsStore.searchEngine = eng.id"
                  >{{ eng.label }}</button>
                </div>
              </div>

              <!-- 自动排列设置面板：当前屏幕的桌面布局 -->
              <div v-else-if="view === 'layout'" key="layout" class="flex flex-col gap-apple-md px-apple-md py-apple-md">
                <div class="flex items-center justify-between gap-apple-sm">
                  <div class="min-w-0">
                    <p class="text-[14px] text-ink-muted-80">自动排列</p>
                    <p class="text-[12px] text-ink-muted-48">{{ settings.auto ? '按行列顺序紧凑排布' : '可拖动到任意位置' }}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="settings.auto"
                    aria-label="自动排列"
                    class="relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
                    :class="settings.auto ? 'bg-primary' : 'bg-hairline'"
                    @click="settings.auto = !settings.auto"
                  >
                    <span
                      class="absolute top-[2px] h-5 w-5 rounded-full bg-white shadow-hairline transition-all duration-200"
                      :class="settings.auto ? 'left-[22px]' : 'left-[2px]'"
                    />
                  </button>
                </div>

                <button
                  v-if="settings.auto"
                  type="button"
                  :disabled="!settings.order || settings.order.length === 0"
                  class="w-full rounded-apple-md bg-canvas-parchment py-apple-xs text-[14px] text-ink-muted-80 transition hover:text-ink active:scale-[0.98] disabled:cursor-default disabled:opacity-40 disabled:active:scale-100"
                  @click="restoreOrder"
                >
                  恢复默认顺序
                </button>
                <button
                  v-else
                  type="button"
                  class="w-full rounded-apple-md bg-canvas-parchment py-apple-xs text-[14px] text-ink-muted-80 transition hover:text-ink active:scale-[0.98]"
                  @click="resetLayout"
                >
                  整理图标（恢复网格排列）
                </button>
              </div>

              <!-- 关于 -->
              <div v-else key="about" class="flex flex-col items-center gap-apple-sm px-apple-md py-apple-lg text-center">
                <img :src="mainIcon" alt="随它导航" class="h-32 w-32 rounded-[24%] object-cover shadow-hairline ring-1 ring-black/5" />
                <div>
                  <p class="text-[19px] font-semibold text-ink">{{ aboutTitle }}</p>
                  <p class="text-[13px] text-primary">{{ aboutSlogan }}</p>
                </div>
                <p class="max-w-[280px] text-[14px] leading-normal text-ink-muted-80">{{ aboutText }}</p>
              </div>
                  </Transition>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* 更多菜单内子面板切换：用轻柔的淡入 + 轻微上移替代原来的左右大幅滑动，
   避免方向切换带来的眩晕感；位移幅度参考搜索下拉的 suggest-*（8px）。 */
.pane-enter-active,
.pane-leave-active {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}
/* 离场内容改为绝对定位：脱离文档流，内容区高度只跟随新内容，弹窗不再塌缩到标题栏 */
.pane-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
}
.pane-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.pane-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
