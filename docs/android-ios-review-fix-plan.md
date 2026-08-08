# DadKit 双端 Review 修复计划（3.4.2 历史归档）

> 此文档记录 3.4.2 的原生 Compose 尝试，已被 3.4.3 的全端同源方案取代，不再是当前施工依据。当前 Android 使用 `scripts/build-android-web.mjs` 将完整 PWA 打包进 APK；`scripts/validate-android-release.mjs` 校验全部页面、144 张物品图、33 张成长图，并逐文件比对 `public/`。3.4.2 原生数据通过 `DadKitAndroidMigration` 在首次启动时合并迁移。

本文档是「安卓转原生 App + iOS 仍 PWA」双端 review 的修复计划，交给 Codex 执行。问题已由 Kimi 完成排查与定位，按优先级排成 5 个阶段，每个阶段独立可交付、独立验收。

## 背景速览（先读）

- **安卓端已是完全原生应用**：Kotlin + Jetpack Compose，代码在 `android/app/src/main/java/com/dadkit/mobile/`。WebView 壳已退役，`scripts/prepare-native-android.mjs`（`npm run android:bundle`）负责把 `lib/templates/general.ts` 生成 `android/app/src/main/assets/default_checklist.json`，**该脚本仍在使用，必须保留**。
- **iOS 端仍是 Next.js PWA**：`app/` + `public/sw.js`，localStorage（`lib/storage.ts`）+ IndexedDB（`lib/baby/repository.ts`）。
- **双端共用一套家庭同步协议**：`/api/sync/pull|push` + `/api/sync/v2/*`，文档版本 v9。Web 端合并纯函数 `lib/sync/merge.ts`（服务端 push 也用它，`lib/sync/server-store.ts`），原生端对应 `android/.../sync/JsonDocumentMerger.kt`。合并语义：按 `updatedAt` 字段级 last-write-wins + 墓碑 + `clearedAt` 清除线。
- 原生端关键文件：
  - `ui/DadKitApp.kt`（约 1050 行，全部界面）
  - `data/DadKitRepository.kt`（本地文档读写 + 快照解码，文档存单条 SharedPreferences）
  - `data/NativeModels.kt`（模型 + `categoryLabels`）
  - `sync/NativeSyncClient.kt`（pull→merge→push，Bearer token 来自创建/加入时的 Set-Cookie）
  - `sync/JsonDocumentMerger.kt`
  - 构建：`android/app/build.gradle`（versionCode 15 / versionName 3.4.2，`SYNC_BASE_URL` 由 `DADKIT_PUBLIC_ORIGIN` 注入，默认 `https://dadkit.505f.com`）

## 施工约定（必须遵守）

- **不做任何 git 写操作**（commit/push/reset 等），只许只读 git 命令（status/diff/log/show）。
- UI 文案一律简体中文；代码风格、注释密度、命名跟随所在文件现状。
- 仓库工作区文件以 CRLF 为主且部分混合行尾。**编辑时必须保留每处原有行尾**，用 `git diff --ignore-cr-at-eol` 自查没有行尾污染。
- 文中行号是 review 时的定位，**按符号名定位，不要迷信行号**。
- 新增行为要补测试：web 侧补 vitest（`tests/`，命名跟随现有惯例）；安卓侧补 junit4 单测（`android/app/src/test/`，跟随 `JsonDocumentMergerTest.kt` 惯例，junit4 + org.json）。
- 每完成一个阶段执行对应验收命令，全绿再进入下一阶段。

### 各端验收命令

- Web 改动：`npm run lint && npm run typecheck && npm run test`；动了 bundle 结构再 `npm run build && npm run performance:check`。
- 安卓改动：先 `npm run android:bundle`，再 `cd android && ./gradlew.bat :app:assembleDebug :app:testDebugUnitTest`（Windows；类 Unix 用 `./gradlew`）。注意 `lintOptions { abortOnError true }`，lint 不过assemble 会失败。
- 全量收尾：以上全部 + `npm run test:e2e`（如 Playwright 环境可用）。

---

## 阶段 1：原生端数据正确性（最高优先，防数据丢失）

### 1.1 原生端改字段级时间戳（整对象刷新会覆盖 iOS 端并发修改）

- 证据：`DadKitRepository.kt` 的 `saveBabyProfile`（约 :113-120）把 nickname/birthDate/birthTime/sex 四个字段**全部**打新时间戳；`saveHospital`（约 :169-182）对 7 个字段同样处理；`updateChecklistItem`（约 :41-63）总是刷新 name/quantity/note。而 Web 端是字段级更新（`lib/baby/portable.ts` `updateBabyProfileValues`、`lib/hospital/portable.ts` `updateHospitalProfile`、`components/EditItemDialog.tsx` 只传变化字段）。
- 后果：iOS 端刚改了出生日期，安卓端只改昵称保存 → 安卓本地的旧出生日期带着更新时间戳推上去，iOS 端的修改被静默覆盖。服务端合并只认 `updatedAt`，协议合法、语义错误。
- 要求：
  - `saveBabyProfile` / `saveHospital`：逐字段比较 stamped 旧值（`value`）与新值，**只为真正变化的字段**写入 `stamped(newValue, timestamp)`；未变字段保持原对象不动。
  - `updateChecklistItem`：同样逐字段处理 name/quantity/note；`customItems` 镜像对象同步只改变化字段。
  - 一个都沒变时返回 `DataActionResult.success(changed = false)`，不落盘。
- 验收：新增 `DadKitRepositoryTest.kt` 单测——构造文档后只改一个字段，导出 JSON 断言其他字段的 `updatedAt` 保持不变；`gradlew :app:testDebugUnitTest` 绿。

### 1.2 原生端服务器时钟对齐

- 证据：Web 首次同步会读响应头 `X-DadKit-Server-Time` 计算时钟偏移并平移本地时间戳（`lib/sync/client.ts` 中 `alignExportDataToServerTime` 相关逻辑）；原生端 `DadKitRepository.nextTimestamp`（约 :428-438）直接用 `System.currentTimeMillis()`，无对齐。设备时钟偏慢时原生端编辑在 LWW 合并中必然输给其他端，偏快时又会误赢。
- 要求：
  - `NativeSyncClient.request` 的 `HttpResult` 增加暴露响应头；每次 pull 后读取 `X-DadKit-Server-Time`，计算 `offsetMs = serverTime - localNow`，存入 prefs（`dadkit_native_sync`）。
  - `DadKitRepository` 的时间来源改为可注入时钟（构造参数或 setter，默认 `System.currentTimeMillis() + prefsOffset`）；`nextTimestamp` 与照护记录的 `occurredAt`（`Instant.now()` 处）都走这个时钟。
  - 不需要重写历史时间戳，只对之后的写入生效（比 web 的整体平移简单，可接受）。
- 验收：单测注入固定偏移，断言新时间戳按服务器时钟生成；`gradlew :app:testDebugUnitTest` 绿。

### 1.3 断开同步时调用 `/api/sync/leave`

- 证据：Web 退出同步会调 leave，服务端立即移除 session（`lib/sync/client.ts` 约 :793-807）；原生端 `NativeSyncClient.disconnectFromFamily`（约 :134-144）只清本地 prefs，服务端设备列表残留到 TTL 过期。
- 要求：`disconnectFromFamily` 改为 `suspend`，先带当前 token 按 web 端相同的方法/路径调 leave（先读 `lib/sync/client.ts` 确认是 POST 还是 DELETE、路径与载荷），**成功失败都清本地**（失败可记 message 但不阻断断开）。`DadKitApp.kt` 中 `report(client.disconnectFromFamily())` 调用处改为 `scope.launch { report(client.disconnectFromFamily()) }`。
- 验收：断开后服务端 `/api/sync/v2/sessions` 列表不再包含该设备（手动验证即可，注明验证方式）。

---

## 阶段 2：原生端应用内更新检查

### 2.1 启动时检查新版本

- 证据：`components/AndroidUpdatePrompt.tsx` 依赖 `?source=twa|apk&appVersionCode=` 参数，只对旧 TWA 用户有效；新原生 App 没有任何查询 `/api/app-version` 的逻辑，今后发新版无法触达现有用户。`/api/app-version` 与 APK 下载端点（`app/api/app-version/route.ts`、`app/api/app-version/apk/route.ts`、`lib/android-release.ts`）**必须保留**——既是旧 TWA 用户迁移通道，也是本阶段原生端更新检查的依赖。
- 要求：
  - 先读 `app/api/app-version/route.ts` 确认响应结构（约 `{ versionCode, versionName, notes, url? }`）。
  - 原生端 App 启动后（`DadKitApp` 的 `LaunchedEffect` 或独立 composable）GET `/api/app-version`，与 `BuildConfig.VERSION_CODE` 比较；有更新时弹 `AlertDialog`：版本名 + notes + 「下载更新」（`Intent.ACTION_VIEW` 打开 `url` 或 `/api/app-version/apk?versionCode=N`，浏览器下载 APK 后由系统引导安装）+「稍后」。
  - 检查失败/无更新完全静默；不阻塞启动；每次冷启动至多检查一次即可（无需间隔存储）。
- 验收：`assembleDebug` 通过（lint abortOnError 下）；手动把 `DADKIT_PUBLIC_ORIGIN` 指向带更新 manifest 的环境验证弹窗与下载跳转。

---

## 阶段 3：原生端 UX 对齐

### 3.1 「妈妈包」分类标签去歧义

- 证据：`NativeModels.kt` `categoryLabels`（约 :92-102）中 `mom_labor` 与 `mom_postpartum` 都映射为「妈妈包」，添加物品对话框（`DadKitApp.kt` `AddChecklistDialog` 约 :460）出现两个一模一样的 chips。
- 要求：先在 web 端查这两个 key 的展示文案（grep `mom_labor` / `mom_postpartum`，看 `lib/` 与组件中的分类标签来源），原生端改成与 web 一致且互相可区分的文案；若 web 也叫同一个名字，则两端一起改（web 改 vitest 同步更新）。
- 验收：添加对话框无重复标签；清单筛选 chips 同步生效；全端测试绿。

### 3.2 医院档案补齐 14 个字段

- 证据：`DadKitRepository.kt` `HOSPITAL_FIELDS`（约 :447-452）定义了 14 个字段，但 `HospitalProfile`（`NativeModels.kt:30-38`）与 `HospitalScreen`（`DadKitApp.kt` 约 :710-735）只暴露 7 个；web 端填写过的 `inpatientEntranceNote`/`admissionProcessNote`/`companionRuleNote`/`providedItemsNote`/`restrictedItemsNote`/`requiredDocumentsNote`/`generalNote` 在原生端不可见。
- 要求：`HospitalProfile` 补齐 7 个字段；`decode` 与 `saveHospital` 的 values map 同步扩展（沿用阶段 1.1 的字段级时间戳）；`HospitalScreen` 增加对应输入框（文案对齐 web 端 `app/hospital/` 的字段标签）。
- 验收：web 端已填字段在原生端可见可编辑；保存后 web 端可见。

### 3.3 清单编辑能力补齐

- 证据：原生端无法标记「不需要」（web 有 `toggleItemSkipped`）、无法指定「已清洗」等具体状态（web 按 `preparationKind` 给状态选项，`lib/preparation.ts` `getStatusOptionsForItem`/`getQuickStatusOptionsForItem`）；`AddChecklistDialog` 无数量字段，`EditChecklistDialog` 无分类；`addChecklistItem` 的 `preparationKind` 固定写死 `"pack_existing"`（`DadKitRepository.kt` 约 :84）。
- 要求：
  - a) `AddChecklistDialog` 加数量字段；`EditChecklistDialog` 加分类选择 chips（复用去歧义后的 `categoryLabels`）。
  - b) 移植 `lib/preparation.ts` 的状态工作流逻辑到原生端（按 `preparationKind` 决定可选状态集，含 `not_needed`），`EditChecklistDialog` 增加状态 chips；`DadKitRepository` 新增 `setChecklistItemStatus(id, status)`（更新 checklist + customItems 镜像 + `updatedAt`）。快捷点按循环**保持不变**（已与 web `advanceItem` 一致）。
  - c) `AddChecklistDialog` 增加准备方式选择（对齐 web `AddItemDialog` 的 `CUSTOM_PREPARATION_OPTIONS`，含 `wash_then_pack`），`addChecklistItem` 按选择写 `preparationKind` 及关联默认字段。
- 验收：原生端可标「不需要」「已清洗」，状态在 web 端正确显示（web `getChecklistItemState` 兼容）；补单测覆盖新 repository 方法。

### 3.4 照护记录「记录人」

- 证据：web 端照护事件记录 `recordedByMemberId`（`lib/baby/types.ts`、`lib/baby/store.ts`），原生端恒写 null（`DadKitRepository.kt` 约 :134、:153），web 时间线上原生端记录没有「谁记的」。
- 要求：在家庭成员页或同步页增加「这台设备的记录人」设置项（成员列表 + 「不指定」），存 prefs；`addBottleRecord`/`addDiaperRecord` 写入该 memberId；成员被删除后回退 null。
- 验收：web 端查看记录显示记录人；补单测。

### 3.5（可选，时间充裕再做）清单搜索

- web `/checklist` 有搜索；原生端没有。可在 `ChecklistScreen` 顶部加 `OutlinedTextField` 过滤 name/note。验收：中文包含匹配即可。

---

## 阶段 4：iOS PWA 修复

### 4.1 Service Worker 离线覆盖补齐

- 证据：`public/sw.js` install 预缓存只覆盖少量路由（当前实现见文件顶部常量），`/baby`、`/growth`、`/departure`、`/hospital`、`/planning`、`/tools`、`/settings/*` 等未预缓存的路由离线首访会回退到首页而非目标页；安装引导文案宣称「离线也能用」。
- 要求：先读 `public/sw.js` 现状（注意 `docs/optimization-plan-remaining.md` 阶段 1 #8 改过缓存策略：install 只预缓存 app shell，其余首访时写缓存）。把核心路由（`/baby`、`/baby/timeline`、`/tools`、`/growth`、`/departure`、`/hospital`、`/planning`、`/settings`、`/settings/backup`、`/settings/checklist`、`/settings/family`、`/settings/sync`、`/privacy`、`/support`）纳入 install 预缓存；`CACHE_NAME` 后缀升一级（如 `r1→r2`）触发旧缓存清理。若某路由预缓存会显著拖慢 install，可改为「导航请求命中缓存回退时优先回退到请求路径自身的缓存副本，最后才回退 `/`」——目标是离线打开已访问过的页面不跳首页。
- 验收：手动或 e2e 验证离线访问已缓存路由不回退首页；`tests/` 中如有 sw 相关断言同步更新。

### 4.2 对话框 history guard（iOS 左滑返回）

- 证据：iOS standalone 下打开对话框（`components/AddItemDialog.tsx`、`EditItemDialog.tsx`、`ItemPlanningDialog.tsx`）时从屏幕左缘滑动会触发浏览器后退，弹窗状态丢失。
- 要求：对话框打开时 `history.pushState` 压入一条标记记录，监听 `popstate` 关闭对话框（而不是离开页面）；对话框正常关闭时清理对应 history 记录，避免堆积。封装成可复用 hook（如 `lib/use-dialog-history-guard.ts`），三个对话框复用。
- 验收：iOS PWA 下左滑只关弹窗不跳页；浏览器后退键行为不回归；补 vitest。

### 4.3 安装引导文案区分浏览器

- 证据：`components/InstallPrompt.tsx`（约 :174）iOS 引导文案固定「用 Safari 打开……」，对已在 Safari 的用户不准确。
- 要求：UA 判断当前是否已是 Safari（排除 CriOS/FxiOS/EdgiOS）：已是 Safari 直接给「点底部分享按钮 → 添加到主屏幕」步骤；不是则提示先用 Safari 打开本页。
- 验收：两种场景的文案各有 vitest 断言。

---

## 阶段 5：WebView/TWA 时代死代码清理

### 5.1 移除 `isBundledAndroidApp` 及相关分支

- 证据：原生 App 不再加载网页，UA 里不会出现 `DadKitAndroid/`，`lib/install-prompt.ts:27-33` 的 `isBundledAndroidApp()` 恒为 false。引用点：`components/InstallPrompt.tsx`（约 :48-53、:90、:128）、`components/InstallPromptSettingsEntry.tsx`（约 :44-47）、`components/BackgroundTasks.tsx`（约 :82，PwaRegister 条件渲染）、`lib/install-prompt.ts` 的 `isPwaInstallAvailable`。
- 要求：删除函数与所有分支（`isPwaInstallAvailable` 简化为只看 beforeinstallprompt/iOS）；`tests/install-prompt.test.ts` 中 WebView UA 用例（约 :97）删除或改写；`tests/e2e/dadkit.spec.ts`（约 :71）「Android APK WebView 不显示 PWA 安装入口」用例同步处理。
- 验收：`npm run lint && npm run typecheck && npm run test` 全绿；全仓 grep `isBundledAndroidApp` / `DadKitAndroid` 仅剩 `NativeSyncClient.kt` 中的请求 UA（那个保留，服务端可用来识别原生客户端）。

### 5.2 移除 `next.config.ts` 的 `isAndroidBundle` 分支

- 证据：`next.config.ts:3、17-18、22` 的 `DADKIT_BUILD_TARGET=android` 分支（`output: "export"`、`trailingSlash`、跳过安全头）服务于已退役的 WebView 打包流程。
- 要求：移除分支，`output` 恒 `"standalone"`、`trailingSlash` 恒 false、headers 恒启用；全仓（含 `.github/`、`scripts/`、Dockerfile、docker-compose.yml）grep `DADKIT_BUILD_TARGET` 确认无其他引用后一并清理。**保留** `npm run android:bundle`（prepare-native-android.mjs 仍被原生端使用）。
- 验收：`npm run build` 正常；`npm run performance:check` 绿。

### 5.3 保留项（明确不做）

- `/api/app-version`、`/api/app-version/apk`、`lib/android-release.ts`：保留（旧 TWA 迁移通道 + 阶段 2 原生端更新检查依赖）。
- `components/AndroidUpdatePrompt.tsx`：保留（旧 TWA/APK WebView 用户仍是它的受众）。
- `NativeSyncClient.kt` 的 `User-Agent: DadKitAndroid/<versionCode>`：保留。

---

## 附录：已知但本计划不修的事项

- `JsonDocumentMerger.kt` 缺 web `lib/sync/merge.ts` 里 v8→v9 `recordedByMemberId` 保留与 v7/v8 planning 兼容分支：原生端固定请求 data version 9，正常运行不触发，不修。
- 原生端 pull 无 ETag/304：流量优化，不紧急，可后续单独立项。
- 双端各自创建同名自定义物品会成两条（ID 前缀 `native-` vs `user-item-`）：不冲突但会重复，记录为已知行为。
- 原生端无孕期成长/出院清单/采购分工界面（数据仅同步透传，不会丢）：属功能规划，另立需求。

## 执行顺序与里程碑

1. **阶段 1**（数据安全，必须最先）：1.1 → 1.2 → 1.3，三条都在 `android/` 内，互不依赖可并行，但 1.1 必须先合入。
2. **阶段 2**（更新机制）：依赖 `/api/app-version`，独立于阶段 1。
3. **阶段 3**（原生 UX 对齐）：3.1 → 3.2 → 3.3 → 3.4，3.5 可选；3.2/3.3 依赖阶段 1.1 的字段级时间戳模式。
4. **阶段 4**（iOS PWA）：三条互相独立，可与阶段 1-3 并行。
5. **阶段 5**（死代码清理）：最后做，避免与前面改动冲突。
6. 全部完成后跑「全量收尾」命令，并更新 `docs/optimization-plan-remaining.md` 或新增完成记录。

---

## 执行结果（2026-08-07）

- 阶段 1–5 已全部完成，阶段 3.5 可选清单搜索也已实现。
- Android 已补齐字段级时间戳、服务器时钟偏移、退出同步、原生更新检查、医院 14 字段、清单完整编辑能力与照护记录人；原生 JUnit 覆盖 repository 与时钟逻辑。
- iOS PWA 已补齐核心路由预缓存、动态构建资源缓存回执、对话框 history guard 与 Safari 差异化安装文案。Service Worker 在 3.4.2 发布时更新为 `dadkit-v3.4.2-pwa-r1`，注册延后到页面完成加载后，避免与首屏 LCP 争用资源。
- WebView/TWA 死代码已清理；`/api/app-version`、`AndroidUpdatePrompt`、`prepare-native-android.mjs` 与原生同步 UA 按计划保留。
- 最终验收：
  - `npm run lint`、`npm run typecheck`、`npm run build`、`npm run performance:check` 全部通过；规划页 240.1 KiB / 255 KiB，备份页 239.9 KiB / 258 KiB。
  - `npm run test`：88 个测试文件、544 项测试全部通过。
  - `npm run test:e2e`：Chromium/WebKit 共 69 项通过、1 项按设计跳过（WebKit 不执行 Chromium CDP 性能门禁）、0 失败。
  - `npm run android:validate` 与 `npm run android:bundle` 通过，生成 144 项原生默认清单。
  - `gradlew :app:assembleDebug :app:testDebugUnitTest`：BUILD SUCCESSFUL。
