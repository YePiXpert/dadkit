# DadKit UI direction

> **已归档（2026-07）**：本文描述的是旧「粉色贴纸可爱风」方向，已被全站改版的「精致现代简约风」取代。当前有效规范见 [design-system.md](./design-system.md)（微粉暖白底 + 珊瑚粉主色、`card-surface`/`list-row`/`icon-tile` 标准件、物品级图标彩色 tile、无贴纸插画引用）。下文仅作历史记录保留。

## Visual references

- 美柚：多阶段女性健康服务，强调经期、备孕、怀孕、育儿的身份切换和工具入口密度。
- 宝宝记：孕育记录和家庭共育工具，适合参考温和、可信、轻记录的页面节奏。
- DadKit 保持本地优先、准爸爸任务工具定位，不引入社区流、电商推荐或医疗诊断视觉。
- 本轮建立“小马宝贝 · 女宝属马”透明插画体系：首页、空状态、临出门和时间线预产期卡优先使用戴粉色蝴蝶结的小马宝宝贴纸。

## Palette

- Primary pink `#FF5C7A`：主行动、当前阶段、底栏激活态。
- Soft mint `#D8F2EA`：完成、确认、已提供等正向状态。
- Warm coral `#FF8A68`：重要提醒、临出门、风险提示。
- Gentle blush `#FFEFF2`：孕期阶段、页面背景、轻情绪。
- Soft amber `#FFE09B`：待处理、下次产检问、准备提醒。
- Clean background `#FFF7F8`：整体奶白浅粉，避免纸质厚重感。
- Ink `#243231`：主文字，降低纯黑压迫感。

## Illustration system

- 界面不使用插画；视觉依靠珊瑚渐变 hero、6 色图标 tile 与 lucide 图标撑住，页面源码禁止引用 `public/illustrations/` 素材。

## Interaction rules

- 页面内容区不使用横向滑动 chips、内嵌 carousel 或 sticky 工具层。
- 关键入口用两列或三列网格，所有入口直接可见。
- 筛选与操作展开后推开下方内容，不遮挡清单卡片。
- 主按钮高度不低于 44px，移动端文字允许换行，不挤压。

## Mockup

Open `docs/design/dadkit-mobile-ui-map.svg` to view the screen map.
