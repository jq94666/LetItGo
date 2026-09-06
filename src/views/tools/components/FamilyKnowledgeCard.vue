<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  sex: { type: String, default: '男' }
})
const emit = defineEmits(['close'])

const sex = ref(props.sex === '女' ? '女' : '男')

/* ============================================================
   亲属称谓“谱系大图”
   以「我」为起点：上 N 代（长辈）在上 / 同代横排 / 下 N 代在下。
   每个称谓卡 = 一个可点击的亲属槽位；点选后沿其 via 血缘链
   高亮「我 → … → 该人」路径并在底部给出关系解释。
   ============================================================ */

// 生成完整称谓槽位数据（按代分组，含 via 血缘链：从"我"向该人逐级经过的祖先槽）
function build() {
  const isM = sex.value === '男'
  const spouse = isM
    ? { id: 'wife', kind: 'inlaw', name: '妻子', emoji: '👰', via: [], def: '我的妻子（姻亲）' }
    : { id: 'husb', kind: 'inlaw', name: '丈夫', emoji: '🤵', via: [], def: '我的丈夫（姻亲）' }

  const groups = [
    {
      // 上二代：祖辈
      g: 2,
      kind: 'up',
      nodes: [
        { id: 'grandpaF', kind: 'direct', name: '爷爷', emoji: '👴', via: ['dad'], def: '爸爸的爸爸' },
        { id: 'grandmaF', kind: 'direct', name: '奶奶', emoji: '👵', via: ['dad'], def: '爸爸的妈妈' },
        { id: 'grandpaM', kind: 'direct', name: '外公', emoji: '👴', via: ['mom'], def: '妈妈的爸爸' },
        { id: 'grandmaM', kind: 'direct', name: '外婆', emoji: '👵', via: ['mom'], def: '妈妈的妈妈' }
      ]
    },
    {
      // 上一代：父辈
      g: 1,
      kind: 'up',
      nodes: [
        { id: 'dad', kind: 'direct', name: '爸爸', emoji: '👨', via: [], def: '我的父亲' },
        { id: 'mom', kind: 'direct', name: '妈妈', emoji: '👩', via: [], def: '我的母亲' },
        // 旁系：父系/母系兄弟姊妹（与父母同源于祖辈，是我旁系长辈）
        { id: 'uncleF', kind: 'side', name: '伯父/叔父', emoji: '🧔', via: ['dad', 'grandpaF'], def: '爸爸的兄弟（同源于爷爷）' },
        { id: 'auntF', kind: 'side', name: '姑母', emoji: '👩', via: ['dad', 'grandpaF'], def: '爸爸的姐妹（同源于爷爷）' },
        { id: 'uncM', kind: 'side', name: '舅舅', emoji: '🧔', via: ['mom', 'grandpaM'], def: '妈妈的兄弟（同源于外公）' },
        { id: 'auntM', kind: 'side', name: '姨母', emoji: '👩', via: ['mom', 'grandpaM'], def: '妈妈的姐妹（同源于外公）' },
        // 姻亲长辈（随我性别）
        isM
          ? { id: 'fInLaw', kind: 'inlaw', name: '岳父', emoji: '🧔', via: ['wife'], def: '妻子的父亲' }
          : { id: 'fInLaw', kind: 'inlaw', name: '公公', emoji: '🧔', via: ['husb'], def: '丈夫的父亲' },
        isM
          ? { id: 'mInLaw', kind: 'inlaw', name: '岳母', emoji: '👩', via: ['wife'], def: '妻子的母亲' }
          : { id: 'mInLaw', kind: 'inlaw', name: '婆婆', emoji: '👩', via: ['husb'], def: '丈夫的母亲' }
      ]
    },
    {
      // 同代
      g: 0,
      kind: 'me',
      nodes: [
        { id: 'me', kind: 'direct', name: '我', emoji: isM ? '👨' : '👩', via: [], def: '我自己' },
        spouse,
        { id: 'eldB0', kind: 'side', name: '哥哥', emoji: '👦', via: ['dad'], def: '同父同母的哥哥（旁系）' },
        { id: 'eldS0', kind: 'side', name: '姐姐', emoji: '👧', via: ['dad'], def: '同父同母的姐姐（旁系）' },
        { id: 'yngB0', kind: 'side', name: '弟弟', emoji: '👦', via: ['dad'], def: '同父同母的弟弟（旁系）' },
        { id: 'yngS0', kind: 'side', name: '妹妹', emoji: '👧', via: ['dad'], def: '同父同母的妹妹（旁系）' },
        { id: 'cousinT', kind: 'side', name: '堂兄弟/堂姐妹', emoji: '🧑', via: ['dad', 'grandpaF', 'uncleF'], def: '伯父/叔父的子女（同源于爷爷）' },
        { id: 'cousinB', kind: 'side', name: '表兄弟/表姐妹', emoji: '👩‍🦰', via: ['mom', 'grandpaM', 'uncM'], def: '舅舅/姨母的子女（同源于外公，姑母子女亦称表）' }
      ]
    },
    {
      // 下一代：子女 + 侄甥
      g: -1,
      kind: 'down',
      nodes: [
        { id: 'son', kind: 'direct', name: '儿子', emoji: '👦', via: [], def: '我的儿子' },
        { id: 'daughter', kind: 'direct', name: '女儿', emoji: '👧', via: [], def: '我的女儿' },
        { id: 'nephew', kind: 'side', name: '侄子', emoji: '👦', via: ['eldB0'], def: '哥哥/弟弟的儿子' },
        { id: 'nephewSis', kind: 'side', name: '外甥', emoji: '👦', via: ['eldS0'], def: '姐姐/妹妹的儿子' }
      ]
    },
    {
      // 下二代：孙辈
      g: -2,
      kind: 'down',
      nodes: [
        { id: 'grandson', kind: 'direct', name: '孙子', emoji: '👦', via: ['son'], def: '儿子的儿子' },
        { id: 'granddaughter', kind: 'direct', name: '孙女', emoji: '👧', via: ['son'], def: '儿子的女儿' }
      ]
    }
  ]
  return groups
}

const groups = computed(build)

// 扁平槽位便于按 id 取节点
const byId = computed(() => {
  const map = {}
  for (const g of groups.value) for (const n of g.nodes) map[n.id] = n
  return map
})

const selectedId = ref(null)
function toggle(id) {
  selectedId.value = selectedId.value === id ? null : id
}

const selected = computed(() => (selectedId.value ? byId.value[selectedId.value] : null))

// 路径上需要点亮/连线的槽位 id 顺序：我 → 途经祖先（由近及远） → 该人
const pathIds = computed(() => {
  const sel = selected.value
  if (!sel) return []
  const seen = new Set()
  const out = []
  for (const id of ['me', ...(sel.via || []), sel.id]) {
    if (id && byId.value[id] && !seen.has(id)) {
      out.push(id)
      seen.add(id)
    }
  }
  return out
})

const pathText = computed(() => {
  const ids = pathIds.value
  if (!ids.length) return ''
  return ids.map((id) => byId.value[id].name).join(' → ')
})

/* ---------- SVG 连线：在谱系大图上方铺一层折线，连接路径各槽 ---------- */
const graphBox = ref(null)
const svgBox = ref(null)
const linePoints = ref('')

async function drawLine() {
  await nextTick()
  const box = graphBox.value
  const ids = pathIds.value
  if (!box || ids.length < 2) {
    linePoints.value = ''
    return
  }
  const boxRect = box.getBoundingClientRect()
  const pts = ids
    .map((id) => graphBox.value?.querySelector(`[data-kid="${id}"]`))
    .filter(Boolean)
    .map((el) => {
      const r = el.getBoundingClientRect()
      return {
        x: r.left - boxRect.left + r.width / 2,
        y: r.top - boxRect.top + r.height / 2
      }
    })
  if (pts.length < 2) return
  linePoints.value = pts.map((p) => `${p.x},${p.y}`).join(' ')
  // 尺寸：连线折点若超出，给 svg 足够可视区域（跟随内容滚动时同层坐标系）
  svgBox.value?.setAttribute('viewBox', `0 0 ${box.scrollWidth} ${box.scrollHeight}`)
}

let ro = null
onMounted(async () => {
  await nextTick()
  if (graphBox.value) {
    ro = new ResizeObserver(() => drawLine())
    ro.observe(graphBox.value)
  }
})
onBeforeUnmount(() => {
  ro?.disconnect()
})
// 选中 / 性别切换后自动重绘路径；性别变化时旧选中槽位可能已失效，先清空
watch(selectedId, () => drawLine())
watch(sex, () => {
  selectedId.value = null
  drawLine()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-apple-sm backdrop-blur-sm sm:p-apple-xl"
        @click.self="emit('close')"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="亲属称谓图"
          class="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product"
        >
          <!-- 头部：标题 + 我性别切换 + 关闭 -->
          <div class="flex shrink-0 items-center justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
            <p class="text-body-strong text-ink">亲属称谓图</p>
            <div class="flex items-center gap-apple-sm">
              <div class="flex overflow-hidden rounded-pill border border-black/[0.08]">
                <button
                  type="button"
                  class="px-apple-md py-apple-xs text-caption-strong transition"
                  :class="sex === '女' ? 'bg-primary text-on-primary' : 'text-ink-muted-80 hover:text-ink'"
                  @click="sex = '女'"
                >👩 我（女）</button>
                <button
                  type="button"
                  class="px-apple-md py-apple-xs text-caption-strong transition"
                  :class="sex === '男' ? 'bg-primary text-on-primary' : 'text-ink-muted-80 hover:text-ink'"
                  @click="sex = '男'"
                >👨 我（男）</button>
              </div>
              <button
                type="button"
                aria-label="关闭"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
                @click="emit('close')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
          </div>

          <!-- 图例 -->
          <div class="shrink-0 px-apple-md pt-apple-sm sm:px-apple-lg">
            <div class="flex flex-wrap items-center gap-x-apple-md gap-y-1 text-fine-print text-ink-muted-48">
              <span class="flex items-center gap-1"><span class="kt-dot bg-emerald-500/70" />直系血亲</span>
              <span class="flex items-center gap-1"><span class="kt-dot bg-sky-500/70" />旁系血亲（三代以内）</span>
              <span class="flex items-center gap-1"><span class="kt-dot bg-amber-500/70" />姻亲（非血亲）</span>
              <span class="hidden sm:inline">点击任一称谓可高亮“我 → 该人”的关系路径</span>
            </div>
          </div>

          <!-- 主体：可滚动的大图 -->
          <div class="min-h-0 flex-1 overflow-auto p-apple-md sm:p-apple-lg">
            <div
              ref="graphBox"
              class="relative mx-auto w-full overflow-visible"
              @scroll.passive="drawLine"
            >
              <!-- SVG 折线层：连接选中的关系路径 -->
              <svg
                v-show="pathIds.length > 1"
                ref="svgBox"
                class="pointer-events-none absolute left-0 top-0 z-10 h-full w-full"
              >
                <polyline
                  :points="linePoints"
                  fill="none"
                  stroke="var(--color-primary)"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-dasharray="1 6"
                />
              </svg>

              <!-- 分代行：上 N 代在上 / 我居中 / 下 N 代在下 -->
              <template v-for="(g, gi) in groups" :key="g.g + '' + gi">
                <!-- 行徽章 -->
                <div class="kt-tier-hint">
                  <span
                    class="rounded-pill px-apple-xs py-[2px] text-[11px] font-medium leading-normal"
                    :class="g.kind === 'up' ? 'bg-rose-100 text-rose-700' : g.kind === 'down' ? 'bg-sky-100 text-sky-700' : 'bg-primary/10 text-primary'"
                  >{{ g.kind === 'up' ? `上${g.g}代 · 长辈` : g.kind === 'down' ? `下${-g.g}代 · 晚辈` : '我 · 同代' }}</span>
                </div>

                <!-- 该代所有槽位横向排布 -->
                <div class="kt-row">
                  <button
                    v-for="node in g.nodes"
                    :key="node.id"
                    :data-kid="node.id"
                    type="button"
                    class="kt-card"
                    :class="[
                      node.kind === 'direct' ? 'kt-direct' : node.kind === 'inlaw' ? 'kt-inlaw' : 'kt-side',
                      node.id === 'me' ? 'kt-me' : '',
                      selectedId === node.id ? 'kt-selected' : '',
                      selectedId && selectedId !== node.id && pathIds.includes(node.id) ? 'kt-onpath' : ''
                    ]"
                    @click="toggle(node.id)"
                  >
                    <span class="kt-emoji">{{ node.emoji }}</span>
                    <span class="kt-name">{{ node.name }}</span>
                  </button>
                </div>

                <!-- 行与行之间细竖线（示意代际向下） -->
                <div v-if="gi < groups.length - 1" class="kt-tier-connector" />
              </template>
            </div>

            <!-- 点选后的关系说明 -->
            <div
              v-if="selected"
              class="sticky bottom-0 mt-apple-md rounded-apple-lg bg-canvas-parchment p-apple-md ring-1 ring-black/5"
            >
              <div class="flex flex-wrap items-center gap-x-apple-md gap-y-1 text-caption-strong text-ink">
                <span>“我 → 该人”：<span class="text-primary">{{ pathText }}</span></span>
                <span v-if="selected.def" class="text-ink-muted-80">＝ {{ selected.def }}</span>
              </div>
              <p class="mt-1 text-fine-print text-ink-muted-48">再次点击该称谓可取消高亮；绿=直系，蓝=旁系，琥珀=姻亲。</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.kt-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.kt-tier-hint {
  display: flex;
  justify-content: center;
  padding-bottom: 6px;
}
.kt-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  padding-bottom: 4px;
}
.kt-tier-connector {
  width: 2px;
  height: 14px;
  margin: 2px auto 4px;
  background: rgba(0, 0, 0, 0.15);
}

.kt-card {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 64px;
  padding: 7px 9px;
  border-radius: 14px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
.kt-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 0 1.5px var(--color-ink-muted-48);
}
.kt-emoji {
  font-size: 20px;
  line-height: 1.2;
}
.kt-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-ink);
  white-space: nowrap;
}

/* 直系 / 旁系 / 姻亲底色 */
.kt-direct {
  background: rgba(16, 185, 129, 0.1);
  box-shadow: 0 0 0 1px rgba(5, 150, 105, 0.35);
}
.kt-side {
  background: rgba(14, 165, 233, 0.1);
  box-shadow: 0 0 0 1px rgba(2, 132, 199, 0.35);
}
.kt-inlaw {
  background: rgba(245, 158, 11, 0.12);
  box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.4);
}

/* 我 */
.kt-me {
  background: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary);
}
.kt-me .kt-name {
  color: #fff;
}

/* 选中目标 */
.kt-selected {
  transform: scale(1.08);
  box-shadow: 0 0 0 2.5px var(--color-primary), 0 6px 16px -6px rgba(0, 102, 204, 0.5);
}
/* 路径途经节点 */
.kt-onpath {
  box-shadow: 0 0 0 2px var(--color-primary-focus), 0 0 10px rgba(0, 113, 227, 0.35);
  background: #fff;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
