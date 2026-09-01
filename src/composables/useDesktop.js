import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { getDesktopSettings } from './desktopStore.js'

/* 桌面布局：网格排布、拖拽摆放、自动排列
   网站页与工具页共用同一套逻辑；列数/行数/位置等设置由 desktopStore 统一持久化，
   以便底部导航里的设置按钮与页面共享同一份状态。 */

const TILE_MAX = 120 // 图标/文件夹最大边长（px）
const TILE_GAP = 20 // 图标之间的固定间距（px）
const LABEL_H = 22 // 图标下方文字高度（px）
const EDGE_PAD = 20 // 网格左右内边距（px）
const TOP_PAD = 16 // 网格顶部留白（px）
const MIN_TILE = 80 // 单格最小图标边长（px）：低于此值则自动减少列数（移动端换行）

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export function useDesktop({ storageKey, itemCount = 0 }) {
  const s = getDesktopSettings(storageKey) // 与底部导航共享的响应式设置
  const screenEl = ref(null)
  const openedId = ref(null)
  const dragId = ref(null)
  const screenSize = reactive({ w: 0, h: 0 })

  // 以 computed 代理共享状态，保持页面内 v-model / watch 的用法不变
  const cols = computed({ get: () => s.cols, set: (v) => (s.cols = clamp(Number(v) || 4, 2, 8)) })
  const rows = computed({ get: () => s.rows, set: (v) => (s.rows = clamp(Number(v) || 5, 2, 10)) })
  const auto = computed({ get: () => s.auto, set: (v) => (s.auto = v) })
  const positions = s.pos

  /* ---------- 屏幕尺寸 ---------- */
  function measure() {
    const rect = screenEl.value?.getBoundingClientRect()
    if (rect) {
      screenSize.w = rect.width
      screenSize.h = rect.height
    }
  }

  onMounted(() => {
    measure()
    window.addEventListener('resize', measure)
  })
  onBeforeUnmount(() => window.removeEventListener('resize', measure))

  /* ---------- 网格排布 ---------- */
  // 单元格取「屏幕均分」与「图标尺寸 + 固定间距」的较小值，
  // 屏幕过宽时不拉伸间距，整块网格默认靠左上排列
  const layout = computed(() => {
    const { w, h } = screenSize
    const availW = w ? w - EDGE_PAD * 2 : 0
    const availH = h ? h - TOP_PAD : 0
    // 列数：按可用宽度自动缩减，保证单格不小于 MIN_TILE（移动端自动换行、不挤在一起）
    const effCols = clamp(Math.floor((availW + TILE_GAP) / (MIN_TILE + TILE_GAP)), 2, cols.value)
    // 行数：由内容数量决定，保证所有文件夹都能排下（超出视口则整块可纵向滑动）
    const effRows = Math.max(2, Math.ceil(itemCount / effCols))
    const cellW = availW > 0 ? Math.min(availW / effCols, TILE_MAX + TILE_GAP) : TILE_MAX + TILE_GAP
    const cellH = availH > 0 ? Math.min(availH / effRows, TILE_MAX + LABEL_H + TILE_GAP) : TILE_MAX + LABEL_H + TILE_GAP
    const tile = Math.max(56, Math.min(TILE_MAX, cellW - TILE_GAP, cellH - LABEL_H - TILE_GAP))
    // 桌面高度取「视口高度」与「内容所需高度」的较大值：内容超出视口即可纵向滚动
    const deskH = Math.max(availH, TOP_PAD + effRows * cellH)
    return {
      w,
      h,
      cellW,
      cellH,
      tile,
      effCols,
      effRows,
      deskH,
      offsetX: availW > 0 ? Math.max(0, Math.min(EDGE_PAD, w - cellW * effCols)) : 0,
      offsetY: TOP_PAD
    }
  })

  function slotPos(index) {
    const { w, cellW, cellH, offsetX, offsetY, effCols, effRows, deskH } = layout.value
    if (!w || !deskH) return { x: 50, y: 50 }
    const col = index % effCols
    const row = Math.floor(index / effCols) % effRows
    return {
      x: ((offsetX + (col + 0.5) * cellW) / w) * 100,
      y: ((offsetY + (row + 0.5) * cellH) / deskH) * 100
    }
  }

  const tileWidth = computed(() => `${layout.value.tile}px`)
  const deskHeight = computed(() => `${layout.value.deskH}px`)

  /* ---------- 拖拽：可在整个屏幕内自由摆放 ---------- */
  let drag = null
  let lastMoved = false // 记录「最近一次按下到抬起」之间是否发生过明显移动（用于 click 兜底判定）

  function onDown(e, tile) {
    if (openedId.value || e.button > 0) return
    const rect = screenEl.value?.getBoundingClientRect()
    if (!rect) return
    const tileW = layout.value.tile
    const tileH = tileW + LABEL_H
    const deskH = layout.value.deskH
    lastMoved = false
    drag = {
      id: tile.id,
      x: tile.x,
      y: tile.y,
      sx: e.clientX,
      sy: e.clientY,
      rect,
      padX: (tileW / 2 / rect.width) * 100 + 1,
      padY: (tileH / 2 / deskH) * 100 + 1,
      moved: false,
      canDrag: !auto.value // 自动排列时只允许点击，不允许拖动
    }
    dragId.value = drag.canDrag ? tile.id : null
    // 仅手动模式下抢占手势并阻止冒泡，避免与「整屏左右滑动切换面板」冲突；
    // 自动排列（默认）下不抢占，让手势继续冒泡给底部导航的滑动切换
    if (drag.canDrag) {
      e.stopPropagation?.()
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
  }

  function onMove(e) {
    if (!drag) return
    const dx = e.clientX - drag.sx
    const dy = e.clientY - drag.sy
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) >= 10) {
      drag.moved = true
      lastMoved = true
    }
    if (!drag.canDrag) return // 自动排列：只判定是否为点击，不跟随移动
    positions[drag.id] = {
      x: clamp(drag.x + (dx / drag.rect.width) * 100, drag.padX, 100 - drag.padX),
      y: clamp(drag.y + (dy / layout.value.deskH) * 100, drag.padY, 100 - drag.padY)
    }
  }

  function onUp() {
    if (!drag) return
    // 拖动过程中位置已写入 positions（即 s.pos），由 desktopStore 的 watcher 自动持久化
    if (!drag.moved) openedId.value = drag.id // 未拖动则视为点击，展开文件夹
    drag = null
    dragId.value = null
  }

  function onCancel() {
    // 触摸被浏览器取消（如被判为滚动）时，若未发生拖动仍视为点击，展开文件夹
    // （移动端轻点常被识别为潜在滚动而触发 pointercancel，需在此兜底打开）
    if (drag && !drag.moved) openedId.value = drag.id
    drag = null
    dragId.value = null
  }

  function onClick(tile) {
    // 兜底：部分移动端浏览器在触摸点按时 pointerup / pointercancel 不可靠，
    // 而浏览器为「点按」合成的 click 是最稳定的点按信号，用它最终兜底打开文件夹。
    if (openedId.value) return
    if (lastMoved) {
      lastMoved = false // 这是一次拖动/滑动，而非点按，不打开
      return
    }
    openedId.value = tile.id
  }

  function resetLayout() {
    s.resetLayout() // 清空自由摆放的位置（store 内自动持久化）
    openedId.value = null
  }

  return {
    screenEl,
    cols,
    rows,
    auto,
    positions,
    openedId,
    dragId,
    tileWidth,
    deskHeight,
    slotPos,
    onDown,
    onMove,
    onUp,
    onCancel,
    onClick,
    resetLayout
  }
}
