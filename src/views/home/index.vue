<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { siteFolders } from '../../data/sites.js'
import { useSettingsStore } from '../../stores/settings.js'
import { useLauncherStore } from '../../stores/launcher.js'
import { highlightParts, searchLocal, TYPE_LABEL } from '../../data/localSearch.js'
import DesktopFolderPanel from '../../components/DesktopFolderPanel.vue'
import AppTile from '../sites/components/AppTile.vue'

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
// 本地命中项：文件夹 / 应用 / 网站
const localHits = computed(() => (hasQuery.value ? searchLocal(query.value, 8) : []))
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
// 首帧内让遮罩不响应指针：移动端点按搜索结果后浏览器会合成一次 click，
// 该 click 若落在刚出现的遮罩上会立刻关闭弹窗（与网站页同款处理）
const armed = ref(true)
watch(openedFolderId, (val, old) => {
  if (val && !old) {
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

    <!-- 命中文件夹：当前页直接弹窗展示内容，不切换 tab -->
    <Transition name="folder">
      <div v-if="openedFolder" class="fixed inset-0 z-40" :class="{ 'pointer-events-none': !armed }">
        <DesktopFolderPanel :title="openedFolder.label" @close="openedFolderId = null">
          <AppTile v-for="site in openedFolder.sites" :key="site.name" :site="site" />
        </DesktopFolderPanel>
      </div>
    </Transition>
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
