import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

/* 全局偏好设置（与桌面布局无关，跨页面共享，持久化到 localStorage）。
   目前包含：默认搜索引擎。

   这里不用 useDesktop 的 per-screen storageKey，因为搜索引擎是全局偏好，
   在主页 / 网站 / 工具任意一页的设置里修改都应全局生效。 */

export const SEARCH_ENGINES = [
  { id: 'baidu', label: '百度', url: 'https://www.baidu.com/s?wd=' },
  { id: 'google', label: '谷歌', url: 'https://www.google.com/search?q=' },
  { id: 'bing', label: '必应', url: 'https://www.bing.com/search?q=' }
]

const DEFAULT_ENGINE = 'bing' // 默认必应
const STORAGE_KEY = 'workmate.settings'

export const useSettingsStore = defineStore('settings', () => {
  const searchEngine = ref(DEFAULT_ENGINE)

  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    const saved = raw?.searchEngine
    if (SEARCH_ENGINES.some((e) => e.id === saved)) searchEngine.value = saved
  } catch {
    /* 本地存储不可用或数据损坏时回退默认值 */
  }

  // pinia 的 setup store 自带 effectScope，watcher 脱离组件生命周期，
  // 因此页面切换后设置仍能持久化
  watch(searchEngine, (v) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ searchEngine: v }))
    } catch {
      /* 本地存储不可用时忽略 */
    }
  })

  function currentEngine() {
    return (
      SEARCH_ENGINES.find((e) => e.id === searchEngine.value) ??
      SEARCH_ENGINES.find((e) => e.id === DEFAULT_ENGINE)
    )
  }

  function searchUrl(q) {
    return currentEngine().url + encodeURIComponent(q)
  }

  return { searchEngine, currentEngine, searchUrl }
})
