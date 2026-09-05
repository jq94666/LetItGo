---
version: ios26-liquid-glass
name: workmate-design-system
description: >-
  Workmate 的界面设计真源，以 iOS 26「Liquid Glass（液态玻璃）」为视觉语言基准，
  继承 Apple 官网 v1 分析（摄影克制、单一 Action Blue、SF 字阶、8pt 间距）后，
  将“表面”从扁平卡片升级为「承载于壁纸之上的玻璃浮层」。
  玻璃通过 backdrop-blur + saturate 折射背后内容，以顶部高光边缘与细内描边定义形状，
  用材质透明度（而非边框/阴影）表达层级；阴影只用于“玻璃浮离表面”的轻柔深度。
  本文档同步驱动 src/style.css 的 Tailwind v4 @theme 令牌与全部全局组件外观。

colors:
  primary: "#0066cc"
  primary-focus: "#0071e3"
  primary-on-dark: "#2997ff"
  ink: "#1d1d1f"
  body: "#1d1d1f"
  body-on-dark: "#ffffff"
  body-muted: "#cccccc"
  ink-muted-80: "#333333"
  ink-muted-48: "#7a7a7a"
  divider-soft: "#f0f0f0"
  hairline: "#e0e0e0"
  canvas: "#ffffff"
  canvas-parchment: "#f5f5f7"
  surface-pearl: "#fafafc"
  surface-tile-1: "#272729"
  surface-tile-2: "#2a2a2c"
  surface-tile-3: "#252527"
  surface-black: "#000000"
  surface-chip-translucent: "#d2d2d7"
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  glass-tint: "rgba(255,255,255,0.55)"
  glass-edge: "rgba(255,255,255,0.85)"
  glass-rim: "rgba(255,255,255,0.35)"
  glass-shadow: "rgba(31,38,135,0.22)"
  scrim: "rgba(15,23,42,0.32)"

materials:
  # 玻璃基础 = 半透明白 + 模糊 + 高饱和 + 顶部高光 + 细内描边
  # 层级越高透明度越低、模糊半径越大；前景文字一律不透明 ink
  glass-panel:
    background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.75))"
    backdropFilter: "blur(28px) saturate(185%)"
    rim: "inset 0 0 0 0.5px rgba(255,255,255,0.6)"
    topHighlight: "inset 0 0.5px 0 rgba(255,255,255,0.9)"
    shadow: "0 24px 48px -12px rgba(31,38,135,0.25)"
  glass-pill:
    background: "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.6))"
    backdropFilter: "blur(24px) saturate(180%)"
    rim: "inset 0 0 0 0.5px rgba(255,255,255,0.6)"
    topHighlight: "inset 0 0.5px 0 rgba(255,255,255,0.9)"
    shadow: "0 6px 16px -6px rgba(31,38,135,0.18)"
  glass-tile:
    background: "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.86))"
    backdropFilter: "blur(20px) saturate(175%)"
    rim: "inset 0 0 0 0.5px rgba(255,255,255,0.5)"
    topHighlight: "inset 0 0.5px 0 rgba(255,255,255,0.95)"
    shadow: "0 10px 24px -10px rgba(31,38,135,0.2)"

typography:
  # 与 src/style.css @theme 一一对应（--text-* 主变量 + --*-- 子属性）
  hero-display: { fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif", fontSize: 56px, fontWeight: 600, lineHeight: 1.07, letterSpacing: -0.28px }
  display-lg: { fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif", fontSize: 40px, fontWeight: 600, lineHeight: 1.1, letterSpacing: 0 }
  display-md: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 34px, fontWeight: 600, lineHeight: 1.47, letterSpacing: -0.374px }
  lead: { fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif", fontSize: 28px, fontWeight: 400, lineHeight: 1.14, letterSpacing: 0.196px }
  lead-airy: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 24px, fontWeight: 300, lineHeight: 1.5, letterSpacing: 0 }
  tagline: { fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif", fontSize: 21px, fontWeight: 600, lineHeight: 1.19, letterSpacing: 0.231px }
  body-strong: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 17px, fontWeight: 600, lineHeight: 1.24, letterSpacing: -0.374px }
  body: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 17px, fontWeight: 400, lineHeight: 1.47, letterSpacing: -0.374px }
  caption: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 14px, fontWeight: 400, lineHeight: 1.43, letterSpacing: -0.224px }
  caption-strong: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 14px, fontWeight: 600, lineHeight: 1.29, letterSpacing: -0.224px }
  button-large: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 18px, fontWeight: 300, lineHeight: 1.0, letterSpacing: 0 }
  button-utility: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 14px, fontWeight: 400, lineHeight: 1.29, letterSpacing: -0.224px }
  fine-print: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 12px, fontWeight: 400, lineHeight: 1.0, letterSpacing: -0.12px }
  micro-legal: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 10px, fontWeight: 400, lineHeight: 1.3, letterSpacing: -0.08px }
  nav-link: { fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif", fontSize: 12px, fontWeight: 400, lineHeight: 1.0, letterSpacing: -0.12px }

radius:
  none: 0px
  xs: 5px
  sm: 8px
  md: 11px
  lg: 18px
  pill: 9999px
  full: 9999px
  # iOS 应用图标超级椭圆（squircle）近似
  app-icon: 24%
  app-icon-mini: 28%

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 17px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px

layout:
  contentMax: 680px   # 主页搜索/单列内容最宽
  sheetMax: 680px     # 文件夹展开面板最宽
  gridDesktop: 12     # 网站页桌面列数
  gridMobile: 4

components:
  # —— 全局壳（受本次 Liquid Glass 升级约束）——
  dock:
    material: glass-pill
    radius: pill
    height: 56px
    note: 底部标签导航容器：玻璃胶囊 + tab（选中态 = Action Blue 白字胶囊）
  folder-tile:
    material: glass-pill
    radius: app-icon (24%)
    note: 桌面“文件夹”图标；内部 1–9 个 mini 图标以 parchment 小圆角方格承载
  folder-panel:
    material: glass-panel
    radius: 28px
    shadow: product + glass
    note: 文件夹展开面板（DesktopFolderPanel / FolderPanelV2）：玻璃卡片浮于壁纸与遮罩上
  app-icon:
    material: glass-tile
    radius: app-icon (24%)
    note: 网站/工具单图标（AppTile / ToolTile）；favicon 或 emoji 居中，hover 1.05 / 按下 0.95
  search-card:
    material: glass-panel
    radius: lg (18px)
    note: 主页搜索框外层：内置白 pill 输入框，focus 时浮起并投影增强
  more-menu:
    material: glass-panel
    radius: lg (18px)
    note: “更多”底部弹层 / 桌面端居中弹层；移动端从底部上滑
  tool-modal:
    material: glass-panel
    radius: lg (18px)
    note: 各工具页 Teleport 弹窗（21 个 *Tool.vue 共享的模板副本），本轮不逐个改
  toggle:
    track: "bg-primary（开）/ bg-hairline（关），44pt 命中区"
    knob: "bg-white 圆点，shadow-hairline"
  # —— 交互原子 ——
  primary-button:
    background: colors.primary
    color: colors.on-primary
    radius: pill
    press: "scale(0.95-0.98)"
  secondary-button:
    background: canvas-parchment / canvas
    color: ink / ink-muted-80
    radius: pill 或 md
  icon-circle-button:
    background: "rgba(0,0,0,0.05)"
    radius: full
    size: 32px (关闭) / 44px (主浮层)

# —— 手势与动效 ——
motion:
  pressScale: "0.95 ~ 0.98"
  modalIn: "translate-y-4 scale-95 → 1（卡片） + 遮罩淡入"
  folderOpen: "scale(0.25) → 1，cubic-bezier(0.16,1,0.3,1)"
  focusRing: "2px solid primary-focus"
---

# Workmate 设计系统 · iOS 26 Liquid Glass 基准

> 本文件是界面外观的**唯一设计真源**，`src/style.css` 的 `@theme` 令牌、以及所有组件的视觉类，都应按本文档对齐。原 `DESIGN-apple.md` v1（Apple 官网摄影驱动页面分析）的完整分析保留在文末附录，其色彩 / 字阶 / 间距 / 圆角 token 继续作为本系统的继承底座。

## 一、视觉定位

Workmate 是一个**运行在浏览器里的“随身桌面”**：默认/自定义壁纸铺满整屏，三页内容（主页 / 网站 / 工具）与底部 Dock 悬浮其上。iOS 26 的 **Liquid Glass（液态玻璃）** 恰好定义了这种形态的材质语言：

- **玻璃承载内容，不画边框**：一切浮层（Dock、文件夹图标、文件夹面板、弹窗、搜索卡片）都是“玻璃板”，背后壁纸经 `backdrop-filter: blur() saturate()` 折射成柔和色斑，层级由**玻璃的透过程度**表达，而不是描边粗细。
- **高光即形状**：每块玻璃顶部有一条**细高光边缘**（`inset 0 0.5px 0 rgba(255,255,255,.9)`），叠加内侧 0.5px 白色 rim，玻璃边缘因此“亮起来”，这是液态玻璃区别于普通毛玻璃的核心。
- **颜色延伸（Color wash）**：玻璃不必涂满白，而是让壁纸色彩透过玻璃成为自身色调——前景文字、图标始终不透明，保证可读。
- **单点强调色不变**：所有可点信号仍只用 Action Blue `#0066cc`（选中态、链接、焦点环）。玻璃是“承载”，蓝色是“动作”。

### 与 v1 的关系
v1（Apple 官网）用“浅色 / 深色 tile 交替 + 一条产品阴影”制造节奏；Liquid Glass 版用“玻璃透明度 + 高光 + 壁纸色透出”制造节奏。二者共用：SF 字阶、8pt 间距体系、`rounded.app-icon` 圆角语法、单一 Action Blue。

## 二、颜色令牌

| Token | 值 | 用途 |
|---|---|---|
| `colors.primary` | `#0066cc` | 选中 tab、主按钮、链接、toggle 开、焦点主色 |
| `colors.primary-focus` | `#0071e3` | `focus-visible` 焦点环（2px） |
| `colors.primary-on-dark` | `#2997ff` | 深色表面上的链接色（本轮浅色系统预留） |
| `colors.ink` | `#1d1d1f` | 前景主文字、图标（近黑，非纯黑） |
| `colors.ink-muted-80` | `#333333` | 次级文字 / 普通按钮字 |
| `colors.ink-muted-48` | `#7a7a7a` | 辅助说明、禁用 |
| `colors.canvas` | `#ffffff` | 玻璃内嵌的实底输入框、下拉选项激活底 |
| `colors.canvas-parchment` | `#f5f5f7` | 玻璃内的“内容坑”底色（列表项、mini 图标底） |
| `colors.surface-pearl` | `#fafafc` | 更亮按钮底 |
| `colors.glass-tint/-edge/-rim/-shadow` | 见 frontmatter | 玻璃四件套：底色 / 高光 / 内描边 / 投影像色 |
| `colors.hairline` | `#e0e0e0` | 输入框细边、开关关态轨道 |

> **深色**：本轮不实现 `prefers-color-scheme` 深色，所有 token 为浅色壁纸体系下的常量。

## 三、玻璃材质

玻璃统一为“**半透明白渐变 + blur + saturate + 顶部高光 + 内 rim**”。三档按层级取用：

| 层级 | 透明度 | blur / saturate | 典型位置 |
|---|---|---|---|
| `glass-tile` | 96%→86% | 20px / 175% | 应用/文件夹单图标、壁纸小按钮 |
| `glass-pill` | 82%→60% | 24px / 180% | Dock、胶囊按钮、桌面文件夹图标 |
| `glass-panel` | 90%→75% | 28px / 185% | 文件夹面板、更多弹层、搜索卡片、工具弹窗 |

通用实现（以 panel 为例）：

```css
background: linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.75));
-webkit-backdrop-filter: blur(28px) saturate(185%);
backdrop-filter: blur(28px) saturate(185%);
box-shadow:
  inset 0 0 0 0.5px rgba(255,255,255,.6),   /* 细内描边 = rim */
  inset 0 .5px 0 rgba(255,255,255,.9),      /* 顶部高光 */
  0 24px 48px -12px rgba(31,38,135,.25);    /* 轻柔离屏阴影 */
```

铁律：

1. **前景文字/图标一律不透明**（`colors.ink` 系），玻璃只透背景，不透前景。
2. **不加外描边**（旧 `ring-black/5` 移除）：玻璃的形状由 rim + 高光表达，外轮廓用极小透明投影。
3. **阴影只表达“离屏”**，不在卡片间制造互相压叠；投影统一带一点蓝（`31,38,135`）而不是纯黑。
4. 玻璃背后若内容复杂（自定义壁纸），可叠加 `colors.canvas/70 → 85` 提高不透明度保证对比（见 home 搜索框与搜索下拉）。

## 四、排版与圆角

字阶沿用 v1（SF 字族 + Apple 负字距），详见 frontmatter `typography`。要点：

- 全局正文 `--text-apple-body`（17px/1.47/-0.374px）；标题与正文同宽时用 600 字重。
- 名称/说明（文件夹名、应用名、弹窗标签）用 `caption`（14px）/ `caption-strong`；小注 `fine-print`（12px）。
- **工具弹窗头不再加副标题**（主标题一行）。
- 圆角：图标 `radius.app-icon`（24% 超级椭圆）、mini 图标 28%、玻璃面板 `lg`（18px）、文件夹面板 28px、动作胶囊 `pill`。

## 五、全局壳规范（本轮实施）

### 5.1 Dock（App.vue 底部导航）
- 容器：`glass-pill` 玻璃胶囊，宽 `min(420px, 屏宽-2*md)`，圆角 pill，内 `p-4px`。
- tab：flex-1 竖排 emoji+label；当前 tab = **Action Blue 胶囊**（`bg-primary text-on-primary`），非当前 = `text-ink-muted-80`；按下 `scale(0.96)`；焦点环 `primary-focus`。
- 右侧“更多”独立小玻璃胶囊，同 Dock 高度。
- 底部 Home 指示条：`bg-ink/25` 圆角条，居中 4×104px。

### 5.2 桌面图标与文件夹
- **应用图标**（`AppTile` / `ToolTile`）：`glass-tile`，`radius.app-icon`；favicon（52% 内容区）/ emoji（22px）居中；hover `scale(1.05)`、按下 `scale(0.95)`；站点/工具名称用 `caption`（14px）muted-80，两行截断。
- **文件夹图标**（`DesktopFolderTile`）：`glass-pill` + `radius.app-icon`，内 `p-[10%]`；mini 图标以 `canvas-parchment` 28% 圆角小格铺 1–9 个，favicon 占小格 62%。

### 5.3 文件夹面板（DesktopFolderPanel / FolderPanelV2）
- 遮罩：`scrim`（`rgba(15,23,42,.32)`）+ 轻 `backdrop-blur(2-4px)`。
- 卡片：`glass-panel`，圆角 28px，宽响应式 340→680px，高 `max-h-[78%]`；内部图标网格 `3→5` 列。
- 打开动画：从文件夹处 `scale(0.25)` 放大 + 淡入（`cubic-bezier(0.16,1,0.3,1)`）。
- V2 支持标题内联改名（pill 输入框）、长按图标拖拽排序（抓起时 `scale(1.16) translateY(-3px)` + 蓝色投影）。

### 5.4 更多弹层与搜索
- 更多菜单（`MoreMenu`）：`glass-panel` 圆角 lg；移动端贴底上滑、桌面端居中；顶部拖动指示条 `bg-black/15`。
- 主页搜索：外层 `glass-panel`（圆角 lg）内含 44px 白 pill 输入框；focus 时外层浮起（`shadow-product`）。搜索下拉 `bg-canvas/95` + blur + 玻璃 rim，选中项 `canvas-parchment` 底。

### 5.5 工具弹窗
- 21 个 `views/tools/components/*Tool.vue` 共用同一模板副本：Teleport 遮罩 + `glass-panel` 卡片，宽度 `max-w-xl→3xl`，头部无副标题，内容区可滚动。本轮仅以文档约束，不逐文件改（后续如需统一可抽公共 ModalShell）。

## 六、交互原子

| 原子 | 视觉 | 状态 |
|---|---|---|
| 主动作 pill | `bg-primary text-on-primary rounded-pill` | hover 轻微压暗；按下 scale .97；禁用 50% |
| 次动作 pill/圆角 | `bg-canvas-parchment text-ink` | hover 变深 5%；按下 scale .97 |
| 图标圆钮 | `bg-black/5 rounded-full h-8/9` | hover `bg-black/10`；按下 scale .9 |
| 开关 | 轨道 24×44 pill，关=`hairline` 开=`primary`，白圆点 | 无 |
| 焦点环 | `ring-2 ring-primary-focus`（focus-visible only） | 键盘导航可达性 |

## 七、动效

- 按压统一 `scale(0.95~0.98)`（150-200ms，ease-out）。
- 弹层进场：遮罩淡入 + 卡片 `translateY(8-16px) scale(.95)→1`；文件夹展开用专用 scale-from-tile 曲线。
- 内容切换（更多菜单子页）轻微淡入 + `translateY(6-8px)`。
- 页面横滑：3 面板轨道位移，360ms `cubic-bezier(0.16,1,0.3,1)`（Apple 弹簧感）。
- 尽量少用 `transition-all`，改列具体属性，减少布局抖动。

## 八、Do / Don't

**Do**
- 所有浮层先取对应玻璃档位，再决定不透明度；前景永远实色。
- 保留单一 Action Blue；focus-visible 统一 `primary-focus` 2px 环。
- 图标统一超级椭圆 24%（含 About 图标）；小内容格 28%。
- 名称/正文走 token：`caption`(14px) 起，说明文字 `fine-print`。
- 用材质与高光“画”形状，阴影只表达离屏。

**Don't**
- 不再给浮层加 `ring-black/5` 等外描边（玻璃自带 rim）。
- 不引入第二个强调色；不把 `primary-on-dark` 用在浅色玻璃上。
- 玻璃不压前景：文字对比度不足时提高玻璃白不透明度而非加深文字。
- 不动 v1 的 SF 字阶与 8pt 间距；深度不用大段黑色。

## 九、代码对齐（style.css / 组件）

`src/style.css` 将新增 `@theme` 令牌与 `@utility`/组件类：

```css
@theme {
  --color-glass-tint: rgba(255,255,255,.55);
  --color-glass-edge: rgba(255,255,255,.85);
  --color-glass-rim: rgba(255,255,255,.35);
  --shadow-glass: 0 24px 48px -12px rgba(31,38,135,.25);
}
```

组件类（`@layer components` 或直接原子组合）：`.glass-panel/.glass-pill/.glass-tile` 会以高光+rim+blur 供全局组件引用。主要组件更新范围：`App.vue`（Dock）、`MoreMenu.vue`、`DesktopFolderTile.vue`、`AppTile.vue`、`ToolTile.vue`、`DesktopFolderPanel.vue`、`FolderPanelV2.vue`、`views/home/index.vue`（搜索）。工具弹窗本轮不逐改，仅套文档约束。

---

## 附录 · v1 Apple 官网分析（继承来源）

> 以下为原 DESIGN-apple.md v1 的要点摘录，token 已并入本系统 frontmatter；v1 面向“苹果官网营销页”的分析仍作为材质/字阶/间距的推导证据，不再作为界面直接规范。

**v1 关键结论**
1. **单一强调蓝**：Action Blue #0066cc 是所有交互的唯一信号；Press 用 scale，不用换色。
2. **摄影克制 / 无装饰梯度**：深度来自表面明暗交替与唯一产品投影。
3. **SF Pro Display + Text 双字族**：显示字 600 + 负字距（Apple tight）；正文 17px 不是 16px。
4. **字阶 300/400/600/700**，刻意不用 500。
5. **圆角语法**：pill=动作，lg=内容卡，sm=紧凑 utility，24%=超级椭圆图标（本系统继承）。
6. **8pt 间距与节律**：md=17px 由 17px 正文行高派生，显示在每页复现。
7. 原 v1 的 `product-tile-*`、`global-nav`、`sub-nav-frosted`、`footer` 等营销页组件在本产品不直接使用，token（surface-tile-1/2/3、divider-soft、hairline 等）保留作深色/强调预留。

---

## Known Gaps
- Liquid Glass 的“背景折射畸变”（真液态折射）无法纯 CSS 完整模拟，本系统以“blur + saturate + 高光”作 Web 近似。
- 传感器驱动的动态高光（iOS 真机陀螺仪）不在 Web 范围，维持静态高光。
- 深色模式、动态色彩（Dynamic Color）留待下一迭代。
- 21 个工具弹窗仍是模板副本，未来建议抽公共 `ModalShell` 组件后再统一批量应用本轮玻璃规范。
