<script setup>
import { ref } from 'vue'
import { favicons } from '../../../assets/icons/favicon-manifest.js'
import ContextMenu from '../../../components/ContextMenu.vue'
import { useSettingsStore } from '../../../stores/settings.js'

const props = defineProps({
  site: { type: Object, required: true }
})

const settingsStore = useSettingsStore()
const ctxMenu = ref(null)
// 右键发送到主页：钉选后该站点从各文件夹视图移除，出现在主页搜索框下方
function onContext(e) {
  ctxMenu.value?.show(e, [{ key: 'pin', label: '发送到主页' }], () => settingsStore.pinApp('site', props.site.name))
}
</script>

<template>
  <a
    :href="site.href"
    target="_blank"
    rel="noopener noreferrer"
    class="group flex flex-col items-center gap-apple-xs no-underline max-[767px]:gap-[4px]"
    @contextmenu.prevent="onContext"
  >
    <!-- APP 图标：方形圆角（类 iOS 超级椭圆） -->
    <span
      class="glass-tile flex aspect-square w-full items-center justify-center rounded-[24%] transition-transform duration-200 group-hover:scale-[1.05] group-focus-visible:ring-2 group-focus-visible:ring-primary-focus group-active:scale-[0.95]"
    >
      <img
        v-if="!site.icon && favicons[site.name]"
        :src="favicons[site.name]"
        :alt="site.name"
        class="h-[52%] w-[52%] object-contain"
      />
      <span v-else-if="site.icon" class="text-[22px] leading-none sm:text-[26px]">{{ site.icon }}</span>
      <span v-else class="text-body-strong text-ink-muted-48">{{ site.name.charAt(0).toUpperCase() }}</span>
    </span>
    <span class="line-clamp-2 w-full text-center text-caption text-ink-muted-80 max-[767px]:text-[11px]">{{ site.name }}</span>

    <ContextMenu ref="ctxMenu" />
  </a>
</template>
