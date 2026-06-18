# DadKit Optimization And Feature Roadmap

## Goal

梳理 DadKit 下一阶段最值得做的优化和新增功能，形成可执行的 MVP 范围，避免继续零散堆页面或把不同目标混进移动端布局稳定化任务。

## What I Already Know

* DadKit 是 Next.js 15 / React 19 本地优先 PWA，核心定位是准爸爸使用的待产包、医院确认、时间线和临产准备工具。
* 当前已有页面包括首页、初始化、清单、医院、时间线、出发、宫缩、分娩计划、产后、设置、分享和示例页。
* 当前已有核心模块包括规则生成、时间线、医院确认问答、助产士门诊内容、分娩准备、导出、本地存储、WebDAV 备份和首页 presentation 层。
* 最近提交已完成女宝属马视觉方向、移动端布局收敛、时间线拆分、文字溢出修复、更多工具区、助产士门诊知识和提醒项。
* 进行中的旧任务 `06-15-stabilize-pwa-mobile-layout-system` 已聚焦移动端布局稳定化，不适合继续承载产品功能路线图。

## Assumptions

* 下一阶段应优先提升“真实临产场景里的可用性”，而不是单纯增加信息展示页。
* 新功能应保持本地优先，不默认引入账号体系、远程数据库或医疗诊断式 AI。
* UI 继续遵循移动端 PWA、小屏优先、女宝属马、低文字溢出风险的方向。

## Open Questions

* None.

## Requirements (Evolving)

* 输出一组按优先级排序的产品优化/新增功能候选。
* 为首个 MVP 方向明确目标用户场景、主要页面/模块、验收标准和不做范围。
* 保持与现有页面结构、local-first 数据模型、Trellis 质量流程兼容。
* 已选择首个 MVP 方向：临产执行闭环。
* 首版应把 `/go` 打造成“现在要出门怎么办”的行动页，整合待产包最后确认、证件/支付、医院电话、路线提示、宫缩/破水记录入口和家人可复制的信息。
* 首版优先复用现有数据：时间线 go-time 任务、清单状态、宫缩记录、临产提醒、分娩计划中的医院电话字段。
* 首版纳入医院联系与入院路线信息，至少包括：医院电话、入院地址/路线备注、夜间入口、停车备注。
* 医院联系与路线信息必须本地保存，随 JSON 导入导出和 WebDAV 备份一起保留。
* `/go` 必须提供这些信息的快速查看和快速编辑入口，避免临产时跳多层页面。
* 首页只做临产模式强入口和关键状态提示，不承载完整操作流程。
* `/go` 承载完整临产执行详情，作为出门前的主操作页。
* 新增范围：优化全站操作逻辑、页面排布和功能分类，减少“每页都像工具箱”的混杂感。
* 首轮信息架构优化应优先处理现有页面职责和入口归属，不优先新增远程能力、账号能力或复杂新数据模型。
* 底部导航继续保持 5 个主入口，但每个入口需要有清晰职责：状态、清单、医院、时间线、我的/工具与数据。
* 二级工具页需要有稳定归属，避免用户不知道从哪里进入或返回。

## Candidate Directions

## Research References

* [`research/xiaohongshu-mom-positioning.md`](research/xiaohongshu-mom-positioning.md) — 小红书推广更适合“真实、可收藏、可截图分享”的孕妈主视角，DadKit 应从准爸爸工具转成孕妈安心待产搭子，爸爸协作降为辅助模式。

### Option A: 临产执行闭环

把 `/go`、宫缩、破水/见红提示、待产包最后确认、证件支付、医院电话/路线整合成“现在要出门怎么办”的行动流。

**Decision**: 采用为当前 MVP。理由是它最贴近真实临产时爸爸会立即打开 PWA 的场景，并且能复用当前已有 `/go`、`/contractions`、`birth-plan`、`timeline` 能力。

### UI Shape Decision

**Decision**: 采用“首页入口 + `/go` 页详情”。首页突出临产模式入口和少量关键状态，完整操作流放在 `/go`。

**Consequences**: 首页保持轻量，不变成复杂工具页；`/go` 成为临产时唯一主操作入口。相比单页行动卡片，这会多一次进入详情的点击，但后续扩展空间更清晰。

### Option B: 医院问答与分娩偏好闭环

把医院确认项变成下次产检问答单，支持已问/未问、复制给家人、导出分娩偏好卡，并把结果反哺清单和时间线。

### Option C: 移动端质量基建

继续强化 PWA 截图回归、横向溢出检测、文字撑爆防护、移动端安全区和双指缩放防回归测试。

### Option D: 产后办理与家庭协作

补齐出生后证件、出院、医保、复查、喂养记录、家人分工等后续流程，但这会明显扩大产品范围。

### Current Addendum: 操作逻辑与信息架构优化

当前用户明确要求使用 Trellis 继续优化“操作逻辑和页面排布布置分类等”。这应作为上一轮临产执行闭环之后的下一阶段，而不是继续向 `/go` 单页追加功能。

初步代码检查显示：

* `MobileNav` 已有 5 个主入口：首页、清单、医院、时间线、我的。
* 首页已经承担状态总览、今日行动、临产模式入口和小工具入口，存在入口继续膨胀的风险。
* 清单页同时承担分类入口、筛选、模式切换、添加、自定义、复制购物清单、跳转时间线和临出门模式，操作密度偏高。
* 医院页已经有医院确认闭环，但“高级设置”和问答操作混在同一页，适合做分层。
* 时间线页已有当前阶段、今天先做、阶段列表和临出门入口，方向正确，但需要保持窄屏信息密度和首屏节奏。
* 设置页当前混合了资料、更多工具、备份、WebDAV、危险操作、关于信息，适合拆成“我的资料 / 小工具 / 数据安全 / 关于”四类。

Recommended first IA direction:

* 首页：只保留“今天要做什么”“准备进度”“临产模式强入口”“3 个常用工具”，不承载完整工具目录。
* 清单：变成“物品准备工作台”，把视觉分类放前面，把筛选/重置/复制购物清单收进操作区。
* 医院：变成“产检问答与入院信息”，优先展示待确认问题和入院关键信息，高级模板设置折叠。
* 时间线：变成“节奏与阶段”，只回答当前阶段、今天先做、后续阶段，不再承担工具目录。
* 我的：变成“资料、工具、数据、安全”的分类中心，承载完整小工具区和备份/导入导出。

**Decision**: 采用 Option A “任务流优先”。用户已确认该方向。第一轮实现不追求重做所有视觉细节，而是先收敛操作路径和页面职责。

**Consequences**:

* 首页作为状态和下一步动作入口，避免继续堆完整工具目录。
* “我的”成为工具和数据的归档入口，保留完整工具目录、资料、备份、安全操作。
* 清单、医院、时间线各自只承担本域主流程；跨域入口只保留高价值跳转。
* 该方案对现有数据结构影响最小，主要是组件拆分、文案分组、入口归属和页面顺序调整。

### Xiaohongshu / Mom-Facing Addendum

小红书推广方向应作为下一轮产品表达和传播能力优化，而不是把当前 DadKit 做成社交社区或电商导购。

Recommended direction:

* 公开叙事从“准爸爸待产准备 PWA”调整为“给姐妹自己的安心待产清单，爸爸也能一起协作”。
* 首页、设置、分享页优先使用孕妈主视角：宝宝倒计时、今天先做、别漏项、下次产检要问、临出门检查。
* “爸爸负责 / 爸爸执行版”改成更柔和的“给爸爸的协作清单 / 家人协作”。
* 分享能力从通用页面升级为小红书友好的笔记配图卡：待产包进度卡、下次产检要问卡、临出门检查卡、分娩偏好卡、小马宝宝倒计时卡。
* 保持本地优先和隐私作为信任卖点，但不要在首屏堆技术术语；放在“我的 / 数据安全”里解释。
* 宝宝性别应作为用户资料可选项；生肖/属相不手选，应根据预产期或出生日期自动推算并作为派生展示。
* 软件界面和用户可见文案不能出现“小红书”字样；相关能力在产品内命名为“分享配图 / 笔记配图”。

Decision to validate:

* 第一版推荐采用“孕妈主视角 + 爸爸协作保留 + 分享卡先行”。不做账号、社区、评论、模板市场或商品推荐。
* 用户已确认：属相不用选，按出生日期/预产期自动计算。

## Implementation Design

### Navigation Contract

Keep the 5 mobile tabs:

* 首页：状态、今天先做、临产模式强入口、少量常用入口。
* 清单：物品准备工作台，重点是分类、进度、筛选和清单操作。
* 医院：产检问答和入院规则确认，模板/覆盖信息保持折叠。
* 时间线：孕周阶段节奏，不承载完整工具目录。
* 我的：资料、全部工具、数据备份、安全操作、关于。

### Page-Level Changes

* 首页：保留 hero、临产模式、今日行动、准备进度；常用工具只保留 3 个高频入口，并指向“我的”的完整工具目录。
* 清单：保留分类入口前置；把筛选/批量操作文案改成“清单操作”，减少像设置面板的感觉；跨域按钮只保留“临出门检查”和“时间线”。
* 医院：首屏强调“待确认事项”和“入院信息”；高级模板设置继续折叠。
* 时间线：保留当前结构，重点检查 `mobile-shell` 宽度、stage row overflow 和 `/go` CTA 文案。
* 我的：重排为四个明确分区：我的资料、常用小工具、数据备份、应用与安全。完整工具目录从这里进入。

### Testing Approach

* Update existing copy/style tests only where assertions depend on moved labels.
* Add or update UI contract tests for:
  * 首页仍有 `/go` 强入口和 `settings#more-tools` 链接。
  * `MobileNav` secondary route ownership remains unchanged.
  * 设置页存在 `#more-tools` and grouped tool links.
* Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`.

## Acceptance Criteria (Evolving)

* [x] 用户确认一个 MVP 优先方向。
* [ ] PRD 明确该方向的需求、验收标准、技术边界和不做范围。
* [ ] 如进入实现，先加载 `trellis-before-dev`，实现后加载 `trellis-check`。
* [ ] 首页有明确的临产模式入口，能跳转到 `/go`。
* [ ] `/go` 首屏能直接回答“现在要做哪几件事”：联系医院、确认信号、拿关键物品、出门路线。
* [ ] 用户可保存医院电话、入院地址/路线备注、夜间入口、停车备注，并在 `/go` 首屏或近首屏看到。
* [ ] 临产信号记录入口能从 `/go` 快速进入宫缩/破水/见红相关记录或提示。
* [ ] 导出/导入数据后，医院联系与路线信息仍保留。
* [ ] 不引入医疗判断结论；所有去医院判断仍以医生/医院要求为准。
* [ ] 全站主入口职责清晰，首页不继续堆完整工具目录。
* [ ] 小工具形成独立分类区，用户能从“我的”稳定找到全部工具。
* [ ] 清单、医院、时间线各自只承载本域主任务，跨域跳转保持轻量。
* [ ] 移动端页面继续使用 `page-shell` / `mobile-shell`，不引入横向溢出。

## Definition of Done

* Tests added/updated where behavior changes.
* Lint / tests / build pass before completion.
* Trellis spec updated if new UI or data-flow conventions emerge.
* Work committed separately from unrelated untracked Trellis scaffold files unless explicitly requested.

## Out of Scope

* 当前不直接做医疗诊断、风险评分或替代医生建议。
* 当前不默认加入账号登录、社交社区或远程多人实时协作。
* 当前不做地图 SDK、实时导航、定位权限或路线耗时计算；路线字段先作为用户手动记录。
* 当前不把旧移动端稳定化任务继续扩大为产品路线图任务。

## Technical Notes

* Existing scripts: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run visual:screenshots`.
* Existing visual verification constraint: Codex in-app Browser 访问 localhost/127.0.0.1 可能被企业网络策略阻止，应优先使用本地 Chrome/Edge CDP 截图脚本。
* Likely relevant modules for future implementation: `app/go/page.tsx`, `app/contractions/page.tsx`, `app/hospital/page.tsx`, `app/birth-plan/page.tsx`, `app/timeline/page.tsx`, `app/settings/page.tsx`, `lib/labor-guide.ts`, `lib/hospital/*`, `lib/store.ts`, `lib/storage.ts`.
* Current reusable pieces discovered during inspection:
  * `/go` already renders go-time task progress and toggles timeline go tasks.
  * `/contractions` already stores contraction records and has `#labor-alerts` for urgent signal guidance.
  * `BirthPlan` already includes `hospitalPhone`; it does not yet include address, route, entrance, parking, or night-entry fields.
  * `generateTimeline` already includes one-week and go-time tasks for route, phone, documents, payment, labor-signal note, and go-bag confirmation.
  * `MobileNav` already supports secondary route ownership for `/go`, `/share`, `/birth-plan`, `/contractions`, and `/postpartum`.
  * `app/settings/page.tsx` already has a `#more-tools` section, but it is visually mixed with backup, profile, WebDAV, about, and danger-zone content.
  * `components/TimelineDashboard.tsx` is already split into current stage, priority tasks, stage rows, due date card, and go-mode CTA, so timeline optimization can stay mostly presentational.
* Recommended data approach for implementation:
  * Extend the existing local-first birth/admission communication data rather than creating a separate remote model.
  * Keep fields string-based for MVP: `hospitalPhone`, `hospitalAddress`, `hospitalRouteNotes`, `nightEntranceNotes`, `parkingNotes`.
  * Include new fields in storage merge defaults, JSON export/import validation, store hydration, and copy/share text where relevant.
