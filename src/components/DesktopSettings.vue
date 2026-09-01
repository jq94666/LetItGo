<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

// 直接接收底部导航与页面共享的响应式设置对象（来自 desktopStore）
const props = defineProps({
  settings: { type: Object, required: true }
})
const emit = defineEmits(['reset'])

const open = ref(false)
const rootEl = ref(null)

function step(key, delta, min, max) {
  const next = Math.min(max, Math.max(min, props.settings[key] + delta))
  props.settings[key] = next
}

function reset() {
  emit('reset')
  open.value = false
}

// 点击面板外部时关闭
let cleanup = null
watch(open, (v) => {
  if (v) {
    const onDoc = (e) => {
      if (!rootEl.value?.contains(e.target)) open.value = false
    }
    document.addEventListener('pointerdown', onDoc)
    cleanup = () => document.removeEventListener('pointerdown', onDoc)
  } else {
    cleanup?.()
    cleanup = null
  }
})
onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div ref="rootEl" class="relative shrink-0">
    <button
      type="button"
      class="flex flex-col items-center gap-[3px] rounded-pill bg-white/70 px-apple-sm py-[7px] text-ink-muted-80 shadow-hairline ring-1 ring-black/5 backdrop-blur-apple transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.95]"
      :aria-expanded="open"
      aria-label="屏幕设置"
      @click="open = !open"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-[15px] w-[15px] leading-none">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span class="text-[10px] leading-none">设置</span>
    </button>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 scale-95 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-1 scale-95 opacity-0"
    >
      <div
        v-if="open"
        role="dialog"
        aria-label="屏幕设置"
        class="absolute bottom-[56px] right-0 z-30 w-[236px] origin-bottom rounded-apple-lg bg-white/90 p-apple-md shadow-product ring-1 ring-black/5 backdrop-blur-apple"
        @click.stop
      >
        <p class="text-caption-strong text-ink">屏幕容量</p>
        <p class="mt-apple-xs text-fine-print text-ink-muted-48">设置屏幕可容纳的图标行列数</p>

        <!-- 排列方式 -->
        <div class="mt-apple-md flex items-center justify-between gap-apple-sm">
          <div class="min-w-0">
            <p class="text-caption text-ink-muted-80">自动排列</p>
            <p class="text-fine-print text-ink-muted-48">{{ settings.auto ? '按行列顺序紧凑排布' : '可拖动到任意位置' }}</p>
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

        <div class="mt-apple-md flex flex-col gap-apple-sm">
          <div class="flex items-center justify-between">
            <span class="text-caption text-ink-muted-80">列数</span>
            <span class="flex items-center gap-apple-xs">
              <button type="button" aria-label="减少列数" class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink transition hover:bg-hairline active:scale-[0.9]" @click="step('cols', -1, 2, 8)">−</button>
              <span class="w-6 text-center text-caption-strong text-ink">{{ settings.cols }}</span>
              <button type="button" aria-label="增加列数" class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink transition hover:bg-hairline active:scale-[0.9]" @click="step('cols', 1, 2, 8)">+</button>
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-caption text-ink-muted-80">行数</span>
            <span class="flex items-center gap-apple-xs">
              <button type="button" aria-label="减少行数" class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink transition hover:bg-hairline active:scale-[0.9]" @click="step('rows', -1, 2, 10)">−</button>
              <span class="w-6 text-center text-caption-strong text-ink">{{ settings.rows }}</span>
              <button type="button" aria-label="增加行数" class="flex h-7 w-7 items-center justify-center rounded-full bg-canvas-parchment text-ink transition hover:bg-hairline active:scale-[0.9]" @click="step('rows', 1, 2, 10)">+</button>
            </span>
          </div>
        </div>

        <button
          v-if="!settings.auto"
          type="button"
          class="mt-apple-md w-full rounded-apple-md bg-canvas-parchment py-apple-xs text-button-utility text-ink-muted-80 transition hover:text-ink active:scale-[0.98]"
          @click="reset"
        >
          整理图标（恢复网格排列）
        </button>
      </div>
    </Transition>
  </div>
</template>
