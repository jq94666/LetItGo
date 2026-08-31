<script setup>
import { computed, ref } from 'vue'

// 中国法定节假日（公历日期，格式 MM-DD）
// 真实项目建议接入国务院官方每年公告 API 或公共库，这里放固定常例。
const HOLIDAYS = {
  '01-01': '元旦',
  '02-01': '春节',
  '02-02': '春节',
  '02-03': '春节',
  '02-04': '春节',
  '02-05': '春节',
  '02-06': '春节',
  '02-07': '春节',
  '04-04': '清明',
  '04-05': '清明',
  '04-06': '清明',
  '05-01': '劳动节',
  '05-02': '劳动节',
  '05-03': '劳动节',
  '05-04': '劳动节',
  '05-05': '劳动节',
  '06-19': '端午',
  '06-20': '端午',
  '06-21': '端午',
  '09-17': '中秋',
  '09-18': '中秋',
  '09-19': '中秋',
  '10-01': '国庆',
  '10-02': '国庆',
  '10-03': '国庆',
  '10-04': '国庆',
  '10-05': '国庆',
  '10-06': '国庆',
  '10-07': '国庆'
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

// 当前"视图月份"状态：跨年由用户点击上下月切换
const viewDate = ref(new Date())

// 日历面板的展示月/年
const viewYear = computed(() => viewDate.value.getFullYear())
const viewMonth = computed(() => viewDate.value.getMonth()) // 0-11
const viewMonthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`)

// 今天的信息（用于当天圆点高亮）
const today = new Date()
const todayKey = dateKey(today)

// 选中日期（卡片上展示的当前日期）
const selected = ref(todayKey)

function dateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function mdKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}-${day}`
}

// 日历 6 列 × 6 行 = 42 格（保证月份切换跳动幅度一致，Apple 日历同款）
const calendarCells = computed(() => {
  const y = viewYear.value
  const m = viewMonth.value
  const first = new Date(y, m, 1)
  const startWeekday = first.getDay() // 0=Sun
  const gridStart = new Date(y, m, 1 - startWeekday)
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    const key = dateKey(d)
    const k = mdKey(d)
    cells.push({
      date: d,
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === m,
      weekday: d.getDay(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isToday: key === todayKey,
      isSelected: key === selected.value,
      holiday: HOLIDAYS[k] || null
    })
  }
  return cells
})

function prevMonth() {
  viewDate.value = new Date(viewYear.value, viewMonth.value - 1, 1)
}
function nextMonth() {
  viewDate.value = new Date(viewYear.value, viewMonth.value + 1, 1)
}
function prevYear() {
  viewDate.value = new Date(viewYear.value - 1, viewMonth.value, 1)
}
function nextYear() {
  viewDate.value = new Date(viewYear.value + 1, viewMonth.value, 1)
}
function jumpToToday() {
  viewDate.value = new Date()
  selected.value = todayKey
}

function selectCell(cell) {
  selected.value = cell.key
  viewDate.value = new Date(cell.date.getFullYear(), cell.date.getMonth(), 1)
}

// 卡片上显示的日期摘要
const selectedDate = computed(() => {
  const [y, m, d] = selected.value.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const wd = WEEKDAYS[dt.getDay()]
  const holi = HOLIDAYS[`${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`]
  return { y, m, d, wd, holi }
})

const open = ref(false)
function toggle() { open.value = !open.value }
function close() { open.value = false }
</script>

<template>
  <!-- 日历卡片（store-utility-card 语法） -->
  <button
    type="button"
    class="w-full text-left rounded-apple-lg bg-canvas p-apple-lg shadow-hairline transition-all duration-200 active:scale-[0.98] hover:bg-surface-pearl"
    @click="toggle"
  >
    <div class="flex items-center justify-between gap-apple-md">
      <div>
        <p class="text-caption text-ink-muted-48">日历</p>
        <div class="mt-apple-xxs flex items-baseline gap-apple-xs">
          <span class="text-display-lg leading-none">{{ selectedDate.d }}</span>
          <span class="text-caption text-ink-muted-48">
            {{ selectedDate.y }}.{{ String(selectedDate.m).padStart(2, '0') }} · 周{{ selectedDate.wd }}
          </span>
        </div>
        <p class="mt-apple-xxs text-body-strong" :class="selectedDate.holi ? 'text-primary' : ''">
          {{ selectedDate.holi || '工作日' }}
        </p>
      </div>
      <div class="flex flex-col items-end text-right">
        <p class="text-tagline leading-none">{{ selectedDate.m }}月</p>
        <p class="mt-apple-xxs text-caption text-primary">查看月历 ›</p>
      </div>
    </div>
  </button>

  <!-- 弹窗 -->
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-surface-black/40 p-apple-xl backdrop-blur-sm"
      @click.self="close"
    >
      <div
        class="w-full max-w-lg rounded-apple-lg bg-canvas p-apple-lg shadow-product"
        role="dialog"
        aria-modal="true"
        aria-label="日历"
      >
        <!-- 头部：年/月 + 上下月 + 上下年切换 + 今天 + 关闭 -->
        <div class="mb-apple-md flex items-center justify-between gap-apple-sm">
          <div class="flex items-center gap-apple-xs">
            <!-- 上下年 -->
            <div class="flex items-center rounded-pill bg-surface-pearl">
              <button
                type="button"
                class="px-apple-sm py-apple-sm text-ink-muted-80 transition active:scale-[0.95]"
                aria-label="上一年"
                @click="prevYear"
              >«</button>
              <span class="w-10 text-center text-caption text-ink-muted-80">{{ viewYear }}</span>
              <button
                type="button"
                class="px-apple-sm py-apple-sm text-ink-muted-80 transition active:scale-[0.95]"
                aria-label="下一年"
                @click="nextYear"
              >»</button>
            </div>
            <!-- 上下月 -->
            <div class="flex items-center rounded-pill bg-surface-pearl">
              <button
                type="button"
                class="px-apple-sm py-apple-sm text-ink-muted-80 transition active:scale-[0.95]"
                aria-label="上一月"
                @click="prevMonth"
              >‹</button>
              <span class="w-8 text-center text-caption-strong text-ink">{{ viewMonth + 1 }}</span>
              <button
                type="button"
                class="px-apple-sm py-apple-sm text-ink-muted-80 transition active:scale-[0.95]"
                aria-label="下一月"
                @click="nextMonth"
              >›</button>
            </div>
          </div>

          <div class="flex items-center gap-apple-xs">
            <button
              type="button"
              class="rounded-pill px-apple-md py-apple-sm text-body text-primary transition active:scale-[0.95] hover:bg-surface-pearl"
              @click="jumpToToday"
            >今天</button>
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-chip-translucent/60 text-ink transition active:scale-[0.95]"
              aria-label="关闭"
              @click="close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 周表头 -->
        <div class="mb-apple-xxs grid grid-cols-7 text-center text-caption text-ink-muted-48">
          <div
            v-for="(name, idx) in WEEKDAYS"
            :key="name"
            :class="(idx === 0 || idx === 6) ? 'text-primary' : ''"
          >
            {{ name }}
          </div>
        </div>

        <!-- 日历网格 -->
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            type="button"
            class="relative aspect-square rounded-apple-xs text-caption transition-colors duration-150 active:scale-[0.95] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
            :class="[
              cell.inMonth ? 'text-ink' : 'text-ink-muted-48/60',
              cell.isWeekend && cell.inMonth && !cell.isSelected ? 'text-primary' : '',
              cell.holiday && cell.inMonth && !cell.isSelected ? 'text-primary' : '',
              cell.isSelected
                ? 'bg-primary text-on-primary shadow-hairline'
                : 'hover:bg-surface-pearl'
            ]"
            :title="cell.holiday || ''"
            @click="selectCell(cell)"
          >
            <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {{ cell.day }}
            </span>
            <!-- 今天的小圆点（未选中时显示，选中后被蓝色底代替） -->
            <span
              v-if="cell.isToday && !cell.isSelected"
              class="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
            />
          </button>
        </div>

        <!-- 底部图例 -->
        <div class="mt-apple-md flex flex-wrap items-center gap-apple-md text-fine-print text-ink-muted-48">
          <span class="flex items-center gap-apple-xxs"><span class="h-2 w-2 rounded-full bg-primary"></span>今天/周末/节假日</span>
          <span class="flex items-center gap-apple-xxs"><span class="h-2 w-2 rounded-full bg-surface-chip-translucent"></span>非当月</span>
          <span class="flex items-center gap-apple-xxs"><span class="h-2 w-2 rounded-full bg-primary text-on-primary"></span>选中日</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>
