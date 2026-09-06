import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { siteFolders } from '../data/sites.js'

/* 全局偏好设置（与桌面布局无关，跨页面共享，持久化到 localStorage）。
   目前包含：默认搜索引擎、自定义壁纸。

   这里不用 useDesktop 的 per-screen storageKey，因为搜索引擎是全局偏好，
   在主页 / 网站 / 工具任意一页的设置里修改都应全局生效。 */

export const SEARCH_ENGINES = [
  { id: 'bing', label: '必应', url: 'https://www.bing.com/search?q=' },
  { id: 'google', label: '谷歌', url: 'https://www.google.com/search?q=' }
]

const DEFAULT_ENGINE = 'bing' // 默认必应
const STORAGE_KEY = 'workmate.settings'
// 自定义壁纸单独存储：dataURL 较大，与 searchEngine 分开读写可避免互相拖累
const WALLPAPER_KEY = 'workmate.wallpaper'

// 壁纸结构：{ src: dataURL, zoom: 1~8, tx/ty: 缩放后中心偏移像素 }
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
const norm = (v, dft = 0) => (Number.isFinite(v) ? v : dft)

/* 「编程：」类文件夹：应用显隐功能的作用范围，直接派生自 sites.js 数据——
   新增 / 删除 / 改名（前缀增减）后设置面板与桌面过滤都自动跟上，无需另行维护 */
const CODING_PREFIX = '编程：'
const codingFolders = computed(() => siteFolders.filter((f) => f.label.startsWith(CODING_PREFIX)))
const codingFolderIds = computed(() => new Set(codingFolders.value.map((f) => f.id)))
function readWallpaper() {
  try {
    const raw = localStorage.getItem(WALLPAPER_KEY)
    if (!raw) return null
    // 兼容旧版本：直接存的 dataURL
    if (raw.startsWith('data:image/')) {
      return { src: raw, zoom: 1, tx: 0, ty: 0 }
    }
    const cfg = JSON.parse(raw)
    if (cfg && typeof cfg.src === 'string' && cfg.src.startsWith('data:image/')) {
      return {
        src: cfg.src,
        zoom: clamp(norm(cfg.zoom, 1), 1, 8),
        tx: norm(cfg.tx),
        ty: norm(cfg.ty)
      }
    }
  } catch {
    /* 本地存储不可用或数据损坏时回退默认值 */
  }
  return null
}

export const useSettingsStore = defineStore('settings', () => {
  const searchEngine = ref(DEFAULT_ENGINE)
  // 应用显隐：需要隐藏的网站页文件夹 id 列表（如编程类分组），空数组 = 全部显示
  const hiddenGroups = ref([])
  // 「编程：默认隐藏」是否已播种：老存档里 hiddenGroups 已持久化为 []，仅改默认值不生效；
  // 该标记 false 时播种一次（编程类全部隐藏），之后用户在显隐面板的手动调整始终优先
  const codingHiddenDefaulted = ref(false)
  // 主页钉选：从文件夹「发送到主页」的网站/工具（[{ type: 'site'|'tool', key }]，
  // site 用站点名、tool 用工具 id），数组顺序即主页展示顺序
  const pinnedApps = ref([])

  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const saved = raw?.searchEngine
    if (SEARCH_ENGINES.some((e) => e.id === saved)) searchEngine.value = saved
    codingHiddenDefaulted.value = raw?.codingHiddenDefaulted === true
    if (codingHiddenDefaulted.value && Array.isArray(raw?.hiddenGroups)) {
      hiddenGroups.value = raw.hiddenGroups.filter((x) => typeof x === 'string')
    }
    if (Array.isArray(raw?.pinnedApps)) {
      pinnedApps.value = raw.pinnedApps.filter(
        (p) => p && typeof p.key === 'string' && (p.type === 'site' || p.type === 'tool')
      )
    }
  } catch {
    /* 本地存储不可用或数据损坏时回退默认值 */
  }

  // 自定义壁纸：null 表示使用内置默认壁纸
  const wallpaper = ref(readWallpaper())
  const wallpaperSrc = computed(() => wallpaper.value?.src ?? null)

  // pinia 的 setup store 自带 effectScope，watcher 脱离组件生命周期，
  // 因此页面切换后设置仍能持久化。
  // 注意：settings 是一整个 key，所有字段必须一起写入，避免互相覆盖；
  // hiddenGroups 靠 push/splice 原地变更，必须显式 deep 才能侦听到。
  watch(
    [searchEngine, hiddenGroups, codingHiddenDefaulted, pinnedApps],
    ([engine, hidden, seeded, pinned]) => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            searchEngine: engine,
            hiddenGroups: hidden,
            codingHiddenDefaulted: seeded,
            pinnedApps: pinned
          })
        )
      } catch {
        /* 本地存储不可用时忽略 */
      }
    },
    { deep: true }
  )

  // 数据同步：分组被删除或不再带「编程：」前缀时，清掉对应的隐藏记录——
  // 避免面板「已隐藏 N 个」虚高、或文件夹已不属于编程类却仍被隐藏且无处恢复。
  // 放在 watch 之后执行，清理结果会立即持久化。
  if (hiddenGroups.value.length) {
    hiddenGroups.value = hiddenGroups.value.filter((id) => codingFolderIds.value.has(id))
  }

  // 默认隐藏编程类：老存档首次升级时播种一次（放在 watch 之后，结果立即持久化）
  if (!codingHiddenDefaulted.value) {
    codingHiddenDefaulted.value = true
    hiddenGroups.value = codingFolders.value.map((f) => f.id)
  }

  // 发送到主页：钉选网站/工具（重复钉选幂等）；钉选后应用在原文件夹视图中隐藏
  function pinApp(type, key) {
    if (!pinnedApps.value.some((p) => p.type === type && p.key === key)) {
      pinnedApps.value.push({ type, key })
    }
  }

  // 从主页删除：取消钉选，应用回归原文件夹（文件夹视图即时恢复显示）
  function unpinApp(type, key) {
    const i = pinnedApps.value.findIndex((p) => p.type === type && p.key === key)
    if (i >= 0) pinnedApps.value.splice(i, 1)
  }

  function isPinned(type, key) {
    return pinnedApps.value.some((p) => p.type === type && p.key === key)
  }

  // 切换某个网站页文件夹的显示 / 隐藏
  function toggleGroupHidden(id) {
    const i = hiddenGroups.value.indexOf(id)
    if (i >= 0) hiddenGroups.value.splice(i, 1)
    else hiddenGroups.value.push(id)
  }

  // 批量显隐：一键隐藏 / 显示全部「编程：」类文件夹
  function setAllGroupsHidden(hidden) {
    hiddenGroups.value = hidden ? codingFolders.value.map((f) => f.id) : []
  }

  // 替换壁纸（含初始变换）。persist=false 时仅本次会话生效
  function setWallpaper(config, persist = true) {
    wallpaper.value = config || null
    if (!persist) return true
    return persistWallpaper()
  }

  // 平移/缩放过程中的连续调整：只更新内存状态，不立即写 localStorage
  function updateWallpaper(patch) {
    const c = wallpaper.value
    if (!c) return
    if ('zoom' in patch) c.zoom = clamp(Number(patch.zoom) || 1, 1, 8)
    if ('tx' in patch && Number.isFinite(patch.tx)) c.tx = patch.tx
    if ('ty' in patch && Number.isFinite(patch.ty)) c.ty = patch.ty
  }

  // 一次性持久化当前壁纸变换（调整结束后调用）
  function persistWallpaper() {
    const c = wallpaper.value
    try {
      if (c) {
        localStorage.setItem(WALLPAPER_KEY, JSON.stringify({ src: c.src, zoom: c.zoom, tx: c.tx, ty: c.ty }))
      } else {
        localStorage.removeItem(WALLPAPER_KEY)
      }
      return true
    } catch {
      /* 超出本地存储配额时忽略（本次会话仍生效） */
      return false
    }
  }

  // 恢复默认：搜索引擎回默认值、壁纸回内置默认、文件夹显隐回默认状态（编程类隐藏）
  function resetDefaults() {
    searchEngine.value = DEFAULT_ENGINE
    hiddenGroups.value = codingFolders.value.map((f) => f.id)
    setWallpaper(null)
  }

  function currentEngine() {
    return (
      SEARCH_ENGINES.find((e) => e.id === searchEngine.value) ??
      SEARCH_ENGINES.find((e) => e.id === DEFAULT_ENGINE)
    )
  }

  function searchUrl(q) {
    return currentEngine().url + encodeURIComponent(q)
  }

  return {
    searchEngine,
    hiddenGroups,
    pinnedApps,
    pinApp,
    unpinApp,
    isPinned,
    codingFolders,
    codingFolderIds,
    toggleGroupHidden,
    setAllGroupsHidden,
    wallpaper,
    wallpaperSrc,
    setWallpaper,
    updateWallpaper,
    persistWallpaper,
    resetDefaults,
    currentEngine,
    searchUrl
  }
})
