<script setup>
import { computed, markRaw, nextTick, ref, watch } from 'vue'
import { useDesktop } from '../../composables/useDesktop.js'
import { toolGroups, allTools } from '../../data/tools.js'
import { useLauncherStore } from '../../stores/launcher.js'
import DesktopFolderPanel from '../../components/DesktopFolderPanel.vue'
import DesktopFolderTile from '../../components/DesktopFolderTile.vue'
import ToolTile from './components/ToolTile.vue'

// 工具改为按需加载：进入工具页只加载页面骨架，
// 点开某个工具时才动态拉取其代码与依赖（pdf.js、pdf-lib、docx 等不再进首屏）
const toolLoaders = {
  publicIp: () => import('./components/PublicIpTool.vue'),
  baseConvert: () => import('./components/BaseConvertTool.vue'),
  calculator: () => import('./components/CalculatorTool.vue'),
  chineseColors: () => import('./components/ChineseColorsTool.vue'),
  relatives: () => import('./components/FamilyRelativesTool.vue'),
  uppercase: () => import('./components/UppercaseAmountTool.vue'),
  excelMerge: () => import('./components/ExcelMergeTool.vue'),
  wordDraft: () => import('./components/WordDraftPaperTool.vue'),
  wordExtract: () => import('./components/WordExtractPagesTool.vue'),
  pdfRotate: () => import('./components/PdfRotateTool.vue'),
  pdfSplit: () => import('./components/PdfSplitTool.vue'),
  pdfMerge: () => import('./components/PdfMergeTool.vue'),
  pdfScan: () => import('./components/PdfScanTool.vue'),
  pdfToExcel: () => import('./components/PdfToExcelTool.vue'),
  pdfToWord: () => import('./components/PdfToWordTool.vue'),
  imgToPdf: () => import('./components/ImgToPdfTool.vue'),
  urlToQrCode: () => import('./components/UrlToQrCodeTool.vue'),
  qrCodeScan: () => import('./components/QrCodeScanTool.vue'),
  imageCompress: () => import('./components/ImageCompressTool.vue'),
  basicColor: () => import('./components/BasicColorTool.vue'),
  analogClock: () => import('./components/AnalogClockTool.vue')
}

const {
  screenEl, auto, positions, openedId, order, dragId, dragX, dragY, tileWidth, deskHeight, slotPos,
  onDown, onMove, onUp, onCancel, onClick
} = useDesktop({ storageKey: 'workmate.tools.screen', itemCount: toolGroups.length, defaultOrder: toolGroups.map((g) => g.id) })

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
  const map = Object.fromEntries(toolGroups.map((g) => [g.id, g]))
  const ordered = order.value.map((id) => map[id]).filter(Boolean)
  return ordered.map((group, i) => {
    const base = auto.value ? slotPos(i) : (positions[group.id] ?? slotPos(i))
    const isDrag = dragId.value === group.id
    const x = isDrag && dragX.value != null ? dragX.value : base.x
    const y = isDrag && dragY.value != null ? dragY.value : base.y
    return { id: group.id, group, x, y }
  })
})

const openedGroup = computed(() => toolGroups.find((g) => g.id === openedId.value) ?? null)
// 桌面滚动容器（供滚动定位等用途）
const deskScroller = ref(null)

// 工具组件以弹窗形式存在；用过的工具会挂载并驻留，之后再次打开直接复用
const toolRefs = {}
const activeTools = ref([]) // [{ id, comp }]，首次打开时才加入
function setToolRef(id, el) {
  if (el) toolRefs[id] = el
}
async function launch(tool) {
  openedId.value = null
  if (toolRefs[tool.id]) {
    toolRefs[tool.id].open?.()
    return
  }
  const loader = toolLoaders[tool.id]
  if (!loader) return
  try {
    const mod = await loader()
    activeTools.value.push({ id: tool.id, comp: markRaw(mod.default) })
    await nextTick()
    toolRefs[tool.id]?.open?.()
  } catch (e) {
    console.error('工具加载失败：', tool.id, e)
  }
}

// 响应主页搜索的直达请求：进入指定应用。
// 必须位于 launch 之后；immediate 用于覆盖「从主页导航过来、工具页首次挂载」的场景
const launcher = useLauncherStore()
watch(
  () => launcher.pendingToolId,
  (id) => {
    if (!id) return
    const tool = allTools.find((t) => t.id === id)
    launcher.clearTool()
    if (tool) launch(tool)
  },
  { immediate: true }
)
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
          <DesktopFolderTile
            :title="tile.group.label"
            :items="tile.group.tools.map((t) => ({ key: t.id, icon: t.icon }))"
          />
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


    <!-- 各工具的弹窗统一挂在此处（按需动态挂载，用过的工具驻留复用） -->
    <component
      v-for="t in activeTools"
      :key="t.id"
      :is="t.comp"
      :ref="(el) => setToolRef(t.id, el)"
    />
  </div>
</template>
