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

/* ---------- 全屏展示层 ---------- */
const playing = ref(false) // 展示层是否可见
const snapshot = ref('') // 播放时冻结的文字
const fsNote = ref('')
const stageEl = ref(null)
const boxEl = ref(null)
const textEl = ref(null)

// 静态展示：文字不滚动，需尽量大且完整放入一屏。
// 文本宽度锁定为展示区域宽度，字号二分放大到整段刚好放满（高度优先）。
const MAX_FONT = 1200

function availableBox() {
  const el = boxEl.value
  if (!el) return { w: 0, h: 0 }
  return { w: el.clientWidth, h: el.clientHeight }
}

// 二分求最大字号：文字完整显示且不滚动溢出
function fitFont() {
  const t = textEl.value
  const box = availableBox()
  if (!t || !snapshot.value || box.w <= 0 || box.h <= 0) return
  const probe = (fs) => {
    t.style.fontSize = `${fs}px`
    // scrollWidth / scrollHeight 反映换行后真实占用；文字宽度锁定区域宽度时只溢出高度
    return t.scrollWidth <= box.w && t.scrollHeight <= box.h
  }
  let lo = 12
  let hi = MAX_FONT
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (probe(mid)) lo = mid + 1
    else hi = mid - 1
  }
  t.style.fontSize = `${Math.max(12, hi)}px`
}

async function play() {
  if (!trimmed.value) {
    errorText.value = '请先输入要展示的文字'
    return
  }
  errorText.value = ''
  snapshot.value = trimmed.value
  playing.value = true
  fsNote.value = ''
  await nextTick()
  // 文本真正渲染后再自适应字号（内容较短时可放大到非常大）
  requestAnimationFrame(() => fitFont())
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
    requestAnimationFrame(() => fitFont())
  } else if (playing.value) {
    playing.value = false
  }
}

function onResize() {
  if (playing.value && document.fullscreenElement) fitFont()
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
  <!-- 配置弹窗：输入文字后全屏展示 -->
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
          aria-label="文字展示"
          class="w-full max-w-[560px] rounded-apple-lg bg-canvas p-apple-lg shadow-product"
        >
          <div class="flex items-start justify-between gap-apple-md">
            <div class="min-w-0">
              <p class="text-body-strong text-ink">文字展示</p>
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
              <label for="text-show-input" class="text-caption-strong text-ink-muted-80">文字内容</label>
              <textarea
                id="text-show-input"
                v-model="text"
                rows="4"
                placeholder="输入要展示的文字，支持换行，例如：会议主题"
                class="mt-apple-xs block w-full resize-y rounded-apple-md border border-hairline bg-surface-pearl px-apple-md py-apple-sm text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
              />
              <p v-if="errorText" class="mt-apple-xs text-fine-print text-red-600">{{ errorText }}</p>
            </div>

            <button
              type="button"
              class="rounded-apple-md bg-primary px-apple-md py-apple-sm text-button-utility text-on-primary transition hover:bg-primary-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
              @click="play"
            >
              ▶ 全屏展示
            </button>
            <p class="text-fine-print text-ink-muted-48">展示时按 Esc 或点击右上角「退出」即可返回。</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 全屏展示层：黑底白字，静止不滚动 -->
  <Teleport to="body">
    <div v-show="playing" ref="stageEl" class="fullscreen-stage">
      <div ref="boxEl" class="center-box">
        <p ref="textEl" class="show-text">{{ snapshot }}</p>
      </div>

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
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

/* 文字区域：占满扣除留白后的整屏，flex 居中；文字超高时裁切避免溢出 */
.center-box {
  position: absolute;
  inset: 60px 6% 4%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* 静态文字：撑满可用宽度以便测量与换行；文本整体居中 */
.show-text {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin: 0;
  text-align: center;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  font-weight: 600;
  line-height: 1.25;
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
