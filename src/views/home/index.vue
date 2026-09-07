<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { siteFolders } from '../../data/sites.js'
import { allTools } from '../../data/tools.js'
import { favicons } from '../../assets/icons/favicon-manifest.js'
import { useSettingsStore } from '../../stores/settings.js'
import { useLauncherStore } from '../../stores/launcher.js'
import { highlightParts, searchLocal, TYPE_LABEL } from '../../data/localSearch.js'
import ContextMenu from '../../components/ContextMenu.vue'
import DesktopFolderPanel from '../../components/DesktopFolderPanel.vue'
import DesktopFolderTile from '../../components/DesktopFolderTile.vue'
import AppTile from '../sites/components/AppTile.vue'
import AddAppModal from './components/AddAppModal.vue'

const router = useRouter()
// 搜索引擎由「更多 → 设置」统一配置，默认必应；本地无命中时才用到
const settingsStore = useSettingsStore()
const launcher = useLauncherStore()

const query = ref('')
const listOpen = ref(false) // 下拉是否展开（Esc / 失焦 / 选中后关闭）
const NONE = -1 // 未选中任何行：默认不预选，回车仍然走搜索引擎
const activeIndex = ref(NONE) // 键盘高亮项
const placeholder = '搜索本站或网络'

const hasQuery = computed(() => !!query.value.trim())
// 本地命中项：文件夹 / 应用 / 网站（设置里隐藏的文件夹及其站点一并排除）
const localHits = computed(() => (hasQuery.value ? searchLocal(query.value, 8, settingsStore.hiddenGroups) : []))
// 下拉行 = 本地命中 + 兜底的「用引擎搜索」
const rows = computed(() => [
  ...localHits.value,
  {
    type: 'web',
    key: 'web',
    label: query.value.trim(),
    sub: settingsStore.currentEngine().label,
    icon: '🔍',
    iconSrc: null
  }
])
const showList = computed(() => listOpen.value && hasQuery.value)

// 输入变化后重新展开，且默认不预选任何行
watch(query, () => {
  listOpen.value = true
  activeIndex.value = NONE
})

/* 命中文件夹：直接在当前页弹窗展示内容，不再滑到网站 tab。
   用 fixed 铺满视口，避免页面纵向滚动时弹窗随内容偏移。 */
const openedFolderId = ref(null)
const openedFolder = computed(() => siteFolders.find((f) => f.id === openedFolderId.value) ?? null)
// 弹窗内站点：已「发送到主页」的从文件夹视图移除
const openedFolderSites = computed(() =>
  (openedFolder.value?.sites ?? []).filter((s) => !settingsStore.isPinned('site', s.name))
)
// 主页自定义文件夹弹窗（「添加」弹窗创建，内容后续再开发）
const openedCustomFolderId = ref(null)
const openedCustomFolder = computed(
  () => settingsStore.customFolders.find((f) => f.id === openedCustomFolderId.value) ?? null
)
// 文件夹内容 = 移入的钉选应用（网站/工具）+ 移入的自定义应用
const openedCustomFolderApps = computed(() => {
  const fid = openedCustomFolder.value?.id
  if (!fid) return []
  const items = []
  for (const p of settingsStore.pinnedApps) {
    if (p.folderId !== fid) continue
    if (p.type === 'site') {
      const site = allSites.find((s) => s.name === p.key)
      if (site) items.push({ kind: 'site', key: p.key, label: site.name, site })
    } else {
      const tool = allTools.find((t) => t.id === p.key)
      if (tool) items.push({ kind: 'tool', key: p.key, label: tool.label, tool })
    }
  }
  for (const a of settingsStore.customApps) {
    if (a.folderId === fid) items.push({ kind: 'custom', key: a.id, label: a.name, app: a })
  }
  return items
})
function openFolderApp(it) {
  if (it.kind === 'site') window.open(it.site.href, '_blank', 'noopener,noreferrer')
  else if (it.kind === 'tool') {
    launcher.requestTool(it.key)
    router.push('/tools')
  } else window.open(it.app.url, '_blank', 'noopener,noreferrer')
}
// 移回主页：从自定义文件夹回到主页应用行
function onFolderAppContext(e, it) {
  homeCtx.value?.show(
    e,
    [{ key: 'back', label: '移回主页' }],
    () => {
      if (it.kind === 'custom') settingsStore.setCustomAppFolder(it.key, null)
      else settingsStore.setPinnedFolder(it.kind, it.key, null)
    }
  )
}
// 重命名自定义文件夹（面板铅笔，与网站页文件夹同款交互）
function onRenameCustomFolder(name) {
  const f = settingsStore.customFolders.find((x) => x.id === openedCustomFolderId.value)
  if (f) f.name = name
}
// 首帧内让遮罩不响应指针：移动端点按搜索结果后浏览器会合成一次 click，
// 该 click 若落在刚出现的遮罩上会立刻关闭弹窗（与网站页同款处理）
const armed = ref(true)
watch([openedFolderId, openedCustomFolderId], (val, old) => {
  if (val.some((v, i) => v && !old[i])) {
    armed.value = false
    requestAnimationFrame(() => requestAnimationFrame(() => { armed.value = true }))
  }
})

function move(step) {
  if (!showList.value) return
  const n = rows.value.length
  // 未预选时：↓ 进入首项，↑ 进入末项（末项即搜索引擎兜底）
  if (activeIndex.value === NONE) {
    activeIndex.value = step > 0 ? 0 : n - 1
    return
  }
  activeIndex.value = (activeIndex.value + step + n) % n
}

function close() {
  listOpen.value = false
}

function openWeb() {
  const q = query.value.trim()
  if (!q) return
  window.open(settingsStore.searchUrl(q), '_blank', 'noopener,noreferrer')
}

function choose(i) {
  const row = rows.value[i]
  if (!row) return
  close()
  if (row.type === 'web') {
    openWeb()
  } else if (row.type === 'folder') {
    // 直接在当前页弹出文件夹内容，不切到网站页
    openedFolderId.value = row.id
  } else if (row.type === 'tool') {
    // 切到工具页并进入该应用
    launcher.requestTool(row.id)
    router.push('/tools')
  } else if (row.type === 'site') {
    window.open(row.href, '_blank', 'noopener,noreferrer')
  }
}

function onSubmit(e) {
  e.preventDefault()
  if (!hasQuery.value) return
  // 有高亮项时执行该项；默认未预选（或下拉已关闭）时回落到搜索引擎
  if (showList.value && activeIndex.value !== NONE) choose(activeIndex.value)
  else openWeb()
}

/* ---------- 主页钉选（发送到主页的应用） ---------- */
const allSites = siteFolders.flatMap((f) => f.sites)
// 钉选顺序即展示顺序；数据里已不存在的钉选项自动忽略；已移入自定义文件夹的不在主页行显示
const pinnedItems = computed(() =>
  settingsStore.pinnedApps
    .filter((p) => !p.folderId)
    .map((p) => {
      if (p.type === 'site') {
        const site = allSites.find((s) => s.name === p.key)
        return site ? { ...p, label: site.name, site } : null
      }
      const tool = allTools.find((t) => t.id === p.key)
      return tool ? { ...p, label: tool.label, tool } : null
    })
    .filter(Boolean)
)

function faviconFor(site) {
  return site.icon ? null : favicons[site.name]
}

// 功能与原位置一致：网站新标签页打开，工具切到工具页并弹窗（与主页搜索命中行为相同）
function openPinned(item) {
  if (item.type === 'site') {
    window.open(item.site.href, '_blank', 'noopener,noreferrer')
  } else {
    launcher.requestTool(item.tool.id)
    router.push('/tools')
  }
}

/* 删除确认：自己添加的直接删除；从网站/工具发送而来的回归原文件夹 */
const confirmBox = ref(null) // { title, body, action }
function requestRemovePinned(item) {
  confirmBox.value = {
    title: `删除「${item.label}」？`,
    body: '自己添加的应用会直接删除；从网站和工具发送而来的应用会回归原位。',
    action: () => settingsStore.unpinApp(item.type, item.key)
  }
}
function requestRemoveCustomApp(app) {
  confirmBox.value = {
    title: `删除「${app.name}」？`,
    body: '自己添加的应用会直接删除；从网站和工具发送而来的应用会回归原位。',
    action: () => settingsStore.removeCustomApp(app.id)
  }
}
function requestRemoveFolder(folder) {
  confirmBox.value = {
    title: `删除「${folder.name}」？`,
    body: '自己添加的文件夹会直接删除；其中移入的应用将回到主页。',
    action: () => settingsStore.removeCustomFolder(folder.id)
  }
}
function confirmOk() {
  confirmBox.value?.action?.()
  confirmBox.value = null
}

/* 移动到文件夹：选择一个主页自定义文件夹 */
const movePicker = ref(null) // { type: 'site'|'tool'|'custom', key, label }
const pickerFolderId = ref(null)
function openMovePicker(item) {
  movePicker.value = item
  pickerFolderId.value = settingsStore.customFolders[0]?.id ?? null
}
function confirmMove() {
  const it = movePicker.value
  if (!it || !pickerFolderId.value) {
    movePicker.value = null
    return
  }
  if (it.type === 'custom') settingsStore.setCustomAppFolder(it.key, pickerFolderId.value)
  else settingsStore.setPinnedFolder(it.type, it.key, pickerFolderId.value)
  movePicker.value = null
}

const homeCtx = ref(null)
function onPinContext(e, item) {
  homeCtx.value?.show(
    e,
    [
      { key: 'move', label: '移动到文件夹' },
      { key: 'remove', label: '删除' }
    ],
    (key) => {
      if (key === 'move') openMovePicker({ type: item.type, key: item.key, label: item.label })
      else requestRemovePinned(item)
    }
  )
}

/* ---------- 主页自定义应用 / 文件夹（「添加」弹窗创建） ---------- */
const addAppModal = ref(null)
const rowCustomApps = computed(() => settingsStore.customApps.filter((a) => !a.folderId))
function openCustomApp(app) {
  window.open(app.url, '_blank', 'noopener,noreferrer')
}
function onCustomAppContext(e, app) {
  homeCtx.value?.show(
    e,
    [
      { key: 'move', label: '移动到文件夹' },
      { key: 'remove', label: '删除' }
    ],
    (key) => {
      if (key === 'move') openMovePicker({ type: 'custom', key: app.id, label: app.name })
      else requestRemoveCustomApp(app)
    }
  )
}
function onCustomFolderContext(e, folder) {
  homeCtx.value?.show(e, [{ key: 'remove', label: '删除' }], () => requestRemoveFolder(folder))
}
// 文件夹预览（DesktopFolderTile 形态）：映射移入的钉选网站/工具与自定义应用
function folderPreviewItems(folderId) {
  const items = []
  for (const p of settingsStore.pinnedApps) {
    if (p.folderId !== folderId) continue
    if (p.type === 'site') {
      const site = allSites.find((s) => s.name === p.key)
      if (site) items.push({ key: `site:${p.key}`, name: site.name, icon: site.icon, fallback: site.name.charAt(0).toUpperCase() })
    } else {
      const tool = allTools.find((t) => t.id === p.key)
      if (tool) items.push({ key: `tool:${p.key}`, icon: tool.icon })
    }
  }
  for (const a of settingsStore.customApps) {
    if (a.folderId !== folderId) continue
    items.push({ key: `custom:${a.id}`, img: a.icon || null, fallback: a.name.charAt(0).toUpperCase() })
  }
  return items
}
</script>

<template>
  <!-- 背景：单一 parchment 表面，无大色块对比，靠磨砂卡片自身提供层次 -->
  <div class="relative flex min-h-full w-full flex-col sm:block">
    <!-- 内容：桌面端靠上；移动端贴近底部「主页一排按钮」上方，左右端分别与主页/设置按钮对齐 -->
    <div class="relative z-10 mt-auto w-full px-apple-md pb-[16px] pt-0 sm:mx-auto sm:max-w-apple-content sm:px-apple-xl sm:pb-apple-section sm:pt-apple-xxl">
      <!-- 搜索框：relative 作为下拉的定位容器 -->
      <div class="relative mx-auto w-full max-w-[680px]">
        <form
          role="search"
          class="glass-panel rounded-apple-lg p-apple-sm transition-shadow duration-200 focus-within:shadow-glass"
          @submit="onSubmit"
        >
          <label class="relative block">
            <!-- 左侧搜索图标（muted 色调） -->
            <span
              class="pointer-events-none absolute left-apple-md top-1/2 flex -translate-y-1/2 items-center text-ink-muted-48"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-[18px] w-[18px]"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>

            <!-- 搜索输入：Apple search-input 令牌（pill 44px） -->
            <input
              v-model="query"
              type="search"
              name="q"
              aria-label="搜索"
              :placeholder="placeholder"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="search-suggest"
              :aria-expanded="showList"
              class="h-[44px] w-full rounded-pill border border-black/[0.08] bg-canvas pl-[44px] pr-apple-md text-apple-body text-ink transition-colors duration-200 focus:border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
              autocomplete="off"
              @focus="listOpen = true"
              @blur="close"
              @keydown.down.prevent="move(1)"
              @keydown.up.prevent="move(-1)"
              @keydown.esc.prevent="close"
            />
          </label>
        </form>

        <!-- 本地命中下拉：本地优先，末行固定为搜索引擎兜底；展开/收起附丝滑动画（见底部 <style scoped> 的 suggest-*） -->
        <Transition name="suggest">
          <ul
            v-if="showList"
            id="search-suggest"
            role="listbox"
            aria-label="搜索建议"
            class="glass-panel absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[52vh] overflow-y-auto overscroll-contain rounded-apple-lg p-apple-xs max-[767px]:top-auto max-[767px]:bottom-full max-[767px]:mb-[6px]"
          >
          <li v-for="(row, i) in rows" :key="row.key">
            <button
              type="button"
              role="option"
              :aria-selected="i === activeIndex"
              class="flex w-full items-center gap-apple-sm rounded-apple-md px-apple-md py-apple-sm text-left transition-colors"
              :class="i === activeIndex ? 'bg-canvas-parchment' : 'hover:bg-canvas-parchment/60'"
              @mouseenter="activeIndex = i"
              @mousedown.prevent
              @click="choose(i)"
            >
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-canvas-parchment text-[15px]">
                <img v-if="row.iconSrc" :src="row.iconSrc" :alt="row.label" class="h-4 w-4 object-contain" />
                <span v-else>{{ row.icon || row.label.charAt(0).toUpperCase() }}</span>
              </span>

              <!-- 名称完整展示（不截断），命中的字符高亮 -->
              <span class="min-w-0 flex-1 break-words text-[14px] leading-snug text-ink">
                <template v-if="row.type === 'web'">用{{ row.sub }}搜索「{{ row.label }}」</template>
                <template v-else>
                  <span v-for="(seg, si) in highlightParts(row.label, query)" :key="si" :class="seg.hit ? 'font-semibold text-primary' : ''">{{ seg.text }}</span>
                </template>
              </span>

              <!-- 次级信息（网站所属文件夹 / 应用所属分组）同样高亮命中字符 -->
              <span v-if="row.type !== 'web'" class="shrink-0 text-[11px] text-ink-muted-48">{{ TYPE_LABEL[row.type] }} · <span v-for="(seg, si) in highlightParts(row.sub, query)" :key="si" :class="seg.hit ? 'font-semibold text-primary' : ''">{{ seg.text }}</span></span>
            </button>
          </li>
        </ul>
        </Transition>
      </div>
    </div>

    <!-- 发送到主页的应用：搜索框下方一排快捷方式，从最左侧开始排列（与网站/工具桌面同款 20px 边距）；
         功能与原位置一致，右键删除回归原文件夹。负 margin 抵消搜索区的桌面端底部留白，使行紧贴搜索框下方 -->
    <div
      class="relative z-10 mt-apple-md flex w-full flex-wrap gap-apple-md px-[20px] pb-[16px] sm:-mt-apple-section sm:gap-apple-lg sm:pb-apple-section"
    >
      <button
        v-for="item in pinnedItems"
        :key="item.type + ':' + item.key"
        type="button"
        :aria-label="item.label"
        class="group flex w-16 flex-col items-center gap-apple-xs rounded-apple-md no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus max-[767px]:gap-[4px]"
        @click="openPinned(item)"
        @contextmenu.prevent="onPinContext($event, item)"
      >
        <span
          v-if="item.type === 'site'"
          class="glass-tile flex aspect-square w-full items-center justify-center rounded-[24%] transition-transform duration-200 group-hover:scale-[1.05] group-active:scale-[0.95]"
        >
          <img v-if="faviconFor(item.site)" :src="faviconFor(item.site)" :alt="item.label" class="h-[52%] w-[52%] object-contain" />
          <span v-else class="text-[22px] leading-none">{{ item.site.icon || item.label.charAt(0).toUpperCase() }}</span>
        </span>
        <span
          v-else
          class="flex aspect-square w-full items-center justify-center rounded-[24%] bg-linear-to-br text-[22px] leading-none shadow-hairline ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-[1.05] group-active:scale-[0.95]"
          :class="item.tool.tint"
        >{{ item.tool.icon }}</span>
        <span class="line-clamp-2 w-full text-center text-caption text-ink-muted-80 max-[767px]:text-[11px]">{{ item.label }}</span>
      </button>

      <!-- 自定义应用（「添加」弹窗创建）：点击新标签页打开，右键删除/移动到文件夹 -->
      <button
        v-for="app in rowCustomApps"
        :key="app.id"
        type="button"
        :aria-label="app.name"
        class="group flex w-16 flex-col items-center gap-apple-xs rounded-apple-md no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus max-[767px]:gap-[4px]"
        @click="openCustomApp(app)"
        @contextmenu.prevent="onCustomAppContext($event, app)"
      >
        <span class="glass-tile flex aspect-square w-full items-center justify-center overflow-hidden rounded-[24%] transition-transform duration-200 group-hover:scale-[1.05] group-active:scale-[0.95]">
          <img v-if="app.icon" :src="app.icon" :alt="app.name" class="h-full w-full object-cover" />
          <span v-else class="text-body-strong text-ink-muted-80">{{ app.name.charAt(0).toUpperCase() }}</span>
        </span>
        <span class="line-clamp-2 w-full text-center text-caption text-ink-muted-80 max-[767px]:text-[11px]">{{ app.name }}</span>
      </button>

      <!-- 自定义文件夹：空时显示 📁 占位，有应用时与网站页文件夹同款（内部铺 mini 图标） -->
      <button
        v-for="folder in settingsStore.customFolders"
        :key="folder.id"
        type="button"
        :aria-label="folder.name"
        class="group flex w-16 flex-col items-center gap-apple-xs rounded-apple-md no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus max-[767px]:gap-[4px]"
        @click="openedCustomFolderId = folder.id"
        @contextmenu.prevent="onCustomFolderContext($event, folder)"
      >
        <!-- 根元素需 w-full：按钮内宽度非确定（无网格单元格），否则内部百分比尺寸塌缩为 0 导致图标整体不可见 -->
        <DesktopFolderTile v-if="folderPreviewItems(folder.id).length" class="w-full" :title="folder.name" :items="folderPreviewItems(folder.id)" />
        <template v-else>
          <span class="glass-tile flex aspect-square w-full items-center justify-center rounded-[24%] text-[22px] leading-none transition-transform duration-200 group-hover:scale-[1.05] group-active:scale-[0.95]">📁</span>
          <span class="line-clamp-2 w-full text-center text-caption text-ink-muted-80 max-[767px]:text-[11px]">{{ folder.name }}</span>
        </template>
      </button>

      <!-- 添加：固定排列在末尾，打开添加弹窗 -->
      <button
        type="button"
        aria-label="添加"
        class="group flex w-16 flex-col items-center gap-apple-xs rounded-apple-md no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus max-[767px]:gap-[4px]"
        @click="addAppModal?.open?.()"
      >
        <span
          class="glass-tile flex aspect-square w-full items-center justify-center rounded-[24%] text-ink-muted-48 transition-transform duration-200 group-hover:scale-[1.05] group-active:scale-[0.95]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-6 w-6"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
        </span>
        <span class="line-clamp-2 w-full text-center text-caption text-ink-muted-80 max-[767px]:text-[11px]">添加</span>
      </button>
    </div>

    <!-- 命中文件夹：当前页直接弹窗展示内容，不切换 tab。
         Teleport 到 body：App 的 tab 滑轨带 transform，会把 fixed 困在滑轨盒内（高度不足视口），
         遮罩盖不到底部主页应用行 -->
    <Teleport to="body">
      <Transition name="folder">
        <div v-if="openedFolder" class="fixed inset-0 z-40" :class="{ 'pointer-events-none': !armed }">
          <DesktopFolderPanel :title="openedFolder.label" @close="openedFolderId = null">
            <AppTile v-for="site in openedFolderSites" :key="site.name" :site="site" />
          </DesktopFolderPanel>
        </div>
      </Transition>
    </Teleport>

    <!-- 自定义文件夹：点击弹出面板，内含移入的应用；右键图标可移回主页 -->
    <Teleport to="body">
      <Transition name="folder">
        <div v-if="openedCustomFolder" class="fixed inset-0 z-40" :class="{ 'pointer-events-none': !armed }">
          <DesktopFolderPanel
            :title="openedCustomFolder.name"
            renamable
            @close="openedCustomFolderId = null"
            @rename="onRenameCustomFolder"
          >
            <template v-if="openedCustomFolderApps.length">
              <button
                v-for="it in openedCustomFolderApps"
                :key="it.kind + ':' + it.key"
                type="button"
                :aria-label="it.label"
                class="group flex w-full flex-col items-center gap-apple-xs rounded-apple-md no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus max-[767px]:gap-[4px]"
                @click="openFolderApp(it)"
                @contextmenu.prevent="onFolderAppContext($event, it)"
              >
                <span v-if="it.kind === 'site'" class="glass-tile flex aspect-square w-full items-center justify-center rounded-[24%] transition-transform duration-200 group-hover:scale-[1.05] group-active:scale-[0.95]">
                  <img v-if="faviconFor(it.site)" :src="faviconFor(it.site)" :alt="it.label" class="h-[52%] w-[52%] object-contain" />
                  <span v-else class="text-[22px] leading-none">{{ it.site.icon || it.label.charAt(0).toUpperCase() }}</span>
                </span>
                <span v-else-if="it.kind === 'tool'" class="flex aspect-square w-full items-center justify-center rounded-[24%] bg-linear-to-br text-[22px] leading-none shadow-hairline ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-[1.05] group-active:scale-[0.95]" :class="it.tool.tint">{{ it.tool.icon }}</span>
                <span v-else class="glass-tile flex aspect-square w-full items-center justify-center overflow-hidden rounded-[24%] transition-transform duration-200 group-hover:scale-[1.05] group-active:scale-[0.95]">
                  <img v-if="it.app.icon" :src="it.app.icon" :alt="it.label" class="h-full w-full object-cover" />
                  <span v-else class="text-body-strong text-ink-muted-80">{{ it.label.charAt(0).toUpperCase() }}</span>
                </span>
                <span class="line-clamp-2 w-full text-center text-caption text-ink-muted-80 max-[767px]:text-[11px]">{{ it.label }}</span>
              </button>
            </template>
            <p v-else class="col-span-full py-apple-xl text-center text-caption text-ink-muted-48">文件夹为空，可在主页应用图标的右键菜单中选择「移动到文件夹」</p>
          </DesktopFolderPanel>
        </div>
      </Transition>
    </Teleport>

    <!-- 删除确认：按应用来源说明去向 -->
    <Teleport to="body">
      <Transition name="suggest">
        <div v-if="confirmBox" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm" @click.self="confirmBox = null">
          <div role="alertdialog" aria-modal="true" :aria-label="confirmBox.title" class="w-full max-w-sm rounded-apple-lg bg-canvas p-apple-lg shadow-product">
            <p class="text-body-strong text-ink">{{ confirmBox.title }}</p>
            <p class="mt-apple-sm text-caption leading-relaxed text-ink-muted-80">{{ confirmBox.body }}</p>
            <div class="mt-apple-lg flex justify-end gap-apple-sm">
              <button type="button" class="rounded-pill bg-canvas-parchment px-apple-lg py-apple-sm text-caption-strong text-ink transition hover:bg-black/5 active:scale-[0.97]" @click="confirmBox = null">取消</button>
              <button type="button" class="rounded-pill bg-red-500 px-apple-lg py-apple-sm text-caption-strong text-white transition active:scale-[0.97]" @click="confirmOk">删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 移动到文件夹：选择主页自定义文件夹 -->
    <Teleport to="body">
      <Transition name="suggest">
        <div v-if="movePicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm" @click.self="movePicker = null">
          <div role="dialog" aria-modal="true" aria-label="移动到文件夹" class="w-full max-w-xs rounded-apple-lg bg-canvas p-apple-lg shadow-product">
            <p class="text-body-strong text-ink">移动到文件夹</p>
            <p class="mt-apple-xs text-fine-print text-ink-muted-48">「{{ movePicker.label }}」将移入所选文件夹</p>
            <div v-if="settingsStore.customFolders.length" class="mt-apple-md flex max-h-56 flex-col gap-apple-xs overflow-y-auto" role="radiogroup" aria-label="文件夹列表">
              <button
                v-for="f in settingsStore.customFolders"
                :key="f.id"
                type="button"
                role="radio"
                :aria-checked="pickerFolderId === f.id"
                class="flex items-center gap-apple-sm rounded-apple-md border px-apple-md py-apple-sm text-left text-caption transition active:scale-[0.98]"
                :class="pickerFolderId === f.id ? 'border-primary bg-primary/5 text-ink' : 'border-hairline bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                @click="pickerFolderId = f.id"
              >
                <span>📁</span>
                <span class="min-w-0 flex-1 truncate">{{ f.name }}</span>
                <svg v-if="pickerFolderId === f.id" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-primary"><path d="M20 6 9 17l-5-5" /></svg>
              </button>
            </div>
            <p v-else class="mt-apple-md rounded-apple-md bg-amber-50 p-apple-sm text-caption text-amber-600">暂无文件夹，请先通过「添加 → 添加文件夹」创建</p>
            <div class="mt-apple-lg flex justify-end gap-apple-sm">
              <button type="button" class="rounded-pill bg-canvas-parchment px-apple-lg py-apple-sm text-caption-strong text-ink transition hover:bg-black/5 active:scale-[0.97]" @click="movePicker = null">取消</button>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="!settingsStore.customFolders.length || !pickerFolderId"
                @click="confirmMove"
              >确认</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ContextMenu ref="homeCtx" />
    <AddAppModal ref="addAppModal" />
  </div>
</template>

<style scoped>
/* 搜索下拉的丝滑动画：淡入 + 自顶部轻微下移并收一点，收起时反向 */
.suggest-enter-active,
.suggest-leave-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
}
.suggest-enter-from,
.suggest-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  transform-origin: top;
}
</style>
