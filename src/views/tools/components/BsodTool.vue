<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

/* ---------- 打开（由工具启动器调用，无配置弹窗，直接进入） ---------- */
const active = ref(false) // 蓝屏层是否显示
const degraded = ref(false) // 未能进入系统全屏 → 降级为页面整屏，Esc 由键盘监听接管
const stageEl = ref(null)
const qrCanvas = ref(null)

/* 伪二维码：每次蓝屏随机绘制一张“看起来能扫”的码，增强拟真感 */
function drawFakeQr() {
  const cv = qrCanvas.value
  if (!cv) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const size = cv.clientWidth
  if (!size) return
  cv.width = size * dpr
  cv.height = size * dpr
  const ctx = cv.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, size, size)

  const n = 21
  const cell = size / (n + 2)
  const off = cell
  // 伪随机但每次进入都不同
  let seed = Math.floor(Math.random() * 2 ** 31)
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }

  // 数据点：浅蓝底上的白点
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inFinder =
        (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7)
      if (inFinder) continue
      if (rand() > 0.42) {
        ctx.fillRect(off + c * cell + cell * 0.12, off + r * cell + cell * 0.12, cell * 0.76, cell * 0.76)
      }
    }
  }
  // 三个定位角（与真实 QR 类似的外白内蓝白心，配色反转以贴合蓝底）
  const drawFinder = (x, y) => {
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fillRect(x, y, cell * 7, cell * 7)
    ctx.fillStyle = '#0078d7'
    ctx.fillRect(x + cell, y + cell, cell * 5, cell * 5)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3)
    ctx.fillStyle = '#0078d7'
    ctx.fillRect(x + cell * 3, y + cell * 3, cell, cell)
  }
  drawFinder(off, off)
  drawFinder(off + (n - 7) * cell, off)
  drawFinder(off, off + (n - 7) * cell)
}

async function openTool() {
  if (active.value) return
  active.value = true
  degraded.value = false
  startProgress()
  await nextTick()
  drawFakeQr()
  const el = stageEl.value
  if (!el) return
  const req = el.requestFullscreen?.bind(el) || el.webkitRequestFullscreen?.bind(el)
  if (!req) {
    degraded.value = true
    return
  }
  try {
    await req()
  } catch {
    // 用户手势可能因异步加载而失效：降级为页面整屏遮罩，Esc 仍可退出
    degraded.value = true
  }
}

/* ---------- 进度：从 5% 起，按真实时间爬升，8 小时后到 100% ---------- */
const percentText = ref('5.00%')
const START_PCT = 5
const GAIN_PCT = 95 // 5 → 100
const DURATION_MS = 8 * 60 * 60 * 1000 // 8 小时
let progressStart = 0
let progressTimer = null

function startProgress() {
  progressStart = Date.now()
  tickProgress()
  if (progressTimer) clearInterval(progressTimer)
  progressTimer = setInterval(tickProgress, 200)
}
function tickProgress() {
  if (!active.value) return
  const elapsed = Date.now() - progressStart
  const ratio = Math.min(1, elapsed / DURATION_MS)
  const pct = Math.min(100, START_PCT + GAIN_PCT * ratio)
  percentText.value = `${pct.toFixed(2)}%`
  if (pct >= 100 && progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}
function stopProgress() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

function close() {
  active.value = false
  stopProgress()
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {})
  }
}

function onFsChange() {
  // 系统全屏被 Esc 退出时触发；若蓝屏仍显示则一并关闭
  if (!document.fullscreenElement && active.value) {
    active.value = false
  }
}

function onKey(e) {
  // 仅在未进入系统全屏（降级整屏）时由键盘接管 Esc；系统全屏下 Esc 由浏览器触发 fullscreenchange
  if (e.key === 'Escape' && active.value && degraded.value) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFsChange)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  stopProgress()
  document.removeEventListener('fullscreenchange', onFsChange)
  window.removeEventListener('keydown', onKey)
})

defineExpose({ open: openTool })
</script>

<template>
  <!-- 蓝屏全屏层：模拟 Windows 蓝屏，无任何退出按钮，仅 Esc 可退出 -->
  <Teleport to="body">
    <div v-show="active" ref="stageEl" class="bsod-stage">
      <div class="bsod-msg">
        <p class="bsod-sad">:(</p>
        <div class="bsod-body">
          <p class="bsod-title">你的电脑遇到问题，需要重新启动。我们只收集某些错误信息，然后为你重新启动。</p>
          <p class="bsod-percent">(已完成 {{ percentText }})</p>
          <p class="bsod-detail">
            如需了解详细信息，可以稍后在线搜索此错误：
            <span class="bsod-code">CRITICAL_PROCESS_DIED</span>
          </p>
        </div>
      </div>

      <div class="bsod-qr">
        <canvas ref="qrCanvas" class="bsod-qr-canvas" aria-hidden="true" />
        <p class="bsod-qr-hint">扫描二维码了解详细信息</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 蓝屏层：Windows 蓝屏底色，覆盖一切；隐藏鼠标、禁止选中，更像真蓝屏 */
.bsod-stage {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  background: #0078d7;
  color: #fff;
  cursor: none;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  font-family: "Segoe UI", system-ui, -apple-system, "Microsoft YaHei", sans-serif;
}

/* 主消息区：左上留出与真蓝屏相近的大块内边距 */
.bsod-msg {
  position: absolute;
  top: clamp(40px, 9vh, 120px);
  left: clamp(28px, 7vw, 110px);
  max-width: min(76vw, 860px);
}
.bsod-sad {
  margin: 0;
  font-size: clamp(72px, 15vh, 190px);
  font-weight: 300;
  line-height: 1;
}
.bsod-body {
  margin-top: clamp(24px, 5vh, 64px);
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2.4vh, 30px);
}
.bsod-title {
  margin: 0;
  font-size: clamp(18px, 3.6vh, 34px);
  font-weight: 300;
  line-height: 1.5;
}
.bsod-percent {
  margin: 0;
  font-size: clamp(14px, 2.6vh, 24px);
  font-weight: 300;
  opacity: 0.95;
}
.bsod-detail {
  margin: 0;
  font-size: clamp(12px, 2vh, 18px);
  font-weight: 300;
  line-height: 1.6;
  opacity: 0.9;
}
.bsod-code {
  color: #fff;
}

/* 右下角伪二维码 */
.bsod-qr {
  position: absolute;
  right: clamp(24px, 6vw, 90px);
  bottom: clamp(24px, 7vh, 90px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.bsod-qr-canvas {
  width: clamp(96px, 15vmin, 168px);
  height: clamp(96px, 15vmin, 168px);
}
.bsod-qr-hint {
  margin: 0;
  font-size: clamp(10px, 1.6vh, 14px);
  font-weight: 300;
  opacity: 0.85;
}
</style>
