<script setup>
import { computed, ref, watch } from 'vue'
import { useDesktop } from '../../composables/useDesktop.js'
import DesktopFolderPanel from '../../components/DesktopFolderPanel.vue'
import DesktopFolderTile from '../../components/DesktopFolderTile.vue'
import AnalogClockTool from './components/AnalogClockTool.vue'
import ExcelMergeTool from './components/ExcelMergeTool.vue'
import FamilyRelativesTool from './components/FamilyRelativesTool.vue'
import ImageCompressTool from './components/ImageCompressTool.vue'
import ImgToPdfTool from './components/ImgToPdfTool.vue'
import PdfRotateTool from './components/PdfRotateTool.vue'
import PdfScanTool from './components/PdfScanTool.vue'
import PdfToExcelTool from './components/PdfToExcelTool.vue'
import PdfToWordTool from './components/PdfToWordTool.vue'
import ToolTile from './components/ToolTile.vue'
import UppercaseAmountTool from './components/UppercaseAmountTool.vue'
import UrlToQrCodeTool from './components/UrlToQrCodeTool.vue'
import WordDraftPaperTool from './components/WordDraftPaperTool.vue'

// 同分类的工具合并为一个文件夹
const groups = [
  {
    id: 'family',
    label: '家庭',
    tools: [{ id: 'relatives', label: '亲戚计算', icon: '👨‍👩‍👧', tint: 'from-violet-400 to-fuchsia-400' }]
  },
  {
    id: 'finance',
    label: '财务',
    tools: [{ id: 'uppercase', label: '大写金额', icon: '¥', tint: 'from-emerald-400 to-teal-400' }]
  },
  {
    id: 'excel',
    label: 'Excel',
    tools: [{ id: 'excelMerge', label: '合并', icon: '📗', tint: 'from-green-400 to-emerald-400' }]
  },
  {
    id: 'word',
    label: 'Word',
    tools: [{ id: 'wordDraft', label: '草稿纸', icon: '📘', tint: 'from-sky-400 to-blue-500' }]
  },
  {
    id: 'pdf',
    label: 'PDF',
    tools: [
      { id: 'pdfRotate', label: '旋转', icon: '🔄', tint: 'from-cyan-400 to-sky-400' },
      { id: 'pdfScan', label: '转扫描件', icon: '🖨️', tint: 'from-orange-400 to-rose-400' },
      { id: 'pdfToExcel', label: '转Excel', icon: '📊', tint: 'from-emerald-400 to-teal-400' },
      { id: 'pdfToWord', label: '转Word', icon: '📝', tint: 'from-blue-400 to-indigo-400' },
      { id: 'imgToPdf', label: '图片转PDF', icon: '🖼️', tint: 'from-fuchsia-400 to-pink-400' }
    ]
  },
  {
    id: 'qrcode',
    label: '二维码',
    tools: [{ id: 'urlToQrCode', label: '网址转码', icon: '🔳', tint: 'from-indigo-400 to-blue-500' }]
  },
  {
    id: 'image',
    label: '图片',
    tools: [{ id: 'imageCompress', label: '压缩', icon: '🗜️', tint: 'from-amber-400 to-orange-400' }]
  },
  {
    id: 'simulate',
    label: '模拟',
    tools: [{ id: 'analogClock', label: '模拟时钟', icon: '🕰️', tint: 'from-amber-400 to-orange-500' }]
  }
]

const toolComponents = {
  relatives: FamilyRelativesTool,
  uppercase: UppercaseAmountTool,
  excelMerge: ExcelMergeTool,
  wordDraft: WordDraftPaperTool,
  pdfRotate: PdfRotateTool,
  pdfScan: PdfScanTool,
  pdfToExcel: PdfToExcelTool,
  pdfToWord: PdfToWordTool,
  imgToPdf: ImgToPdfTool,
  urlToQrCode: UrlToQrCodeTool,
  imageCompress: ImageCompressTool,
  analogClock: AnalogClockTool
}

const {
  screenEl, auto, positions, openedId, order, dragId, dragX, dragY, tileWidth, deskHeight, slotPos,
  onDown, onMove, onUp, onCancel, onClick
} = useDesktop({ storageKey: 'workmate.tools.screen', itemCount: groups.length, defaultOrder: groups.map((g) => g.id) })

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
  const map = Object.fromEntries(groups.map((g) => [g.id, g]))
  const ordered = order.value.map((id) => map[id]).filter(Boolean)
  return ordered.map((group, i) => {
    const base = auto.value ? slotPos(i) : (positions[group.id] ?? slotPos(i))
    const isDrag = dragId.value === group.id
    const x = isDrag && dragX.value != null ? dragX.value : base.x
    const y = isDrag && dragY.value != null ? dragY.value : base.y
    return { id: group.id, group, x, y }
  })
})

const openedGroup = computed(() => groups.find((g) => g.id === openedId.value) ?? null)
// 桌面滚动容器（供滚动定位等用途）
const deskScroller = ref(null)

// 工具组件以弹窗形式存在，这里集中挂载并通过 ref 调用其 open()
const toolRefs = {}
function setToolRef(id, el) {
  if (el) toolRefs[id] = el
}
function launch(tool) {
  openedId.value = null
  toolRefs[tool.id]?.open?.()
}
</script>

<template>
  <!-- 工具面板：与网站页同一套桌面（壁纸与底部按钮由 App 统一提供） -->
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
          :aria-label="`${tile.group.label}，${tile.group.tools.length} 个工具`"
          @pointerdown="onDown($event, tile)"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onCancel"
          @click="onClick(tile)"
          @keydown.enter.prevent="openedId = tile.id"
          @keydown.space.prevent="openedId = tile.id"
        >
          <DesktopFolderTile :title="tile.group.label" :items="tile.group.tools" />
        </button>
      </div>
    </div>

    <!-- 文件夹展开 -->
    <Transition name="folder">
      <div
        v-if="openedGroup"
        class="absolute inset-0 z-20"
        :class="{ 'pointer-events-none': !armed }"
      >
        <DesktopFolderPanel
          :title="openedGroup.label"
          @close="openedId = null"
        >
          <ToolTile v-for="tool in openedGroup.tools" :key="tool.id" :tool="tool" @launch="launch" />
        </DesktopFolderPanel>
      </div>
    </Transition>


    <!-- 各工具的弹窗统一挂在此处 -->
    <component
      v-for="(comp, id) in toolComponents"
      :key="id"
      :is="comp"
      :ref="(el) => setToolRef(id, el)"
    />
  </div>
</template>
