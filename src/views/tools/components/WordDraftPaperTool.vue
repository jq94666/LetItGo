<script setup>
import { computed, ref } from 'vue'
import { BorderStyle, Document, HeightRule, Packer, Paragraph, Table, TableLayoutType, TableCell, TableRow, WidthType } from 'docx'

const open = ref(false)
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })
const type = ref('letter') // letter 信纸 | grid 方格纸
const letterLines = ref(24) // 信纸行数
const lineGap = ref(10) // 行距 mm
const cellSize = ref(8) // 方格边长 mm
const gridCols = ref(20) // 每行列数
const gridRows = ref(30) // 总行数

const MM = 56.6929 // 1mm = twips
const CONTENT_W_MM = 180 // A4 210mm - 左右各 15mm 页边距

const gridWidthMm = computed(() => cellSize.value * gridCols.value)
const overflow = computed(() => type.value === 'grid' && gridWidthMm.value > CONTENT_W_MM)

/* 预览（按 1mm ≈ 2px 缩放） */
const previewLineGap = computed(() => `${lineGap.value * 2}px`)
const previewCell = computed(() => `${cellSize.value * 2}px`)
const previewRows = computed(() => Math.min(gridRows.value, 10))

function generate() {
  const noB = { style: BorderStyle.NONE, size: 0, color: 'auto' }
  const line = { style: BorderStyle.SINGLE, size: 4, color: '9CA3AF' }

  let table
  if (type.value === 'letter') {
    table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: Array.from({ length: clamp(letterLines.value, 5, 80) }, () => new TableRow({
        height: { value: Math.round(clamp(lineGap.value, 6, 20) * MM), rule: HeightRule.EXACT },
        children: [new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: noB, left: noB, right: noB, bottom: line },
          children: [new Paragraph('')]
        })]
      }))
    })
  } else {
    const cellTw = Math.round(clamp(cellSize.value, 4, 20) * MM)
    const cols = clamp(gridCols.value, 1, 40)
    const rows = clamp(gridRows.value, 1, 200)
    table = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: cellTw * cols, type: WidthType.DXA },
      columnWidths: Array(cols).fill(cellTw),
      rows: Array.from({ length: rows }, () => new TableRow({
        height: { value: cellTw, rule: HeightRule.EXACT },
        children: Array.from({ length: cols }, () => new TableCell({
          width: { size: cellTw, type: WidthType.DXA },
          borders: { top: line, bottom: line, left: line, right: line },
          children: [new Paragraph('')]
        }))
      }))
    })
  }

  return new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 851, bottom: 851, left: 851, right: 851 } } },
      children: [table]
    }]
  })
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, Number(v) || min))

const exporting = ref(false)
const result = ref(null)

async function exportDocx() {
  if (overflow.value || exporting.value) return
  exporting.value = true
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = null
  try {
    const blob = await Packer.toBlob(generate())
    result.value = { name: type.value === 'letter' ? '信纸草稿.docx' : '方格草稿.docx', url: URL.createObjectURL(blob) }
  } catch (e) {
    console.error(e)
  }
  exporting.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="Word草稿纸" class="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <!-- 头部 -->
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div>
                <p class="text-body-strong text-ink">Word草稿纸</p>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div class="flex flex-1 flex-col gap-apple-md overflow-y-auto p-apple-md sm:p-apple-lg">
              <!-- 类型切换 -->
              <div class="flex gap-apple-sm">
                <button
                  type="button"
                  class="rounded-pill px-apple-lg py-apple-sm text-caption-strong transition-all duration-200 active:scale-[0.97]"
                  :class="type === 'letter' ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="type = 'letter'"
                >信纸</button>
                <button
                  type="button"
                  class="rounded-pill px-apple-lg py-apple-sm text-caption-strong transition-all duration-200 active:scale-[0.97]"
                  :class="type === 'grid' ? 'bg-primary text-on-primary' : 'bg-canvas-parchment text-ink-muted-80 hover:text-ink'"
                  @click="type = 'grid'"
                >方格纸</button>
              </div>

              <!-- 参数 -->
              <div class="grid grid-cols-2 gap-apple-md sm:grid-cols-3">
                <template v-if="type === 'letter'">
                  <label class="flex flex-col gap-apple-xs">
                    <span class="text-fine-print text-ink-muted-80">横线行数</span>
                    <input v-model.number="letterLines" type="number" min="5" max="80" class="h-[44px] rounded-apple-md border border-black/[0.08] bg-canvas px-apple-md text-apple-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus" />
                  </label>
                  <label class="flex flex-col gap-apple-xs">
                    <span class="text-fine-print text-ink-muted-80">行距（mm）</span>
                    <input v-model.number="lineGap" type="number" min="6" max="20" class="h-[44px] rounded-apple-md border border-black/[0.08] bg-canvas px-apple-md text-apple-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus" />
                  </label>
                </template>
                <template v-else>
                  <label class="flex flex-col gap-apple-xs">
                    <span class="text-fine-print text-ink-muted-80">方格边长（mm）</span>
                    <input v-model.number="cellSize" type="number" min="4" max="20" class="h-[44px] rounded-apple-md border border-black/[0.08] bg-canvas px-apple-md text-apple-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus" />
                  </label>
                  <label class="flex flex-col gap-apple-xs">
                    <span class="text-fine-print text-ink-muted-80">每行列数</span>
                    <input v-model.number="gridCols" type="number" min="1" max="40" class="h-[44px] rounded-apple-md border border-black/[0.08] bg-canvas px-apple-md text-apple-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus" />
                  </label>
                  <label class="flex flex-col gap-apple-xs">
                    <span class="text-fine-print text-ink-muted-80">总行数</span>
                    <input v-model.number="gridRows" type="number" min="1" max="200" class="h-[44px] rounded-apple-md border border-black/[0.08] bg-canvas px-apple-md text-apple-body text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus" />
                  </label>
                </template>
              </div>

              <p v-if="overflow" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">
                当前总宽 {{ gridWidthMm }}mm 超出 A4 页面内容宽度（{{ CONTENT_W_MM }}mm），请减小方格边长或列数
              </p>
              <p v-else-if="type === 'grid'" class="text-fine-print text-ink-muted-48">总宽 {{ gridWidthMm }}mm，超出页面高度的行会自动延续到下一页</p>

              <!-- 预览 -->
              <div class="flex flex-col gap-apple-sm rounded-apple-lg bg-canvas-parchment p-apple-md">
                <p class="text-caption-strong text-ink">预览（1mm ≈ 2px）</p>
                <div v-if="type === 'letter'" class="overflow-hidden rounded-apple-md border border-divider-soft bg-canvas" :style="{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent calc(${previewLineGap} - 1px), #cbd5e1 calc(${previewLineGap} - 1px), #cbd5e1 ${previewLineGap})` }" />
                <div v-else class="max-h-[220px] overflow-hidden rounded-apple-md border border-divider-soft bg-canvas p-apple-xs">
                  <div class="inline-grid" :style="{ gridTemplateColumns: `repeat(${gridCols}, ${previewCell})`, gridAutoRows: previewCell }">
                    <span v-for="i in gridCols * previewRows" :key="i" class="border border-slate-300" />
                  </div>
                </div>
              </div>

              <!-- 生成结果 -->
              <div v-if="result" class="flex flex-col gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                <a :href="result.url" :download="result.name" class="flex items-center gap-apple-xs rounded-apple-md bg-canvas px-apple-md py-apple-sm text-caption-strong text-primary shadow-hairline transition hover:text-ink active:scale-[0.99]">⬇️ {{ result.name }}</a>
              </div>
            </div>

            <!-- 底部操作 -->
            <div class="flex flex-wrap items-center justify-between gap-apple-md border-t border-divider-soft p-apple-md sm:p-apple-lg">
              <span class="text-fine-print text-ink-muted-48">A4 纸 · 页边距 15mm</span>
              <button
                type="button"
                class="rounded-pill bg-primary px-apple-lg py-apple-sm text-caption-strong text-on-primary transition-all duration-200 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="overflow || exporting"
                @click="exportDocx"
              >{{ exporting ? '生成中…' : '生成并下载' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>