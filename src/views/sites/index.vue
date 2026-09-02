<script setup>
import { computed, ref, watch } from 'vue'

import { designSiteGroups, directoryGroups, pdfSites } from '../../data/sites.js'
import { useDesktop } from '../../composables/useDesktop.js'
import DesktopFolderPanel from '../../components/DesktopFolderPanel.vue'
import DesktopFolderTile from '../../components/DesktopFolderTile.vue'
import AppTile from './components/AppTile.vue'

// 同一菜单下的站点合并为一个文件夹
const folders = [
  { id: 'pdf', label: 'PDF', sites: pdfSites },
  ...directoryGroups.map((g) => ({ id: g.id, label: g.label, sites: g.sites })),
  { id: 'icons', label: '图标', sites: designSiteGroups.icons }
]

const {
  screenEl, auto, positions, openedId, order, dragId, dragX, dragY, tileWidth, deskHeight, slotPos,
  onDown, onMove, onUp, onCancel, onClick
} = useDesktop({ storageKey: 'workmate.sites.screen', itemCount: folders.length, defaultOrder: folders.map((f) => f.id) })

// 打开弹窗后，首帧内禁止遮罩捕获指针事件：移动端点按按钮后浏览器会合成一次 click，
// 此时遮罩恰好覆盖按钮，该 click 会落在遮罩上触发关闭（phantom click），导致弹窗一开即关。
// 让遮罩在首帧穿透，使该 click 落到按钮（onClick 中已打开则为无副作用），随后再恢复交互。
const armed = ref(true)
watch(openedId, (val, old) => {
  if (val && !old) {
    armed.value = false
    requestAnimationFrame(() => requestAnimationFrame(() => { armed.value = true }))
  }
})

// 自动排列：按「持久化的文件夹顺序」紧凑落位；手动：优先使用拖动记录的位置
const tiles = computed(() => {
  const map = Object.fromEntries(folders.map((f) => [f.id, f]))
  const ordered = order.value.map((id) => map[id]).filter(Boolean)
  return ordered.map((folder, i) => {
    const base = auto.value ? slotPos(i) : (positions[folder.id] ?? slotPos(i))
    const isDrag = dragId.value === folder.id
    const x = isDrag && dragX.value != null ? dragX.value : base.x
    const y = isDrag && dragY.value != null ? dragY.value : base.y
    return { id: folder.id, folder, x, y }
  })
})

const openedFolder = computed(() => folders.find((f) => f.id === openedId.value) ?? null)
// 桌面滚动容器（供滚动定位等用途）
const deskScroller = ref(null)
</script>

<template>
  <!-- 网站面板：即整块屏幕的桌面（壁纸与底部按钮由 App 统一提供） -->
  <div ref="screenEl" class="relative h-full w-full overflow-hidden">
    <!-- 可纵向滚动的桌面：内容超出视口时整块可滑动，文件夹弹窗保持固定不随滚动 -->
    <div ref="deskScroller" class="h-full w-full overflow-y-auto overscroll-contain">
      <div class="relative w-full" :style="{ minHeight: '100%', height: deskHeight }">
        <button
          v-for="tile in tiles"
          :key="tile.id"
          type="button"
          class="absolute z-10 select-none rounded-apple-md transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
          :class="[dragId === tile.id ? 'cursor-grabbing touch-none' : auto ? 'cursor-default touch-pan-y' : 'cursor-grab touch-none']"
          :style="{
            left: `${tile.x}%`,
            top: `${tile.y}%`,
            width: tileWidth,
            transform: `translate(-50%, -50%) scale(${dragId === tile.id ? 1.06 : 1})`
          }"
          :aria-label="`${tile.folder.label}，${tile.folder.sites.length} 个网站`"
          @pointerdown="onDown($event, tile)"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onCancel"
          @click="onClick(tile)"
          @keydown.enter.prevent="openedId = tile.id"
          @keydown.space.prevent="openedId = tile.id"
        >
          <DesktopFolderTile :title="tile.folder.label" :items="tile.folder.sites" />
        </button>
      </div>
    </div>

    <!-- 文件夹展开 -->
    <Transition name="folder">
      <div
        v-if="openedFolder"
        class="absolute inset-0 z-20"
        :class="{ 'pointer-events-none': !armed }"
      >
        <DesktopFolderPanel
          :title="openedFolder.label"
          @close="openedId = null"
        >
          <AppTile v-for="site in openedFolder.sites" :key="site.name" :site="site" />
        </DesktopFolderPanel>
      </div>
    </Transition>

  </div>
</template>
