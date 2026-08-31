<script setup>
import { ref } from 'vue'
import ToolsView from './views/tools/index.vue'

const tabs = [
  { key: 'home', label: '主页' },
  { key: 'sites', label: '网站' },
  { key: 'tools', label: '工具' }
]

const active = ref('home')
</script>

<template>
  <div class="min-h-screen bg-canvas-parchment text-ink">
    <!-- 顶部 Tab 栏：参考 sub-nav-frosted -->
    <nav
      class="sticky top-0 z-50 h-[64px] border-b border-divider-soft bg-canvas-parchment/80 backdrop-blur-apple"
      role="tablist"
    >
      <div class="mx-auto flex h-full max-w-apple-grid items-center justify-center gap-apple-xs px-apple-xl">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="active === tab.key"
          class="rounded-pill px-apple-lg py-apple-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.95]"
          :class="active === tab.key
            ? 'bg-primary text-on-primary'
            : 'bg-surface-pearl text-ink-muted-80 hover:text-ink'"
          @click="active = tab.key"
        >
          <span class="text-caption-strong">{{ tab.label }}</span>
        </button>
      </div>
    </nav>

    <!-- 三个可切换面板：参考 product-tile-light / product-tile-parchment 节奏 -->
    <main class="mx-auto max-w-apple-grid px-apple-xl">
      <!-- 主页 -->
      <section
        v-show="active === 'home'"
        role="tabpanel"
        aria-labelledby="home"
        class="min-h-[calc(100vh-64px)] bg-canvas px-apple-section py-apple-section"
      >
        <div class="flex min-h-[60vh] items-center justify-center">
          <p class="text-caption text-ink-muted-48">待填充</p>
        </div>
      </section>

      <!-- 网站 -->
      <section
        v-show="active === 'sites'"
        role="tabpanel"
        aria-labelledby="sites"
        class="min-h-[calc(100vh-64px)] bg-canvas-parchment px-apple-section py-apple-section"
      >
        <div class="flex min-h-[60vh] items-center justify-center">
          <p class="text-caption text-ink-muted-48">待填充</p>
        </div>
      </section>

      <!-- 工具 -->
      <section
        v-show="active === 'tools'"
        role="tabpanel"
        aria-labelledby="tools"
        class="min-h-[calc(100vh-64px)] bg-canvas"
      >
        <ToolsView />
      </section>
    </main>
  </div>
</template>
