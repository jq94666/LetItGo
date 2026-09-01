import { chromium } from 'playwright-core'

const EXEC = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const URL = 'http://localhost:5173/sites'

const browser = await chromium.launch({ executablePath: EXEC, headless: true })
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2
})
const page = await context.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('[aria-label*="个网站"]', { timeout: 10000 })
await page.waitForTimeout(500)

const info = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('[aria-label*="个网站"]')]
  const desk = document.querySelector('[ref="deskScroller"]') || document.querySelector('.overflow-y-auto')
  const screen = document.querySelector('.relative.h-full.w-full.overflow-hidden')
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } }
  return {
    docW: document.documentElement.clientWidth,
    screenRect: screen ? rectOf(screen) : null,
    deskRect: desk ? rectOf(desk) : null,
    btns: btns.slice(0, 4).map((b) => ({
      label: b.getAttribute('aria-label'),
      styleLeft: b.style.left,
      styleTop: b.style.top,
      box: rectOf(b)
    }))
  }
})
console.log(JSON.stringify(info, null, 2))
await browser.close()
