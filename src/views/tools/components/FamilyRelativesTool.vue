<script setup>
import { computed, ref } from 'vue'

const open = ref(false)
const mySex = ref('女')

// ------------- 家族图谱数据模型 -------------
// 每个成员节点按真实血缘连接：
//   upF=父亲(男祖链)、upM=母亲(女祖链)、spouse=配偶、g=相对"我"的代差(0=同代)
let seq = 0
const graph = {
  me: { rel: '我', g: 0, sex: mySex.value === '男' ? '男' : '女', upF: null, upM: null, spouse: null },
}
function mk(rel, g, sex) {
  const id = 'n' + ++seq
  graph[id] = { rel, g, sex, upF: null, upM: null, spouse: null }
  return id
}

const focus = ref('me')
const notice = ref('')

// 关系按钮
const RELS = ['父亲', '母亲', '丈夫', '妻子', '哥哥', '弟弟', '姐姐', '妹妹', '儿子', '女儿']
const SEX_OF = { 父亲: '男', 母亲: '女', 丈夫: '男', 妻子: '女', 哥哥: '男', 弟弟: '男', 姐姐: '女', 妹妹: '女', 儿子: '男', 女儿: '女' }

// 该按钮在焦点节点上是否合法
function canAdd(r) {
  const f = graph[focus.value]
  if (r === '父亲') return !f.upF
  if (r === '母亲') return !f.upM
  if (r === '丈夫' || r === '妻子') return !f.spouse
  return true
}
function blockReason(r) {
  const f = graph[focus.value]
  if ((r === '父亲' && f.upF) || (r === '母亲' && f.upM)) return '该成员已有上一代'
  if ((r === '丈夫' || r === '妻子') && f.spouse) return '该成员已有配偶（夫妻关系冲突，不存在）'
  return ''
}

function addRel(r) {
  notice.value = ''
  const bad = blockReason(r)
  if (bad) { notice.value = bad; return }
  const f = graph[focus.value]
  let id

  if (r === '父亲' || r === '母亲') {
    id = mk(r, f.g + 1, SEX_OF[r])
    if (r === '父亲') f.upF = id; else f.upM = id
  } else if (r === '儿子' || r === '女儿') {
    id = mk(r, f.g - 1, SEX_OF[r])
    if (f.sex === '男') graph[id].upF = focus.value
    else if (f.sex === '女') graph[id].upM = focus.value
  } else if (r === '丈夫' || r === '妻子') {
    id = mk(r, f.g, SEX_OF[r])
    f.spouse = id
    graph[id].spouse = focus.value
  } else {
    // 兄弟姊妹：共享父亲的祖先链（无父时补一个虚拟祖辈，保证最近公共祖先可计算）
    id = mk(r, f.g, SEX_OF[r])
    if (!f.upF && !f.upM) {
      const v = mk('祖辈', f.g + 1, '男')
      f.upF = v
    }
    graph[id].upF = f.upF
    graph[id].upM = f.upM
  }
  focus.value = id
}

function reset() {
  Object.keys(graph).forEach((k) => delete graph[k])
  graph.me = { rel: '我', g: 0, sex: mySex.value === '男' ? '男' : '女', upF: null, upM: null, spouse: null }
  focus.value = 'me'
  notice.value = ''
}

// ------------- 称谓推导（最近公共祖先） -------------
const M = '男'

function ancestrySet(id) {
  const seen = new Set([id]); const out = [id]; const q = [id]
  while (q.length) {
    const cur = graph[q.shift()]
    for (const p of [cur.upF, cur.upM]) {
      if (p && !seen.has(p)) { seen.add(p); out.push(p); q.push(p) }
    }
  }
  return out
}
function inAncestry(from, target) { return ancestrySet(from).includes(target) }
function depthOf(from, target) {
  const seen = new Set([from]); const q = [[from, 0]]
  while (q.length) {
    const [cur, d] = q.shift()
    if (cur === target) return d
    const n = graph[cur]
    for (const p of [n.upF, n.upM]) {
      if (p && !seen.has(p)) { seen.add(p); q.push([p, d + 1]) }
    }
  }
  return -1
}
function lcaOf(a, b) {
  const bs = new Set(ancestrySet(b))
  for (const x of ancestrySet(a)) if (bs.has(x)) return x
  return null
}
function childrenOf(L) {
  const r = []
  for (const id of Object.keys(graph)) {
    const o = graph[id]
    if (o.upF === L || o.upM === L) r.push(id)
  }
  return r
}
function childToward(L, target) {
  for (const c of childrenOf(L)) if (inAncestry(c, target)) return c
  return null
}

// 祖先称谓（由"我"一步步走向祖先得到路径字符，如 FF=爷爷、MM=外婆）
function ancestorName(g, paternal, lastSex) {
  if (g === 1) return lastSex === M ? '爸爸' : '妈妈'
  if (paternal) {
    if (g === 2) return lastSex === M ? '爷爷' : '奶奶'
    if (g === 3) return lastSex === M ? '曾祖父' : '曾祖母'
    if (g === 4) return lastSex === M ? '高祖父' : '高祖母'
    return `${g}世祖（父系）`
  }
  if (g === 2) return lastSex === M ? '外公' : '外婆'
  if (g === 3) return lastSex === M ? '外曾祖父' : '外曾祖母'
  if (g === 4) return lastSex === M ? '外高祖父' : '外高祖母'
  return `${g}世祖（母系）`
}
function ancPathName(L) {
  const enc = []
  let cur = 'me'
  while (cur !== L) {
    const n = graph[cur]
    const canF = n.upF && inAncestry(n.upF, L)
    enc.push(canF ? 'F' : 'M')
    cur = canF ? n.upF : n.upM
  }
  const g = enc.length
  const paternal = enc[0] === 'F'
  return ancestorName(g, paternal, graph[L].sex)
}
// 直系后代称谓
function descName(d, sexNow) {
  const s = sexNow === M ? '男' : '女'
  if (d === 1) return s === '男' ? '儿子' : '女儿'
  if (d === 2) return s === '男' ? '孙子' : '孙女'
  if (d === 3) return s === '男' ? '曾孙' : '曾孙女'
  if (d === 4) return s === '男' ? '玄孙' : '玄孙女'
  return `${d}代孙`
}

// 旁系（堂表）称谓
function cousinName(prefix, sexNow) {
  return `${prefix}${sexNow === M ? '兄弟' : '姊妹'}`
}

// 姻亲（经配偶）
function spouseSide(nodeId) {
  const me = 'me'
  const sp = graph[me].spouse
  const spn = graph[sp]
  const n = graph[nodeId]
  if (spn.upF === nodeId) return mySex.value === '男' ? '岳父' : '公公'
  if (spn.upM === nodeId) return mySex.value === '男' ? '岳母' : '婆婆'
  if ((n.upF && n.upF === spn.upF) || (n.upM && n.upM === spn.upM)) {
    // 配偶的同辈兄弟姊妹
    if (mySex.value === '男') return n.sex === M ? '大舅子/小舅子' : '大姨子/小姨子'
    return n.sex === M ? '大伯哥/小叔子' : '大姑姐/小姑子'
  }
  if (n.upF === sp || n.upM === sp) return n.sex === M ? '儿子' : '女儿'
  return null
}

function computeTerm(nodeId) {
  const me = 'me'
  if (nodeId === me) return { ok: true, text: '我', abnormal: false }
  if (graph[me].spouse && nodeId === graph[me].spouse) {
    return { ok: true, text: mySex.value === '男' ? '妻子' : '丈夫', abnormal: false }
  }
  const L = lcaOf(me, nodeId)
  if (L) {
    const meDep = depthOf(me, L)
    const taDep = depthOf(nodeId, L)
    if (L === me) return { ok: true, text: descName(taDep, graph[nodeId].sex), abnormal: false }
    if (L === nodeId) return { ok: true, text: ancPathName(L), abnormal: false }
    // 旁系
    if (meDep === 1 && taDep === 1) return { ok: true, text: graph[nodeId].rel || '同胞', abnormal: false }
    if (meDep === 1 && taDep === 2) {
      const sib = childToward(L, nodeId)
      const sibSex = graph[sib].sex
      const nSex = graph[nodeId].sex
      return { ok: true, text: sibSex === M ? (nSex === M ? '侄子' : '侄女') : (nSex === M ? '外甥' : '外甥女'), abnormal: false }
    }
    if (meDep === 2 && taDep === 1) {
      const myParent = childToward(L, me)
      const fatherSide = graph[me].upF === myParent
      const side = graph[nodeId].sex
      const txt = fatherSide ? (side === M ? '伯父/叔父' : '姑母') : (side === M ? '舅舅' : '姨母')
      return { ok: true, text: txt, abnormal: false }
    }
    if (meDep === 2 && taDep === 2) {
      const myParent = childToward(L, me)
      const tParent = childToward(L, nodeId)
      const patr = graph[me].upF === myParent
      const prefix = patr && graph[tParent] && graph[tParent].sex === M ? '堂' : '表'
      return { ok: true, text: cousinName(prefix, graph[nodeId].sex), abnormal: false }
    }
    const n = meDep + taDep - 2
    return { ok: true, text: `远房亲戚（共祖 ${n} 层）`, abnormal: false }
  }
  // 无共同血缘 → 姻亲 或 关系异常
  const sk = graph[me].spouse ? spouseSide(nodeId) : null
  if (sk) return { ok: true, text: sk, abnormal: false }
  return { ok: false, text: '关系异常', abnormal: true }
}

const term = computed(() => {
  notice.value = ''
  return computeTerm(focus.value)
})
const focusName = computed(() => {
  const ids = []
  let cur = focus.value
  const seen = new Set()
  while (cur !== 'me' && cur && !seen.has(cur)) {
    ids.push(graph[cur].rel)
    seen.add(cur)
    cur = graph[cur].upF ?? graph[cur].upM
  }
  return ids.length ? `我${ids.map((r) => '的' + r).join('')}` : '我'
})

// 亲属图分行：代差大的（长辈）在上，小的（晚辈）在下；同代横向排列
const rows = computed(() => {
  const byG = {}
  for (const [id, o] of Object.entries(graph)) {
    ;(byG[o.g] = byG[o.g] || []).push({ ...o, id })
  }
  const gs = Object.keys(byG).map(Number).sort((a, b) => b - a)
  return gs.map((g) => byG[g])
})

function iconOf(node) {
  if (node.rel === '我') return mySex.value === '男' ? '🙋‍♂️' : '🙋‍♀️'
  if (node.g >= 2) return node.sex === M ? '👴' : '👵'
  if (node.g === 1) return node.sex === M ? '👨' : '👩'
  if (node.g < 0) return node.sex === M ? '👦' : '👧'
  if (node.rel === '丈夫' || node.rel === '妻子') return '💑'
  return node.sex === M ? '🧑' : '👩‍🦰'
}
</script>

<template>
  <button
    type="button"
    class="flex flex-col items-start gap-apple-sm rounded-apple-lg border border-divider-soft bg-canvas p-apple-md text-left shadow-hairline transition-all duration-200 hover:-translate-y-px hover:shadow-product focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98]"
    :aria-haspopup="'dialog'"
    @click="open = true"
  >
    <span class="flex h-11 w-11 items-center justify-center rounded-apple-md bg-linear-to-br from-violet-400 to-fuchsia-400 text-xl">👨‍👩‍👧</span>
    <p class="text-body-strong text-ink">亲戚计算机器</p>
  </button>

  <Teleport to="body">
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl" @click.self="open = false">
        <Transition appear enter-active-class="transition duration-300 ease-out" enter-from-class="translate-y-4 scale-95 opacity-0">
          <div role="dialog" aria-modal="true" aria-label="亲戚计算机器" class="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product">
            <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
              <div class="flex flex-wrap items-center gap-x-apple-md gap-y-apple-xs">
                <div>
                  <p class="text-body-strong text-ink">亲戚计算机器</p>
                  <p class="text-fine-print text-ink-muted-48">点按钮逐层走家谱 · 亲属图实时绘制</p>
                </div>
                <div class="flex overflow-hidden rounded-pill border border-black/[0.08]">
                  <button type="button" class="px-apple-md py-apple-xs text-caption-strong transition" :class="mySex === '女' ? 'bg-primary text-on-primary' : 'text-ink-muted-80 hover:text-ink'" @click="mySex = '女'">👩 我（女）</button>
                  <button type="button" class="px-apple-md py-apple-xs text-caption-strong transition" :class="mySex === '男' ? 'bg-primary text-on-primary' : 'text-ink-muted-80 hover:text-ink'" @click="mySex = '男'">👨 我（男）</button>
                </div>
              </div>
              <button type="button" aria-label="关闭" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]" @click="open = false">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <div class="grid flex-1 gap-0 overflow-y-auto lg:grid-cols-[340px_1fr]">
              <!-- 左栏：关系按钮 + 当前称谓 -->
              <div class="flex flex-col gap-apple-md border-b border-divider-soft p-apple-md lg:border-b-0 lg:border-r sm:p-apple-lg">
                <div>
                  <p class="text-caption-strong text-ink">选择与当前成员的关系</p>
                  <p class="mt-apple-xs line-clamp-1 text-fine-print text-ink-muted-48">当前：{{ focusName }}（{{ graph[focus].rel }}）</p>
                </div>

                <div class="grid grid-cols-2 gap-apple-xs">
                  <button
                    v-for="r in RELS" :key="r" type="button"
                    class="flex items-center justify-center gap-apple-xs rounded-apple-md py-apple-sm text-caption-strong transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.95]"
                    :class="canAdd(r) ? 'bg-canvas-parchment text-ink hover:bg-surface-tile-1 hover:text-on-primary' : 'cursor-not-allowed opacity-40 text-ink-muted-48'"
                    :disabled="!canAdd(r)"
                    :title="blockReason(r) || r"
                    @click="addRel(r)"
                  >
                    <span class="text-base">{{ r === '父亲' ? '👨' : r === '母亲' ? '👩' : r === '儿子' ? '👦' : r === '女儿' ? '👧' : r === '丈夫' ? '🤵' : r === '妻子' ? '👰' : r === '哥哥' || r === '弟弟' ? '🧑‍🦱' : '👩‍🦰' }}</span>
                    {{ r }}
                  </button>
                </div>

                <button type="button" class="self-start rounded-pill text-caption-strong text-primary transition hover:text-ink active:scale-[0.98]" @click="reset">↺ 重新开始</button>

                <p v-if="notice" role="alert" class="rounded-apple-md bg-red-50 p-apple-sm text-caption text-red-600">{{ notice }}</p>

                <div class="flex flex-col items-center gap-apple-xs rounded-apple-lg bg-canvas-parchment p-apple-md">
                  <span class="text-apple-body text-ink-muted-80">{{ focusName }}是</span>
                  <span class="text-[2.5rem] font-semibold leading-tight" :class="term.ok ? (term.abnormal ? 'text-red-600' : 'text-primary') : 'text-red-600'">{{ term.text }}</span>
                  <span v-if="term.abnormal" class="text-fine-print text-red-500">该关系不存在（或与已选亲属冲突）</span>
                </div>
              </div>

              <!-- 右栏：实时亲属图（长辈在上 / 晚辈在下 / 同辈横向） -->
              <div class="flex flex-col gap-apple-md p-apple-md sm:p-apple-lg">
                <div class="flex items-center justify-between">
                  <p class="text-caption-strong text-ink">亲属图</p>
                  <p class="text-fine-print text-ink-muted-48">点击节点切换聚焦目标</p>
                </div>

                <div class="flex flex-col items-center gap-1 overflow-x-auto py-2">
                  <template v-for="(row, ri) in rows" :key="ri">
                    <div class="flex items-center justify-center gap-apple-md">
                      <button v-for="node in row" :key="node.id" type="button" class="relative flex shrink-0 flex-col items-center gap-1" @click="focus = node.id">
                        <span class="flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-hairline ring-2 transition-all duration-200"
                          :class="node.id === focus ? 'scale-110 bg-primary ring-primary' : 'bg-canvas-parchment ring-black/5 hover:scale-105'">
                          {{ iconOf(node) }}
                        </span>
                        <span class="rounded-full px-apple-xs py-0.5 text-caption-strong" :class="node.id === focus ? 'bg-primary text-on-primary' : 'text-ink'">
                          {{ node.rel }}
                        </span>
                      </button>
                    </div>
                    <span v-if="ri < rows.length - 1" class="mx-auto block h-6 w-px bg-black/15" />
                  </template>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>