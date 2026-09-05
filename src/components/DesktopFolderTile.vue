<script setup>
import { computed } from 'vue'
import { favicons } from '../assets/icons/favicon-manifest.js'

// 网站页与工具页共用的文件夹图标：方形圆角，内部铺 1~9 个 mini 图标。
// 传入 items，每项满足以下任一形态：
//   - { key, icon }            工具 / 指定 emoji 图标的站点：emoji 图标
//   - { key, name }            网站：按 name 取 favicon，缺省时显示首字母
const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, required: true }
})

const GAP = 6 // mini 网格间距（百分比）
const preview = computed(() => props.items.slice(0, 9))
const miniCols = computed(() => Math.min(3, Math.max(1, Math.ceil(Math.sqrt(preview.value.length)))))
const miniWidth = computed(() => `calc((100% - ${(miniCols.value - 1) * GAP}%) / ${miniCols.value})`)

function iconSrc(item) {
  // 有 emoji 图标（item.icon）时不叠加 favicon，直接显示 emoji
  if (item.icon) return null
  return item.name ? favicons[item.name] : null
}
function iconText(item) {
  return item.icon ?? item.fallback ?? (item.name ? item.name.charAt(0).toUpperCase() : '')
}
</script>

<template>
  <div class="flex flex-col items-center gap-apple-xs max-[767px]:gap-[4px]">
    <!-- 文件夹：方形圆角，内部铺 mini 图标（尺寸与工具页完全一致） -->
    <div class="aspect-square w-full rounded-[24%] bg-white/70 p-[10%] shadow-hairline ring-1 ring-black/5 backdrop-blur-apple">
      <div class="flex h-full w-full flex-wrap content-center items-center justify-center" :style="{ gap: GAP + '%' }">
        <span
          v-for="item in preview"
          :key="item.key"
          class="flex aspect-square items-center justify-center rounded-[28%] bg-canvas-parchment"
          :style="{ width: miniWidth }"
        >
          <img v-if="iconSrc(item)" :src="iconSrc(item)" :alt="item.name" class="h-[62%] w-[62%] object-contain" />
          <span v-else class="flex h-[62%] w-[62%] items-center justify-center text-[13px] leading-none">{{ iconText(item) }}</span>
        </span>
      </div>
    </div>
    <p class="w-full truncate text-center text-caption text-ink-muted-80 max-[767px]:text-[11px]">{{ title }}</p>
  </div>
</template>
