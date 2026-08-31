<script setup>
import { ref } from 'vue'
import PdfSites from './components/PdfSites.vue'
import DirectorySites from './components/DirectorySites.vue'

// 侧边菜单：每个菜单项带彩色图标（badge 底色 + 图标 emoji）
const menus = [
  { key: 'pdf', label: 'PDF', icon: '📄', badge: 'bg-orange-100', accent: 'text-orange-600' },
  { key: 'directory', label: '文档', icon: '📚', badge: 'bg-blue-100', accent: 'text-blue-600' }
]

const active = ref('pdf')

// 侧边栏折叠状态：true = 收起为窄条
const collapsed = ref(false)
</script>

<template>
  <div class="flex min-h-[calc(100vh-64px)] flex-col sm:flex-row sm:items-start">
    <!-- 侧边菜单卡片：四周留白（m-apple-md），多彩图标，支持展开/收起 -->
    <aside
      class="flex shrink-0 flex-col gap-apple-sm rounded-apple-lg border border-divider-soft bg-canvas p-apple-sm shadow-hairline transition-[width] duration-300 ease-in-out sm:m-apple-md sm:gap-apple-md sm:p-apple-md"
      :class="collapsed ? 'w-full sm:w-[76px]' : 'w-full sm:w-[240px]'"
      role="navigation"
      aria-label="网站菜单"
    >
      <!-- 头部：品牌 + 折叠开关 -->
      <div class="flex items-center justify-between">
        <div v-if="!collapsed" class="flex min-w-0 items-center gap-apple-sm">
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-apple-md bg-linear-to-br from-orange-400 via-rose-400 to-violet-400 text-base"
          >🌐</span>
          <div class="min-w-0">
            <p class="truncate text-body-strong text-ink">网站导航</p>
            <p class="hidden text-fine-print text-ink-muted-48 sm:block">{{ menus.length }} 个分类</p>
          </div>
        </div>
        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-apple-md text-ink-muted-80 transition hover:bg-surface-pearl hover:text-ink active:scale-[0.95]"
          :aria-expanded="!collapsed"
          :aria-label="collapsed ? '展开菜单' : '收起菜单'"
          @click="collapsed = !collapsed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-5 w-5"
          >
            <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
          </svg>
        </button>
      </div>

      <!-- 菜单项 -->
      <ul class="flex flex-row flex-wrap gap-apple-xs sm:flex-col" role="menu">
        <li v-for="menu in menus" :key="menu.key" role="none">
          <button
            type="button"
            role="menuitem"
            :aria-current="active === menu.key ? 'page' : undefined"
            class="flex grow items-center gap-apple-sm rounded-apple-md px-apple-sm py-apple-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98] sm:m-0 sm:w-full sm:grow-0 sm:gap-apple-md sm:px-apple-sm"
            :class="[
              collapsed ? 'justify-center px-0' : 'px-apple-sm',
              active === menu.key
                ? 'bg-primary text-on-primary'
                : 'text-ink hover:bg-surface-pearl'
            ]"
            :title="menu.label"
            @click="active = menu.key"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-apple-sm text-sm"
              :class="active === menu.key ? 'bg-white/20' : menu.badge + ' ' + menu.accent"
            >
              {{ menu.icon }}
            </span>
            <span v-if="!collapsed" class="truncate text-caption-strong">{{ menu.label }}</span>
          </button>
        </li>
      </ul>
    </aside>

    <!-- 右侧功能面板 -->
    <main class="min-w-0 flex-1 px-apple-md py-apple-md sm:px-apple-section">
      <PdfSites v-show="active === 'pdf'" />
      <DirectorySites v-show="active === 'directory'" />
    </main>
  </div>
</template>