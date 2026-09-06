<script setup>
import { onBeforeUnmount, ref } from 'vue'

/* 轻量右键菜单：Teleport 到 body，出现在指针处；点击外部 / Esc / 选中后关闭。
   用法：<ContextMenu ref="menu" />，menu.show(event, [{ key, label }], (key) => { ... }) */
const open = ref(false)
const pos = ref({ x: 0, y: 0 })
const items = ref([])
const rootEl = ref(null)
let onSelect = null

function show(e, list, select) {
  items.value = list
  onSelect = select
  // 按菜单近似尺寸夹紧视口，避免贴边溢出
  pos.value = {
    x: Math.max(4, Math.min(e.clientX, window.innerWidth - 148)),
    y: Math.max(4, Math.min(e.clientY, window.innerHeight - list.length * 40 - 20))
  }
  open.value = true
  document.addEventListener('pointerdown', onDocDown, true)
  document.addEventListener('keydown', onKey, true)
}

function pick(key) {
  close()
  onSelect?.(key)
}

function close() {
  open.value = false
  removeListeners()
}

function onDocDown(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) close()
}

function onKey(e) {
  if (e.key === 'Escape') close()
}

function removeListeners() {
  document.removeEventListener('pointerdown', onDocDown, true)
  document.removeEventListener('keydown', onKey, true)
}

onBeforeUnmount(removeListeners)
defineExpose({ show })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="rootEl"
      class="glass-panel fixed z-[70] min-w-[132px] rounded-apple-md p-apple-xs shadow-product"
      :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      role="menu"
    >
      <button
        v-for="it in items"
        :key="it.key"
        type="button"
        role="menuitem"
        class="block w-full truncate rounded-apple-md px-apple-md py-apple-xs text-left text-caption text-ink transition-colors hover:bg-canvas-parchment"
        @click="pick(it.key)"
      >{{ it.label }}</button>
    </div>
  </Teleport>
</template>
