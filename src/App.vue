<script setup>
import { ref } from 'vue'

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
      class="sticky top-0 z-50 h-[52px] border-b border-divider-soft bg-canvas-parchment/80 backdrop-blur-apple"
      role="tablist"
    >
      <div class="mx-auto flex h-full max-w-apple-grid items-center gap-apple-lg px-apple-xl">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="active === tab.key"
          class="relative -my-apple-sm px-apple-xs py-apple-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97]"
          :class="active === tab.key ? 'text-primary' : 'text-ink-muted-48 hover:text-ink'"
          @click="active = tab.key"
        >
          <span class="text-tagline">{{ tab.label }}</span>
          <span
            v-if="active === tab.key"
            class="absolute -bottom-px left-apple-xs right-apple-xs h-[2px] rounded-pill bg-primary"
          />
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
        class="min-h-[calc(100vh-52px)] bg-canvas px-apple-section py-apple-section"
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
        class="min-h-[calc(100vh-52px)] bg-canvas-parchment px-apple-section py-apple-section"
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
        class="min-h-[calc(100vh-52px)] bg-canvas px-apple-section py-apple-section"
      >
        <div class="flex min-h-[60vh] items-center justify-center">
          <p class="text-caption text-ink-muted-48">待填充</p>
        </div>
      </section>
    </main>
  </div>
</template>
