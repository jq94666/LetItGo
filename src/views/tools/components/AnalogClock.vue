<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/* 模拟时钟：圆形表盘 + 时/分/秒针，秒针实时转动（走时平滑连续）。
   注意：本组件只使用内联样式、不使用 Tailwind/ scoped 样式，
   以便直接挂载到「画中画」置顶窗口（该窗口不继承本页面样式表）。 */

const props = defineProps({
  // 外层尺寸（CSS 长度），如 260px / 100%
  size: { type: String, default: '100%' }
})

const now = ref(Date.now())
let raf = null
function tick() {
  now.value = Date.now()
  raf = requestAnimationFrame(tick)
}
onMounted(() => {
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})

// 指针角度（度）：含小数，使秒针连续扫动而非跳格
const angles = computed(() => {
  const d = new Date(now.value)
  const s = d.getSeconds() + d.getMilliseconds() / 1000
  const m = d.getMinutes() + s / 60
  const h = (d.getHours() % 12) + m / 60
  return { h: h * 30, m: m * 6, s: s * 6 }
})

// 12 个时标数字
const numerals = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  const a = (n * 30 * Math.PI) / 180
  return { n, x: 100 + 70 * Math.sin(a), y: 100 - 70 * Math.cos(a) }
})

// 60 个分钟刻度，整点为长粗刻度
const ticks = Array.from({ length: 60 }, (_, i) => {
  const big = i % 5 === 0
  const a = (i * 6 * Math.PI) / 180
  const r1 = big ? 79 : 84
  return {
    big,
    x1: 100 + r1 * Math.sin(a),
    y1: 100 - r1 * Math.cos(a),
    x2: 100 + 88 * Math.sin(a),
    y2: 100 - 88 * Math.cos(a)
  }
})
</script>

<template>
  <div
    :style="{
      width: props.size,
      height: props.size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }"
  >
    <svg
      viewBox="0 0 200 200"
      :style="{ width: '100%', height: '100%', display: 'block' }"
      role="img"
      aria-label="模拟时钟"
    >
      <!-- 外圈边框与表盘 -->
      <circle cx="100" cy="100" r="99" fill="#35353a" />
      <circle cx="100" cy="100" r="94" fill="#8e8b82" />
      <circle cx="100" cy="100" r="91" fill="#f7f2e6" />
      <circle cx="100" cy="100" r="91" fill="none" stroke="#ded5c0" stroke-width="1" />

      <!-- 分钟刻度 -->
      <line
        v-for="(t, i) in ticks"
        :key="i"
        :x1="t.x1"
        :y1="t.y1"
        :x2="t.x2"
        :y2="t.y2"
        :stroke="t.big ? '#2f2f33' : '#b3a892'"
        :stroke-width="t.big ? 2.4 : 1"
        stroke-linecap="round"
      />

      <!-- 时标数字 -->
      <text
        v-for="n in numerals"
        :key="n.n"
        :x="n.x"
        :y="n.y"
        text-anchor="middle"
        dominant-baseline="central"
        :style="{
          fontFamily: 'Georgia, \'Times New Roman\', serif',
          fontSize: '14px',
          fontWeight: '600',
          fill: '#2f2f33'
        }"
      >{{ n.n }}</text>

      <!-- 时针 -->
      <g :transform="`rotate(${angles.h} 100 100)`">
        <rect x="97" y="56" width="6" height="52" rx="3" fill="#2f2f33" />
      </g>
      <!-- 分针 -->
      <g :transform="`rotate(${angles.m} 100 100)`">
        <rect x="98" y="38" width="4" height="72" rx="2" fill="#2f2f33" />
      </g>
      <!-- 秒针（红色，带配重） -->
      <g :transform="`rotate(${angles.s} 100 100)`">
        <rect x="99.2" y="22" width="1.6" height="94" rx="0.8" fill="#c0392b" />
        <circle cx="100" cy="112" r="4.5" fill="#c0392b" />
      </g>

      <!-- 中心轴 -->
      <circle cx="100" cy="100" r="4.6" fill="#2f2f33" />
      <circle cx="100" cy="100" r="1.6" fill="#f7f2e6" />
    </svg>
  </div>
</template>
