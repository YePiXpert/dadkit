# DadKit 优化计划（阶段 2-5）— Codex 执行版

本文档是全维度优化的剩余计划，交给 Codex 执行。阶段 1（性能/网速/内存）已由 Kimi 完成并验证，不要重复做。

> 2026-08-08 / v3.4.5 复核：修复 Android 窄屏单列卡片图片过高，以及 APK 静态导出末尾斜杠导致清单页底部菜单被隐藏的问题；分类页新增按钮同步避让底部菜单。最终验收见 `docs/release-v3.4.5.md`。
>
> 2026-08-08 / v3.4.4 复核：文档中的大部分项目已在 3.4.3 实现；本轮补齐家庭邀请分享、备份页样式、可关闭同步断连提示、持久化存储申请、localStorage 快照迁移 IndexedDB、v6-v9 未知顶层字段兼容，并新增 APK 应用内下载、进度、SHA-256 校验与系统安装链路。最终验收和发布边界见 `docs/release-v3.4.4.md`。

## 项目速览

- DadKit：local-first 待产准备应用；Web、iPhone PWA 与 Android APK 统一使用 Next.js PWA 界面，Android 在 APK 中内置同一次静态导出的全部页面和资源。
- 核心页面：`/` 首页（清单总览）、`/checklist/[sectionId]` 分类清单、`/growth` 孕期成长、`/settings` 及三个子页、`/privacy`、`/support`。
- 核心状态：`lib/store.ts`（清单 zustand store）、`lib/checklist-v2.ts`（视图/统计逻辑）、`lib/growth-store.ts`、`lib/storage.ts`（localStorage 持久化 + 快照 + 导入导出）、`lib/sync/`（家庭同步）、`lib/webdav/`（WebDAV 备份）、`lib/item-photos.ts`（IndexedDB 照片）。

## 施工约定（必须遵守）

- **不做任何 git 写操作**（commit/push/reset 等），只许只读 git 命令（status/diff/log/show）。
- UI 文案一律简体中文；代码风格、注释密度、命名跟随所在文件现状。
- 仓库 `core.autocrlf=true`，工作区文件以 CRLF 为主且部分是混合行尾。**编辑时必须保留每处原有行尾**，用 `git diff --ignore-cr-at-eol` 自查没有行尾污染。
- 每完成一个阶段跑：`npm run lint && npm run test`。改动 bundle 结构后先 `npm run build` 再 `npm run performance:check`（该脚本读 `.next` 产物，且现在会把 polyfills 约 38.7 KiB 计入每条路由、覆盖全部路由并检查 CSS 总重）。
- 新增行为要补 vitest 用例；测试文件放 `tests/`，命名跟随现有惯例。
- 文中行号是审计时（2.1.1 基线）的定位，阶段 1 已改过部分文件，**按符号名定位，不要迷信行号**。

## 阶段 1 已完成清单（影响后续定位，务必先读）

1. `AddItemDialog` 在两个 Workspace 改为 `next/dynamic`（`ssr: false`）——首页首载 -30 KiB。注意：FAB 按钮不再出现在 SSR HTML 中，hydration 后才出现。
2. 新增叶子模块 `lib/persistence-status.ts`（零依赖）：持久化状态（dirty/persisted revision、错误、订阅）全部移入；`lib/storage.ts` 顶部 re-export 保持对外签名不变；`PersistenceWarning` 只依赖它。
3. 新增 `lib/webdav/checksum.ts`：`calculateChecksum`/`stableStringify` 从 `lib/webdav/client.ts` 抽出，`lib/sync/client.ts` 改为从这里导入；`app/settings/backup/page.tsx` 的 webdav client 已改为按钮点击时 `await import()` 懒加载（模块级 helper `loadWebDavClient()`，失败提示 `WEB_DAV_CLIENT_LOAD_ERROR`）。
4. `scripts/check-performance-budgets.mjs` 重写：动态枚举全部路由、计入 polyfills、CSS 预算；预算已按现状+余量重设。预算语义变了，**后续加首屏代码会更容易触发超限，这是有意的门禁**。
5. `components/PwaRegister.tsx` 移除每次加载的强制 `registration.update()`。
6. `components/AndroidUpdatePrompt.tsx` 更新检查加 6h 最小间隔，时间戳 key 为 `dadkit:android-version-checked-at`（有意不用 v3 前缀，属设备本地状态）。
7. `lib/growth-store.ts` 昵称防抖：setNickname 立即更新内存、400ms 防抖落盘，pagehide/visibilitychange 自动 flush，导出前强制 flush；`GrowthWorkspace` 昵称 Input blur 时 `flushPendingProfileWrite()`。**已知小边界**：`lib/sync/client.ts` 直接读 localStorage 的 growth key，防抖窗口内主动同步可能读到旧昵称（可接受，也可在阶段 5 顺手修）。
8. `public/sw.js` 重写预缓存：install 只预缓存 `/` + 其构建产物 + 图标/manifest（`precacheAppShell`），其余路由首访时写缓存；`/_next/static`、`/item-art/`、`/growth/` 运行时缓存加 FIFO 上限（120/200/60 条，`trimRuntimeCache`）；**CACHE_NAME 已升级为 `dadkit-v2.1.3-pwa-r2`**，activate 会清理旧缓存。
9. `public/og.png` 887KB→185KB；`public/growth/` 6 张 >85KB 的 webp 重压缩到 ~60KB（week-11/16/31/33/34/37）。
10. `lib/templates/general.ts` 紧凑化：2141 行→225 行元组格式（源 -36%），运行时产物与旧版逐字段深度相等（已用 git show HEAD 对比验证）。**改模板内容时按新元组格式来**，文件头有列含义注释。
11. `lib/item-photos.ts`：读缓存加 LRU 上限 30 条（Map 插入序实现，驱逐不碰 refs>0 的对象 URL）；新增 `pruneOrphanedPhotos(validItemIds)`（60s 宽限期防竞态）；`components/BackgroundTasks.tsx` 空闲时执行孤儿清理（未 hydrated 跳过）。
12. 基线对照：阶段 1 前 `npm run test` 245 用例，现 257 用例；首页首载（含 polyfills 口径）226.0→195.5 KiB。

---

## 阶段 2：易用性 + 功能缺口（14 项）

### 2.1 必填校验静默失败
- 证据：`components/AddItemDialog.tsx` 与 `components/EditItemDialog.tsx` 的 submit 在名称为空时直接 return，无提示、按钮不禁用。
- 要求：名称为空时禁用提交按钮；用户尝试提交（或名称字段 blur 后仍为空）时显示内联错误提示。两个对话框行为一致。
- 验收：空名无法提交且有可见反馈；补 vitest 或组件测试断言。

### 2.2 添加/编辑选项不一致 + 合并反馈别扭
- 证据：`AddItemDialog` 的 `CUSTOM_PREPARATION_OPTIONS` 只有 3 项，`EditItemDialog` 有 4 项（含 `wash_then_pack`）；同名合并后表单被清空、对话框保持打开只显示一行反馈（`AddItemDialog` 内 merge 分支）。
- 要求：AddItemDialog 补 `wash_then_pack`；合并成功后关闭对话框，改用页面级 toast 反馈「已与现有物品合并」。
- 验收：`tests/custom-item-merge.test.ts` 更新后全绿；四个 preparation 选项两处一致。

### 2.3 数量步进器不能直接输入
- 证据：`components/QuantityStepper.tsx` 只有 +/− 按钮；空值显示「1」但实际值为 `""`；`count<=1` 时减号禁用，状态令人困惑。
- 要求：中间数字做成可点按直接输入（点击变 input 或恒为 input），失焦/回车收敛到合法范围（≥1 整数，空值回退 1）。保持移动端点按区域够大。
- 验收：输 10 不用点 9 次；边界值（0、负数、非数字、空）行为合理；补测试。

### 2.4 庆祝遮罩可访问性 + 文案口径
- 证据：`components/CelebrationOverlay.tsx` 是带 onClick 的 `role="status"` div，无 Escape、无关闭按钮、无焦点管理，只能鼠标点或等 3.2s；文案「待产包全部装包完成！」与统计口径不符（`lib/checklist-v2.ts` 进度统计排除 `last_minute` 和 `car` 分类）。
- 要求：改为可键盘关闭（Escape、可聚焦的关闭按钮、焦点管理，可用项目已有的 Radix Dialog）；若存在未处理的 `last_minute`/`car` 物品，庆祝卡附一行「别忘了临出门拿 N 件」。
- 验收：键盘可关闭；附行计数正确（无待办时不显示）；补测试。

### 2.5 删除 undo
- 证据：`lib/store.ts` 的 `removeItem` 立即持久化删除（自定义物品连同照片不可恢复）；`createSnapshot` 只在 reset/clear 前调用。
- 要求：removeItem 改为「先标记隐藏 + 弹出 toast（已删除，可撤销），N 秒（建议 5s）未撤销才真正删除」。撤销恢复原位。注意与四视图筛选、同名合并、同步 push 的交互（墓碑逻辑参考 `lib/sync/merge.ts` 删除优先规则，避免未删除状态被同步出去又复活）。
- 验收：误删可完整恢复（含自定义字段与照片）；超时后真删；同步场景不复活；补测试。

### 2.6 window.confirm 统一
- 证据：原生 confirm 6 处：`ChecklistItemDetailsDialog.tsx`、`ItemPhotoField.tsx`、`FamilySyncCard.tsx`、`app/settings/backup/page.tsx`（3 处）；而重建/清空已用应用内打字确认 Dialog（`app/settings/checklist/page.tsx`）。
- 要求：统一替换为应用内确认 Dialog（普通删除确认用单确认型即可，不必打字确认；沿用 ui/dialog 组件与现有视觉）。
- 验收：全项目无 `window.confirm`；移动端样式统一。

### 2.7 首页预产期倒计时 + 产检提醒入口
- 证据：`lib/growth-store.ts` 已有 `dueDate`，首页 hero（`components/ChecklistWorkspace.tsx`）只有装包进度；产检提醒只能手动打勾（`components/GrowthWorkspace.tsx`），无任何到期提示。
- 要求：首页 hero 区显示「距预产期约 N 天」（未填 dueDate 不显示，可点击跳 /growth 引导填写）；本周产检提醒未完成时，首页或 MobileNav 的成长入口显示轻量标记（红点或一行提示，别用打扰式弹窗）。
- 验收：填/不填 dueDate 两种状态渲染正确；提醒打勾后标记消失；补测试。

### 2.8 分类卡进度可视化
- 证据：`components/ChecklistCategoryCard.tsx` 只有「还差 N 项」文字。
- 要求：卡内加细进度条或百分比（沿用 hero 进度条的 aria 模式，`role="progressbar"`）。
- 验收：8 个分类卡进度一眼可比；aria 完整。

### 2.9 清单搜索
- 证据：全项目无搜索框（grep 无 `type="search"`），约 144 项模板 + 自定义物品只能按分类翻。
- 要求：清单首页（`ChecklistWorkspace`）加搜索框，按名称/备注关键词过滤，命中项按分类分组展示并保留状态操作；清空恢复默认视图。注意与现有四视图筛选（全部/待购买/待装包/已装包）的关系：搜索时凌驾于视图筛选或在其内过滤，选定一种并写清楚空态文案。
- 验收：中英文关键词、无结果空态、清除恢复；补测试。

### 2.10 批量操作
- 证据：状态流转只有单条 `advanceItem`（`lib/store.ts`）。
- 要求：「待装包」视图（和/或分类页）加「本页全部标记装包」批量按钮，带确认；批量操作走 store 单次状态更新 + 单次落盘（别循环调单条方法导致 N 次写盘）。
- 验收：批量后进度/统计正确；补测试（含同步 exportData 一致）。

### 2.11 导出文本清单
- 证据：备份只有 JSON 与 WebDAV（`app/settings/backup/page.tsx`），无可读文本。
- 要求：加「复制清单为文本」：按分类分组、含物品名/数量/状态符号（如 ☐/☑）、排除或单独标注「不需要」项；用 navigator.clipboard，降级为选中文本框。放清单首页或备份页均可，推荐清单页工具区。
- 验收：复制内容与当前清单一一对应；补测试（文本生成函数纯函数化便于测）。

### 2.12 「不需要」找回指引 + EmptyState 死参数
- 证据：`not_needed` 项从三个状态视图消失（`lib/checklist-v2.ts`），只在「全部」视图底部；分类页空态文案只说「切换上方筛选」（`ChecklistSectionWorkspace.tsx`）；`EmptyState.tsx` 的 `actionHref/actionLabel` 参数所有调用方都没传（死代码）。
- 要求：分类页空态或全部视图加「查看已标记不需要」入口（跳到全部视图并高亮该区域即可）；EmptyState 的行动按钮参数接线（如空态加「去添加物品」）或删除死参数——二选一，别留着。
- 验收：用户能从任意空态找到恢复路径。

### 2.13 成长页「回到本周」
- 证据：`GrowthWorkspace.tsx` 的 `selectWeek` 覆盖 `lastViewedWeek`，浏览其他孕周后无一键回当前周的入口。
- 要求：周切换区加「回到本周」按钮（仅当浏览周 ≠ 当前孕周时显示）。
- 验收：交互正确；补测试。

### 2.14 安装入口与时机
- 证据：`components/InstallPrompt.tsx` 关闭即永久写 localStorage，设置页无再入口；且固定在首页首屏即出现（`ChecklistWorkspace.tsx` 底部）。
- 要求：设置页（`app/settings/page.tsx` 三个入口旁）加「安装到桌面」入口，复用 InstallPrompt 的引导文案；InstallPrompt 改为用户完成若干次勾选（建议 ≥3 项）后再展示。
- 验收：关闭引导后仍能从设置页再次打开；首屏不再立即出现。

---

## 阶段 3：心情 + 分享欲（6 项）

### 3.1 Web Share 三连
- 证据：全项目无 `navigator.share`（grep 0 命中）。三处该有：
  1. `FamilySyncCard.tsx` 邀请家人只有复制 8 位口令；
  2. `CelebrationOverlay.tsx` 100% 庆祝无分享出口（分享欲最强时刻）；
  3. 孕周卡（`GrowthWorkspace.tsx`，有昵称 + 预产期 + 33 张水果类比插画）无分享。
- 要求：封装一个 `shareText(text)` 工具（navigator.share 优先，不支持降级 clipboard + toast「已复制，去粘贴给家人吧」）。三处接入：邀请口令分享文案（含口令 + 简短说明）、庆祝卡「分享给家人」（文案含准备进度）、孕周卡「分享本周」（文案形如「孕24周，宝宝大约像一根玉米，待产包已准备 68%」，数据都现成）。
- 验收：支持/不支持 Web Share 两条路径都有反馈；文案含真实数据；补工具函数测试。

### 3.2 中间里程碑庆祝
- 证据：庆祝只在首次 100% 触发一次（`ChecklistWorkspace.tsx`）。
- 要求：加轻量里程碑：进度首次到 50%、首个分类清空，用 toast 级提示（别用全屏遮罩），各只触发一次（持久化已触发标记，localStorage key 跟随 `dadkit:v3:*` 同步命名空间惯例）。
- 验收：触发一次后不重复；重置清单后标记清理；补测试。

### 3.3 空状态配插画
- 证据：`EmptyState.tsx` 只有 16px 图标 + 灰字，而 `public/item-art/` 有 144 张现成物品 webp。
- 要求：EmptyState 支持传入插画名，各空态按场景配一张相关物品图（如待购买空态用购物车/奶瓶类图），尺寸小巧、lazy load。
- 验收：视觉抽查；不增加首载负担（img lazy）。

### 3.4 勾选与孕周仪式感
- 证据：`ChecklistItemRow.tsx` 状态按钮只有 `active:scale-95`；`GrowthWorkspace.tsx` 切周只是换数字。
- 要求：勾选「已装包」时对勾加描边/弹出小动效（复用 `app/globals.css` 已有的 `sticker-pop` 关键帧）；切到当前孕周时成长插画做一次 sticker-pop。都要遵守 `prefers-reduced-motion`（globals.css 已有处理模式）。
- 验收：动效轻、不挡操作；reduced-motion 下无动画。

### 3.5 文案温度化
- 证据：高频兜底文案偏工具腔，如 `ChecklistItemRow.tsx` 的兜底 note「按家庭和医院实际需要准备」、`FamilySyncCard.tsx` 口令规则说明；对照标杆：`CelebrationOverlay.tsx`「辛苦了，随时可以安心出发」。
- 要求：过一遍用户高频可见的兜底/说明/空态文案（清单行、同步卡、空态、设置页），在保持信息准确的前提下加温。**注意 `tests/*copy*.test.ts` 系列（home-page-copy、checklist-page-copy、settings-page-copy 等）钉住了大量文案**，改文案必须同步更新这些测试，且新文案仍需包含测试断言的关键信息点。
- 验收：copy 测试全绿；无信息丢失。

### 3.6 PWA 元数据修正
- 证据：`app/layout.tsx` 的 apple-touch-icon 指向 `maskable-icon-512.png`（带安全区留白，主屏图标显小），而 `public/apple-touch-icon.png` 存在却只在 SW 预缓存里用；`public/manifest.webmanifest` 只有 icons 无 screenshots；`app/growth/page.tsx` 只设了 title/description，分享 /growth 链接回退到 root og.png（待产包图，与内容不符）。
- 要求：apple-touch-icon 改指 `apple-touch-icon.png`；manifest 补 2 张窄屏 screenshots（用手机尺寸截图首页与清单页，存 `public/`）；/growth 配专属 OG 图（可复用一张 growth 插画风格生成 1200x630，放 `public/og-growth.png` 并在 page metadata 引用）。
- 验收：构建后 HTML head 检查；manifest 校验通过；图片体积控制（screenshots/OG 各 <300KB，参考阶段 1 压缩手法）。

---

## 阶段 4：界面一致性（8 项）

### 4.1 圆角三级收敛
- 证据：基准 `--radius: 1.75rem`（`app/globals.css`），实际散落 1.15/1.35/1.4/1.5rem、rounded-3xl 等 6+ 种（`ChecklistCategoryCard.tsx` 1.15rem、`ChecklistItemRow.tsx` 与 `ChecklistGroupTabs.tsx` 1.35rem、`GrowthAnalogyIllustration.tsx` 1.4rem、`SettingToggleRow.tsx` 与 `ChecklistItemDetailsDialog.tsx` 1.5rem、`EmptyState.tsx` 与 `AndroidUpdatePrompt.tsx` rounded-3xl）。
- 要求：收敛为三级——卡片 1.75rem / 内嵌 1.35rem / 控件 2xl，注册进 `tailwind.config.ts` 命名（如 rounded-card/rounded-inset），全局替换。**注意 `tests/ui-style.test.ts` 可能钉住样式类名**，同步更新。
- 验收：grep 不再出现散值；视觉无断裂。

### 4.2 硬编码颜色提 token
- 证据：`ChecklistItemArt.tsx` 的 `bg-[#f8eeda] dark:bg-[#241f18]`、`GrowthAnalogyIllustration.tsx` 的 `bg-[#f7f0e2]` + rgba 阴影；深色适配靠 `dark:brightness-[0.82]` 滤镜；庆祝彩带色 `#f9536f/#ffc94d/#4caf7d/#7fb3e8` 不在任何 token（`CelebrationOverlay.tsx`）。
- 要求：提为 CSS 变量（如 `--surface-art`、彩带 `--confetti-*` 或与 `--primary` 派生），亮暗双主题各给值，替换硬编码与滤镜技巧。
- 验收：暗色模式下插画容器不再靠 brightness 滤镜；变量集中在 globals.css 主题块。

### 4.3 首页 hero SVG 深色适配
- 证据：`HomeHeroIllustration.tsx` 全部固定浅色 hex（#ff9fb2、#fffdf6 等），在深棕 hero 渐变（globals.css 暗色块）上是刺眼的亮粉色块。
- 要求：给 SVG 做暗色适配（CSS 变量化 fill，或 dark: 透明度/整体调暗处理），两主题下都和谐。
- 验收：双主题视觉抽查（可跑 dev server 截图或 ReadMediaFile 比对）。

### 4.4 死 CSS 与重复模式清理
- 证据：`globals.css` 的 `.dark .illustration-wash / .illustration-frame` 全项目 0 引用；tile 配色超长 arbitrary value（`bg-[hsl(var(--tile-mom-bg))] text-[hsl(var(--tile-mom-fg))]`）重复 11 处（`ChecklistCategoryCard.tsx`、`app/settings/page.tsx`）；icon-tile 样式串在 `AppearanceCard.tsx`、`FamilySyncCard.tsx`、`GrowthWorkspace.tsx` 手写重复，而 `globals.css` 已有 `.icon-tile` 组件类。
- 要求：删死 CSS；tile 色注册进 tailwind.config（类名缩成 `bg-tile-mom-bg` 式）；三处手写 icon-tile 换用现有类。
- 验收：grep 确认收敛；ui-style 测试同步更新。

### 4.5 断点统一
- 证据：三套并存——globals.css 自定义 360px 媒体查询、mobile-shell 用 430px/672px、`AddItemDialog.tsx` 手写 `[@media(min-width:640px)_and_(min-height:640px)]`。
- 要求：统一为 Tailwind sm 断点 + 一个自定义 `xs: 360px`，430/672 归入最近语义断点；替换三处。**逐处核对视觉**（430 是 mobile-shell 宽度相关，改错会破版式）。
- 验收：移动端/桌面端版式无回归。

### 4.6 字号与对比度下限
- 证据：`ChecklistItemRow.tsx` 等处用 text-[10px]/text-[11px]（徽章 10px 接近手机可读极限）；`--muted-foreground` 本身在 4.5:1 边缘，再叠加透明度（`text-muted-foreground/75`、`text-foreground/65`）更低。
- 要求：辅助文字下限 11px、徽章 12px；去透明度修饰或上调色深，保证关键文字对比度 ≥4.5:1。
- 验收：grep 无 text-[10px]；抽查对比度。

### 4.7 骨架屏同构
- 证据：`ChecklistWorkspace.tsx` 加载骨架是 4 条灰条，与真实「PageHeader + hero + tabs + 卡片」结构差距大，加载完成跳动明显。
- 要求：按真实卡片轮廓画骨架（hero 区、tabs 条、2-3 张分类卡形状），减少 CLS 感。
- 验收：加载→渲染的视觉跳变明显减小。

### 4.8 主题初始化收敛
- 证据：`app/layout.tsx` 内联脚本与 `lib/use-theme.ts` 各写一份 `"dadkit-theme"` key 与解析逻辑；`layout.tsx` 的 themeColor `#FBF8F2/#1A1714` 与 globals.css 的 HSL 值靠人肉同步。
- 要求：key 抽共享常量（注意内联脚本是纯 JS 字符串，无法 import——用构建期注入或注释互相锚定，选简单方案）；themeColor 与 globals.css 值加互相锚定注释。
- 验收：改 key 只需动一处（或两处有明确注释互指）。

---

## 阶段 5：同步 / 账户 / 持久化加固（11 项）

> 本阶段改动最深，逐项独立验证。先读 `lib/sync/client.ts`、`lib/sync/merge.ts`、`lib/sync/server-store.ts`、`lib/storage.ts`、`lib/webdav/client.ts` 全貌再动手。

### 5.1 WebDAV 条目级合并
- 证据：`lib/webdav/client.ts` 冲突 = 远端 checksum 不同即拒绝，用户手动选「用本地覆盖远端」整文件覆盖——多设备必然互丢数据。而 `lib/sync/merge.ts` 已有成熟的条目级 LWW 合并（`mergeExportData`），服务端 push 也在用。
- 要求：WebDAV 上传/恢复前复用 `mergeExportData` 做条目级合并：下载远端 → 与本地合并 → 上传合并结果；恢复 = 远端与本地合并后落盘，而非整文件替换。UI 文案从「二选一」改为「合并」语义（保留极端情况下的强制覆盖入口可藏于二级确认）。
- 验收：双设备各改不同条目 → 合并后两边都在；同名同条目按 updatedAt 新者胜；墓碑优先规则生效；补合并测试。

### 5.2 401 断连引导
- 证据：`lib/sync/client.ts` 收到 401 直接 `saveSyncSession(undefined)` 静默登出；同步状态指示只在设置页，主页/AppHeader 无断连提示；会话 180 天 TTL（`server-store.ts`）过期同路。
- 要求：会话失效时在全局显示横幅（复用 PersistenceWarning 同款机制——阶段 1 已把状态面拆成 `lib/persistence-status.ts` 式轻量模块，照此模式新建 sync-session-status 或并入），引导去设置页重新加入；横幅可关闭、重连成功自动消失。
- 验收：模拟 401 后主页可见提示；重新加入后消失；补测试。

### 5.3 空间名归一化
- 证据：`lib/sync/server-store.ts` 空间 key = `sha256(name.trim())`，大小写/全半角差异会静默建成两个空间。
- 要求：哈希前做 Unicode NFKC + case-fold 归一（服务端客户端都要在显示/推导处一致）。**注意存量空间**：已存在的空间 key 不变会造成旧空间失联——用「join 时先查归一化 key、找不到再查原始 key」的兼容查找，或在文档中声明断变更（项目尚无承诺跨版本兼容就取前者，稳妥）。
- 验收：`测试`/`测试 `（全角空格）/大小写变体进入同一空间；补服务端测试。

### 5.4 配额监控统一
- 证据：全代码库无 `navigator.storage.estimate()/persist()`；`PersistenceWarning` 只覆盖清单写入（growth 写入失败走 `growth-store.ts` 回滚后 throw，无 UI）；`lib/sync/client.ts` 的 `applyMerged` 直接 setItem growth 两个 key，不像 `growth-store.ts` 那样带回滚，同步中途 QuotaExceeded 会留半新半旧状态。
- 要求：启动时申请 `navigator.storage.persist()`；estimate 用量超阈值（如 80%）进统一横幅；growth 写入失败也进同一横幅；`applyMerged` 改为复用 `persistPortableDataAtomically` 原子写。
- 验收：横幅覆盖三类写入失败；原子写测试（模拟中途失败无半成品状态）。

### 5.5 快照减负
- 证据：5 份全量快照都存 localStorage（`lib/storage.ts` `saveSnapshots`），典型 5MB 配额下快照机制自身就是 QuotaExceeded 主要来源。
- 要求：快照迁移到 IndexedDB（复用 item-photos 的 IndexedDB 封装思路）或减至 2 份 + 裁剪非必要字段。迁移时把存量 localStorage 快照搬过去并清掉旧 key。恢复流程（`app/settings/backup/page.tsx` 恢复点列表）相应改造。
- 验收：迁移无损（旧快照仍可恢复）；localStorage 占用显著下降；补测试。

### 5.6 hasExactKeys 放宽
- 证据：`lib/storage.ts` 的 `hasExactKeys` 严格校验拒绝任何未知字段——未来版本加字段后，旧客户端无法导入新备份，跨版本同步直接校验失败。
- 要求：改「忽略未知字段 + 校验必需字段」（未知字段不带入运行时状态即可）。导入/同步/exportData 三处口径一致。
- 验收：带未知字段的备份可导入；缺必需字段仍拒绝；补测试。

### 5.7 重试治理
- 证据：`lib/sync/client.ts` retryTimer 退避到 300s 后无 jitter 无限循环；UI 不暴露重试状态。
- 要求：退避加 ±20% 抖动；设置页同步卡显示「下次重试时间/重试中」状态（状态面沿用轻量模块模式）。
- 验收：退避序列有抖动；UI 状态正确。

### 5.8 服务端滚动备份 + 部署约束文档
- 证据：`lib/sync/server-store.ts` 每个空间是单 JSON 文件，写坏/卷丢 = 全家数据没；`withSpaceLock` 是内存 Map，多实例部署会互踩。
- 要求：写空间文件前滚动备份最近 N 份（如 5 份，`space.<key>.json.bak.1` 式或目录式，随写轮换）；README 或部署文档补「单实例部署」约束说明。
- 验收：连续写 N+1 次后旧备份可找回；补服务端测试。

### 5.9 时钟偏移校正
- 证据：冲突解决是条目级 LWW，直接比客户端 `updatedAt`（`lib/sync/merge.ts`），时钟不准的设备会丢更新或让旧值复活。
- 要求：pull/push 响应带 `serverTime`，客户端维护偏移估计（如滑动平均或最近一次），merge 比较前把本地 updatedAt 校正到服务器时间轴；偏移持久化（localStorage）。离线时退化为本地时钟（现状）。
- 验收：模拟客户端时钟快/慢 1 小时的合并正确性测试；协议变更向后兼容（旧服务端无 serverTime 时退化）。

### 5.10 照片备份
- 证据：`lib/storage.ts` 的 `exportData` 不含 IndexedDB 照片；家庭同步 payload、WebDAV 备份都不含；`ItemPhotoField.tsx` 已明示「照片不会进入备份」——换设备即丢全部照片。
- 要求：最低方案——设置页备份区加「导出照片」打包下载（zip 或逐张，`lib/item-photos.ts` 已有 canvas/压缩工具可借鉴）；进阶——WebDAV 备份提供可选的照片打包上传/恢复。**同步改 `ItemPhotoField` 的说明文案**，与实际能力保持一致。
- 验收：导出包可在干净环境完整恢复照片到 IndexedDB；文案不再说「无法备份」；补测试。

### 5.11 WebDAV 易用性与密钥提示
- 证据：「记住密码」= 明文 localStorage（`lib/storage.ts`），无任何提示；失败提示是裸 HTTP 状态码（`lib/webdav/client.ts` 如「上传失败，WebDAV 返回 401。」）。
- 要求：勾选「记住密码」时提示明文存储风险；按状态码给可操作中文指引（401→检查应用密码是否填的是应用专用密码而非登录密码；404→检查远端目录是否存在；网络错误→检查地址与 HTTPS）；默认 endpoint 123pan 处补一句「其他服务填自己的 WebDAV 地址」式引导。
- 验收：提示文案测试；无行为回归。

---

## 后续专项（本期不做，各自单独立项）

1. **恢复口令/账户恢复体系**：身份 = localStorage token，清浏览器数据即永久失联，一次性口令用后即焚。涉及同步服务端协议变更（可反复使用的恢复凭证），影响面大。
2. **增量/op-based 同步**：当前全量快照 push（上限 2MB），数据量增长后再改协议。
3. **多实例服务端部署**：文件锁/SQLite 化，属部署形态变更，本期只在 5.8 补文档。

## 整体验收（全部阶段完成后）

- `npm run lint && npm run test` 全绿。
- `npm run build && npm run performance:check` 全 PASS（注意预算含 polyfills 的新口径）。
- `npm run test:e2e` 全绿；关键新交互（undo toast、批量装包、分享降级、庆祝遮罩键盘操作、搜索）补了 e2e 或组件测试。
- 改了 SW/manifest 后跑 `node scripts/validate-android-release.mjs`；阶段 5 完成后跑 `npm run webdav:verify`。
- 双主题（亮/暗）+ 移动端窄屏视觉抽查一遍。
