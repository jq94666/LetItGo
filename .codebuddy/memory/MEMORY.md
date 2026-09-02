# 长期记忆（MEMORY.md）

## 用户偏好 / 协作约定
- **临时文件清理无需征得同意**：由我（AI）自己创建的临时/调试文件（如测试脚本 `.xxx-test.mjs`、诊断日志等），可直接删除，不必向用户申请批准。用户已明确授权。
- 涉及修改/删除**用户已有**文件、运行有副作用的命令（如 git push、安装全局包、删除仓库内既有文件）时，仍应先确认或走正常审批流程。
- **新增网站必须同步抓取 favicon**：在 `src/data/sites.js` 新增任何站点（含空文件夹首次加站点）后，运行 `npm run fetch:favicons`（`scripts/fetch-favicons.mjs` 读取 sites.js 自动下载图标并更新 `src/assets/icons/favicon-manifest.js`），否则页面会用首字母占位图标。favicon 按站点 `name` 作为 manifest 的 key，文件名按 `href` 域名生成（如 dbeaver.io → `favicon-dbeaver-io.png`）。
  - **增量抓取**：脚本已改为「已抓取过且本地图标文件仍在则跳过、不再重新下载」，只抓取新增站点。所以每次加网站跑一遍即可，不会重复下载旧图标。
