const cp = require('child_process')
const fs = require('fs')
const path = require('path')

const target = path.resolve('node_modules.bak')
const big = ['core-js', '@babel', '.core-js-gfGRyF7I', 'pdf-lib', 'caniuse-lite', 'pdfjs-dist', 'regenerate-unicode-properties']

const dirs = []
for (const name of big) {
  const top = path.join(target, name)
  let kids = []
  try {
    kids = fs.readdirSync(top)
  } catch {
    continue
  }
  for (const k of kids) {
    const p = path.join(top, k)
    try {
      if (fs.lstatSync(p).isDirectory()) dirs.push(p)
    } catch {}
  }
}
console.log('dirs to clean:', dirs.length)
const BATCH = 80
for (let i = 0; i < dirs.length; i += BATCH) {
  const batch = dirs.slice(i, i + BATCH)
  for (const d of batch) {
    cp.spawn(process.execPath, [path.resolve('scripts/_clean.js'), '--worker', d], {
      stdio: 'ignore',
      detached: true
    }).unref()
  }
}
console.log('launched')
