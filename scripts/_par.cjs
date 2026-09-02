const cp = require('child_process')
const fs = require('fs')
const path = require('path')

const target = path.resolve('node_modules.bak')
const dirs = []
function walk(d) {
  let kids = []
  try {
    kids = fs.readdirSync(d)
  } catch {
    return
  }
  for (const e of kids) {
    const p = path.join(d, e)
    let st
    try {
      st = fs.lstatSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      dirs.push(p)
      walk(p)
    }
  }
}
walk(target)
console.log('total dirs:', dirs.length)
// 非阻塞并行：一次性派发所有 worker，各自处理子目录并带重启
let launched = 0
for (const d of dirs) {
  cp.spawn(process.execPath, [path.resolve('scripts/_clean.js'), '--worker', d], {
    stdio: 'ignore',
    detached: true
  }).unref()
  launched++
}
console.log('launched', launched, 'workers')
