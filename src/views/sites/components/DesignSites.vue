<script setup>
import { ref } from 'vue'

/* 设计相关站点：按子菜单分组 */
const subMenus = [
  { key: 'icons', label: '图标', icon: '🎨' }
]

const active = ref('icons')

const siteGroups = {
  icons: [
    { name: 'iconfont', href: 'https://www.iconfont.cn/' },
    { name: 'iconpark', href: 'https://iconpark.oceanengine.com/home' }
  ]
}
</script>

<template>
  <div class="flex flex-col gap-apple-md">
    <!-- 子菜单：横向胶囊切换 -->
    <div class="flex flex-wrap gap-apple-xs" role="tablist" aria-label="设计子菜单">
      <button
        v-for="sub in subMenus"
        :key="sub.key"
        type="button"
        role="tab"
        :aria-selected="active === sub.key"
        class="flex items-center gap-apple-xs rounded-pill px-apple-md py-apple-xs text-caption-strong transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97]"
        :class="active === sub.key ? 'bg-primary text-on-primary' : 'bg-canvas text-ink-muted-80 shadow-hairline hover:text-ink'"
        @click="active = sub.key"
      >
        <span>{{ sub.icon }}</span>
        {{ sub.label }}
      </button>
    </div>

    <!-- 站点卡片网格 -->
    <div
      v-for="sub in subMenus"
      v-show="active === sub.key"
      :key="sub.key"
      role="tabpanel"
      :aria-label="sub.label"
      class="grid grid-cols-2 gap-apple-md sm:grid-cols-3 lg:grid-cols-4"
    >
      <a
        v-for="site in siteGroups[sub.key]"
        :key="site.name"
        :href="site.href"
        target="_blank"
        rel="noopener noreferrer"
        class="flex flex-col items-center gap-apple-xs rounded-apple-lg bg-canvas p-apple-sm transition-all duration-200 hover:shadow-hairline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] no-underline"
      >
        <!-- 图标占位：待用户自行定义 -->
        <span
          class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-tile-2"
        ></span>
        <span class="text-caption-strong text-ink">{{ site.name }}</span>
      </a>
    </div>
  </div>
</template>