<script setup>
import { favicons } from '../../../assets/icons/favicon-manifest.js'

defineProps({
  site: { type: Object, required: true }
})
</script>

<template>
  <a
    :href="site.href"
    target="_blank"
    rel="noopener noreferrer"
    class="flex flex-col items-center gap-apple-xs rounded-apple-lg bg-canvas p-apple-sm transition-all duration-200 hover:shadow-hairline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] no-underline"
  >
    <!-- 统一白色毛玻璃圆片 -->
    <span class="flex h-12 w-12 items-center justify-center rounded-full bg-white/70 shadow-hairline ring-1 ring-black/[0.06] backdrop-blur-apple">
      <img
        v-if="favicons[site.name]"
        :src="favicons[site.name]"
        :alt="site.name + ' 图标'"
        class="h-7 w-7 object-contain"
      />
      <span v-else class="text-caption-strong text-ink-muted-48">{{ site.name.charAt(0).toUpperCase() }}</span>
    </span>
    <span class="text-caption-strong text-ink">{{ site.name }}</span>
  </a>
</template>