# DadKit 设计系统：精致现代简约

全站统一视觉规范。所有页面与组件必须遵守；禁止重新引入已删除的「贴纸可爱风」样式。

## 色彩令牌（app/globals.css `:root`）

| 角色 | 值（HSL） | Tailwind 用法 |
| --- | --- | --- |
| background | 350 33% 98%（微粉暖白，纯色无渐变） | `bg-background` |
| foreground | 345 15% 20%（暖墨色） | `text-foreground` |
| card | 0 0% 100%（纯白卡片） | `bg-card` / `text-card-foreground` |
| primary | 348 78% 62%（珊瑚粉） | `bg-primary` / `text-primary` / `text-primary-foreground` |
| secondary | 350 70% 96%（主色极浅底，hover/选中） | `bg-secondary` / `text-secondary-foreground` |
| muted | 350 20% 95%（分隔、弱底） | `bg-muted` / `text-muted-foreground` |
| border | 350 25% 91%（真实边框色） | `border-border`（输入框用 `border-input`） |
| destructive | 3 62% 45% | `bg-destructive` |

物品图标彩色底（清单行内 tile，按所属包着色）：

- `--tile-mom-bg/fg`（妈妈包·粉）、`--tile-baby-bg/fg`（宝宝包·杏）、`--tile-docs-bg/fg`（证件包·蓝灰）
- `--tile-dad-bg/fg`（爸爸背包·灰绿）、`--tile-car-bg/fg`（车上·灰紫）、`--tile-lastminute-bg/fg`（临出门·玫红）
- 用法：`lib/presentation/item-icons.ts` 的 `getItemTileTone(item)` + `ITEM_TILE_TONE_STYLES`，经内联 style 应用

状态色一律用 Tailwind 标准色淡底：

- 成功/已完成：`border-emerald-200 bg-emerald-50 text-emerald-700`
- 警告/待确认：`border-amber-200 bg-amber-50 text-amber-800`

## 页面 hero 与色块卡片

- 页面顶部主卡（首页倒计时、清单进度、临出门就绪度）用珊瑚渐变 hero：`linear-gradient(135deg, hsl(348 82% 64%) 0%, hsl(16 86% 70%) 100%)`，白字、白色进度条（轨道 `bg-white/30`）、`rounded-2xl`。渐变只允许出现在这类页面级 hero 上，按钮、普通卡片仍纯色。
- 模块/快捷导航使用同一套 tile 配色：首页准备模块行保持白底，仅 `icon-tile` 取 `--tile-*-bg` / `--tile-*-fg`；医院快捷宫格整卡使用 tile 淡底，图标块为 `bg-white/85`，状态文字使用对应 fg 色。
- 清单"打包分组" tab 的 tile 配色表在 `lib/presentation/item-icons.ts` 的 `CHECKLIST_GROUP_TILE_STYLES`，与物品行 tile 共用同一组 `--tile-*` 变量。

## 形状、阴影、排版

- `--radius: 1rem`；卡片一律 `rounded-xl`，行 `rounded-xl`，图标块 `rounded-lg`，按钮 `rounded-lg`（Badge 保持 `rounded-full`）
- 阴影只有一档：`shadow-sm`（tailwind.config 已覆盖为暖粉调 `0 1px 2px rgb(234 83 113/.05), 0 6px 20px rgb(234 83 113/.06)`）。弹层可用 `shadow-md`/`shadow-lg`
- 页面标题：`text-xl sm:text-2xl font-semibold`；卡片标题：`text-sm font-semibold`（`CardTitle` 默认已是）；正文：`text-sm`；辅助：`text-xs text-muted-foreground`
- 字重最多 `font-bold`，优先 `font-semibold`；全站禁止 `font-black`

## 标准件（优先复用，不要自造）

- 卡片：`<Card>`（已是新样式）或 `className="card-surface"`
- 行：`className="list-row"`（图标块 + 标题 + 副文 + chevron 的统一行）
- 图标块：`className="icon-tile"`（`size-10 rounded-lg bg-secondary text-primary`，可用 `size-9`/`size-11` 微调）；清单物品行用 `lib/presentation/item-icons.ts` 的 `getChecklistItemIcon(item)` 取物品级图标，配 `ITEM_TILE_TONE_STYLES` 按包着色的 tile
- 小节标签：`className="section-kicker"`（`text-xs font-semibold text-muted-foreground`）
- 页眉：`<PageIntro eyebrow title description>`（标题、描述整行排布，无插画位）
- Badge variant：`default | secondary | outline | muted | success | warning`
- Button variant：`default | destructive | outline | secondary | ghost | link`（纯色无渐变）
- Tabs：激活态为白底 segmented 样式；Progress：纯色 primary

## 已删除，禁止使用

- 颜色：`bg/text/border-cream|peach|mint|blush|lavender|coral|amber(-soft|-foreground)`（令牌已删，类不会生成）
- 组件类：`pony-*`、`macaron-*`、`journal-*`、`cute-eyebrow`、`sticker-surface`、`app-hero-card`、`app-list-card`、`app-list-row`、`app-icon-tile`、`soft-panel`、`paper-card`、`soft-detail`、`share-poster-*`
- `shadow-soft`（已删）→ `shadow-sm`
- `border-white/80`、`border-white/90`、`bg-card/95` → `border-border`、`bg-card`
- 装饰渐变（`linear-gradient`/`radial-gradient` 背景）与装饰 emoji 字符（✿ ✦ ❤ 等）；页面级 hero 卡除外（见「页面 hero 与色块卡片」，仅允许规定的珊瑚渐变）
- 界面不使用插画，视觉依靠渐变 hero 与分色图标 tile；页面源码禁止引用 `/illustrations/` 路径（`public/illustrations/` 素材仅作历史保留）

## 改造约束

- 只改视觉类与装饰结构；不改业务逻辑、store、数据流、路由、文案（装饰性 emoji 除外）
- 不引入新依赖；保持 mobile-shell（390px）移动优先，`sm:` 断点同步适配桌面端
