# DadKit 3.4.6 发布说明

发布日期：2026-08-08

Android：versionCode 19 / `com.dadkit.mobile`

## 修复内容

- 「我的」新增「关于 DadKit」入口，持续显示当前版本名；详情页在 Android 中同时显示 `versionCode`。
- Android 新增「检查更新」按钮，手动检查不受后台自动检查的 6 小时间隔限制。
- 检查结果明确区分「已是最新版」「发现新版本」和「检查失败」，有新版时同步显示版本说明。
- 启动更新浮层与设置页共用可用版本、下载进度、SHA-256 校验和安装状态，避免两个入口互相覆盖。
- 直接恢复到深层页面时，可从 `DadKitAndroid/<versionCode>` User-Agent 纠正本地版本，避免升级后沿用旧缓存造成误判。
- 「关于 DadKit」页面加入 PWA 预缓存、Android 静态导出和 APK 发布资源门禁。

## APK/PWA 一致性

- Web、PWA 和 APK 继续使用同一套 React 页面、更新检测逻辑和视觉组件。
- APK 继续内置完整页面、594 项公开资源、144 张物品图和 33 张成长图。
- 原生桥不可用时保留版本化 APK 下载链接，旧 APK 和浏览器仍可完成更新。

## 验收结果

- ESLint、TypeScript 类型检查通过。
- Vitest：93 个测试文件、617 项用例通过。
- Web 生产构建及全部性能预算通过；「我的」页 99%，「关于 DadKit」页 77%。
- Playwright：Chromium/WebKit 共 71 项通过、1 项按设计跳过。
- WebKit 跨标签完整链路额外连续复跑 3 次通过。
- `npm run android:bundle`、Android 发布资源校验、Gradle `assembleDebug` 与 `lintDebug` 通过。

## 发布后真机检查

建议从 3.4.5 正式包打开「我的 → 关于 DadKit」，确认显示 `3.4.5 (18)`，手动检查后发现 3.4.6，并完成下载、SHA-256 校验和系统安装。
