<script setup>
import { ref } from 'vue'
import AnalogClock from './AnalogClock.vue'

/* 置顶小窗容器：整窗只显示圆形时钟（不含任何网址/文字内容）。
   - 鼠标悬浮到窗口上时，右上角浮现 ✕ 关闭按钮
   - 按住时钟即可把整个小窗拖到屏幕任意位置（借助 PiP 窗口的 moveTo）
   仅使用内联样式，确保在画中画文档中不丢样式。 */
const props = defineProps({
  pipWindow: { type: Object, required: true }
})

const hovering = ref(false)
const dragging = ref(false)
let drag = null

function onDown(e) {
  if (e.button !== 0) return
  // 避免把「点按关闭按钮」误判为拖动
  if (e.target.closest && e.target.closest('[data-role=close]')) return
  dragging.value = true
  drag = {
    sx: e.screenX,
    sy: e.screenY,
    ox: props.pipWindow.screenX || 0,
    oy: props.pipWindow.screenY || 0
  }
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId)
  } catch {
    /* ignore */
  }
}

function onMove(e) {
  if (!drag) return
  try {
    props.pipWindow.moveTo(drag.ox + (e.screenX - drag.sx), drag.oy + (e.screenY - drag.sy))
  } catch {
    /* ignore */
  }
}

function onUp() {
  drag = null
  dragging.value = false
}

function close() {
  try {
    props.pipWindow.close()
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div
    class="float-root"
    :style="{
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      cursor: dragging ? 'grabbing' : 'grab',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'none'
    }"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @pointerdown="onDown"
    @pointermove="onMove"
    @pointerup="onUp"
    @pointercancel="onUp"
  >
    <!-- 仅圆形时钟：高撑满，宽随 aspectRatio，保证始终是正圆且不超出窗口 -->
    <div :style="{ height: '100%', maxWidth: '100%', aspectRatio: '1', display: 'flex' }">
      <AnalogClock size="100%" />
    </div>

    <!-- 悬浮出现的关闭按钮 -->
    <button
      data-role="close"
      type="button"
      :aria-label="hovering ? '关闭置顶时钟' : undefined"
      :style="{
        position: 'absolute',
        top: '6px',
        right: '6px',
        width: '26px',
        height: '26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.16)',
        color: '#fff',
        fontSize: '13px',
        lineHeight: 1,
        cursor: 'pointer',
        opacity: hovering ? 1 : 0,
        transition: 'opacity 0.15s ease'
      }"
      @pointerdown.stop
      @click.stop="close"
    >
      ✕
    </button>
  </div>
</template>
