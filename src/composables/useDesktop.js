import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useDesktopStore } from '../stores/desktop.js'

/* 桌面布局：网格排布、拖拽摆放、自动排列、长按重排文件夹顺序
   网站页与工具页共用同一套逻辑；列数/行数/位置/顺序等设置由 Pinia store 统一持久化，
   以便底部导航里的设置按钮与页面共享同一份状态。 */

const TILE_MAX = 120 // 图标/文件夹最大边长（px）
const TILE_GAP = 20 // 图标之间的固定间距（px）
const LABEL_H = 22 // 图标下方文字高度（px）
const EDGE_PAD = 20 // 网格左右内边距（px）
const TOP_PAD = 16 // 网格顶部留白（px）
const MIN_TILE = 80 // 单格最小图标边长（px）：低于此值则自动减少列数（移动端换行）
const LONG_PRESS = 380 // 自动排列模式下，长按进入「重排」的阈值（ms）

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export function useDesktop({ storageKey, itemCount = 0, defaultOrder = [] }) {
  const store = useDesktopStore()
  const s = store.getSettings(storageKey) // 与底部导航共享的响应式设置
  const screenEl = ref(null)
  const openedId = ref(null)
  const dragId = ref(null)
  const dragX = ref(null) // 拖拽中文件夹的实时中心坐标（% 屏幕），用于跟手显示
  const dragY = ref(null)
  const screenSize = reactive({ w: 0, h: 0 })

  // 以 computed 代理共享状态，保持页面内 v-model / watch 的用法不变
  const cols = computed({ get: () => s.cols, set: (v) => (s.cols = clamp(Number(v) || 4, 3, 12)) })
  const auto = computed({ get: () => s.auto, set: (v) => (s.auto = v) })
  const positions = s.pos

  // 文件夹顺序：以持久化的自定义顺序为准，补入默认中存在但自定义缺失的项，剔除已不存在的项
  const order = computed(() => {
    const set = new Set(defaultOrder)
    const out = s.order.filter((id) => set.has(id))
    for (const id of defaultOrder) if (!out.includes(id)) out.push(id)
    return out
  })

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
  const layout = computed(() => {
    const { w, h } = screenSize
    const availW = w ? w - EDGE_PAD * 2 : 0
    const availH = h ? h - TOP_PAD : 0
    const effCols = clamp(Math.floor((availW + TILE_GAP) / (MIN_TILE + TILE_GAP)), 3, cols.value)
    const effRows = Math.max(2, Math.ceil(itemCount / effCols))
    const cellW = availW > 0 ? Math.min(availW / effCols, TILE_MAX + TILE_GAP) : TILE_MAX + TILE_GAP
    const cellH = availH > 0 ? Math.min(availH / effRows, TILE_MAX + LABEL_H + TILE_GAP) : TILE_MAX + LABEL_H + TILE_GAP
    const tile = Math.max(56, Math.min(TILE_MAX, cellW - TILE_GAP, cellH - LABEL_H - TILE_GAP))
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

  /* ---------- 拖拽 ---------- */
  let drag = null
  let lastMoved = false // 记录「最近一次按下到抬起」之间是否发生过明显移动（用于 click 兜底判定）
  let longPressTimer = null

  const clearLongPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

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
      el: e.currentTarget,
      pid: e.pointerId,
      padX: (tileW / 2 / rect.width) * 100 + 1,
      padY: (tileH / 2 / deskH) * 100 + 1,
      moved: false,
      reorder: false,
      aborted: false
    }
    if (auto.value) {
      // 自动排列：长按进入「重排模式」——未达阈值而移动则视为翻页滑动，不进入重排
      longPressTimer = setTimeout(() => {
        if (!drag || drag.aborted || drag.moved) return
        drag.reorder = true
        dragId.value = drag.id
        dragX.value = drag.x
        dragY.value = drag.y
        // 首次重排时，把当前顺序固化进自定义顺序，便于后续移动
        if (!s.order.length) s.order.splice(0, s.order.length, ...order.value)
        try {
          drag.el?.setPointerCapture?.(drag.pid)
        } catch {
          /* ignore */
        }
      }, LONG_PRESS)
    } else {
      // 手动排列：立即进入自由拖拽（抢占手势，避免与底部导航滑动切换冲突）
      drag.reorder = true
      dragId.value = drag.id
      e.stopPropagation?.()
      try {
        drag.el?.setPointerCapture?.(drag.pid)
      } catch {
        /* ignore */
      }
    }
  }

  // 根据手指（拖拽物中心）所在网格单元，将 draggedId 移动到对应位置
  function reorderTo(px, py, draggedId) {
    const { w, deskH, offsetX, offsetY, cellW, cellH, effCols, effRows } = layout.value
    if (!w) return
    const localX = (px / 100) * w - offsetX
    const localY = (py / 100) * deskH - offsetY
    const col = clamp(Math.floor(localX / cellW), 0, effCols - 1)
    const row = clamp(Math.floor(localY / cellH), 0, effRows - 1)
    const target = clamp(row * effCols + col, 0, s.order.length - 1)
    const from = s.order.indexOf(draggedId)
    if (from < 0 || target === from) return
    s.order.splice(from, 1)
    s.order.splice(target, 0, draggedId)
  }

  function onMove(e) {
    if (!drag || drag.aborted) return
    const dx = e.clientX - drag.sx
    const dy = e.clientY - drag.sy
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) >= 10) {
      drag.moved = true
      lastMoved = true
      if (auto.value && !drag.reorder) {
        // 自动模式下提前滑动 → 判定为翻页，放弃本次拖拽（让手势冒泡给底部导航）
        clearLongPress()
        drag.aborted = true
        return
      }
    }
    if (auto.value) {
      if (!drag.reorder) return // 长按尚未触发，仅记录移动量
      e.stopPropagation?.() // 进入重排后阻止事件冒泡，避免触发整屏翻页
      dragX.value = clamp(drag.x + (dx / drag.rect.width) * 100, 0, 100)
      dragY.value = clamp(drag.y + (dy / layout.value.deskH) * 100, 0, 100)
      reorderTo(dragX.value, dragY.value, drag.id)
    } else {
      // 手动：可在整个屏幕内自由摆放
      positions[drag.id] = {
        x: clamp(drag.x + (dx / drag.rect.width) * 100, drag.padX, 100 - drag.padX),
        y: clamp(drag.y + (dy / layout.value.deskH) * 100, drag.padY, 100 - drag.padY)
      }
    }
  }

  function finishDrag() {
    clearLongPress()
    drag = null
    dragId.value = null
    dragX.value = null
    dragY.value = null
  }

  function onUp() {
    if (!drag) return
    // 拖动过程中位置/顺序已写入 state（s.pos / s.order），由 store 的 watcher 自动持久化
    if (drag.aborted) {
      finishDrag()
      return
    }
    if (drag.reorder) {
      finishDrag()
      return
    }
    if (!drag.moved) openedId.value = drag.id // 未拖动则视为点击，展开文件夹
    finishDrag()
  }

  function onCancel() {
    // 触摸被浏览器取消（如被判为滚动）时，若未发生拖动仍视为点击，展开文件夹
    if (!drag) return
    if (drag.aborted || drag.reorder) {
      finishDrag()
      return
    }
    if (!drag.moved) openedId.value = drag.id
    finishDrag()
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
    auto,
    positions,
    order,
    openedId,
    dragId,
    dragX,
    dragY,
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
