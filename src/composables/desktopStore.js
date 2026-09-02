import { reactive, watch, effectScope } from 'vue'

/* 各页面独立的桌面设置（列数 / 行数 / 自动排列 / 图标位置），
   按 storageKey 缓存为单例：页面内的 useDesktop 与底部导航的设置按钮共享同一份响应式状态，
   因此导航栏里的设置修改能实时作用到对应页面，且两处不会各自漂移。 */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

// 移动端（窄屏）默认 3 列，PC 端默认 12 列
const isMobile = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
const defaultCols = () => (isMobile() ? 3 : 12)

// 使用 detached effectScope，使持久化 watcher 脱离组件生命周期，
// 这样页面来回切换（组件卸载/重建）后设置仍能正确读写
const scope = effectScope(true)
const cache = {} // storageKey -> reactive state

function create(storageKey) {
  const state = reactive({
    cols: defaultCols(),
    auto: true,
    pos: {} // id -> { x, y }（屏幕百分比坐标）
  })

  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || '{}')
    state.cols = clamp(Number(raw.cols) || defaultCols(), 3, 12)
    state.auto = raw.auto !== false
    for (const [id, p] of Object.entries(raw.pos ?? {})) {
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
        state.pos[id] = { x: clamp(p.x, 0, 100), y: clamp(p.y, 0, 100) }
      }
    }
  } catch {
    /* 本地存储不可用时忽略 */
  }

  scope.run(() => {
    watch(
      state,
      () => {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ cols: state.cols, auto: state.auto, pos: state.pos })
          )
        } catch {
          /* 本地存储不可用时忽略 */
        }
      },
      { deep: true }
    )
  })

  // 恢复默认网格排列（仅清空自由摆放的位置，保留列数/行数/自动排列设置）
  state.resetLayout = () => {
    for (const id of Object.keys(state.pos)) delete state.pos[id]
  }

  return state
}

export function getDesktopSettings(storageKey) {
  if (!cache[storageKey]) cache[storageKey] = create(storageKey)
  return cache[storageKey]
}
