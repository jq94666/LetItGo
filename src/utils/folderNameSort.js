/* 文件夹/分组的默认名称排序：在第一个差异字符处，英文（字母）开头的排在前，
   中文（拼音）开头的排在后——与资源管理器的中英文混排习惯一致。
   先剥离公共前缀再判别，保证「编程：JAVA库」这类带相同前缀的分组内，
   英文开头的也稳定排在中文开头的之前。
   网站页与工具页的文件夹默认顺序共用此比较器。 */
export function compareByLabel(a, b) {
  let i = 0
  const max = Math.min(a.length, b.length)
  while (i < max && a[i] === b[i]) i++
  if (i >= max) return a.length - b.length // 一方是另一方的前缀：短的在前
  const ra = a.slice(i)
  const rb = b.slice(i)
  const la = /^[a-zA-Z]/.test(ra)
  const lb = /^[a-zA-Z]/.test(rb)
  if (la !== lb) return la ? -1 : 1
  return a.localeCompare(b, 'zh-Hans-CN')
}
