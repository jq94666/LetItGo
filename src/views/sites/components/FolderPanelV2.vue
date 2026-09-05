<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { favicons } from '../../../assets/icons/favicon-manifest.js'

/* v2 文件夹弹窗（网站页文件夹模式专用）：
   - 标题可改名（铅笔 → 输入框）
   - 长按站点图标可拖动排序（网格内左右上下移动即交换位置）

   网站始终保存在文件夹中；状态变化通过 reorder / rename 通知上层。 */
const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, required: true } // site 对象列表 { name, href }
})
const emit = defineEmits(['close', 'rename', 'reorder'])

const LONG_PRESS = 380
const gridEl = ref(null)

/* 名称编辑 */
const editingName = ref(false)
const nameText = ref('')
async function startRename() {
  nameText.value = props.title
  editingName.value = true
  await nextTick()
  document.getElementById('folder-name-input')?.select?.()
}
function commitRename() {
  const v = nameText.value.trim()
  if (v && v !== props.title) emit('rename', v)
  editingName.value = false
}

/* 内部图标长按排序 */
const dragState = ref(null)
let longTimer = null
const clearLong = () => {
  if (longTimer) {
    clearTimeout(longTimer)
    longTimer = null
  }
}

const items = ref([])
watch(
  () => props.items,
  (arr) => {
    if (!dragState.value) items.value = arr.slice()
  },
  { immediate: true }
)

function onTileDown(e, idx) {
  if (editingName.value || e.button > 0) return
  const tile = e.currentTarget
  dragState.value = {
    idx,
    pid: e.pointerId,
    el: tile,
    sx: e.clientX,
    sy: e.clientY,
    moved: false,
    ok: false
  }
  longTimer = setTimeout(() => {
    if (!dragState.value) return
    const st = dragState.value
    if (st.moved && Math.hypot(e.clientX - st.sx, e.clientY - st.sy) > 8) return
    st.ok = true
    st.dx0 = st.sx
    st.dy0 = st.sy
    try {
      st.el?.setPointerCapture?.(st.pid)
    } catch {
      /* ignore */
    }
  }, LONG_PRESS)
}

function indexAt(e) {
  const grid = gridEl.value
  if (!grid) return -1
  const rect = grid.getBoundingClientRect()
  const tiles = [...grid.children]
  for (let i = 0; i < tiles.length; i++) {
    const r = tiles[i].getBoundingClientRect()
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return i
  }
  return -1
}

function onTileMove(e) {
  const st = dragState.value
  if (!st || e.pointerId !== st.pid) return
  const dx = e.clientX - st.sx
  const dy = e.clientY - st.sy
  if (!st.ok) {
    if (Math.abs(dx) + Math.abs(dy) >= 10) {
      clearLong()
      dragState.value = null
    }
    return
  }
  if (Math.abs(dx) + Math.abs(dy) >= 4 && !st.moved) st.moved = true

  // 网格内实时交换排序
  const over = indexAt(e)
  if (over >= 0 && over !== st.idx) {
    const list = items.value.slice()
    const [item] = list.splice(st.idx, 1)
    list.splice(over, 0, item)
    items.value = list
    st.idx = over
  }
  e.stopPropagation?.()
}

let suppressClick = false // 拖动结束后的 click 不再当作打开站点
function onTileUp() {
  const st = dragState.value
  clearLong()
  dragState.value = null
  if (!st) return
  if (st.ok && st.moved) {
    suppressClick = true
    emit('reorder', items.value.map((i) => i.name))
    return
  }
  // 未移动的长按或普通点击交给 click 处理（打开站点）
}

function onTileCancel() {
  clearLong()
  const st = dragState.value
  dragState.value = null
  if (st?.ok && st.moved) {
    suppressClick = true
    emit('reorder', items.value.map((i) => i.name))
  }
}

function onTileClick(site) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  window.open(site.href, '_blank', 'noopener,noreferrer')
}

onBeforeUnmount(clearLong)

function iconSrc(site) {
  // 站点配置了 emoji 图标时不再使用 favicon
  return site.icon ? null : favicons[site.name]
}
</script>

<template>
  <div class="absolute inset-0 z-20">
    <div class="absolute inset-0 bg-ink/10 backdrop-blur-[2px]" @click="emit('close')" />

    <div
      class="folder-card absolute left-1/2 top-1/2 max-h-[78%] w-[min(340px,86%)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] bg-white/90 p-apple-md shadow-product ring-1 ring-black/5 backdrop-blur-apple sm:w-[min(440px,86%)] md:w-[min(560px,88%)] lg:w-[min(680px,90%)]"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="flex items-center gap-apple-xs">
        <div class="min-w-0 flex-1">
          <input
            v-if="editingName"
            id="folder-name-input"
            v-model="nameText"
            class="w-full rounded-pill border border-primary/40 bg-canvas-parchment px-apple-sm py-1 text-body-strong text-ink focus:outline-none"
            maxlength="20"
            @blur="commitRename"
            @keydown.enter.prevent="commitRename"
            @keydown.esc="commitRename"
          />
          <p v-else class="truncate text-body-strong text-ink">{{ title }}</p>
        </div>
        <button
          v-if="!editingName"
          type="button"
          aria-label="重命名文件夹"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
          @click="startRename"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
          </svg>
        </button>
        <button
          v-if="!editingName"
          type="button"
          aria-label="关闭"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
          @click="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>

      <div ref="gridEl" class="mt-apple-md grid grid-cols-3 gap-apple-md md:grid-cols-4 lg:grid-cols-5">
        <button
          v-for="(site, i) in items"
          :key="site.name"
          type="button"
          class="group flex select-none flex-col items-center gap-apple-xs rounded-apple-md p-1 no-underline focus:outline-none max-[767px]:gap-[4px]"
          :class="dragState?.idx === i ? 'cursor-grabbing touch-none' : 'cursor-default touch-pan-y'"
          @pointerdown="onTileDown($event, i)"
          @pointermove="onTileMove"
          @pointerup="onTileUp"
          @pointercancel="onTileCancel"
          @click="onTileClick(site)"
        >
          <span
            class="flex aspect-square w-full items-center justify-center rounded-[24%] bg-white/85 shadow-hairline ring-1 ring-black/5 transition-[transform,box-shadow] duration-200 ease-out"
            :class="dragState?.ok && dragState.idx === i ? 'desk-lifted' : dragState?.idx === i ? 'ring-2 ring-primary/50' : 'group-active:scale-[0.95]'"
          >
            <img v-if="!site.icon && iconSrc(site)" :src="iconSrc(site)" :alt="site.name" class="h-[52%] w-[52%] object-contain" />
            <span v-else-if="site.icon" class="text-[22px] leading-none sm:text-[26px]">{{ site.icon }}</span>
            <span v-else class="text-body-strong text-ink-muted-48">{{ site.name.charAt(0).toUpperCase() }}</span>
          </span>
          <span class="line-clamp-2 w-full text-center text-caption text-ink-muted-80 max-[767px]:text-[11px]">{{ site.name }}</span>
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.folder-card {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.folder-card::-webkit-scrollbar {
  display: none;
}
/* 长按「抓起」：放大浮起 + 投影，营造离屏手感 */
.desk-lifted {
  transform: scale(1.16) translateY(-3px);
  box-shadow: 0 14px 26px -10px rgba(15, 23, 42, 0.35);
}
</style>

<!-- 文件夹弹出动画：由父级 <Transition name="folder"> 驱动，类名需全局可命中，故非 scoped -->
<style>
.folder-enter-active,
.folder-leave-active {
  transition: opacity 0.26s ease;
}
.folder-enter-from,
.folder-leave-to {
  opacity: 0;
}
.folder-enter-active .folder-card,
.folder-leave-active .folder-card {
  transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
}
.folder-enter-from .folder-card,
.folder-leave-to .folder-card {
  transform: translate(-50%, -50%) scale(0.25);
  opacity: 0;
}
</style>
