# 长期记忆（MEMORY.md）

## 用户偏好 / 协作约定
- **记忆只记永久内容，不建每日 md（2026-09-04）**：`MEMORY.md` 只沉淀长期有效的偏好、协作约定、项目常识；不创建以日期为单位的日志文件（如 `2026-09-04.md`、daily notes 等），也不写入一次性进展、临时调试信息。落笔前判断「半年后是否仍然成立」，否则不记。
- **临时文件一律直接删除（2026-09-03 再次确认）**：由我（AI）自己创建的临时/调试文件（如测试脚本 `.xxx-test.mjs`、诊断日志、`.tmp-*` 目录、启动的临时 dev/preview 进程等），清理时直接删除即可，不要询问或等批准。
- 涉及修改/删除**用户已有**文件、运行有副作用的命令（如 git push、安装全局包、删除仓库内既有文件）时，仍应先确认或走正常审批流程。
- **新增网站必须同步抓取 favicon**：在 `src/data/sites.js` 新增任何站点（含空文件夹首次加站点）后，运行 `npm run fetch:favicons`（`scripts/fetch-favicons.mjs` 读取 sites.js 自动下载图标并更新 `src/assets/icons/favicon-manifest.js`），否则页面会用首字母占位图标。favicon 按站点 `name` 作为 manifest 的 key，文件名按 `href` 域名生成（如 dbeaver.io → `favicon-dbeaver-io.png`）。
  - **增量抓取**：脚本已改为「已抓取过且本地图标文件仍在则跳过、不再重新下载」，只抓取新增站点。所以每次加网站跑一遍即可，不会重复下载旧图标。

## 项目常识
- **Vue ref 存对象返回 reactive 代理（2026-09-05 排查教训）**：`ref()` 深度响应，`.value` 存对象时读出的是 **reactive proxy**，与原始对象 `===` 恒为 false。长按拖拽里若用 `drag.value !== st` 判断「定时器是否过期」会永久拦截、导致拖拽永不激活。正确做法：给手势对象加自增 `seq` + `cancelled` 标记，定时器回调只认 `st.seq !== dragSeq || st.cancelled`，不要在定时器里对响应式 ref 值与原始对象做引用比较。
- **自定义壁纸数据结构（2026-09-04）**：`workmate.settings` 存 `searchEngine`；`workmate.wallpaper` 存壁纸 JSON `{ src: dataURL, zoom: 1~8, tx, ty }`（旧版本直接存 dataURL，读取时自动转为 `{src, zoom:1, tx:0, ty:0}` 兼容）。壁纸渲染在 `src/components/Wallpaper.vue`（`object-contain` 完整显示 + 同图模糊铺底；按 `translate(tx,ty) scale(zoom)` 变换），上传压缩与「拖动平移 / 缩放」交互在 `MoreMenu.vue` 的 wallpaper 子面板（预览区与屏幕同宽高比等比缩放）。
- **网站页桌面（文件夹模式，2026-09-04 收敛定稿）**：`workmate.sites.screen` 状态 `layout`（文件夹布局快照；`{kind:'folder', id, label, items:[siteName...]}`，站点一律放在文件夹内、**不允许桌面独立站点**）与 `v2` 标记；读取时若有 `kind:'site'` 遗留自动收拢回其默认分类文件夹并补齐缺失默认分组。交互：桌面仅文件夹，长按文件夹拖动即时让位排序；文件夹弹窗 `views/sites/components/FolderPanelV2.vue` 内长按站点拖动排序、标题可改名、点击打开；文件夹名/站点顺序等修改前先经 `liveOpenedFolder`/`mutableLayout` 固化快照。图标按下 `stopPropagation` 避免与 App 整屏滑动冲突。工具页(tools)仍为 v1 静态分组逻辑不受影响。
