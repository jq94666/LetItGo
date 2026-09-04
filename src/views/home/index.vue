<script setup>
import { computed, ref } from 'vue'
import { useSettingsStore } from '../../stores/settings.js'

// 搜索引擎由「更多 → 设置」统一配置，默认必应
const settingsStore = useSettingsStore()
const query = ref('')
const placeholder = computed(() => `在${settingsStore.currentEngine().label}中搜索`)

function onSubmit(e) {
  e.preventDefault()
  const q = query.value.trim()
  if (!q) return
  window.open(settingsStore.searchUrl(q), '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <!-- 背景：单一 parchment 表面，无大色块对比，靠磨砂卡片自身提供层次 -->
  <div class="relative min-h-full w-full">
    <!-- 内容：搜索框桌面端靠上；移动端下移（thumb 友好），避开顶部 -->
    <div class="relative z-10 mx-auto w-full max-w-apple-content px-apple-xl pb-apple-section pt-apple-xl sm:pt-apple-xxl max-[767px]:mt-[48vh]">
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
              aria-label="搜索"
              :placeholder="placeholder"
              class="h-[44px] w-full rounded-pill border border-black/[0.08] bg-canvas pl-[44px] pr-apple-md text-apple-body text-ink transition-colors duration-200 focus:border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
              autocomplete="off"
            />
          </label>
        </form>
      </div>

    </div>
  </div>
</template>
