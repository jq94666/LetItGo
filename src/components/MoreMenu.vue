<script setup>
import { ref } from 'vue'
import pkg from '../../package.json'
import { SEARCH_ENGINES, useSettingsStore } from '../stores/settings.js'

// 底部导航的「更多」按钮：点击弹出上拉菜单，内含「设置 / 关于」
const props = defineProps({
  settings: { type: Object, required: true }
})
const emit = defineEmits(['reset'])

const open = ref(false)
const view = ref('menu') // menu | settings | about

// 全局偏好（默认搜索引擎等），与传入的桌面布局设置相互独立
const settingsStore = useSettingsStore()
const engines = SEARCH_ENGINES

function openMenu() {
  view.value = 'menu'
  open.value = true
}
function close() {
  open.value = false
}
function go(v) {
  view.value = v
}
function restoreOrder() {
  props.settings.resetOrder?.()
}
function resetLayout() {
  emit('reset')
  close()
}

const aboutTitle = 'LuLu 导航'
const aboutText =
  '个人网址与工具导航页：整理常用站点与日常小工具，全部在浏览器本地运行，数据保存在本机。'
</script>

<template>
  <div class="relative shrink-0">
    <button
      type="button"
      class="flex flex-col items-center gap-[3px] rounded-pill bg-white/70 px-apple-sm py-[7px] text-ink-muted-80 shadow-hairline ring-1 ring-black/5 backdrop-blur-apple transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.95]"
      aria-label="更多"
      @click="openMenu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-[15px] w-[15px] leading-none">
        <circle cx="5" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="19" cy="12" r="1.6" />
      </svg>
      <span class="text-[10px] leading-none">更多</span>
    </button>

    <!-- 上拉菜单 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-if="open"
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-sm sm:items-center"
          @click.self="close"
        >
          <Transition
            appear
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="translate-y-6 opacity-0 sm:translate-y-3 sm:scale-95"
            leave-active-class="transition duration-150 ease-in"
            leave-to-class="translate-y-6 opacity-0 sm:translate-y-3 sm:scale-95"
          >
            <div
              role="dialog"
              aria-modal="true"
              :aria-label="view === 'menu' ? '更多' : view === 'settings' ? '设置' : '关于'"
              class="mx-apple-sm flex w-[calc(100%-2*var(--spacing-apple-sm))] max-w-md flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product ring-1 ring-black/5 pb-[max(10px,env(safe-area-inset-bottom))] sm:mx-0"
            >
              <!-- 顶部拖动指示条 -->
              <div class="mx-auto mt-apple-xs h-[4px] w-9 shrink-0 rounded-full bg-black/15" />

              <!-- 标题栏 -->
              <div class="flex items-center gap-apple-xs px-apple-md pt-apple-sm">
                <button
                  v-if="view !== 'menu'"
                  type="button"
                  aria-label="返回"
                  class="-ml-1 flex h-8 w-8 items-center justify-center rounded-full text-ink-muted-80 transition hover:bg-black/5 hover:text-ink active:scale-[0.9]"
                  @click="view = 'menu'"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <p class="flex-1 text-[15px] font-semibold text-ink">
                  {{ view === 'menu' ? '更多' : view === 'settings' ? '设置' : '关于' }}
                </p>
                <button
                  type="button"
                  aria-label="关闭"
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 hover:text-ink active:scale-[0.9]"
                  @click="close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>

              <!-- 主菜单 -->
              <div v-if="view === 'menu'" class="flex flex-col gap-apple-xs px-apple-md py-apple-md">
                <button
                  type="button"
                  class="flex w-full items-center gap-apple-sm rounded-apple-md bg-canvas-parchment p-apple-sm text-left transition hover:bg-hairline active:scale-[0.99]"
                  @click="view = 'settings'"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-apple-md bg-canvas text-ink shadow-hairline ring-1 ring-black/5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                  <span class="flex-1 text-[15px] font-semibold text-ink">设置</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0 text-ink-muted-48"><path d="m9 18 6-6-6-6" /></svg>
                </button>

                <button
                  type="button"
                  class="flex w-full items-center gap-apple-sm rounded-apple-md bg-canvas-parchment p-apple-sm text-left transition hover:bg-hairline active:scale-[0.99]"
                  @click="view = 'about'"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-apple-md bg-canvas text-ink shadow-hairline ring-1 ring-black/5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                  </span>
                  <span class="flex-1 text-[15px] font-semibold text-ink">关于</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0 text-ink-muted-48"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </div>

              <!-- 设置面板 -->
              <div v-else-if="view === 'settings'" class="flex flex-col gap-apple-md px-apple-md py-apple-md">
                <!-- 默认搜索引擎（全局偏好，跨页面生效） -->
                <div class="flex flex-col gap-apple-sm">
                  <div class="min-w-0">
                    <p class="text-[14px] text-ink-muted-80">默认搜索引擎</p>
                    <p class="text-[12px] text-ink-muted-48">主页搜索框使用 · 当前「{{ settingsStore.currentEngine().label }}」</p>
                  </div>
                  <div class="flex gap-apple-sm">
                    <button
                      v-for="eng in engines"
                      :key="eng.id"
                      type="button"
                      class="flex-1 rounded-pill py-apple-xs text-[13px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97]"
                      :class="settingsStore.searchEngine === eng.id ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                      :aria-pressed="settingsStore.searchEngine === eng.id"
                      @click="settingsStore.searchEngine = eng.id"
                    >{{ eng.label }}</button>
                  </div>
                </div>

                <div class="flex items-center justify-between gap-apple-sm">
                  <div class="min-w-0">
                    <p class="text-[14px] text-ink-muted-80">自动排列</p>
                    <p class="text-[12px] text-ink-muted-48">{{ settings.auto ? '按行列顺序紧凑排布' : '可拖动到任意位置' }}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="settings.auto"
                    aria-label="自动排列"
                    class="relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
                    :class="settings.auto ? 'bg-primary' : 'bg-hairline'"
                    @click="settings.auto = !settings.auto"
                  >
                    <span
                      class="absolute top-[2px] h-5 w-5 rounded-full bg-white shadow-hairline transition-all duration-200"
                      :class="settings.auto ? 'left-[22px]' : 'left-[2px]'"
                    />
                  </button>
                </div>

                <button
                  v-if="settings.auto"
                  type="button"
                  :disabled="!settings.order || settings.order.length === 0"
                  class="w-full rounded-apple-md bg-canvas-parchment py-apple-xs text-[14px] text-ink-muted-80 transition hover:text-ink active:scale-[0.98] disabled:cursor-default disabled:opacity-40 disabled:active:scale-100"
                  @click="restoreOrder"
                >
                  恢复默认顺序
                </button>
                <button
                  v-else
                  type="button"
                  class="w-full rounded-apple-md bg-canvas-parchment py-apple-xs text-[14px] text-ink-muted-80 transition hover:text-ink active:scale-[0.98]"
                  @click="resetLayout"
                >
                  整理图标（恢复网格排列）
                </button>
              </div>

              <!-- 关于 -->
              <div v-else class="flex flex-col items-center gap-apple-sm px-apple-md py-apple-lg text-center">
                <span class="flex h-16 w-16 items-center justify-center rounded-[24%] bg-linear-to-br from-primary to-indigo-500 text-3xl shadow-hairline">🗂️</span>
                <div>
                  <p class="text-[17px] font-semibold text-ink">{{ aboutTitle }}</p>
                  <p class="text-[12px] text-ink-muted-48">v{{ pkg.version }} · {{ pkg.name }}</p>
                </div>
                <p class="max-w-[280px] text-[14px] leading-normal text-ink-muted-80">{{ aboutText }}</p>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
