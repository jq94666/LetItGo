<script setup>
/* 目录：按部门分组的站点链接集合，点击顶部目录可跳转到对应部门 */
const groups = [
  {
    id: 'document-search',
    label: '文档检索',
    sites: [{ name: 'anytxt', href: 'https://anytxt.net/' }]
  },
  {
    id: 'file-transfer',
    label: '文件传输',
    sites: [{ name: 'localsend', href: 'https://localsend.org/zh-CN/download' }]
  }
]

function jump(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="flex flex-col gap-apple-xl">
    <!-- 顶部目录：点击跳转到对应部门 -->
    <nav class="flex flex-wrap items-center gap-apple-xs" aria-label="目录">
      <button
        v-for="group in groups"
        :key="group.id"
        type="button"
        class="rounded-apple-md bg-surface-pearl px-apple-lg py-apple-sm text-caption-strong text-ink-muted-80 transition-all duration-200 hover:text-ink active:scale-[0.98]"
        @click="jump(group.id)"
      >
        {{ group.label }}
      </button>
    </nav>

    <!-- 各部门内容 -->
    <section
      v-for="group in groups"
      :id="group.id"
      :key="group.id"
      class="scroll-mt-apple-xl"
      :aria-label="group.label"
    >
      <h2 class="mb-apple-md text-body-strong text-ink">{{ group.label }}</h2>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-apple-md">
        <a
          v-for="site in group.sites"
          :key="site.name"
          :href="site.href"
          target="_blank"
          rel="noopener noreferrer"
          class="flex flex-col items-center gap-apple-xs rounded-apple-lg bg-canvas p-apple-sm text-center transition-all duration-200 hover:shadow-hairline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97]"
        >
          <!-- 图标占位：待用户自行定义 -->
          <span
            class="flex h-12 w-12 items-center justify-center rounded-full bg-surface-tile-2"
          ></span>
          <span class="text-caption-strong text-ink">{{ site.name }}</span>
        </a>
      </div>
    </section>
  </div>
</template>