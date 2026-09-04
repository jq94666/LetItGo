import { defineStore } from 'pinia'
import { ref } from 'vue'

/* 跨页启动器：主页搜索命中「应用」后，需要先切到工具页再打开工具弹窗
   （工具组件由工具页按需动态加载）。这里暂存一个待执行请求，由工具页自行消费。

   文件夹不走这里：命中文件夹时主页直接弹窗，不切换 tab。

   之所以不用路由 query：目标面板在首次访问前并未挂载，
   用一个共享的 pending 值配合 immediate 监听，既能覆盖「页面已挂载」
   也能覆盖「导航后首次挂载」两种情况，且不会在地址栏留下痕迹。 */

export const useLauncherStore = defineStore('launcher', () => {
  const pendingToolId = ref(null) // 工具 id

  function requestTool(id) {
    pendingToolId.value = id
  }
  function clearTool() {
    pendingToolId.value = null
  }

  return { pendingToolId, requestTool, clearTool }
})
