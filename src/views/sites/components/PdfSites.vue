<script setup>
/* PDF 相关站点工具 */
const sites = [
  { name: 'pdfgear', href: 'https://www.pdfgear.com/zh/' },
  { name: 'pdf24', href: 'https://tools.pdf24.org/zh/' }
]
</script>

<template>
  <div class="grid grid-cols-2 gap-apple-md sm:grid-cols-3 lg:grid-cols-4">
    <a
      v-for="site in sites"
      :key="site.name"
      :href="site.href"
      target="_blank"
      rel="noopener noreferrer"
      class="flex flex-col items-center gap-apple-xs rounded-apple-lg bg-canvas p-apple-sm transition-all duration-200 hover:shadow-hairline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] no-underline"
    >
      <!-- 图标占位：待用户自行定义 -->
      <span
        class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-tile-2"
      ></span>
      <span class="text-caption-strong text-ink">{{ site.name }}</span>
    </a>
  </div>
</template>