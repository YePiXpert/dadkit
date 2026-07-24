# 执行规格：首页信息架构精简 + 全站插画点缀（交给 Codex 执行）

> **已归档（2026-07）**：本文引入的插画体系（`CuteIllustration`、`illustrationVariant`、`getBabyMascot`）已在后续版本全站移除，仅作历史记录保留。当前有效规范见 [design-system.md](./design-system.md)。
>
> 本规格只描述改动点、参数、样式值、断言变化和参考来源，不含代码全文。
> 代码风格遵循现有文件与 `docs/design/design-system.md`（精致现代简约风）。
> 行号基于当前 main（commit `4a86d4c`），仅供定位，以锚点字符串为准。

## 0. 背景与目标

用户两条反馈：① 画面不够吸引人；② 首页功能冗余、按钮多、无从下手。

对策（已确认方向）：

- **A. 首页信息架构精简**：7 个区块 → 5 个，合并两个重复的准备度面板，删除快捷操作宫格，每个入口只出现一次。
- **B. 全站插画点缀**：保持简约设计系统不变，在规定点位恢复 `public/illustrations/` 透明 PNG 插画（v1.3 改版时被移除，资源文件仍在磁盘上且 sw.js 仍在缓存）。

约束红线（违反会被测试拦住）：

- 插画只允许经新建的 `components/CuteIllustration.tsx` 引入；页面源码禁止出现 `/illustrations/` 字面量（`tests/ui-style.test.ts` 对全部 app 源码有此断言，保留）。
- `components/AppHeader.tsx` 与 `components/SharePosterCanvas.tsx` 禁用 `next/image`（现有断言，不动）。
- `app/globals.css` 禁止出现 `linear-gradient`/`radial-gradient`（hero 渐变只能放 TS 文件内联 style）。
- 禁止恢复 sticker 可爱风 CSS 类（pony-/macaron-/journal-/shadow-soft 等）、装饰 emoji、`font-black`、`border-white/80`、`bg-card/95`（MobileNav 除外，已有豁免断言）。
- 移动端 390px `mobile-shell` 约束：插画一律 `shrink-0`，相邻文字列一律 `min-w-0 flex-1`，不得造成横向溢出。

## 1. 新建 `components/CuteIllustration.tsx`

结构参考 `git show 5ea8099^:components/CuteIllustration.tsx`，**但去掉旧的贴纸容器样式**（旧版的 `border border-white/80 bg-accent/70 shadow-soft` 已禁用）——透明 PNG 直接渲染，无边框、无底色、无阴影。

接口（签名级描述）：

```ts
export type CuteIllustrationVariant =
  | "horse" | "helper" | "family" | "checklistBag" | "goBunny"
  | "babyTimer" | "hospitalRoute" | "timelineCalendar"
  | "postpartumPaperwork" | "shareSummary";

type CuteIllustrationProps = {
  variant?: CuteIllustrationVariant; // 与 src/alt 覆盖二选一，默认 "horse"
  src?: string;                      // 覆盖模式：直接用给定 src（配 alt），供 getBabyMascot 结果使用
  alt?: string;
  className?: string;                // 调用方控制尺寸/宽高比
  imageClassName?: string;
  priority?: boolean;                // 默认 false
  sizes?: string;                    // 默认 "96px"
};
```

渲染规格：外层 `div.relative.overflow-hidden` + 宽高比类 + `className`；内部 `next/image` 用 `fill` + `object-contain`。默认 `aspect-square`；`family`、`babyTimer` 两个 variant 默认 `aspect-[3/2]`。

variant → 资源映射（尺寸为 PNG 实际像素，已实测）：

| variant | 文件 | 尺寸 | alt（中文） |
| --- | --- | --- | --- |
| horse | `/illustrations/dadkit-horse-girl.png` | 1254×1254 | 小马宝宝插画 |
| helper | `/illustrations/dadkit-bear-transparent.png` | 1254×1254 | 小熊助手插画 |
| family | `/illustrations/dadkit-family-transparent.png` | 1536×1024 | 一家人准备待产插画 |
| checklistBag | `/illustrations/dadkit-checklist-bag-sticker-v2.png` | 1254×1254 | 待产包清单贴纸插画 |
| goBunny | `/illustrations/dadkit-go-bunny.png` | 1065×1196 | 临出门小兔插画 |
| babyTimer | `/illustrations/dadkit-baby-girl-timer.png` | 1536×1024 | 宝宝计时插画 |
| hospitalRoute | `/illustrations/dadkit-hospital-route-sticker-v2.png` | 1254×1254 | 医院路线贴纸插画 |
| timelineCalendar | `/illustrations/dadkit-timeline-calendar-sticker-v2.png` | 1254×1254 | 时间线日历贴纸插画 |
| postpartumPaperwork | `/illustrations/dadkit-postpartum-paperwork-sticker.png` | 1536×1536 | 产后手续贴纸插画 |
| shareSummary | `/illustrations/dadkit-share-summary-sticker-v2.png` | 1254×1254 | 准备摘要分享贴纸插画 |

`next/image` 安全性：`next.config.ts` 中 Capacitor 导出时 `images.unoptimized=true`，VPS 为 standalone，两种构建均可用。

## 2. 新建 `lib/presentation/hero-gradient.ts`

导出常量：

```ts
export const HERO_GRADIENT =
  "linear-gradient(135deg, hsl(348 82% 64%) 0%, hsl(16 86% 70%) 100%)";
```

替换三处硬编码（值不变，只改引用）：

- `app/page.tsx` 第 38–39 行的 `HERO_GRADIENT` 常量删除，改为 import。
- `app/checklist/page.tsx` `ChecklistProgressCard`（约 L359-364）内联 style。
- `app/go/page.tsx` hero（约 L197-200）内联 style。

## 3. 首页 `app/page.tsx`：精简 + hero 增强

### 3.1 删除清单（函数/常量及文案）

- `HomePlanReadyPanel`（L150-187）、`HomePlanLink`（L189-225）
- `HomeToolsPanel`（L536-547）、`HomeToolLink`（L549-577）、`homeTools` 数组（L512-534）
- 文案「方案已生成」「快捷操作」随之移除
- `planModuleIcon`（L227-241）与 `MODULE_TILE_TONE`（L22-27）**保留**，移给合并后的模块行用
- 清理随之不再使用的 import（如 `Share2`；`CheckCircle2`/`Hospital`/`CalendarClock` 视剩余用途决定）

### 3.2 新 JSX 顺序（L122-141 区域）

1. `HomeHeroCard`（见 3.3 增强）
2. `TodayFocusPanel`（逻辑不变，位置从第三位提到第二位——新用户首先看到"现在做什么"）
3. `preparationSummary && <ReadinessMetricsPanel summary={preparationSummary} />`（合并改版，见 3.4）
4. `HomeLaborModePanel`（不变）
5. `InstallPrompt`（不变）

外层 `mobile-shell grid gap-3` 与底部免责声明不变。

### 3.3 `HomeHeroCard` 增强规格

- section 容器：现有 `rounded-2xl p-5 text-primary-foreground shadow-sm` + `HERO_GRADIENT` 不变；追加 `relative overflow-hidden`。
- 装饰（不用 emoji、不新增渐变）：section 内**最前**插入 2 个 `aria-hidden` 绝对定位圆：
  - `pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-white/15`
  - `pointer-events-none absolute -bottom-10 right-16 size-16 rounded-full bg-white/10`
- 布局：kicker/「预产期倒计时」/h1/日期/生肖行 5 个元素包进左列 `div.min-w-0.flex-1`，与右侧插画组成 `flex items-start justify-between gap-3`；进度条区块保持整宽在下方。
- 插画：`getBabyMascot(profile)`（`lib/baby-profile.ts` 已有，返回 `{ alt, src }`；无资料→horse，属马女宝→horse，女宝→babyTimer，其他→helper），经 `CuteIllustration` 的 `src`/`alt` 覆盖模式渲染，`className="size-24 shrink-0 drop-shadow-sm sm:size-28"`，`priority`，`sizes="(max-width: 640px) 96px, 112px"`。
- 倒计时数字：`text-5xl` → `text-6xl`（h1 其余类不变）。

### 3.4 `ReadinessMetricsPanel` 合并改版（吸收原 HomePlanReadyPanel）

函数名保留 `ReadinessMetricsPanel`（测试断言它）。结构：

- 标题行：`mb-3 flex items-center justify-between gap-3` —— `h2.text-sm.font-semibold`「入院准备」+ 右侧 `<Link href="/share">`「导出与协作」，样式 `shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-primary`（与原 share 按钮一致）。
- 摘要盒（从原 HomePlanReadyPanel 搬入）：`mb-3 rounded-lg border border-border bg-muted px-3 py-2`，内两行：
  - `{summary.readiness.label} {summary.readiness.percent}%`（`text-xs font-semibold text-primary`）
  - `下一步：{summary.nextAction.label}`（`mt-0.5 break-words text-xs leading-4 text-muted-foreground`）
- 4 个模块行：`grid gap-2`，行组件保留名 `ReadinessMetricRow`，结构改为：
  - 容器仍为 `Link`，类 `flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition-colors active:bg-secondary`
  - 行首：`icon-tile` + 内联 style `ITEM_TILE_TONE_STYLES[MODULE_TILE_TONE[metric.id]]`，图标用 `planModuleIcon(metric.id)`（`size-4`）
  - 中列 `div.min-w-0.flex-1`：title（`break-words text-sm font-semibold leading-5`）、caption（`mt-0.5 break-words text-xs leading-4 text-muted-foreground`）、`Progress`（`mt-2`）
  - 右列 `span.shrink-0.text-sm.font-semibold.text-primary`：`{completed}/{total}`
- 宫缩状态 Link 行（`/contractions`，含「不计入总准备进度」）：原样保留在模块行之后。
- 渲染条件不变：仅 `preparationSummary` 存在时渲染。

## 4. 其他页面插画点位（逐项规格）

统一规则：插图片均 `shrink-0`；相邻文字列补 `min-w-0 flex-1`；`sizes` 按渲染尺寸填写。

| # | 文件 / 函数 | 锚点 | 改动 | variant / 尺寸类 / sizes |
| --- | --- | --- | --- | --- |
| 1 | `app/checklist/page.tsx` `ChecklistProgressCard` | 首个 flex 行（L366-380） | 右端 `span {completed}/{total}` 移入左列 percent 行内（`text-sm font-semibold`）；行尾加插画；左列补 `min-w-0 flex-1` | `checklistBag`，`size-16 sm:size-20`，`sizes="(max-width: 640px) 64px, 80px"` |
| 2 | `app/go/page.tsx` hero | 首个 flex 行（L202-214） | 中间文字 div 补 `flex-1`，行尾加插画 | `goBunny`，`size-14 sm:size-16`，`sizes="(max-width: 640px) 56px, 64px"` |
| 3 | `app/contractions/page.tsx` 待产准备状态 Card | 右列 `Button`（L188-190） | 右列改为 `flex items-center gap-3`，Button 前加插画 | `babyTimer`，`size-14`，`sizes="56px"` |
| 4 | `components/TimelineDashboard.tsx` `CurrentStagePanel` | 标题区 `div.min-w-0`（L260-269） | 改为 flex 行：左列 `min-w-0 flex-1`（原内容），右列插画 | `timelineCalendar`，`size-16 sm:size-20`，`sizes="(max-width: 640px) 64px, 80px"` |
| 5 | `app/hospital/page.tsx` 医院状态卡 | 标题 flex 行（L262-280） | Badge 前插入插画（行内顺序：icon-tile → 文字 → 插画 → Badge） | `hospitalRoute`，`size-12`，`sizes="48px"` |
| 6 | `app/setup/page.tsx` `SetupHeader` | grid（L487） | `grid-cols-[auto_minmax(0,1fr)]` → `grid-cols-[auto_minmax(0,1fr)_auto]`，末尾加插画 | `horse`，`size-12 sm:size-14`，`sizes="(max-width: 640px) 48px, 56px"` |
| 7 | `app/settings/page.tsx` 顶部资料卡 | `CardContent` flex 行（L381-393） | 文字列与版本号 span 之间插入插画 | `family`，`aspect-[3/2] w-16`，`sizes="64px"` |
| 8 | `components/EmptyState.tsx` | `<span className="icon-tile mb-4"><Inbox …/></span>`（L21-23） | 整段替换为插画；删除 `Inbox` import | `helper`，`mb-4 size-24`，`sizes="96px"` |

## 5. `components/PageIntro.tsx`：恢复可选插画 prop

- 新增 prop `illustrationVariant?: CuteIllustrationVariant`（默认 `undefined`，不传则渲染完全不变）。
- 传入时布局：外层 div 改 `grid grid-cols-[minmax(0,1fr)_4rem] items-start gap-2`；文字列 `min-w-0`；插画 `className="size-16 justify-self-end sm:hidden"`（仅移动端显示，桌面端保持纯文字）；`sizes="64px"`，`priority`；`children` 容器补 `col-span-2`。
- 结构参考 `git show 5ea8099^:components/PageIntro.tsx` 的移动端分支；**不要**恢复其桌面端装饰卡（peach/mint/lavender 圆点仍禁用）。

调用方加 prop（各一行改动）：

- `app/postpartum/page.tsx`（L46-50）：`illustrationVariant="postpartumPaperwork"`
- `app/share/page.tsx`（L125-129）：`illustrationVariant="shareSummary"`
- `app/birth-plan/page.tsx`（L32-36）：`illustrationVariant="helper"`

## 6. 测试更新

### 6.1 `tests/home-page-copy.test.ts`

- 删除 `toContain` 断言：「方案已生成」(L32)、`HomePlanLink`(L35)、`HomeToolLink`(L52)、「宫缩记录」(L58)、「入院沟通」(L59)（后两个字面量随快捷宫格移除，宫缩状态行是动态文案）。
- 改为 `not.toContain`：`HomePlanReadyPanel`(L34)、`HomeToolsPanel`(L51)、「快捷操作」(L55)。
- L36 `href: "/share"` → `href="/share"`（share 链接从对象字面量改为合并面板里的 JSX Link）。
- 保留：「导出与协作」(L37)、「今日重点」(L41)、「入院准备」(L45)、`ReadinessMetricsPanel`(L50)、「临出门检查」(L60)、`href="/go"`(L54) 等其余断言。
- 新增：`toContain("CuteIllustration")`、`toContain("getBabyMascot")`。
- 注意 L47 `not.toContain("dadkit-bear-transparent.png")` 保留仍将通过：`getBabyMascot` 的路径字面量在 `lib/baby-profile.ts`，不在 page.tsx。

### 6.2 `tests/ui-style.test.ts`

- 循环断言（L187-197）中删除 `expect(source, name).not.toContain("CuteIllustration")`；**保留** `not.toContain("/illustrations/")`。
- L220-222：`existsSync(... CuteIllustration.tsx)` 由 `false` 改 `true`。
- L224：`pageIntro` 的 `not.toContain("illustrationVariant")` → `toContain("illustrationVariant")`。
- L279：`postpartumPage` 的 `not.toContain("illustrationVariant")` → `toContain("illustrationVariant")`。
- 建议把 `app/birth-plan/page.tsx` 读入并加入 `appSources`（它会带 `illustrationVariant`，且需接受既有禁令断言）。
- 新增一个 it 块做正向断言：
  - `toContain("CuteIllustration")`：`homePage`、`checklistPage`、`goPage`、`contractionsPage`、`hospitalPage`、`setupPage`、`settingsPage`、`timelineDashboard`、`emptyState`、`pageIntro`
  - `toContain('illustrationVariant=')`：`postpartumPage`、`sharePage`、`birthPlanPage`（若加入）
- 其余断言一律不动（`settingsPage` 禁 `getBabyMascot`/`dadkit-dad-avatar.png`；header/sharePosterCanvas 禁 `next/image`；globals 禁渐变——本规格均不触碰）。

### 6.3 不需要改的测试

`tests/baby-profile.test.ts`（getBabyMascot 行为不变）、`tests/release.test.ts`（插画文件保留、sw.js 不动）、其余页面 copy 测试（文案未改）。

## 7. 文档更新 `docs/design/design-system.md`

- L48 改为：页眉 `<PageIntro eyebrow title description illustrationVariant?>`（`illustrationVariant` 可选，传入时在移动端标题右侧显示 size-16 插画）。
- 「标准件」一节新增一行：插画 `<CuteIllustration variant>`（`components/CuteIllustration.tsx`，next/image 透明 PNG，无边框无底；点位限：页面 hero 右侧、PageIntro 移动端、EmptyState、状态卡标题区）。
- L61 改为：`public/illustrations/*` 图片引用——仅允许经 `CuteIllustration` 组件在上述点位使用；页面源码禁止直接出现 `/illustrations/` 路径（首页吉祥物经 `getBabyMascot` 获取）。
- `docs/design/dadkit-task-flow-ia.md` 不改（本次精简正是落实其"首页=驾驶舱"约定）。

## 8. 验证

依次执行并全绿：

```bash
npm run test    # 重点：home-page-copy / ui-style / home-dashboard / baby-profile / release
npm run lint
npm run build
```

## 9. 验收标准

- 首页区块 7 → 5：hero → 今日重点 → 入院准备（含准备度摘要 + 4 模块行 + 宫缩状态）→ 临出门 CTA → 安装提示；「快捷操作」宫格与「方案已生成」面板不存在。
- 入口去重：宫缩记录仅经准备面板状态行（+时间线 tab），入院沟通仅经医院 tab，导出仅经准备面板标题链接；/go 保留模块行 + 独立 CTA 两处（IA 文档要求的强入口）。
- 上述 8 个插画点位 + 3 个 PageIntro 点位 + 首页 hero 吉祥物全部出现，窄屏（390px）无横向溢出。
- 测试 / lint / build 全绿。

## 10. 明确不做

- 不删任何路由/页面；底栏 5 tab 与 `secondaryRouteOwners` 不变。
- 不改业务逻辑、store、数据流、文案（删除冗余区块文案除外）。
- 不新增/删除插画文件；不引入新依赖。
- 不恢复 sticker 可爱风 CSS 类、装饰 emoji、`font-black`、页面背景渐变。
