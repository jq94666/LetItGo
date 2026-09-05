<script setup>
import { computed, onUnmounted, ref, shallowRef } from 'vue'
import { loadDocxModel } from '../../../utils/docxExtract.js'
import { loadLegacyDocModel } from '../../../utils/legacyDoc.js'
import { paginateBlocks } from '../../../utils/docPagination.js'
import { formatPageRanges, parsePageSpec } from '../../../utils/pageSpec.js'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })

const ACCEPT = '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword'

const fileInput = ref(null)
const dragOver = ref(false)
const parsing = ref(false)
const exporting = ref(false)
const fileName = ref('')
const fileKind = ref('') // docx | doc
const model = shallowRef(null)
const forcedBreaks = ref(new Set())
const spec = ref('')
const result = ref(null)
const error = ref('')

const baseName = computed(() => String(fileName.value).replace(/\.(docx?|dotx?)$/i, '') || '文档')

const pages = computed(() => {
  const m = model.value
  if (!m) return []
  return paginateBlocks(m.blocks, m.sections, forcedBreaks.value).map((pg, i) => ({
    no: i + 1,
    blocks: pg.blocks,
    text: previewOf(m, pg),
    pinned: pg.blocks.length ? forcedBreaks.value.has(pg.blocks[0]) : false
  }))
})

const parsed = computed(() => parsePageSpec(spec.value, pages.value.length))
const selectedSet = computed(() => new Set(parsed.value.pages))

const selectedBlocks = computed(() => {
  const picked = selectedSet.value
  const out = []
  for (const p of pages.value) if (picked.has(p.no)) out.push(...p.blocks)
  return [...new Set(out)].sort((a, b) => a - b)
})

const explicitBreaks = computed(() => {
  const m = model.value
  if (!m) return 0
  return m.blocks.reduce((n, b) => n + (b.forceBreak ? 1 : 0), 0)
})

const canExtract = computed(() => !!model.value && parsed.value.pages.length > 0 && !parsing.value)

function previewOf(m, pg) {
  let s = ''
  for (const i of pg.blocks) {
    const t = m.blocks[i]?.text || ''
    if (t) s += s ? ' ' + t : t
    if (s.length >= 120) break
  }
  return s.slice(0, 120)
}

function resetState(keepFile = false) {
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = null
  forcedBreaks.value = new Set()
  spec.value = ''
  error.value = ''
  if (!keepFile) {
    model.value?.destroy?.()
    model.value = null
    fileName.value = ''
    fileKind.value = ''
  }
}

async function handleFiles(list) {
  const f = list?.[0]
  if (!f) return
  resetState()
  parsing.value = true
  fileName.value = f.name
  try {
    const buf = await f.arrayBuffer()
    const head = new Uint8Array(buf.slice(0, 8))
    const isZip = head[0] === 0x50 && head[1] === 0x4b
    const isOle = head[0] === 0xd0 && head[1] === 0xcf
    const isRtf = head[0] === 0x7b && head[1] === 0x5c

    let next
    if (isZip) {
      next = await loadDocxModel(buf)
    } else if (isOle) {
      next = await loadLegacyDocModel(buf, baseName.value)
    } else if (isRtf) {
      throw new Error('该文件是 RTF 格式，请先用 Word / WPS 另存为 .docx 再上传')
    } else {
      throw new Error('无法识别的文件格式，请上传 .docx 或 .doc')
    }

    model.value = next
    fileKind.value = next.kind
  } catch (e) {
    model.value = null
    fileKind.value = ''
    error.value = `解析失败：${e?.message || e}`
  }
  parsing.value = false
}

function pick(e) {
  if (e.target.files?.length) handleFiles([...e.target.files])
  e.target.value = ''
}

function onDrop(e) {
  dragOver.value = false
  const list = [...(e.dataTransfer?.files ?? [])]
  if (list.length) handleFiles(list)
}

function togglePin(no) {
  const pg = pages.value.find((p) => p.no === no)
  if (!pg || no === 1 || !pg.blocks.length) return
  const idx = pg.blocks[0]
  const next = new Set(forcedBreaks.value)
  if (next.has(idx)) next.delete(idx)
  else next.add(idx)
  forcedBreaks.value = next
}

function selectAll() {
  spec.value = 'all'
}

async function extract() {
  if (!canExtract.value || exporting.value) return
  exporting.value = true
  error.value = ''
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = null
  try {
    const name = `${baseName.value}-第${formatPageRanges(parsed.value.pages)}页.docx`
    result.value = await model.value.build(selectedBlocks.value, name)
    triggerDownload(result.value)
  } catch (e) {
    error.value = `生成失败：${e?.message || e}`
  }
  exporting.value = false
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

onUnmounted(() => {
  if (result.value) URL.revokeObjectURL(result.value.url)
  model.value?.destroy?.()
})
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="Word提取页面" class="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">Word提取页面</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <!-- 上传 -->
              <input ref="fileInput" type="file" :accept="ACCEPT" class="hidden" @change="pick" />
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
                {{ parsing ? '解析中…' : '点击选择 Word 文件，或拖拽到此处' }}
              </button>

              <p v-if="error" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ error }}</p>

              <template v-if="model">
                <!-- 文件信息 -->
                <div class="flex flex-wrap items-center gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-sm">
                  <span class="rounded-pill bg-canvas px-apple-sm py-apple-xs text-fine-print text-ink shadow-hairline">
                    {{ fileKind === 'docx' ? '📘 .docx' : '📄 .doc（尽力解析）' }}
                  </span>
                  <span class="truncate text-caption-strong text-ink">{{ fileName }}</span>
                  <span class="text-fine-print text-ink-muted-48">共 {{ pages.length }} 页</span>
                  <span class="text-fine-print text-ink-muted-48">·</span>
                  <span class="text-fine-print text-ink-muted-48">
                    {{ explicitBreaks ? `检测到 ${explicitBreaks} 处显式分页` : '分页位置为排版估算' }}
                  </span>
                  <button type="button" class="ml-auto rounded-pill px-apple-sm py-apple-xs text-fine-print text-ink-muted-80 transition hover:text-red-500" @click="resetState()">移除</button>
                </div>

                <p v-if="fileKind === 'doc'" class="rounded-apple-md bg-amber-50 p-apple-sm text-caption text-amber-700">
                  旧版 .doc 仅还原文字，分页为估算结果，请在下方点击卡片校正；建议另存为 .docx 后重新上传以获得精确分页。
                </p>
                <p v-else-if="!explicitBreaks" class="rounded-apple-md bg-amber-50 p-apple-sm text-caption text-amber-700">
                  文档中没有显式分页符，分页位置由排版估算得出。若某一页切错了，点击该页卡片即可设为分页起点。
                </p>

                <!-- 页码输入 -->
                <div class="flex flex-col gap-apple-xs">
                  <label class="flex flex-col gap-apple-xs sm:flex-row sm:items-center sm:gap-apple-md">
                    <span class="whitespace-nowrap text-fine-print text-ink-muted-80">提取页码</span>
                    <input
                      v-model="spec"
                      type="text"
                      inputmode="text"
                      placeholder="例如：1,3,5-9（8- 表示到最后）"
                      class="h-[44px] w-full flex-1 rounded-apple-md border border-black/[0.08] bg-canvas px-apple-md text-apple-body text-ink placeholder:text-ink-muted-48 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
                    />
                  </label>
                  <div class="flex flex-wrap items-center gap-apple-xs">
                    <button type="button" class="rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-fine-print text-ink transition hover:text-primary active:scale-[0.97]" @click="selectAll">全选</button>
                    <button type="button" class="rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-fine-print text-ink transition hover:text-primary active:scale-[0.97]" @click="spec = '1'">仅第 1 页</button>
                    <button type="button" class="rounded-pill bg-canvas-parchment px-apple-md py-apple-xs text-fine-print text-ink transition hover:text-primary active:scale-[0.97]" @click="spec = ''">清空</button>
                    <span v-if="parsed.error" class="text-fine-print text-red-600">{{ parsed.error }}</span>
                    <span v-else-if="parsed.pages.length" class="text-fine-print text-ink-muted-48">
                      将提取 {{ parsed.pages.length }} 页：{{ formatPageRanges(parsed.pages) }}
                    </span>
                    <span v-else class="text-fine-print text-ink-muted-48">输入页码后自动高亮对应页面</span>
                  </div>
                </div>

                <!-- 页面网格 -->
                <div class="flex flex-col gap-apple-xs">
                  <p class="text-fine-print text-ink-muted-48">点击卡片可切换「在此页之前强制分页」，用于校正估算结果</p>
                  <div class="grid max-h-[320px] grid-cols-2 gap-apple-sm overflow-y-auto rounded-apple-lg bg-canvas-parchment p-apple-sm sm:grid-cols-3 lg:grid-cols-4">
                    <button
                      v-for="p in pages"
                      :key="p.no"
                      type="button"
                      class="flex flex-col gap-apple-xs rounded-apple-md border bg-canvas p-apple-sm text-left transition active:scale-[0.98]"
                      :class="selectedSet.has(p.no) ? 'border-primary ring-1 ring-primary/40' : 'border-divider-soft hover:border-primary/50'"
                      :title="p.no === 1 ? `第 ${p.no} 页` : `点击切换：在第 ${p.no} 页前强制分页`"
                      @click="togglePin(p.no)"
                    >
                      <span class="flex items-center gap-apple-xs">
                        <span class="text-caption-strong" :class="selectedSet.has(p.no) ? 'text-primary' : 'text-ink'">第 {{ p.no }} 页</span>
                        <span v-if="p.pinned" class="rounded-pill bg-primary/10 px-apple-xs py-[1px] text-micro-legal text-primary">分页点</span>
                      </span>
                      <span class="line-clamp-3 text-fine-print text-ink-muted-48">{{ p.text || '（空白页）' }}</span>
                    </button>
                  </div>
                </div>

                <!-- 生成结果 -->
                <div v-if="result" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                  <a
                    :href="result.url"
                    :download="result.name"
                    class="flex items-center gap-apple-xs rounded-apple-md bg-canvas px-apple-md py-apple-sm text-caption-strong text-primary shadow-hairline transition hover:text-ink active:scale-[0.99]"
                  >⬇️ {{ result.name }}</a>
                </div>
              </template>
            </div>

            <!-- 底部操作 -->
            <div class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span class="text-fine-print text-ink-muted-48">
                {{ model ? `共 ${pages.length} 页 · 已选 ${selectedBlocks.length ? parsed.pages.length : 0} 页` : '支持 .docx 精确提取，.doc 尽力解析' }}
              </span>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="!canExtract || exporting"
                @click="extract"
              >{{ exporting ? '生成中…' : '提取并下载' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
