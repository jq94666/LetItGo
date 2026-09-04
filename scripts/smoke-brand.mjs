// 临时冒烟：应用名/标语（用完即删）
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
const ROOT = process.cwd()
const server = spawn('npx', ['vite', '--port', '4178', '--host', '127.0.0.1'], { cwd: ROOT, shell: true, stdio: 'ignore' })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await wait(4000)
let failed = false
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' })
try {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
  await page.goto('http://127.0.0.1:4178/#/', { waitUntil: 'networkidle' })
  const title = await page.title()
  console.log('页面标题:', title)
  if (title !== '随它导航') throw new Error('标题不符：' + title)
  await page.getByRole('button', { name: '更多' }).click()
  await page.getByRole('button', { name: '关于', exact: true }).click()
  await page.waitForFunction(() => /随它导航，不止于导航/.test(document.body.innerText))
  const txt = (await page.locator('[role="dialog"][aria-label="关于"]').innerText()).replace(/\s+/g, ' ')
  console.log('关于:', txt.slice(0, 90))
  if (!/随它导航，不止于导航/.test(txt)) throw new Error('缺少标语')
} catch (e) {
  console.error('测试失败：', e)
  failed = true
} finally {
  await browser.close()
  server.kill()
}
console.log(failed ? '\n=== 品牌冒烟未通过 ===' : '\n=== 品牌冒烟通过 ===')
process.exit(failed ? 1 : 0)
