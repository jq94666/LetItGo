<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { createApp } from 'vue'
import AnalogClock from './AnalogClock.vue'
import FloatingClock from './FloatingClock.vue'

/* ---------- 固定到屏幕最上层 ----------
   借助 Document Picture-in-Picture API 打开一个「始终置顶」的独立小窗，
   窗内只挂载时钟本体，因此使用其他办公软件时依然可见。
   状态放在模块级：切换到网站/主页再回来时，置顶窗口与控制按钮仍保持一致。 */
const pinned = ref(false)
const supported = typeof window !== 'undefined' && 'documentPictureInPicture' in window
const pipError = ref('')
let pipWindow = null
let pipApp = null
let onPipClose = null

async function pin() {
  if (!supported || pinned.value) return
  pipError.value = ''
  try {
    pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 320,
      height: 320,
      disallowReturnToOpener: true
    })
  } catch (e) {
    pipError.value = e?.message ? `打开置顶窗口失败：${e.message}` : '打开置顶窗口失败'
    return
  }

  const doc = pipWindow.document
  doc.title = '模拟时钟'
  doc.documentElement.style.cssText = 'height:100%;background:transparent;'
  // 背景透明：小窗只剩圆形时钟，不再有矩形外框
  doc.body.style.cssText =
    'margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:transparent;user-select:none;'

  const host = doc.createElement('div')
  host.style.cssText = 'width:100%;height:100%;'
  doc.body.appendChild(host)

  pipApp = createApp(FloatingClock, { pipWindow })
  pipApp.mount(host)
  pinned.value = true

  // 用户直接关闭小窗时同步状态
  onPipClose = () => unpin()
  pipWindow.addEventListener('pagehide', onPipClose, { once: true })
}

function unpin() {
  if (onPipClose && pipWindow) {
    try {
      pipWindow.removeEventListener('pagehide', onPipClose)
    } catch {
      /* ignore */
    }
  }
  onPipClose = null
  try {
    pipApp?.unmount()
  } catch {
    /* ignore */
  }
  try {
    pipWindow?.close()
  } catch {
    /* ignore */
  }
  pipApp = null
  pipWindow = null
  pinned.value = false
}

/* ---------- 弹窗 ---------- */
const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

// 弹窗内的数字时间（关闭时停止计时，避免空转）
const timeText = ref('')
let timer = null
function updateTime() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  timeText.value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}`
}
function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
watch(open, (v) => {
  if (v) {
    updateTime()
    timer = setInterval(updateTime, 1000)
  } else {
    stopTimer()
  }
})

// 组件卸载只停计时，不主动取消固定：置顶时钟应可跨页面继续显示
onBeforeUnmount(stopTimer)

const canPin = computed(() => supported && !pinned.value)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink/40 p-apple-md backdrop-blur-apple sm:p-apple-lg"
        @click.self="open = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="模拟时钟"
          class="modal-card flex max-h-[calc(100dvh-2*var(--spacing-apple-lg))] w-full max-w-[460px] flex-col rounded-apple-lg bg-canvas p-apple-lg shadow-hairline sm:p-apple-xl"
        >
          <!-- 头部（不随内容滚动） -->
          <div class="flex shrink-0 items-center justify-between">
            <h2 class="text-display-md text-ink">模拟时钟</h2>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted-48 transition-colors hover:bg-canvas-parchment hover:text-ink focus:outline-none"
              aria-label="关闭"
              @click="open = false"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M1 1l12 12M13 1 1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="mt-apple-lg flex min-h-0 flex-1 flex-col items-center gap-apple-md overflow-y-auto">
            <div class="w-[240px] shrink-0 sm:w-[280px]">
              <AnalogClock size="100%" />
            </div>

            <p class="font-mono text-body-strong text-ink-muted-80">{{ timeText }}</p>

            <div class="flex w-full flex-col gap-apple-xs">
              <button
                v-if="canPin"
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97]"
                @click="pin()"
              >
                固定到屏幕最上层
              </button>
              <button
                v-else-if="pinned"
                type="button"
                class="rounded-pill bg-canvas-parchment px-apple-lg py-apple-sm text-caption-strong text-ink transition-all duration-200 hover:bg-divider-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97]"
                @click="unpin()"
              >
                取消固定
              </button>

              <p v-if="!supported" class="text-fine-print text-ink-muted-48">
                当前浏览器不支持「始终置顶」小窗，请使用 Chrome / Edge 116 及以上版本。
              </p>
              <p v-else-if="pinned" class="text-fine-print text-ink-muted-48">
                已置顶。悬停时钟右上角 ✕ 可关闭；按住时钟即可把时钟拖到屏幕任意位置。
              </p>
              <p v-else-if="pipError" class="text-fine-print text-red-600">{{ pipError }}</p>
              <p v-else class="text-fine-print text-ink-muted-48">
                固定后会独立悬浮于屏幕最上层，窗内只显示时钟，便于办公时随时查看。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 苹果风格弹窗动画：遮罩淡入 + 卡片缩放上浮 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: scale(0.94) translateY(14px);
  opacity: 0;
}
</style>
