import { onBeforeUnmount, ref } from 'vue'

/* 全屏播放层「退出按钮」的移动端自动隐藏：
   - 触摸设备：按钮显示 3 秒后隐藏；点击屏幕任意处重新显示并再次计时 3 秒；
   - 桌面（可悬停设备）：始终显示。
   返回 { showExit, ping }：showExit 控制按钮显隐，ping() 在「开始播放 / 点击屏幕」时调用。 */
export function useTouchExit() {
  const touchUI =
    typeof window !== 'undefined' &&
    !!(window.matchMedia?.('(hover: none) or (pointer: coarse)')?.matches ?? false)
  const showExit = ref(!touchUI)
  let timer = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function ping() {
    showExit.value = true
    clearTimer()
    if (touchUI) timer = setTimeout(() => (showExit.value = false), 3000)
  }

  onBeforeUnmount(clearTimer)

  return { showExit, ping }
}
