<script setup>
defineProps({
  tool: { type: Object, required: true }
})

defineEmits(['launch'])
</script>

<template>
  <button
    type="button"
    class="group flex w-full flex-col items-center gap-apple-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus rounded-apple-md"
    :aria-label="tool.label"
    @click="$emit('launch', tool)"
  >
    <!-- 工具 APP 图标：方形圆角 -->
    <span
      class="flex aspect-square w-full items-center justify-center rounded-[24%] bg-linear-to-br text-[22px] leading-none shadow-hairline ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-[1.05] group-active:scale-[0.95]"
      :class="tool.tint"
    >{{ tool.icon }}</span>
    <span class="w-full truncate text-center text-fine-print text-ink-muted-80">{{ tool.label }}</span>
  </button>
</template>
