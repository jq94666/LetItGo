import { defineStore } from 'pinia'
import { effectScope, reactive, watch } from 'vue'

/* 各页面独立的桌面设置（自动排列 / 图标自由位置 / 文件夹顺序），
   按 storageKey 缓存为单例：页面内的 useDesktop 与底部导航的设置按钮共享同一份响应式状态，
   因此导航栏里的设置修改能实时作用到对应页面，且两处不会各自漂移。

   网格列数不在此持久化：由页面按屏幕宽度自动决定（移动端 4 列，PC 端 12 列）。

   状态通过 Pinia（单一状态源）+ 一个脱离组件生命周期的持久化 watcher 写入 localStorage，
   因此页面来回切换、组件卸载重建后设置仍能正确读写，且“长按重排的文件夹顺序”可长久保存。 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function createState(storageKey) {
  const state = reactive({
    auto: true,
    pos: {}, // id -> { x, y }（屏幕百分比坐标，手动模式下的自由摆放位置）
    order: [], // 用户自定义文件夹顺序（folder id 列表）；为空时回退默认顺序
    layout: [], // v2 布局快照（views/sites iOS 主屏）：{kind:'folder'|'site', ...}；空则回退静态分组默认
    v2: false, // 当前屏幕是否启用 v2 iOS 主屏布局
    folderSig: '' // 上次应用默认排序时的文件夹集合签名（id:label…）；与当前数据不一致 = 文件夹有新增/删除/改名，页面据此自动重排
  })

  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || '{}')
    state.auto = raw.auto !== false
    for (const [id, p] of Object.entries(raw.pos ?? {})) {
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
        state.pos[id] = { x: clamp(p.x, 0, 100), y: clamp(p.y, 0, 100) }
      }
    }
    if (Array.isArray(raw.order)) state.order = raw.order.filter((x) => typeof x === 'string')
    if (Array.isArray(raw.layout)) state.layout.splice(0, state.layout.length, ...raw.layout)
    state.v2 = raw.v2 === true
    state.folderSig = typeof raw.folderSig === 'string' ? raw.folderSig : ''
  } catch {
    /* 本地存储不可用时忽略 */
  }

  // 使用 detached effectScope，使持久化 watcher 脱离组件生命周期，
  // 这样页面来回切换（组件卸载/重建）后设置仍能正确读写
  const scope = effectScope(true)
  scope.run(() => {
    watch(
      state,
      () => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              auto: state.auto,
              pos: state.pos,
              order: state.order,
              layout: state.layout,
              v2: state.v2,
              folderSig: state.folderSig
            })
          )
        } catch {
          /* 本地存储不可用时忽略 */
        }
      },
      { deep: true }
    )
  })

  // 恢复默认网格排列（仅清空自由摆放的位置，保留自动排列设置）
  state.resetLayout = () => {
    for (const id of Object.keys(state.pos)) delete state.pos[id]
  }

  // 恢复默认文件夹顺序（清空用户自定义排序）
  state.resetOrder = () => {
    state.order.splice(0, state.order.length)
  }

  return state
}

export const useDesktopStore = defineStore('desktop', () => {
  const screens = reactive({}) // storageKey -> reactive state

  function getSettings(storageKey) {
    if (!screens[storageKey]) screens[storageKey] = createState(storageKey)
    return screens[storageKey]
  }

  return { getSettings }
})
