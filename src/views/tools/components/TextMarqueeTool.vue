<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

/* ---------- 工具弹窗 ---------- */
const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

const text = ref('')
const errorText = ref('')
const trimmed = computed(() => text.value.trim())

/* ---------- 全屏播放层 ---------- */
const playing = ref(false) // 播放层是否可见
const snapshot = ref('') // 点击播放时冻结的文字，防止退出后编辑影响播放内容
const fsNote = ref('') // 浏览器不支持/拒绝系统全屏时的降级提示
const stageEl = ref(null)
const fontPx = ref(160)
const durSec = ref(10)

// 字号尽量大：优先受视口高度限制；短文本允许更大字号（横向可溢出滚动）
function calcFont() {
  const w = window.innerWidth
  const h = window.innerHeight
  const chars = Math.max(1, snapshot.value.length)
  let fs = Math.min(h * 0.5, (w * 0.96) / Math.max(2, chars))
  fs = Math.max(fs, h * 0.16)
  fs = Math.min(fs, h * 0.78)
  fontPx.value = Math.max(24, Math.round(fs))
}

// 滚动时长：约每 3 字一秒，跑得不过快也不过慢
function calcDuration() {
  const chars = Math.max(1, snapshot.value.length)
  durSec.value = Math.min(120, Math.max(6, Math.ceil(chars / 3)))
}

function refreshLayout() {
  if (!playing.value || !snapshot.value) return
  calcFont()
  calcDuration()
}

async function play() {
  if (!trimmed.value) {
    errorText.value = '请先输入要播放的文字'
    return
  }
  errorText.value = ''
  // 跑马灯为单行滚动：把换行/连续空白折叠为单个空格，避免轨道断行或出现大片空隙
  snapshot.value = trimmed.value.replace(/\s+/g, ' ')
  playing.value = true
  fsNote.value = ''
  refreshLayout()
  await nextTick()
  const el = stageEl.value
  if (!el) return
  try {
    if (document.fullscreenElement) return
    if (el.requestFullscreen) await el.requestFullscreen()
    else fsNote.value = '当前浏览器不支持全屏，已放大到整屏展示'
  } catch (e) {
    fsNote.value = `未进入系统全屏，已放大到整屏展示${e?.name ? `（${e.name}）` : ''}`
  }
}

function stop() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {})
  }
  playing.value = false
}

function onFsChange() {
  if (document.fullscreenElement) {
    // 进入系统全屏后重新按真实屏幕尺寸计算
    requestAnimationFrame(refreshLayout)
  } else if (playing.value) {
    playing.value = false
  }
}

function onResize() {
  if (playing.value && document.fullscreenElement) refreshLayout()
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFsChange)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <!-- 配置弹窗：输入文字后全屏播放 -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-md backdrop-blur-sm sm:p-apple-xl"
        @click.self="open = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="文字跑马灯"
          class="w-full max-w-[560px] rounded-apple-lg bg-canvas p-apple-lg shadow-product"
        >
          <div class="flex items-start justify-between gap-apple-md">
            <div class="min-w-0">
              <p class="text-body-strong text-ink">文字跑马灯</p>
            </div>
            <button
              type="button"
              aria-label="关闭"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
              @click="open = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          <div class="mt-apple-md flex flex-col gap-apple-md">
            <div>
              <label for="text-marquee-input" class="text-caption-strong text-ink-muted-80">文字内容</label>
              <textarea
                id="text-marquee-input"
                v-model="text"
                rows="4"
                placeholder="输入要滚动播放的文字，例如：欢迎光临"
                class="mt-apple-xs block w-full resize-y rounded-apple-md border border-hairline bg-surface-pearl px-apple-md py-apple-sm text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
              />
              <p v-if="errorText" class="mt-apple-xs text-fine-print text-red-600">{{ errorText }}</p>
            </div>

            <button
              type="button"
              class="rounded-apple-md bg-primary px-apple-md py-apple-sm text-button-utility text-on-primary transition hover:bg-primary-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
              @click="play"
            >
              ▶ 全屏播放
            </button>
            <p class="text-fine-print text-ink-muted-48">播放时按 Esc 或点击右上角「退出」即可返回。</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 全屏播放层：黑底白字，文字横向循环滚动 -->
  <Teleport to="body">
    <div
      v-show="playing"
      ref="stageEl"
      class="fullscreen-stage"
    >
      <div class="mq-viewport">
        <div
          class="mq-track"
          :style="{ fontSize: fontPx + 'px', animationDuration: durSec + 's' }"
        >
          <span v-for="n in 2" :key="n" class="mq-copy">{{ snapshot }}</span>
        </div>
      </div>

      <!-- 顶部说明与退出 -->
      <div class="stage-hud">
        <p v-if="fsNote" class="stage-note">{{ fsNote }}</p>
        <button type="button" class="stage-exit" @click="stop">✕ 退出</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 全屏层：黑底白字 */
.fullscreen-stage {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  color: #fff;
  user-select: none;
  -webkit-user-select: none;
}

/* 横向滚动：轨道由两份相同文字组成，平移到 -50% 后回到相同画面，形成无缝循环 */
.mq-viewport {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.mq-track {
  display: flex;
  width: max-content;
  will-change: transform;
  animation-name: mq-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  white-space: nowrap;
  font-weight: 600;
  line-height: 1.1;
}
.mq-copy {
  padding-right: 0.7em;
  white-space: nowrap;
}
@keyframes mq-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

/* 顶部操作区 */
.stage-hud {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
}
.stage-note {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  line-height: 1.4;
}
.stage-exit {
  flex-shrink: 0;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  padding: 6px 14px;
  font-size: 13px;
  line-height: 1;
  transition: background 0.2s ease;
}
.stage-exit:hover {
  background: rgba(255, 255, 255, 0.28);
}

/* 弹窗动画（沿用全局 modal 命名以复用现有过渡） */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
