<script setup>
import { computed, ref } from 'vue'

// 真实项目里改为接口请求。这里用一组自洽的模拟数据，方便 UI 先跑通。
// 近期：今天 + 后续 6 天 = 7 天
const FORECAST = [
  {
    date: '今天',
    short: '周五',
    icon: '☀️',
    label: '晴',
    high: 31,
    low: 22,
    wind: '东南风 2 级',
    humidity: '湿度 48%'
  },
  {
    date: '明天',
    short: '周六',
    icon: '⛅',
    label: '多云',
    high: 29,
    low: 21,
    wind: '东风 2 级',
    humidity: '湿度 55%'
  },
  {
    date: '后天',
    short: '周日',
    icon: '🌦️',
    label: '阵雨',
    high: 26,
    low: 20,
    wind: '东北风 3 级',
    humidity: '湿度 72%'
  },
  {
    date: '周一',
    short: '08-31',
    icon: '🌧️',
    label: '小雨',
    high: 24,
    low: 19,
    wind: '北风 3 级',
    humidity: '湿度 80%'
  },
  {
    date: '周二',
    short: '09-01',
    icon: '⛅',
    label: '多云转晴',
    high: 26,
    low: 19,
    wind: '西北风 2 级',
    humidity: '湿度 65%'
  },
  {
    date: '周三',
    short: '09-02',
    icon: '☀️',
    label: '晴',
    high: 28,
    low: 20,
    wind: '西风 2 级',
    humidity: '湿度 52%'
  },
  {
    date: '周四',
    short: '09-03',
    icon: '☀️',
    label: '晴',
    high: 30,
    low: 21,
    wind: '西南风 2 级',
    humidity: '湿度 46%'
  }
]

const today = FORECAST[0]

const open = ref(false)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}
</script>

<template>
  <!-- 天气卡片（store-utility-card 语法） -->
  <button
    type="button"
    class="w-full text-left rounded-apple-lg bg-canvas p-apple-lg shadow-hairline transition-all duration-200 active:scale-[0.98] hover:bg-surface-pearl"
    @click="toggle"
  >
    <div class="flex items-center justify-between gap-apple-md">
      <div>
        <p class="text-caption text-ink-muted-48">当前天气 · 北京</p>
        <div class="mt-apple-xxs flex items-baseline gap-apple-xs">
          <span class="text-display-lg leading-none">{{ today.high }}°</span>
          <span class="text-caption text-ink-muted-48">/ {{ today.low }}°</span>
        </div>
        <p class="mt-apple-xxs text-body-strong">
          <span class="mr-apple-xxs">{{ today.icon }}</span>{{ today.label }}
        </p>
      </div>
      <div class="text-6xl opacity-90">{{ today.icon }}</div>
    </div>
    <div class="mt-apple-md flex flex-wrap gap-x-apple-lg text-caption text-ink-muted-80">
      <span>{{ today.wind }}</span>
      <span>{{ today.humidity }}</span>
      <span class="text-primary">查看近期 ›</span>
    </div>
  </button>

  <!-- 弹窗遮罩 -->
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-surface-black/40 p-apple-xl backdrop-blur-sm"
      @click.self="close"
    >
      <!-- 弹窗：Apple 工具卡风格，pill CTA + 圆形关闭 -->
      <div
        class="w-full max-w-md rounded-apple-lg bg-canvas p-apple-lg shadow-product"
        role="dialog"
        aria-modal="true"
        aria-label="近期天气"
      >
        <div class="mb-apple-md flex items-start justify-between">
          <div>
            <p class="text-display-md leading-none">近期天气</p>
            <p class="mt-apple-xxs text-caption text-ink-muted-48">未来 7 天预报</p>
          </div>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-chip-translucent/60 text-ink transition active:scale-[0.95]"
            aria-label="关闭"
            @click="close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <!-- 今日大卡 -->
        <div class="mb-apple-md rounded-apple-md bg-canvas-parchment p-apple-md">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-caption text-ink-muted-48">{{ FORECAST[0].date }} · {{ FORECAST[0].short }}</p>
              <div class="mt-apple-xxs flex items-baseline gap-apple-xs">
                <span class="text-hero leading-none">{{ FORECAST[0].high }}°</span>
                <span class="text-caption text-ink-muted-48">/ {{ FORECAST[0].low }}°</span>
              </div>
              <p class="mt-apple-xxs text-body-strong">
                <span class="mr-apple-xxs">{{ FORECAST[0].icon }}</span>{{ FORECAST[0].label }}
              </p>
              <div class="mt-apple-xs flex flex-wrap gap-x-apple-lg text-caption text-ink-muted-80">
                <span>{{ FORECAST[0].wind }}</span>
                <span>{{ FORECAST[0].humidity }}</span>
              </div>
            </div>
            <div class="text-7xl">{{ FORECAST[0].icon }}</div>
          </div>
        </div>

        <!-- 后续 6 天列表 -->
        <ul class="divide-y divide-divider-soft">
          <li
            v-for="item in FORECAST.slice(1)"
            :key="item.date"
            class="flex items-center gap-apple-md py-apple-sm"
          >
            <div class="w-20 shrink-0">
              <p class="text-caption-strong">{{ item.date }}</p>
              <p class="text-fine-print text-ink-muted-48">{{ item.short }}</p>
            </div>
            <div class="text-3xl">{{ item.icon }}</div>
            <p class="flex-1 text-body">{{ item.label }}</p>
            <div class="w-28 shrink-0 text-right">
              <span class="text-body-strong">{{ item.high }}°</span>
              <span class="ml-apple-xs text-caption text-ink-muted-48">{{ item.low }}°</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>
