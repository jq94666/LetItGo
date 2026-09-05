<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 文件夹标题
  title: { type: String, required: true }
})

const emit = defineEmits(['close'])
</script>

<template>
  <div class="absolute inset-0 z-20">
    <div class="absolute inset-0 bg-black/25 backdrop-blur-[3px]" @click="emit('close')" />

    <div
      class="folder-card glass-panel absolute left-1/2 top-1/2 max-h-[78%] w-[min(340px,86%)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] p-apple-md sm:w-[min(440px,86%)] md:w-[min(560px,88%)] lg:w-[min(680px,90%)]"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="flex items-start justify-between gap-apple-sm">
        <div class="min-w-0">
          <p class="truncate text-body-strong text-ink">{{ title }}</p>
        </div>
        <button
          type="button"
          aria-label="关闭"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
          @click="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div class="mt-apple-md grid grid-cols-3 gap-apple-md md:grid-cols-4 lg:grid-cols-5">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 文件夹弹出动画：遮罩淡入 + 卡片从文件夹位置缩放展开 */
.folder-enter-active,
.folder-leave-active {
  transition: opacity 0.26s ease;
}
.folder-enter-from,
.folder-leave-to {
  opacity: 0;
}
.folder-enter-active .folder-card,
.folder-leave-active .folder-card {
  transition: transform 0.34s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
}
.folder-enter-from .folder-card,
.folder-leave-to .folder-card {
  transform: translate(-50%, -50%) scale(0.25);
  opacity: 0;
}

/* 文件夹弹窗卡片隐藏右侧滚动条，保留滚动能力 */
.folder-card {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* 旧版 Edge / IE */
}
.folder-card::-webkit-scrollbar {
  display: none; /* Chrome / Safari */
}
</style>
