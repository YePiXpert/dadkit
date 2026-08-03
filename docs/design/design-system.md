# DadKit V3 设计系统

V3 的目标：在 V2「打开就知道还差什么」的基础上，把界面质感提升到原生应用水准——无边框暖色卡片、统一字体、清晰的信息架构。

## 信息架构

- 主导航恰好五个：`首页 /`、`清单 /checklist`、`宝宝 /baby`、`工具 /tools`、`我的 /settings`。
- `/` 是仪表盘：准备进度 hero、宝宝入口、`PlanningSummaryCard` 分工摘要、「全部工具」链接卡、家庭功能引导。不放工具快捷瓷砖。
- `/tools` 是工具 hub，承载四个一级入口：孕期成长记 `/growth`、准备出发 `/departure`、医院档案 `/hospital`、家庭分工与采购 `/planning`。
- 导航归属（`lib/navigation.ts` ownedRoutes）：清单只拥有 `/checklist`；工具拥有 `/tools`、`/growth`、`/departure`、`/hospital`、`/planning`；我的拥有 `/settings`、`/privacy`、`/support`。
- 移动端底部导航在 `/onboarding`、`/checklist/*`（分类详情）、`/settings/*`（设置子页）隐藏，其余页面（含 `/growth`、`/tools`）均显示。
- 隐私与支持是「我的」页的辅助入口，不增加第六个主导航项。

## 导航与外壳

- 移动端底部导航是悬浮式圆角 dock：`inset-x-3`、底部安全区 `max(env(safe-area-inset-bottom), 0.75rem)`、`rounded-3xl bg-card/90 backdrop-blur-xl shadow-lg`，激活项 `bg-secondary` 圆角 pill 高亮。
- 桌面端页头无分割线：`bg-background/80 backdrop-blur-xl shadow-sm` 吸顶，导航胶囊激活态为主色 + `shadow-glow`。
- 使用底部导航的页面必须带 `page-shell-with-nav`（底部预留 7.5rem + 安全区）；无导航页面用 `page-shell`。
- FAB 底部避让 `.safe-bottom-fab`（6.5rem + 安全区），toast 避让 `.safe-bottom-toast`。

## 色彩与层级

视觉语言延续「暖奶油风」：暖米白底、纯白大圆角无边框卡片、饱和陶土珊瑚红主色、暖棕分层阴影。

| 角色 | HSL | 用途 |
| --- | --- | --- |
| background | `40 43% 97%` | 暖米白页面底 |
| background-glow | `32 85% 96%` | 页面顶部极轻暖色径向氛围光（print 禁用） |
| foreground | `28 16% 14%` | 暖深棕黑正文 |
| card | `0 0% 100%` | 白色内容卡（大圆角、无边框） |
| primary | `7 58% 52%` | 陶土珊瑚红主动作与选中态，白色小字对比度不低于 4.5:1 |
| secondary | `12 70% 92%` | 浅蜜桃提示、选中淡底 |
| muted | `35 38% 92%` | 浅米灰说明泡、计数 chip |
| muted-foreground | `28 12% 42%` | 辅助说明文字（保证对比度，不再"发灰"） |
| border | `36 32% 86%` | 仅用于表单输入框、卡内细分隔线 |

- 卡片一律无边框：`.card-surface`（`rounded-card bg-card shadow-sm`）是唯一卡片基底；交互卡加 `transition-shadow hover:shadow-md`。
- 阴影为暖棕 `rgb(64 45 31)` 分层柔影：`shadow-sm` 默认卡、`shadow-md` 悬浮/hover、`shadow-lg` 对话框与浮动导航、`shadow-glow` 主色 CTA。
- 选中/状态指示用 `ring-1`/`ring-2`（如 `ring-primary`、`ring-destructive/30`），不再用 border 表达状态。
- 分类图标块按语义使用柔和粉、杏、薄荷、蓝、紫 tile 背景。物品卡使用温暖米色纸张、水粉与彩铅质感的无品牌原创插画，禁止人物、文字、医学图示和水印；卡片进入视口前后 600px 范围才读取图片，用户上传的本机实拍始终优先显示。

## 字体与排版

- 全局字体为本地打包的 **MiSans**（400/500/600/700，`public/fonts/misans/`，按 unicode-range 切片懒加载，`lib/font.ts` 注入），系统字体栈兜底（PingFang SC / Microsoft YaHei 等）。不引入其他 Web 字体。
- 排版尺度：
  - 页面标题 `text-2xl sm:text-[28px] font-bold tracking-tight`
  - 卡片/区块标题 `text-[15px] font-semibold`
  - 正文 `text-sm leading-6`
  - 辅助说明 `text-[13px]` 起步，辅助标签可用 `text-xs`；禁止 `text-[11px]`
  - 区块小标签使用 `.section-kicker`（`text-[13px] font-semibold tracking-wide text-muted-foreground`）
- 主要点击目标至少 44×44px。
- 文字必须允许换行；说明默认完整展示，可由全局开关隐藏，但不能被截断。

## 图标

- Lucide 是唯一的图标来源；禁止用 emoji 或字符（如 `✓`、`☑`）充当界面图标。
- 常规尺寸 `size-4`/`size-5`，导航与空状态 `size-6`；strokeWidth 默认 1.8–2，导航激活态 2.2。
- 图标颜色跟随语义类（`text-primary`、`text-muted-foreground`、`text-destructive`）。

## 基础组件要点

- Card：无边框 `rounded-card bg-card shadow-sm`，标题 `text-[15px]`。
- Button：全圆角，主按钮 `shadow-glow`；outline 变体 `border-border/60 bg-card/80`。
- Switch：视觉轨道 `h-7 w-11`、白色拇指 `size-6`，外层保持 ≥44px 触控区。
- 视图切换（如清单四视图）使用软分段控件：`rounded-full bg-muted p-1` 容器 + 激活 `bg-card shadow-sm`。
- Dialog：`rounded-card shadow-lg`；DangerZone 用 `ring-1 ring-destructive/30` + `shadow-sm` 表达危险区。

## 清单结构

- 页头为居中小标题；新增物品入口是右下角主色圆形 FAB（`shadow-glow`）。
- 顶层提供 `全部 / 待购买 / 待装包 / 已装包` 四个视图，数量必须与可见 selector 共源。
- 清单首页展示分类摘要卡，点击进入独立分类页；分类页使用双列物品卡。
- 行的首要动作是状态推进；默认只展示名称、数量、一句话说明、状态和缩略图。
- 编辑、标记不需要、删除、完整说明与本机照片放入行详情。
- 同名新增物品合并数量，不创建第二条可见记录。

## 状态语言

- `待处理`：还未备齐。
- `已备好`：已经买到、洗好或家中已有，下一步装包。
- `已装包`：已经进入固定行李位置。
- `不需要`：当前家庭明确不准备；仍可在"全部"恢复。

实现可以兼容旧内部状态，但界面不得暴露七状态下拉框或工程字段。

## 我的与备份结构

- 顶部说明清单默认只保存在当前设备，并摘要显示本地恢复点和 WebDAV 状态。
- 不提供手工复制或粘贴备份文本；用户只面对本机恢复点和 WebDAV。
- WebDAV 是高级手动备份能力，默认折叠；上传、下载、冲突和错误反馈必须留在同一面板内。
- 本地恢复快照与清空重建分开呈现；清空是危险操作，必须二次确认并在按钮附近反馈结果。
- 本地快照和 WebDAV 备份清单与成长记的便携数据，不包含物品照片、WebDAV 连接配置或凭据。

## 照片

- 照片只帮助用户辨认自家物品，不承担商品推荐。
- 上传后最长边压缩到 800px 左右，以 JPEG 约 0.8 存入 IndexedDB。
- 列表只显示约 36px 缩略图；替换和删除在行详情内。
- 照片不进入本机恢复点或 WebDAV 备份，界面需明确说明"照片仅存本机"。

## 宝宝成长记

- `/growth` 覆盖孕 8 至 40 周，默认可直接查看第 36 周，不以填写资料作为使用门槛。
- 宝宝称呼和预产期均可选；预产期仅用于推算当前孕周，允许继续浏览其他周。
- 逐周内容采用原创大小类比、参考身长体重、简短发育摘要和常见产检时间窗。
- 医疗信息只作一般参考，始终提示地区、医院和个人情况不同，以产检医生实际安排为准。

## 发布链路

- Web/PWA：manifest、Service Worker、离线页和安装入口必须可独立工作；新版本需更新 Service Worker cache name。
- Android：`android/` 工程 + `scripts/build-android-web.mjs` 静态导出打包 APK（含字体等 public 资产）；发布走 `scripts/release-apk.sh` 与 `scripts/validate-android-release.mjs`。

## 边界

- 不做医疗判断，不把模板描述成医院官方要求。
- 不放品牌、价格、购物链接或导购内容。
- 不引入账号体系或默认云上传。
- 不重新引入强制向导、六项及以上导航、七分组顶层 tab 或复杂筛选器。
