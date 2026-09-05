<script setup>
import { computed, ref, watch } from 'vue'

/* 我的公网IP：查询当前网络的公网出口 IPv4（含归属地/运营商/应用场景）与 IPv6。
   归属主源 Vore API（中文省市库，对国内 IP 精确到地级市；https+CORS 免鉴权），
   失败时回退 ipwho.is（国际库，精度到省级），IPv6 用 api6.ipify.org。 */
const open = ref(false)
let queriedOnce = false
function openTool() {
  open.value = true
}
defineExpose({ open: openTool })
watch(open, (v) => {
  if (v && !queriedOnce) {
    queriedOnce = true
    query()
  }
})

const v4 = ref('')
const v6 = ref('')
const country = ref('')
const region = ref('') // 省级
const city = ref('') // 城市级（可含区）
const isp = ref('')
const scene = ref('') // 应用场景
const loading = ref(false)
const error = ref('')
const geoReady = ref(false)
const copied = ref('')

// ipwho.is 兜底路径用的省级 code → 中文
const REGION_CN = {
  AH: '安徽省', BJ: '北京市', CQ: '重庆市', FJ: '福建省', GD: '广东省', GS: '甘肃省',
  GX: '广西壮族自治区', GZ: '贵州省', HA: '河南省', HB: '湖北省', HE: '河北省', HI: '海南省',
  HL: '黑龙江省', HN: '湖南省', HK: '香港特别行政区', JL: '吉林省', JS: '江苏省', JX: '江西省',
  LN: '辽宁省', MO: '澳门特别行政区', NM: '内蒙古自治区', NX: '宁夏回族自治区', QH: '青海省',
  SC: '四川省', SD: '山东省', SH: '上海市', SN: '陕西省', SX: '山西省', TJ: '天津市',
  TW: '台湾省', XJ: '新疆维吾尔自治区', XZ: '西藏自治区', YN: '云南省', ZJ: '浙江省'
}
// 类型 → 中文「应用场景」（ipwho.is 的 type）
const SCENE = {
  isp: '家庭宽带',
  mobile: '移动网络',
  mob: '移动网络',
  com: '企业专线',
  business: '商业网络',
  edu: '教育网',
  gov: '政府机关',
  host: '数据中心/机房',
  cdn: 'CDN 节点'
}
const CN_CARRIERS = /电信|联通|移动|网通|铁通|广电/

async function grabJson(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/* Vore 主路径：info1..3 依次为国家/省市区（国内）、国家/州/城市（国外） */
function applyVore(j) {
  if (!j || j.code !== 200 || !j.ipdata) return false
  v4.value = j.ipinfo?.text || ''
  const d = j.ipdata
  const cn = !!j.ipinfo?.cnip
  if (cn) {
    country.value = '中国'
    region.value = d.info1 || ''
    city.value = [d.info2, d.info3].filter(Boolean).join('')
    isp.value = d.isp || ''
  } else {
    // 国外：info1 国家、info2 州/省、info3 城市；isp 字段对国外不可靠，不展示
    country.value = d.info1 || ''
    region.value = d.info2 || ''
    city.value = d.info3 || ''
    isp.value = ''
  }
  scene.value = cn && CN_CARRIERS.test(d.isp || '') ? '家庭宽带' : ''
  geoReady.value = true
  return true
}

/* ipwho.is 兜底路径：country/region_code/city/connection */
function regionText(code, fallback) {
  if (!code) return ''
  return REGION_CN[code.toUpperCase()] || fallback || code
}
function sceneText(type, ispStr = '') {
  if (type) {
    const t = String(type).toLowerCase()
    if (SCENE[t]) return SCENE[t]
  }
  const s = (ispStr || '').toLowerCase()
  if (/chinanet|telecom|netcom|broadband|hi-net|ctc/.test(s)) return '家庭宽带'
  if (/mobile|cellular|cmcc|unicom/.test(s)) return '移动网络'
  if (/hostpapa|cloud|host|datacenter|server|vps|amazon|aws|gcp|azure|cdn/.test(s)) return '数据中心/机房'
  if (/edu|university|academy/.test(s)) return '教育网'
  if (/gov|government/.test(s)) return '政府机关'
  return '—'
}
function applyIpwho(j) {
  if (!j || j.success === false) return false
  v4.value = j.ip || ''
  country.value = j.country_code === 'CN' ? '中国' : j.country || ''
  region.value = regionText(j.region_code, j.region || '')
  city.value = j.city || ''
  isp.value = j.connection?.isp || j.connection?.org || ''
  scene.value = sceneText(j.type, isp.value)
  geoReady.value = true
  return true
}

async function query() {
  loading.value = true
  error.value = ''
  copied.value = ''
  country.value = region.value = city.value = isp.value = scene.value = ''
  const [vore, v6Info] = await Promise.all([
    grabJson('https://api.vore.top/api/IPdata'),
    grabJson('https://api6.ipify.org?format=json')
  ])
  if (!applyVore(vore)) {
    const ipwho = await grabJson('https://ipwho.is/')
    if (!applyIpwho(ipwho)) {
      // 两家都失败：尝试只取 IP，避免空白
      const ipify = await grabJson('https://api.ipify.org?format=json')
      v4.value = ipify?.ip || ''
      geoReady.value = false
    }
  }
  v6.value = v6Info?.ip || ''
  if (!v4.value && !v6.value) error.value = '获取失败：无法连接网络或查询服务暂不可用，请稍后重试。'
  loading.value = false
}

function refresh() {
  if (!loading.value) query()
}

async function copyIp(kind, value) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copied.value = kind
    setTimeout(() => {
      if (copied.value === kind) copied.value = ''
    }, 1600)
  } catch {
    /* 剪贴板不可用（如非 https 环境）时静默失败 */
  }
}

const regionLine = computed(() => [country.value, region.value, city.value].filter(Boolean).join(' '))
const geoHint = computed(() => (loading.value ? '查询中…' : geoReady.value ? '—' : '归属信息暂不可用'))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-apple-sm backdrop-blur-sm sm:p-apple-xl"
        @click.self="open = false"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="我的公网IP"
          class="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-apple-lg bg-canvas shadow-product"
        >
          <!-- 头部 -->
          <div class="flex items-start justify-between gap-apple-md border-b border-divider-soft p-apple-md sm:p-apple-lg">
            <div>
              <p class="text-body-strong text-ink">我的公网IP</p>
            </div>
            <button
              type="button"
              aria-label="关闭"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
              @click="open = false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="min-h-0 flex-1 overflow-y-auto p-apple-md sm:p-apple-lg">
            <div class="flex flex-col gap-apple-md">
              <!-- 主体信息（左 label / 右 值，参考常见 IP 查询站） -->
              <div class="rounded-apple-md border border-divider-soft bg-canvas-parchment p-apple-md sm:p-apple-lg">
                <dl class="grid grid-cols-[auto_1fr] items-baseline gap-x-apple-md gap-y-apple-sm sm:gap-y-apple-md">
                  <dt class="text-caption-strong text-ink-muted-80">本机IP</dt>
                  <dd class="flex min-w-0 items-center gap-apple-sm">
                    <p class="select-all truncate font-mono text-[24px] leading-none tracking-tight text-ink sm:text-[30px]" :title="v4">{{ v4 || (loading ? '查询中…' : '—') }}</p>
                    <button
                      v-if="v4"
                      type="button"
                      aria-label="复制 IPv4 地址"
                      class="flex h-7 shrink-0 items-center gap-1 rounded-pill bg-black/5 px-apple-sm text-fine-print text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
                      @click="copyIp('v4', v4)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                      {{ copied === 'v4' ? '已复制' : '复制' }}
                    </button>
                  </dd>

                  <dt class="text-caption-strong text-ink-muted-80">归属地</dt>
                  <dd class="break-words text-apple-body text-ink">{{ regionLine || geoHint }}</dd>

                  <dt class="text-caption-strong text-ink-muted-80">运营商</dt>
                  <dd class="break-words text-apple-body text-ink">{{ isp || (loading ? '查询中…' : (geoReady ? '—' : '归属信息暂不可用')) }}</dd>

                  <dt class="text-caption-strong text-ink-muted-80">应用场景</dt>
                  <dd class="break-words text-apple-body text-ink">{{ scene || (loading ? '查询中…' : (geoReady ? '—' : '归属信息暂不可用')) }}</dd>
                </dl>
              </div>

              <!-- IPv6 -->
              <div class="rounded-apple-md border border-divider-soft bg-canvas-parchment p-apple-md">
                <div class="flex items-center justify-between gap-apple-sm">
                  <p class="text-caption-strong text-ink-muted-80">公网 IPv6</p>
                  <button
                    v-if="v6"
                    type="button"
                    aria-label="复制 IPv6 地址"
                    class="flex h-7 items-center gap-1 rounded-pill bg-black/5 px-apple-sm text-fine-print text-ink-muted-80 transition hover:bg-black/10 active:scale-[0.95]"
                    @click="copyIp('v6', v6)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                    {{ copied === 'v6' ? '已复制' : '复制' }}
                  </button>
                </div>
                <p class="mt-apple-xs select-all break-all font-mono text-[15px] leading-snug text-ink sm:text-[17px]">
                  {{ v6 || (loading ? '查询中…' : '未检测到') }}
                </p>
                <p v-if="!v6 && !loading" class="mt-apple-xs text-fine-print text-ink-muted-48">
                  未检测到 IPv6：当前网络可能未分配 IPv6 公网地址。
                </p>
              </div>

              <p v-if="error" class="text-fine-print text-red-600">{{ error }}</p>

              <button
                type="button"
                :disabled="loading"
                class="flex items-center justify-center gap-apple-xs rounded-apple-md bg-primary px-apple-md py-apple-sm text-button-utility text-on-primary transition hover:bg-primary-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                @click="refresh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                {{ loading ? '查询中…' : '重新查询' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
