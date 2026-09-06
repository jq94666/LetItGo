<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import { siteFolders } from '../../data/sites.js'
import { useDesktopStore } from '../../stores/desktop.js'
import { useSettingsStore } from '../../stores/settings.js'
import DesktopFolderTile from '../../components/DesktopFolderTile.vue'
import FolderPanelV2 from './components/FolderPanelV2.vue'

/* 网站页桌面（文件夹模式）：
   所有网站都保存在文件夹内；桌面只排列「文件夹」。
   - 长按文件夹：拖动排序（实时让位）
   - 文件夹内：长按应用可拖动排序、可改名；点击应用打开
   - 历史数据里散落在桌面的独立站点会被自动收拢回各自的分类文件夹 */

const store = useDesktopStore()
const settingsStore = useSettingsStore()
const s = store.getSettings('workmate.sites.screen')

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

// 站点对象索引与默认归属
const siteByName = Object.fromEntries(siteFolders.flatMap((f) => f.sites).map((x) => [x.name, x]))
const groupOfSite = Object.fromEntries(siteFolders.flatMap((f) => f.sites.map((x) => [x.name, f.id])))

function defaultLayout() {
  return siteFolders.map((f) => ({ kind: 'folder', id: f.id, label: f.label, items: f.sites.map((x) => x.name) }))
}

// 首次进入 / 升级：确保 v2，并把历史遗留的桌面独立站点收拢回文件夹
if (!s.v2) {
  s.v2 = true
  s.auto = true
  if (!s.layout.length) s.layout.splice(0, 0, ...defaultLayout())
}
function ensureFoldersOnly() {
  const list = s.layout
  if (!Array.isArray(list)) {
    list.splice(0, 0, ...defaultLayout())
    return
  }
  // 每次进入都做「幂等对齐」：保留用户对文件夹的顺序 / 改名 / 站内排序，
  // 补齐默认分组的新增文件夹、给已有文件夹自动补入默认新增的站点、剔除已下架的站点，
  // 并把历史遗留的桌面独立站点收拢回其分类文件夹。
  const defaults = defaultLayout()
  const defById = new Map(defaults.map((f) => [f.id, f]))
  // 分组改名迁移：快照里仍是任一旧默认名（legacyLabel，单值或数组）时跟随改名，自定义过的名字不动
  const legacyById = new Map(
    siteFolders
      .filter((f) => f.legacyLabel)
      .map((f) => [f.id, Array.isArray(f.legacyLabel) ? f.legacyLabel : [f.legacyLabel]])
  )
  const seen = new Set()
  const out = []
  for (const it of list) {
    if (it.kind !== 'folder') continue
    if (!it.id || typeof it.label !== 'string' || !Array.isArray(it.items)) continue
    const def = defById.get(it.id)
    // 数据里已删除的分组：连同快照一并移除，避免留下 UI 无法删除的空壳文件夹
    // （其中已下架的站点清理、仍在的站点由默认分组补齐逻辑收回）
    if (!def) continue
    // 清理已不存在于默认站点的名字；保留下架前用户的自定义排序
    it.items = it.items.filter((n) => siteByName[n])
    if (def) {
      // 默认新增站点追加到该文件夹末尾（已存在的不动）
      for (const name of def.items) if (!it.items.includes(name)) it.items.push(name)
      // 旧默认名 → 新默认名（例：信创 → 打印机驱动）
      if (legacyById.get(it.id)?.includes(it.label)) it.label = def.label
    }
    seen.add(it.id)
    out.push(it)
  }
  // 缺失的默认文件夹补在末尾
  for (const f of defaults) {
    if (!seen.has(f.id)) {
      seen.add(f.id)
      out.push(f)
    }
  }
  // 历史遗留的桌面独立站点回到分类文件夹
  for (const sit of list) {
    if (sit.kind !== 'site' || !siteByName[sit.name]) continue
    const gid = groupOfSite[sit.name] ?? null
    const folder = gid ? out.find((f) => f.id === gid) : null
    if (folder && !folder.items.includes(sit.name)) folder.items.push(sit.name)
  }
  list.splice(0, list.length, ...out)
}
ensureFoldersOnly()

// 文件夹集合自动重排：siteFolders 按名称首字母排好后生成签名（id:label…）持久化。
// 数据新增/删除/改名文件夹导致签名变化时，布局按默认顺序重排（新增文件夹因此
// 落在正确位置而不是被补在末尾）；数据不变期间用户长按拖动的自定义顺序照常保留。
// 自定义文件夹（不在默认分组里）稳定排在末尾，相对顺序不变。
const folderSig = siteFolders.map((f) => `${f.id}:${f.label}`).join('|')
if (s.folderSig !== folderSig) {
  s.folderSig = folderSig
  const idx = new Map(defaultLayout().map((f, i) => [f.id, i]))
  s.layout.sort(
    (a, b) => (idx.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (idx.get(b.id) ?? Number.MAX_SAFE_INTEGER)
  )
}

// 恢复默认图标布局（v2）：清空用户定制回静态分组
s.resetLayout = () => {
  s.layout.splice(0, s.layout.length)
  s.order.splice(0, s.order.length)
  for (const k of Object.keys(s.pos)) delete s.pos[k]
  s.auto = true
}

// 有效布局 = 持久化布局（空则回默认）过滤掉设置里隐藏的文件夹。
// 隐藏的文件夹仍保留在 s.layout 中（排序/改名不丢），只是不参与渲染与计数。
// 双重条件：id 在隐藏列表里 且 当前仍属于「编程：」类——分组改名去掉前缀后自动恢复显示。
const effLayout = computed(() => {
  const base = s.layout.length ? s.layout : defaultLayout()
  const hid = settingsStore.hiddenGroups
  if (!hid.length) return base
  const coding = settingsStore.codingFolderIds
  return base.filter((it) => !(coding.has(it.id) && hid.includes(it.id)))
})
function mutableLayout() {
  if (!s.layout.length) s.layout.splice(0, s.layout.length, ...defaultLayout())
  return s.layout
}
const itemKey = (it) => it.id

const openedKey = ref(null)
const openedFolder = computed(() => {
  const it = effLayout.value.find((x) => itemKey(x) === openedKey.value)
  return it?.kind === 'folder' ? it : null
})
function liveOpenedFolder() {
  if (!openedKey.value) return null
  const list = mutableLayout()
  const it = list.find((x) => itemKey(x) === openedKey.value)
  return it?.kind === 'folder' ? it : null
}
const openedItems = computed(() => {
  const folder = openedFolder.value
  if (!folder) return []
  return folder.items.map((n) => siteByName[n]).filter(Boolean)
})

// 文件夹事件：改名 / 内部排序
function onRename(label) {
  const folder = liveOpenedFolder()
  if (!folder) return
  folder.label = label
}
function onReorder(names) {
  const folder = liveOpenedFolder()
  if (!folder) return
  folder.items.splice(0, folder.items.length, ...names)
}

/* ---------- 网格度量 ---------- */
const EDGE_PAD = 20
const TOP_PAD = 16
const TILE_MAX = 120
const TILE_GAP = 20
const LABEL_H = 22
const MIN_TILE = 80
const COLS_MOBILE = 4
const COLS_DESKTOP = 12
const COLS_BREAK = 768
const LONG_PRESS = 380

const screenEl = ref(null)
const deskScroller = ref(null)
const screenSize = reactive({ w: 0, h: 0 })
const count = computed(() => effLayout.value.length)

const grid = computed(() => {
  const { w, h } = screenSize
  const availW = w ? w - EDGE_PAD * 2 : 0
  const availH = h ? h - TOP_PAD : 0
  const isNarrow = w > 0 && w < COLS_BREAK
  const effCols = isNarrow
    ? COLS_MOBILE
    : Math.max(1, Math.min(COLS_DESKTOP, Math.floor((availW + TILE_GAP) / (MIN_TILE + TILE_GAP))))
  const effRows = Math.max(2, Math.ceil(count.value / effCols))
  const cellW = availW > 0 ? Math.min(availW / effCols, TILE_MAX + TILE_GAP) : TILE_MAX + TILE_GAP
  const rowGap = isNarrow ? 12 : 24
  const tile = availW > 0 ? Math.max(56, Math.min(TILE_MAX, cellW - TILE_GAP)) : TILE_MAX
  const cellH = tile + LABEL_H + rowGap
  const deskH = Math.max(availH, TOP_PAD + effRows * cellH)
  return { w, h, cellW, cellH, tile, effCols, effRows, deskH, offsetX: availW > 0 ? Math.max(0, Math.min(EDGE_PAD, w - cellW * effCols)) : 0, offsetY: TOP_PAD }
})

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
  window.addEventListener('site-swipe-lock', onPageSwipeLock)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measure)
  window.removeEventListener('site-swipe-lock', onPageSwipeLock)
  window.removeEventListener('pointermove', winMove)
  window.removeEventListener('pointerup', winUp)
  window.removeEventListener('pointercancel', winCancel)
  clearLong()
})

function slotPos(index) {
  const g = grid.value
  if (!g.w || !g.deskH) return { x: 50, y: 50 }
  const col = index % g.effCols
  const row = Math.floor(index / g.effCols) % g.effRows
  return { x: ((g.offsetX + (col + 0.5) * g.cellW) / g.w) * 100, y: ((g.offsetY + (row + 0.5) * g.cellH) / g.deskH) * 100 }
}
const tileWidth = computed(() => `${grid.value.tile}px`)
const deskHeight = computed(() => `${grid.value.deskH}px`)

/* ---------- 桌面文件夹拖拽排序 ---------- */
const drag = ref(null)
const dragKey = ref(null)
const dragPos = reactive({ x: 50, y: 50 })
const hoverKey = ref(null)
let longTimer = null
let dragSeq = 0
const clearLong = () => {
  if (longTimer) {
    clearTimeout(longTimer)
    longTimer = null
  }
}

const tiles = computed(() =>
  effLayout.value.map((it, idx) => {
    const key = itemKey(it)
    const base = slotPos(idx)
    const isDrag = dragKey.value === key
    return { key, it, idx, x: isDrag ? dragPos.x : base.x, y: isDrag ? dragPos.y : base.y }
  })
)

let suppressOpen = false
let suppressTimer = null
function armSuppressOpen() {
  suppressOpen = true
  clearTimeout(suppressTimer)
  suppressTimer = setTimeout(() => (suppressOpen = false), 300)
}
function onTileTap(it) {
  if (suppressOpen) {
    suppressOpen = false
    return
  }
  if (it.kind === 'folder') openedKey.value = it.id
}

function onTileDown(e, it, idx) {
  if (openedKey.value || e.button !== 0) return
  // 不拦截冒泡：页面级左右滑动与长按拖拽靠「竞争仲裁」协调——
  // 快速横滑 → App 锁定并广播 site-swipe-lock，本手势让位；
  // 静止长按 → 本文件广播 site-sort-begin，页面滑动让位。
  clearLong()
  // 遗留手势一律作废（例如触摸中途再次按下），防止旧长按定时器复活
  if (drag.value) drag.value.cancelled = true
  const st = {
    seq: ++dragSeq,
    idx,
    key: itemKey(it),
    kind: it.kind,
    pid: e.pointerId,
    sx: e.clientX,
    sy: e.clientY,
    el: e.currentTarget,
    moved: false,
    ok: false,
    cancelled: false
  }
  drag.value = st
  window.addEventListener('pointermove', winMove)
  window.addEventListener('pointerup', winUp)
  window.addEventListener('pointercancel', winCancel)
  longTimer = setTimeout(() => {
    longTimer = null
    // 只认属于当前手势的定时器：被新的 down / 取消 / 抬指都会先置 cancelled
    // 注意：drag 是深响应 ref，.value 返回 reactive 代理，不能与原始 st 做 === 比较
    if (st.cancelled || st.seq !== dragSeq) return
    st.ok = true
    // 长按获胜：让页面级左右滑动让位（不再把本次手势当切页滑动）
    window.dispatchEvent(new CustomEvent('site-sort-begin', { detail: { pid: st.pid } }))
    dragKey.value = st.key
    const base = slotPos(st.idx)
    dragPos.x = base.x
    dragPos.y = base.y
    try {
      st.el?.setPointerCapture?.(st.pid)
    } catch {
      /* ignore */
    }
  }, LONG_PRESS)
}

function contentXY(e) {
  const rect = screenEl.value?.getBoundingClientRect()
  const scroller = deskScroller.value
  if (!rect) return { x: 0, y: 0 }
  const scrollTop = scroller ? scroller.scrollTop : 0
  const g = grid.value
  return { x: ((e.clientX - rect.left) / rect.width) * 100, y: g.deskH ? ((e.clientY - rect.top + scrollTop) / g.deskH) * 100 : 0 }
}
function slotAt(px, py) {
  const g = grid.value
  if (!g.w || !g.deskH) return -1
  const localX = (px / 100) * g.w - g.offsetX
  const localY = (py / 100) * g.deskH - g.offsetY
  const col = clamp(Math.floor(localX / g.cellW), 0, g.effCols - 1)
  const row = clamp(Math.floor(localY / g.cellH), 0, g.effRows - 1)
  return Math.min(row * g.effCols + col, Math.max(0, effLayout.value.length - 1))
}
function hoverAt(e) {
  if (!screenEl.value) return null
  const els = screenEl.value.querySelectorAll('[data-desk-key]')
  for (const el of els) {
    if (el.dataset.deskKey === drag.value?.key) continue
    const r = el.getBoundingClientRect()
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      const key = el.dataset.deskKey
      return { key, idx: Number(el.dataset.deskIdx), it: effLayout.value[Number(el.dataset.deskIdx)] }
    }
  }
  return null
}

function reorderItem(from, to) {
  const list = mutableLayout()
  // 调用方传入的都是「可见序列」下标（effLayout 已滤掉隐藏文件夹），
  // 这里对可见子序列重排后按原顺序回填，隐藏项保持在原列表中的相对位置。
  const vis = [...effLayout.value] // 副本：无隐藏项时 effLayout 即 s.layout 本体，不能原地 splice
  if (from < 0 || to < 0 || from === to || from >= vis.length || to >= vis.length) return
  const [item] = vis.splice(from, 1)
  vis.splice(to, 0, item)
  let vi = 0
  const merged = list.map((it) => (vis.includes(it) ? vis[vi++] : it))
  list.splice(0, list.length, ...merged)
}

function liveShift(e) {
  const st = drag.value
  if (!st || !st.ok) return
  const c = contentXY(e)
  const to = slotAt(c.x, c.y)
  if (to < 0 || to === st.idx) return
  reorderItem(st.idx, to)
  st.idx = to
}

function winMove(e) {
  const st = drag.value
  if (!st || st.pid !== e.pointerId) return
  const dx = e.clientX - st.sx
  const dy = e.clientY - st.sy
  if (!st.ok) {
    if (Math.abs(dx) + Math.abs(dy) >= 10) {
      st.cancelled = true
      clearLong()
      drag.value = null
    }
    return
  }
  if (!st.moved && Math.abs(dx) + Math.abs(dy) >= 8) st.moved = true
  const c = contentXY(e)
  dragPos.x = clamp(c.x, 0, 100)
  dragPos.y = clamp(c.y, 0, 100)
  hoverKey.value = hoverAt(e)?.key ?? null
  liveShift(e)
  e.preventDefault?.()
}

function dropDone() {
  hoverKey.value = null
  drag.value = null
  dragKey.value = null
  dragPos.x = 50
  dragPos.y = 50
}
function detachWinListeners() {
  window.removeEventListener('pointermove', winMove)
  window.removeEventListener('pointerup', winUp)
  window.removeEventListener('pointercancel', winCancel)
}
function winUp(e) {
  detachWinListeners()
  clearLong()
  const st = drag.value
  if (!st || st.pid !== e.pointerId) {
    dropDone()
    return
  }
  st.cancelled = true
  // 只有进入长按拖拽（st.ok）才抑制浏览器补发的幽灵 click；普通点击原样放行 → 打开文件夹
  if (st.ok) armSuppressOpen()
  if (st.ok && st.moved) {
    const c = contentXY(e)
    const hover = hoverAt(e)
    if (hover) reorderItem(st.idx, hover.idx)
    else reorderItem(st.idx, slotAt(c.x, c.y))
  }
  drag.value = null
  dropDone()
}
function winCancel(e) {
  detachWinListeners()
  clearLong()
  const st = drag.value
  if (st && st.pid === e.pointerId) {
    st.cancelled = true
    if (st.ok) armSuppressOpen()
  }
  drag.value = null
  dropDone()
}
/* 页面级左右滑动获胜：放弃当前长按候选（尚未进入拖拽时） */
function onPageSwipeLock(e) {
  const pid = e.detail?.pid
  const st = drag.value
  if (pid == null || !st || st.pid !== pid || st.ok) return
  st.cancelled = true
  clearLong()
  detachWinListeners()
  drag.value = null
  dropDone()
}

// 打开中的文件夹若从有效布局中消失（被隐藏 / 被重置），自动收起弹层
watch(effLayout, (list) => {
  if (openedKey.value && !list.some((x) => itemKey(x) === openedKey.value)) {
    openedKey.value = null
  }
})
</script>

<template>
  <!-- 网站面板：文件夹主屏（壁纸与底部按钮由 App 统一提供） -->
  <div ref="screenEl" class="relative h-full w-full overflow-hidden">
    <div ref="deskScroller" class="h-full w-full overflow-y-auto overscroll-contain">
      <div class="relative w-full" :style="{ minHeight: '100%', height: deskHeight }">
        <button
          v-for="tile in tiles"
          :key="tile.key"
          type="button"
          :data-desk-key="tile.key"
          :data-desk-idx="tile.idx"
          class="absolute z-10 select-none rounded-apple-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
          :class="dragKey === tile.key ? 'z-20 cursor-grabbing touch-none' : 'cursor-default touch-pan-y'"
          :style="{
            left: `${tile.x}%`,
            top: `${tile.y}%`,
            width: tileWidth,
            transform: `translate(-50%, -50%) scale(${dragKey === tile.key ? 1.08 : 1})`,
            transition: dragKey === tile.key
              ? 'none'
              : 'transform 0.15s ease, left 0.22s cubic-bezier(0.25,0.8,0.4,1), top 0.22s cubic-bezier(0.25,0.8,0.4,1)'
          }"
          :aria-label="`${tile.it.label}，${tile.it.items.length} 个网站`"
          @pointerdown="onTileDown($event, tile.it, tile.idx)"
          @click="onTileTap(tile.it)"
          @keydown.enter.prevent="openedKey = tile.it.id"
          @keydown.space.prevent="openedKey = tile.it.id"
        >
          <DesktopFolderTile
            :title="tile.it.label"
            :items="tile.it.items.map((n) => ({ key: n, name: n, icon: siteByName[n]?.icon }))"
          />

          <!-- 拖拽悬停反馈 -->
          <span
            v-if="hoverKey === tile.key && drag"
            class="pointer-events-none absolute -inset-1.5 z-20 flex items-center justify-center"
            aria-hidden="true"
          >
            <span class="desk-hover absolute inset-0 rounded-apple-md ring-2 ring-primary/80" />
          </span>
        </button>
      </div>
    </div>

    <!-- 文件夹展开 -->
    <Transition name="folder">
      <div v-if="openedFolder" class="absolute inset-0 z-20">
        <FolderPanelV2
          :title="openedFolder.label"
          :items="openedItems"
          @close="openedKey = null"
          @rename="onRename"
          @reorder="onReorder"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* 拖拽悬停到目标文件夹时：圆环脉动 */
.desk-hover {
  animation: desk-hover-pulse 0.9s ease-in-out infinite;
}
@keyframes desk-hover-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.9);
    transform: scale(1);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 9px rgba(99, 102, 241, 0);
    transform: scale(1.07);
    opacity: 0.92;
  }
}
</style>
