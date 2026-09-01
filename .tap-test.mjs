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
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('[aria-label*="个网站"]', { timeout: 10000 })
await page.waitForTimeout(500)

const before = await page.locator('[role="dialog"]').count()
console.log('panel before tap:', before)

// 点按第一个文件夹
const btn = page.locator('[aria-label*="个网站"]').first()
const box = await btn.boundingBox()
console.log('button box:', box)
await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(600)

const after = await page.locator('[role="dialog"]').count()
console.log('panel after tap:', after)
console.log('RESULT:', after > 0 ? 'OPENED ✅' : 'NOT OPENED ❌')
console.log('console errors:', errors)

await browser.close()
