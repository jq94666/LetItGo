<script setup>
import { directoryGroups } from '../../../data/sites.js'
import SiteCard from './SiteCard.vue'

function jump(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="flex flex-col gap-apple-xl">
    <!-- 顶部目录：点击跳转到对应部门 -->
    <nav class="flex flex-wrap items-center gap-apple-xs" aria-label="目录">
      <button
        v-for="group in directoryGroups"
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
      v-for="group in directoryGroups"
      :id="group.id"
      :key="group.id"
      class="scroll-mt-apple-xl"
      :aria-label="group.label"
    >
      <h2 class="mb-apple-md text-body-strong text-ink">{{ group.label }}</h2>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-apple-md">
        <SiteCard v-for="site in group.sites" :key="site.name" :site="site" />
      </div>
    </section>
  </div>
</template>