# DadKit 前端 UI 优化记录（第二批：出发页 / 分区页 / 成长页 / 工具页）

> 执行结果：2026-08-19 已全部完成。下文保留实施方案与验收依据，供后续维护参考。

## 执行结果

上一批首页、清单页重构与本批出发页、分区页、成长页、工具页优化已合并完成；数据状态机、里程碑庆祝与同步逻辑保持不变。

本批完成项：

| 文件 | 状态 |
| --- | --- |
| `components/DepartureItemRow.tsx` | 已完成紧凑行组件与状态交互 |
| `components/DepartureWorkspace.tsx` | 已接入紧凑列表并同步骨架屏 |
| `lib/use-checklist-view-preference.ts` | 已接入 cards/list 偏好持久化 |
| `components/ChecklistItemRow.tsx` | 已完成 compact 分支并避免加载卡片图片 |

验证完成：typecheck、lint、生产构建、626 项 Vitest、相关 Chromium e2e 与 360px/桌面截图核验全部通过。

---

## 第 1 项：准备出发页紧凑化（P0）

目标：`/departure` 从「大图卡片网格」改为紧凑行式列表，消除 25000px 长滚动。状态机、批量确认、详情弹窗、e2e 依赖的钩子全部保留。

### 1.1 `components/DepartureItemRow.tsx`（已完成）

已创建，要点：

- 行结构：`article.flex.items-center.gap-2-5.rounded-card.bg-card.px-3.py-2.shadow-sm`，状态着色与卡片一致（ready→`bg-secondary/35 ring-primary/30`，packed→`bg-secondary/55`，not_needed→`bg-muted/50`）。
- 中部：`displayName`（15px semibold）+ `建议 {quantity}`（13px muted，ready 时追加「· 已备好」），文字 `break-words` 不截断。
- 右侧两个按钮：详情 `MoreHorizontal`（`aria-label="查看详情：{name}"`）+ 状态钮 `size-11 rounded-full ring-2`（`aria-label="{标记已确认|重新核对}：{name}"`，`title` 同 actionLabel，packed 时 `Check` + `sticker-pop` 动画）。
- 状态逻辑与旧 departureMode 一致：`packed/not_needed → todo`，否则 → `packed`（`updateItem`）。
- 无图片、无 IntersectionObserver（紧凑行不需要媒体懒加载）。

### 1.2 `components/DepartureWorkspace.tsx`（已完成）

- `ChecklistItemRow` 导入替换为 `DepartureItemRow`；分组列表容器由 `item-card-grid` 改为 `grid gap-2`；行渲染不再传 `departureMode` / `showFullDescription`。
- 骨架屏：`item-card-grid` + 两个 `h-80` 改为 `grid gap-2` + 三个 `h-16`。
- **保留不动**：PageHeader、hero 进度卡（`#departure-remaining-count`、`role="progressbar" aria-label="出发物品确认 X%"`）、HospitalSummaryCard、分组 section（`aria-labelledby="departure-group-{id}"`）、「本组全部确认」按钮与 ConfirmDialog（确认按钮文案「确认本组项目」）、`ChecklistItemDetailsDialog` 仍传 `departureMode`。

### 1.3 测试核对

- `tests/e2e/departure-flow.spec.ts` 依赖：`heading 准备出发/证件资料`、`button 标记已确认`、`section[aria-labelledby^="departure-group-"]`、`本组全部确认`、`确认本组项目`、`#departure-remaining-count`、progressbar——全部保留，无需改。
- `tests/empty-state.test.ts` 只断言 EmptyState 的 illustrationId，不受影响。
- 建议新增 e2e 断言：出发页首屏行高紧凑（如 `page.locator("article").first()` 高度 < 120px），或归入截图人工核验。

---

## 第 2 项：清单分区页卡片/紧凑列表切换

目标：`/checklist/[sectionId]` 支持紧凑行视图，偏好持久化，默认卡片。

### 2.1 `lib/use-checklist-view-preference.ts`（已建）

- `ChecklistViewMode = "cards" | "list"`，localStorage key `dadkit:ui:checklist:view-mode`，自定义事件 `dadkit:checklist-view-preference-change` 做跨组件同步（模式完全复制 `use-checklist-description-preference.ts`）。
- 导出 `useChecklistViewPreference()` 返回 `{ viewMode, setViewMode, toggleViewMode }`。

### 2.2 `components/ChecklistItemRow.tsx`（已完成）

- 新增 `compact?: boolean` prop（默认 false）。
- compact 分支在 `handleAction` 定义后、`return` 主卡片前 early-return：行式布局同 DepartureItemRow（名称 + `建议 X · {状态文案}` + 详情钮 + 状态钮），保留 `articleRef`、`advanceItem` 主状态机、`justPacked` 动画、`aria-label`/`title` 不变。

### 2.3 `components/ChecklistSectionWorkspace.tsx`（已完成）

1. 导入：`import { List, LayoutGrid } from "lucide-react"`（与 Plus/WrapText 合并导入），`import { useChecklistViewPreference } from "@/lib/use-checklist-view-preference";`。
2. 组件内：`const { toggleViewMode, viewMode } = useChecklistViewPreference();`
3. PageHeader `aside` 改为两个按钮的 flex 容器：

```tsx
aside={
  <div className="flex items-center gap-2">
    <button
      aria-label={viewMode === "cards" ? "切换为紧凑列表" : "切换为卡片视图"}
      aria-pressed={viewMode === "list"}
      className={cn(
        "flex size-11 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground hover:shadow-md",
        viewMode === "list" && "bg-primary text-primary-foreground hover:text-primary-foreground",
      )}
      title={viewMode === "cards" ? "紧凑列表：每行一个物品，快速勾选" : "卡片视图：查看物品图片与说明"}
      type="button"
      onClick={toggleViewMode}
    >
      {viewMode === "cards" ? <List className="size-5" /> : <LayoutGrid className="size-5" />}
    </button>
    {/* 原有 WrapText 按钮原样保留 */}
  </div>
}
```

4. 列表容器与行：

```tsx
<div className={viewMode === "cards" ? "item-card-grid" : "grid gap-2"}>
  {visibleItems.map((item) => (
    <ChecklistItemRow
      compact={viewMode === "list"}
      item={item}
      key={item.id}
      onOpenDetails={setDetailsItemId}
      showFullDescription={showFullDescriptions}
    />
  ))}
</div>
```

### 2.4 测试更新

- `tests/ui-style.test.ts:253`：`expect(checklistSectionWorkspace).toContain('className="item-card-grid"')` 会失败（变为条件类名），改为 `expect(checklistSectionWorkspace).toContain("item-card-grid")` 和 `expect(checklistSectionWorkspace).toContain("grid gap-2")`。
- `tests/checklist-page-copy.test.ts:124-140` 断言（`deriveChecklistView(checklist`、`useChecklistDescriptionPreference`、`showFullDescription={showFullDescriptions}`、`不截断文字`）全部保留可满足。
- 建议补断言：`toContain("useChecklistViewPreference")`、`toContain('compact={viewMode === "list"}')`。
- 建议 e2e：分区页点击「切换为紧凑列表」后 `article` 数量不变、勾选钮 aria-label 仍匹配 `标记已备好`、刷新后偏好保持。

---

## 第 3 项：成长记「完整时间表」收起

目标：`/growth` 的 33 行时间表默认只显示当前查看孕周所在的 trimester 分组，减少首屏长度。

### 3.1 `components/GrowthWorkspace.tsx`（已完成）

1. 组件 state 增加：`const [timelineExpanded, setTimelineExpanded] = useState(false);`
2. 计算当前 trimester：`current.trimester`（`getGrowthWeek` 返回值含 `trimester: GrowthTrimester` 字段，若无不放心可用 `GROWTH_WEEKS.find(e => e.week === current.week)?.trimester`）。
3. 渲染分组处改为：

```tsx
{TIMELINE_GROUPS.filter(
  (trimester) => timelineExpanded || trimester === current.trimester,
).map((trimester) => ( ... 原渲染不变 ... ))}
```

4. 「已完成 N 项，共 33 项」计数行旁（或下方）加切换按钮：

```tsx
<Button
  aria-expanded={timelineExpanded}
  size="sm"
  variant="outline"
  onClick={() => setTimelineExpanded((v) => !v)}
>
  {timelineExpanded ? "收起时间表" : `展开全部 ${GROWTH_WEEKS.length} 周`}
</Button>
```

5. 交互细节：点击时间表内某周 `selectWeek(week, true)` 会滚动到详情；若用户在收起状态点了当前分组以外的周（不会触发，因为其他分组未渲染）。`回到本周` 按钮在收起态无需特殊处理（当前周所在分组始终渲染）。
6. 顶部「个性化成长记」`<details>` 已是折叠态，不动。

### 3.2 测试

- 无现存断言依赖时间表结构（已 rg 确认 `完整时间表|TIMELINE_GROUPS|growth-timeline` 无测试命中）。
- 建议 e2e：打开 `/growth` 默认只见 1 个 trimester 分组标题；点「展开全部」后出现 3 个（孕早期/孕中期/孕晚期）。

---

## 第 4 项：工具页加「管理与支持」低频区

目标：`/tools` 保留 4 个核心工具入口（底部导航路由归属不动），下方新增低频管理入口。

### 4.1 `app/tools/page.tsx`（已完成）

保留 `TOOL_ENTRIES` 与现有 header 文案不动，在 `<LinkEntryGrid entries={TOOL_ENTRIES} />` 后追加：

```tsx
const SUPPORT_ENTRIES = [
  { href: "/settings/checklist", title: "清单设置", description: "自定义分类、模板与不需要的物品。", icon: ListChecks, accent: "bg-tile-docs-bg text-tile-docs-fg" },
  { href: "/settings/backup", title: "备份与恢复", description: "本地导出、WebDAV 与自动备份。", icon: DatabaseBackup, accent: "bg-tile-car-bg text-tile-car-fg" },
  { href: "/settings/sync", title: "家庭同步", description: "和家人实时共享清单与进度。", icon: RefreshCw, accent: "bg-tile-baby-bg text-tile-baby-fg" },
  { href: "/support", title: "帮助与反馈", description: "常见问题、联系我们与版本信息。", icon: LifeBuoy, accent: "bg-tile-mom-bg text-tile-mom-fg" },
] as const satisfies readonly LinkEntry[];
```

渲染：

```tsx
<section aria-labelledby="tools-support-title" className="grid gap-3">
  <h2 id="tools-support-title" className="px-1 text-[15px] font-semibold">管理与支持</h2>
  <LinkEntryGrid entries={SUPPORT_ENTRIES} />
</section>
```

（icon 从 lucide-react 选现有未重名的；accent 色块复用 `--tile-*` token，若视觉重复可两两换用。）

### 4.2 测试更新

- `tests/tools-page.test.ts` 现有断言全是 `toContain`，新增内容不会破坏；建议追加断言 4 个新 href 与「管理与支持」标题。
- 确认 `lib/navigation.ts` 的 `ownedRoutes`：`/settings/*`、`/support` 应归属「我的」tab（若已归属则勿动；若 `/settings/checklist` 等被 tools 占用会失败，跑 `ui-style.test.ts` 导航用例即可暴露）。

---

## 验证清单（全部通过后交付）

1. `npm run typecheck`、`npm run lint`、`npm test`（626+ 单测）全绿。
2. e2e（需先 `npm run build` 生成 `.next/standalone/server.js`，**注意先停掉 3000 端口的 dev server，build 与 dev 共用 `.next` 会互踩**）：
   - `npx playwright test tests/e2e/departure-flow.spec.ts tests/e2e/tools-navigation.spec.ts tests/e2e/home-dashboard.spec.ts --project=chromium-mobile`
3. Playwright 截图人工核验（360×800 移动视口 + 桌面视口）：
   - `/departure`：行高紧凑、无横向滚动、状态钮对齐。
   - `/checklist/documents`：视图切换两种模式、sticky 筛选条不遮挡。
   - `/growth`：时间表默认单分组、展开后三分组。
   - `/tools`：新「管理与支持」区对齐首页宫格风格。

## 风险与注意

- 单测多为「源码字符串断言」，任何结构调整先 rg 相关测试再动手。
- 文件行尾：仓库主流 CRLF（`PageHeader.tsx`/`globals.css`/部分测试是 LF），PowerShell 替换字符串前先按文件主导行尾归一化 anchor。
- 写中文文件用 UTF8 no-BOM（`[System.IO.File]::WriteAllText` + `UTF8Encoding($false)`）。
- dev server 运行时勿执行 `npm run build`。
