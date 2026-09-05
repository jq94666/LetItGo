<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { PDFDocument } from 'pdf-lib'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

// files: { id, name, bytes, pageCount }
const files = ref([])
const generating = ref(false)
const progress = ref('')
const result = ref(null) // { name, url }
const errors = ref([])
const fileInput = ref(null)
const dragOver = ref(false)
let uid = 0

const totalPages = computed(() => files.value.reduce((n, f) => n + f.pageCount, 0))
const canMerge = computed(() => files.value.length > 1 && !generating.value)

function clearErrors() {
  errors.value = []
}

function revokeResult() {
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = null
}

/* ---------- 上传 ---------- */

async function addFiles(list) {
  clearErrors()
  for (const f of list) {
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) {
      errors.value.push(`已跳过 ${f.name}（仅支持 PDF）`)
      continue
    }
    try {
      const bytes = new Uint8Array(await f.arrayBuffer())
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: false })
      files.value.push({ id: ++uid, name: f.name, bytes, pageCount: doc.getPageCount() })
    } catch (e) {
      errors.value.push(`无法解析 ${f.name}（可能已加密或损坏）`)
    }
  }
}

function pick(e) {
  if (e.target.files?.length) {
    revokeResult()
    addFiles([...e.target.files])
  }
  e.target.value = ''
}

function onDrop(e) {
  dragOver.value = false
  const list = [...(e.dataTransfer?.files ?? [])]
  if (list.length) {
    revokeResult()
    addFiles(list)
  }
}

function removeFile(id) {
  const idx = files.value.findIndex((f) => f.id === id)
  if (idx < 0) return
  files.value.splice(idx, 1)
  revokeResult()
}

function moveFile(id, step) {
  const idx = files.value.findIndex((f) => f.id === id)
  const to = idx + step
  if (idx < 0 || to < 0 || to >= files.value.length) return
  const [it] = files.value.splice(idx, 1)
  files.value.splice(to, 0, it)
  revokeResult()
}

function moveTop(id) {
  const idx = files.value.findIndex((f) => f.id === id)
  if (idx <= 0) return
  const [it] = files.value.splice(idx, 1)
  files.value.unshift(it)
  revokeResult()
}

function moveBottom(id) {
  const idx = files.value.findIndex((f) => f.id === id)
  if (idx < 0 || idx === files.value.length - 1) return
  const [it] = files.value.splice(idx, 1)
  files.value.push(it)
  revokeResult()
}

/* ---------- 合并 ---------- */

async function generate() {
  if (!canMerge.value) return
  generating.value = true
  clearErrors()
  revokeResult()
  try {
    const out = await PDFDocument.create()
    const total = files.value.length
    for (let i = 0; i < total; i++) {
      const f = files.value[i]
      progress.value = `正在合并 ${i + 1}/${total}：${f.name}…`
      try {
        const src = await PDFDocument.load(f.bytes.slice(), { ignoreEncryption: false })
        const pages = await out.copyPages(src, src.getPageIndices())
        pages.forEach((p) => out.addPage(p))
      } catch (e) {
        errors.value.push(`${f.name} 合并失败：${e.message}`)
      }
    }
    const bytes = await out.save()
    const base = String(files.value[0].name).replace(/\.pdf$/i, '') || 'PDF'
    const item = { name: `${base}等${files.value.length}个-合并${totalPages.value}页.pdf`, url: URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })) }
    result.value = item
    triggerDownload(item)
  } catch (e) {
    errors.value.push(`生成失败：${e.message}`)
  }
  progress.value = ''
  generating.value = false
}

function triggerDownload(item) {
  const a = document.createElement('a')
  a.href = item.url
  a.download = item.name
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

onUnmounted(revokeResult)
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="PDF合并" class="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">PDF合并</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <!-- 上传 -->
              <input ref="fileInput" type="file" accept="application/pdf,.pdf" multiple class="hidden" @change="pick" />
              <button
                type="button"
                class="flex flex-col items-center gap-apple-xs rounded-apple-lg border border-dashed py-apple-lg text-caption-strong transition active:scale-[0.99]"
                :class="dragOver ? 'border-primary bg-primary/5 text-ink' : 'border-black/15 text-ink-muted-80 hover:border-primary hover:bg-primary/5 hover:text-ink'"
                @click="fileInput.click()"
                @dragover.prevent="dragOver = true"
                @dragenter.prevent="dragOver = true"
                @dragleave.prevent="dragOver = false"
                @drop.prevent="onDrop"
              >
                <span class="text-2xl">📄</span>
                点击选择 PDF 文件（可多选），或拖拽到此处
              </button>

              <p v-for="(err, i) in errors" :key="i" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ err }}</p>

              <!-- 文件列表（顺序即合并顺序） -->
              <div v-if="files.length" class="flex flex-col gap-apple-xs">
                <p class="text-fine-print text-ink-muted-48">合并顺序 = 列表顺序，可调整：</p>
                <ul class="flex flex-col gap-apple-xs">
                  <li
                    v-for="(f, i) in files"
                    :key="f.id"
                    class="flex items-center gap-apple-xs rounded-apple-md bg-canvas-parchment px-apple-sm py-apple-xs"
                  >
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas text-fine-print text-ink-muted-48 shadow-hairline">{{ i + 1 }}</span>
                    <span class="min-w-0 flex-1 truncate text-caption-strong text-ink">{{ f.name }}</span>
                    <span class="shrink-0 text-fine-print text-ink-muted-48">{{ f.pageCount }}页</span>
                    <div class="flex shrink-0 items-center gap-0.5">
                      <button type="button" aria-label="上移" title="上移" class="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted-80 transition hover:bg-canvas hover:text-ink active:scale-[0.9] disabled:opacity-30" :disabled="i === 0" @click="moveFile(f.id, -1)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m18 15-6-6-6 6" /></svg>
                      </button>
                      <button type="button" aria-label="下移" title="下移" class="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted-80 transition hover:bg-canvas hover:text-ink active:scale-[0.9] disabled:opacity-30" :disabled="i === files.length - 1" @click="moveFile(f.id, 1)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                      <button type="button" aria-label="移到开头" title="移到开头" class="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted-48 transition hover:bg-canvas hover:text-ink active:scale-[0.9] disabled:opacity-30" :disabled="i === 0" @click="moveTop(f.id)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M17 14 12 9l-5 5" /><path d="M17 19 12 14l-5 5" /></svg>
                      </button>
                      <button type="button" aria-label="移到最后" title="移到最后" class="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted-48 transition hover:bg-canvas hover:text-ink active:scale-[0.9] disabled:opacity-30" :disabled="i === files.length - 1" @click="moveBottom(f.id)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="m7 10 5 5 5-5" /><path d="m7 5 5 5 5-5" /></svg>
                      </button>
                      <button type="button" aria-label="移除" title="移除" class="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted-80 transition hover:bg-canvas hover:text-red-500 active:scale-[0.9]" @click="removeFile(f.id)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                      </button>
                    </div>
                  </li>
                </ul>
              </div>

              <!-- 生成结果 -->
              <div v-if="result" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                <a
                  :href="result.url"
                  :download="result.name"
                  class="flex items-center gap-apple-xs rounded-apple-md bg-canvas px-apple-md py-apple-sm text-caption-strong text-primary shadow-hairline transition hover:text-ink active:scale-[0.99]"
                >⬇️ {{ result.name }}</a>
              </div>
            </div>

            <!-- 底部操作 -->
            <div class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span class="text-fine-print text-ink-muted-48">
                {{ files.length ? `${files.length} 个文件 · 共 ${totalPages} 页` : '至少上传 2 个 PDF，按顺序合并为一个文件' }}
              </span>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canMerge"
                @click="generate"
              >{{ generating ? (progress || '合并中…') : '合并并下载' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
