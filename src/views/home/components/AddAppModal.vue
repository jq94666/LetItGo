<script setup>
import { computed, ref } from 'vue'
import { useSettingsStore } from '../../../stores/settings.js'

/* 主页「添加」弹窗：左侧「添加应用 / 添加文件夹」两个 tab，右侧对应表单。
   添加应用：网址 + 名称，未上传图标时按名称自动生成文字图标，支持本地上传（压缩到 128px）。 */
const open = ref(false)
const tab = ref('app') // 'app' | 'folder'
const settingsStore = useSettingsStore()

function openModal() {
  tab.value = 'app'
  resetForms()
  open.value = true
}
defineExpose({ open: openModal })

function close() {
  open.value = false
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

/* ---------- 添加应用 ---------- */
const url = ref('')
const name = ref('')
const iconData = ref(null) // 上传图标 dataURL；null = 自动文字图标
const iconInput = ref(null)
const fileError = ref('')
const appError = ref('')

// 补全协议，避免「www.example.com」打不开
const normalizedUrl = computed(() => {
  const v = url.value.trim()
  if (!v) return ''
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v) ? v : `https://${v}`
})
// 名称未填时用域名兜底展示（仍要求填写名称后才能保存）
const autoName = computed(() => normalizedUrl.value.replace(/^[a-zA-Z]+:\/\//, '').replace(/\/.*$/, ''))
const letterIcon = computed(() => (name.value.trim() || autoName.value || '?').charAt(0).toUpperCase())

function onPickIcon(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  fileError.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    fileError.value = '请选择图片文件'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    // 压到 128px 内再存 dataURL，避免撑爆 localStorage
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, 128 / Math.max(img.width, img.height))
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      iconData.value = canvas.toDataURL('image/png')
    }
    img.onerror = () => {
      fileError.value = '图片读取失败'
    }
    img.src = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

function clearIcon() {
  iconData.value = null
}

function submitApp() {
  if (!normalizedUrl.value) {
    appError.value = '请输入网址'
    return
  }
  if (!name.value.trim()) {
    appError.value = '请输入名称'
    return
  }
  settingsStore.addCustomApp({ id: uid(), name: name.value.trim(), url: normalizedUrl.value, icon: iconData.value })
  close()
}

/* ---------- 添加文件夹 ---------- */
const folderName = ref('')
const folderError = ref('')

function submitFolder() {
  const v = folderName.value.trim()
  if (!v) {
    folderError.value = '请输入文件夹名称'
    return
  }
  settingsStore.addCustomFolder({ id: uid(), name: v })
  close()
}

function resetForms() {
  url.value = ''
  name.value = ''
  iconData.value = null
  fileError.value = ''
  appError.value = ''
  folderName.value = ''
  folderError.value = ''
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="close">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="添加" class="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">添加</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="close">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容：左侧 tab / 右侧表单（中间间隔线：移动端横线下分隔，桌面端竖线分隔） -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:flex-row sm:gap-apple-lg sm:p-apple-lg">
              <!-- 左侧 tab 面板 -->
              <div class="flex shrink-0 gap-apple-xs border-b border-divider-soft pb-apple-md sm:flex-col sm:border-b-0 sm:border-r sm:pb-0 sm:pr-apple-md" role="tablist" aria-label="添加类型">
                <button
                  type="button"
                  role="tab"
                  :aria-selected="tab === 'app'"
                  class="rounded-apple-md px-apple-md py-apple-sm text-left text-caption-strong transition active:scale-[0.97]"
                  :class="tab === 'app' ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="tab = 'app'"
                >添加应用</button>
                <button
                  type="button"
                  role="tab"
                  :aria-selected="tab === 'folder'"
                  class="rounded-apple-md px-apple-md py-apple-sm text-left text-caption-strong transition active:scale-[0.97]"
                  :class="tab === 'folder' ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="tab = 'folder'"
                >添加文件夹</button>
              </div>

              <!-- 右侧功能面板：grid 同格叠放，隐藏侧用 invisible（仍占位），高度恒为两面板较高者，切 tab 弹窗高度不变 -->
              <div class="grid min-w-0 flex-1 sm:pl-apple-md">
                <!-- 添加应用 -->
                <div class="col-start-1 row-start-1 flex flex-col gap-apple-md" :class="tab === 'app' ? 'visible' : 'invisible'">
                  <div class="flex items-center gap-apple-sm">
                    <label for="add-app-url" class="shrink-0 text-caption-strong text-ink-muted-80">网址</label>
                    <input
                      id="add-app-url"
                      v-model="url"
                      type="text"
                      inputmode="url"
                      placeholder="如 www.example.com 或 https://example.com"
                      spellcheck="false"
                      autocomplete="off"
                      class="min-w-0 flex-1 rounded-apple-md border border-hairline bg-surface-pearl px-apple-md py-apple-sm text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
                    />
                  </div>

                  <div class="flex items-center gap-apple-sm">
                    <label for="add-app-name" class="shrink-0 text-caption-strong text-ink-muted-80">名称</label>
                    <input
                      id="add-app-name"
                      v-model="name"
                      type="text"
                      maxlength="20"
                      placeholder="显示在图标下方（未填网址名时文字图标按域名生成）"
                      class="min-w-0 flex-1 rounded-apple-md border border-hairline bg-surface-pearl px-apple-md py-apple-sm text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
                    />
                  </div>

                  <!-- 图标预览：本地上传优先，否则按名称自动生成文字图标 -->
                  <div class="flex items-center gap-apple-md">
                    <span class="glass-tile flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[24%]">
                      <img v-if="iconData" :src="iconData" alt="图标预览" class="h-full w-full object-cover" />
                      <span v-else class="text-body-strong text-ink-muted-80">{{ letterIcon }}</span>
                    </span>
                    <div class="flex min-w-0 flex-col gap-apple-xs">
                      <p class="text-fine-print text-ink-muted-48">{{ iconData ? '使用上传的图标' : '未上传图标时按名称自动生成文字图标' }}</p>
                      <div class="flex gap-apple-xs">
                        <button type="button" class="rounded-pill bg-canvas-parchment px-apple-sm py-apple-xs text-fine-print text-ink transition hover:bg-black/5 active:scale-[0.95]" @click="iconInput.click()">上传图标</button>
                        <button v-if="iconData" type="button" class="rounded-pill bg-canvas-parchment px-apple-sm py-apple-xs text-fine-print text-ink transition hover:bg-black/5 active:scale-[0.95]" @click="clearIcon">移除</button>
                      </div>
                      <input ref="iconInput" type="file" accept="image/*" class="hidden" @change="onPickIcon" />
                    </div>
                  </div>

                  <p v-if="fileError" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ fileError }}</p>
                  <p v-if="appError" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ appError }}</p>

                  <div class="mt-auto flex justify-end">
                    <button type="button" class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition active:scale-[0.97]" @click="submitApp">添加</button>
                  </div>
                </div>

                <!-- 添加文件夹 -->
                <div class="col-start-1 row-start-1 flex flex-col gap-apple-md" :class="tab === 'folder' ? 'visible' : 'invisible'">
                  <div class="flex items-center gap-apple-sm">
                    <label for="add-folder-name" class="shrink-0 text-caption-strong text-ink-muted-80">文件夹名称</label>
                    <input
                      id="add-folder-name"
                      v-model="folderName"
                      type="text"
                      maxlength="20"
                      placeholder="显示在主页的文件夹名"
                      class="min-w-0 flex-1 rounded-apple-md border border-hairline bg-surface-pearl px-apple-md py-apple-sm text-apple-body text-ink placeholder:text-ink-muted-48 focus:border-primary-focus focus:outline-none focus:ring-2 focus:ring-primary-focus/30"
                    />
                  </div>

                  <p v-if="folderError" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ folderError }}</p>

                  <div class="mt-auto flex justify-end">
                    <button type="button" class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition active:scale-[0.97]" @click="submitFolder">添加</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
