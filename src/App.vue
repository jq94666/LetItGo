<script setup>
<<<<<<< HEAD
import { ref } from 'vue'
import HomeView from './views/home/index.vue'
import SitesView from './views/sites/index.vue'
import ToolsView from './views/tools/index.vue'
=======
import { useRoute } from 'vue-router'
>>>>>>> 39bf6a4ad23b6510127591600760261b871b8b18

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

<<<<<<< HEAD
    <!-- 三个可切换面板：参考 product-tile-light / product-tile-parchment 节奏 -->
    <main class="mx-auto max-w-apple-grid px-apple-xl">
      <!-- 主页：壁纸与布局由 HomeView 全权负责 -->
      <section
        v-show="active === 'home'"
        role="tabpanel"
        aria-labelledby="home"
        class="min-h-[calc(100vh-64px)]"
      >
        <HomeView />
      </section>

      <!-- 网站 -->
      <section
        v-show="active === 'sites'"
        role="tabpanel"
        aria-labelledby="sites"
        class="min-h-[calc(100vh-64px)] bg-canvas-parchment px-apple-section py-apple-section"
      >
        <SitesView />
      </section>

      <!-- 工具 -->
      <section
        v-show="active === 'tools'"
        role="tabpanel"
        aria-labelledby="tools"
        class="min-h-[calc(100vh-64px)] bg-canvas px-apple-section py-apple-section"
      >
        <ToolsView />
      </section>
=======
    <!-- 路由承载：滚动限制在 <main> 内部，最外层浏览器无滚动条 -->
    <main class="mx-auto h-[calc(100vh-64px)] max-w-apple-grid overflow-y-auto px-apple-xl">
      <RouterView />
>>>>>>> 39bf6a4ad23b6510127591600760261b871b8b18
    </main>
  </div>
</template>
