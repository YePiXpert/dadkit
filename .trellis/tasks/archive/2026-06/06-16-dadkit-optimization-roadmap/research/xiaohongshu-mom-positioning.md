# Xiaohongshu Mom-Facing Positioning Research

## Research Question

How should DadKit be repositioned and reshaped if the product will be promoted on Xiaohongshu and needs to feel attractive to pregnant moms, especially a mom preparing for a baby girl born in the Year of the Horse?

## Sources Checked

* Xiaohongshu / REDnote public platform description: user-generated notes, product discovery, social commerce, female/post-90s user base, search/bookmark behavior.
* Xiaohongshu feature and moderation notes: grass-planting notes, lifestyle search, external-link restrictions, authenticity and fake-review trust issues.
* Current DadKit repo/docs: README, current product positioning, existing page structure, recent IA and mobile optimization PRD.

## Key Takeaways

* Xiaohongshu is not just an ad channel. It behaves like a lifestyle search and bookmarking surface, so content should be useful, searchable, collectable, and screenshot-friendly.
* Pregnant moms are more likely to share or save content that reduces anxiety and gives them a concrete checklist, not content framed as a dad execution dashboard.
* The platform rewards perceived authenticity. Over-polished marketing claims, hard selling, and obvious traffic diversion can hurt trust.
* Xiaohongshu restricts explicit external traffic diversion, so promotion should rely on useful notes and share cards rather than aggressive "download/click link" language.
* DadKit's local-first and no-account privacy story is a strong fit for pregnancy users, but the public-facing copy should lead with mom safety, calmness, and preparation instead of "准爸爸工具".

## Product Implications

### Positioning

Reframe the product from:

> DadKit: 准爸爸待产准备 PWA

to:

> 给姐妹自己的安心待产清单，爸爸也能一起协作

DadKit can remain the internal/app name, but the first-screen and Xiaohongshu-facing narrative should be mom-first.

### IA Direction

The current five-tab structure can stay, but the meaning should shift:

* 首页：我的待产状态、今天先做、宝宝倒计时、临产模式。
* 清单：待产包和证件物品准备，不混入太多工具入口。
* 医院：下次产检要问、入院规则、医院会不会提供什么。
* 时间线：阶段节奏和不漏项提醒。
* 我的：资料、爸爸协作、小工具、数据备份、分享卡。

### Share/Viral Features

The most valuable Xiaohongshu-facing feature is not a generic share page, but a set of "笔记配图" cards:

* 我的待产包进度卡：`已准备 32/47 项`
* 下次产检要问卡：医院问题清单
* 临出门检查卡：证件、手机、充电器、妈妈包、宝宝包
* 分娩偏好卡：陪产人、沟通偏好、过敏/用药
* 小马宝宝倒计时卡：预产期、距离天数、阶段提醒

Cards should be privacy-safe, image-first, and usable as screenshots without requiring an external link.

### Copy Tone

Prefer:

* "姐妹今天先做这 3 件事"
* "别慌，先把能确认的确认好"
* "宝宝快来了，我们一步一步准备"
* "给爸爸的协作清单"

Avoid:

* "爸爸负责"
* "执行版"
* "工具箱"
* "任务管理"
* medical certainty or diagnosis-style claims.

### Visual Direction

Use a warm but clean style:

* Mom-first, not baby-only.
* Year-of-the-Horse baby girl can appear as subtle motifs: pony charm, lucky horseshoe, soft ribbon, calendar sticker.
* Keep strong readability and calm colors; avoid over-cute clutter that reduces trust.
* Share cards should be visually neat enough to appear in Xiaohongshu notes, but not so polished that they feel fake or ad-like.

## Feasible Approaches

### Approach A: Mom-First App Repositioning (Recommended)

Keep current feature foundation, but change public-facing copy, home hierarchy, onboarding, and share cards to a pregnant-mom perspective. Dad collaboration becomes a secondary mode.

Pros:

* Lowest technical risk.
* Fits current local-first data model.
* Makes the app more acceptable for Xiaohongshu promotion without abandoning DadKit's original dad-assist value.

Cons:

* Requires careful copy pass across many pages.
* DadKit name may eventually feel slightly off unless marketing subtitle carries the new positioning.

### Approach B: Share-Card-Led Growth

Prioritize beautiful Xiaohongshu-style image export cards first, then let existing app flows stay mostly unchanged.

Pros:

* Fastest to promote.
* Easy to test with real Xiaohongshu posts.

Cons:

* If users open the app and still see "准爸爸工具", conversion may feel mismatched.
* Could become surface-level if the core IA remains dad-first.

### Approach C: Template/Community Direction

Build "9月预产期姐妹版", "顺产版", "剖宫产版", "某医院待问模板" and later support community-style sharing.

Pros:

* Very Xiaohongshu-native long-term.
* Templates create search-friendly topics.

Cons:

* Highest scope and moderation risk.
* Could conflict with local-first/no-account simplicity if done too early.

## Recommendation

Start with Approach A, but include the first slice of Approach B:

1. Reposition copy to "孕妈安心待产搭子".
2. Keep dad collaboration as optional, named "给爸爸的协作清单".
3. Add 3 to 5 Xiaohongshu-friendly share cards.
4. Avoid community/account/e-commerce scope for the first version.

This keeps implementation incremental while making the product immediately more promotable.
