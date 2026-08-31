<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

// 顶部 Tab，通过 vue-router 跳转
const tabs = [
  { key: 'home', label: '主页', path: '/' },
  { key: 'sites', label: '网站', path: '/sites' },
  { key: 'tools', label: '工具', path: '/tools' }
]

const active = () => route.path
</script>

<template>
  <div class="min-h-screen bg-canvas-parchment text-ink">
    <!-- 顶部 Tab 栏：参考 sub-nav-frosted -->
    <nav
      class="sticky top-0 z-50 h-[64px] border-b border-divider-soft bg-canvas-parchment/80 backdrop-blur-apple"
      role="tablist"
    >
      <div class="mx-auto flex h-full max-w-apple-grid items-center justify-center gap-apple-xs px-apple-xl">
        <router-link
          v-for="tab in tabs"
          :key="tab.key"
          :to="tab.path"
          role="tab"
          :aria-selected="active() === tab.path"
          class="rounded-pill px-apple-lg py-apple-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.95] no-underline"
          :class="active() === tab.path
            ? 'bg-primary text-on-primary'
            : 'bg-surface-pearl text-ink-muted-80 hover:text-ink'"
        >
          <span class="text-caption-strong">{{ tab.label }}</span>
        </router-link>
      </div>
    </nav>

    <!-- 路由承载：全宽，滚动限制在 <main> 内部；宽度/内边距由各视图自管 -->
    <main class="h-[calc(100vh-64px)] w-full overflow-y-auto">
      <RouterView />
    </main>
  </div>
</template>