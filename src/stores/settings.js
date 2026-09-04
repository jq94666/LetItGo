import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

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

  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const saved = raw?.searchEngine
    if (SEARCH_ENGINES.some((e) => e.id === saved)) searchEngine.value = saved
  } catch {
    /* 本地存储不可用或数据损坏时回退默认值 */
  }

  // 自定义壁纸：null 表示使用内置默认壁纸
  const wallpaper = ref(readWallpaper())
  const wallpaperSrc = computed(() => wallpaper.value?.src ?? null)

  // pinia 的 setup store 自带 effectScope，watcher 脱离组件生命周期，
  // 因此页面切换后设置仍能持久化
  watch(searchEngine, (v) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ searchEngine: v }))
    } catch {
      /* 本地存储不可用时忽略 */
    }
  })

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

  // 恢复默认：搜索引擎回默认值、壁纸回内置默认
  function resetDefaults() {
    searchEngine.value = DEFAULT_ENGINE
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
