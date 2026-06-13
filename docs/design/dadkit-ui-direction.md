# DadKit UI direction

## Visual references

- 美柚：多阶段女性健康服务，强调经期、备孕、怀孕、育儿的身份切换和工具入口密度。
- 宝宝记：孕育记录和家庭共育工具，适合参考温和、可信、轻记录的页面节奏。
- DadKit 保持本地优先、准爸爸任务工具定位，不引入社区流、电商推荐或医疗诊断视觉。
- 本轮建立透明插画体系：首页使用孕妈妈和准爸爸一起整理清单的家庭主视觉，工具页、头像和空状态使用拿清单的小熊助手贴纸。

## Palette

- Primary teal `#257A73`：主行动、当前状态、可信赖感。
- Soft mint `#DFF3EF`：完成、确认、进度背景。
- Warm coral `#F07D6F`：重要提醒、临出门、风险提示。
- Gentle blush `#FFE5E8`：孕期阶段、偏好、轻情绪。
- Soft amber `#FFE7A3`：待处理、下次产检问、准备提醒。
- Clean background `#F6F8FA`：整体浅灰白，避免纸质厚重感。
- Ink `#243231`：主文字，降低纯黑压迫感。

## Illustration system

- 主视觉：`public/illustrations/dadkit-family-transparent.png`，用于首页首屏，强调准爸爸、孕妈妈和待产整理场景。
- 贴纸：`public/illustrations/dadkit-bear-transparent.png`，用于页面头部、头像、空状态和轻提示。
- 插画资源使用透明 alpha PNG，保持矢量感和柔和母婴 App 气质，避免矩形背景破坏卡片融合。
- 插画不承载医疗判断，不放文字、Logo 或品牌符号，作为温和引导和情绪缓冲。

## Interaction rules

- 页面内容区不使用横向滑动 chips、内嵌 carousel 或 sticky 工具层。
- 关键入口用两列或三列网格，所有入口直接可见。
- 筛选与操作展开后推开下方内容，不遮挡清单卡片。
- 主按钮高度不低于 44px，移动端文字允许换行，不挤压。

## Mockup

Open `docs/design/dadkit-mobile-ui-map.svg` to view the screen map.
