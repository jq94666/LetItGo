<script setup>
import { ref } from 'vue'
import PdfSites from './components/PdfSites.vue'
import DirectorySites from './components/DirectorySites.vue'

// 侧边菜单
const menus = [
  { key: 'pdf', label: 'PDF' },
  { key: 'directory', label: '文档' }
]

const active = ref('pdf')
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)]">
    <!-- 侧边菜单栏 -->
    <aside
      class="w-[220px] shrink-0 border-r border-divider-soft bg-canvas px-apple-sm py-apple-lg"
      role="navigation"
      aria-label="网站菜单"
    >
      <ul class="flex flex-col gap-apple-xs" role="menu">
        <li v-for="menu in menus" :key="menu.key" role="none">
          <button
            type="button"
            role="menuitem"
            :aria-current="active === menu.key ? 'page' : undefined"
            class="w-full rounded-apple-md px-apple-lg py-apple-sm text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
            :class="active === menu.key
              ? 'bg-primary text-on-primary'
              : 'bg-surface-pearl text-ink-muted-80 hover:text-ink'"
            @click="active = menu.key"
          >
            <span class="text-caption-strong">{{ menu.label }}</span>
          </button>
        </li>
      </ul>
    </aside>

    <!-- 右侧功能面板 -->
    <main class="flex-1 bg-canvas-parchment px-apple-section pb-apple-section pt-apple-sm">
      <PdfSites v-show="active === 'pdf'" />
      <DirectorySites v-show="active === 'directory'" />
    </main>
  </div>
</template>