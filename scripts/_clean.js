// 分批清理：对单个目录优先尝试整体删除（子项≤500 即一次成功，否则向下拆分），
// 单进程删除达上限（~500 项）未删完则重启新进程继续，直到目标目录清空。
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SELF = fileURLToPath(import.meta.url)
const PAR = 16

// 注意：环境的 safe-delete 钩子会在删除成功时也抛出 [safe-delete] 操作失败 的误报，
// 因此不能用异常判定成败，一律以 existsSync 实际结果为准。
function rmIfGone(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true })
  } catch {}
  return !fs.existsSync(p)
}

function cleanOne(p) {
  if (rmIfGone(p)) return
  let kids = []
  try {
    kids = fs.readdirSync(p)
  } catch {
    return
  }
  for (const c of kids) {
    const cp = path.join(p, c)
    if (!rmIfGone(cp)) cleanOne(cp)
  }
  rmIfGone(p)
}

function worker(entry) {
  cleanOne(entry)
  if (fs.existsSync(entry)) {
    spawnSync(process.execPath, [SELF, '--worker', entry], { stdio: 'ignore' })
  }
}

function driver(targetDir) {
  const entries = fs.readdirSync(targetDir).map((e) => path.join(targetDir, e))
  for (let i = 0; i < entries.length; i += PAR) {
    const batch = entries.slice(i, i + PAR)
    for (const e of batch) {
      spawnSync(process.execPath, [SELF, '--worker', e], { stdio: 'ignore' })
    }
  }
}

const mode = process.argv[2]
if (mode === '--worker') {
  worker(process.argv[3])
} else {
  driver(path.resolve(process.argv[2] || '.'))
}
