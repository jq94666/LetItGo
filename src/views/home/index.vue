<script setup>
import { ref } from 'vue'
import WeatherCard from './components/WeatherCard.vue'
import CalendarCard from './components/CalendarCard.vue'

const query = ref('')

function onSubmit(e) {
  e.preventDefault()
  const q = query.value.trim()
  if (!q) return
  // 默认使用必应搜索
  const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <!-- 背景：单一 parchment 表面，无大色块对比，靠磨砂卡片自身提供层次 -->
  <div class="relative min-h-[calc(100vh-64px)] w-full bg-canvas-parchment">
    <!-- 内容：搜索框靠上（距顶 apple-xxl 48px） -->
    <div class="relative z-10 mx-auto w-full max-w-apple-content px-apple-xl pb-apple-section pt-apple-xxl">
      <!-- 搜索框 -->
      <div class="mx-auto w-full max-w-[680px]">
        <form
          role="search"
          class="rounded-apple-lg bg-canvas/70 p-apple-sm shadow-hairline backdrop-blur-apple saturate-[180%] transition-all duration-200 focus-within:shadow-product"
          @submit="onSubmit"
        >
          <label class="relative block">
            <!-- 左侧搜索图标（muted 色调） -->
            <span
              class="pointer-events-none absolute left-apple-md top-1/2 flex -translate-y-1/2 items-center text-ink-muted-48"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-[18px] w-[18px]"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>

            <!-- 搜索输入：Apple search-input 令牌（pill 44px） -->
            <input
              v-model="query"
              type="search"
              name="q"
              placeholder="使用必应搜索…"
              class="h-[44px] w-full rounded-pill border border-black/[0.08] bg-canvas pl-[44px] pr-apple-md text-apple-body text-ink placeholder:text-ink-muted-48 transition-colors duration-200 focus:border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
              autocomplete="off"
            />
          </label>
        </form>
      </div>

      <!-- 两张功能卡片：响应式 2 列，桌面等分，移动堆叠 -->
      <div class="mx-auto mt-apple-xxl grid w-full max-w-apple-content grid-cols-1 gap-apple-lg sm:grid-cols-2">
        <WeatherCard />
        <CalendarCard />
      </div>
    </div>
  </div>
</template>
