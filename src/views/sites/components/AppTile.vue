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
    class="group flex flex-col items-center gap-apple-xs no-underline"
  >
    <!-- APP 图标：方形圆角（类 iOS 超级椭圆） -->
    <span
      class="flex aspect-square w-full items-center justify-center rounded-[24%] bg-white/85 shadow-hairline ring-1 ring-black/5 transition-transform duration-200 group-hover:scale-[1.05] group-focus-visible:ring-2 group-focus-visible:ring-primary-focus group-active:scale-[0.95]"
    >
      <img
        v-if="favicons[site.name]"
        :src="favicons[site.name]"
        :alt="site.name"
        class="h-[52%] w-[52%] object-contain"
      />
      <span v-else class="text-body-strong text-ink-muted-48">{{ site.name.charAt(0).toUpperCase() }}</span>
    </span>
    <span class="line-clamp-2 w-full text-center text-fine-print text-ink-muted-80">{{ site.name }}</span>
  </a>
</template>
