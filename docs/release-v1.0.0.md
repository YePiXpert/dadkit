# DadKit 1.0.0 发布说明

发布日期：2026-09-08

Android：versionCode 28 / `com.dadkit.mobile`；iOS：`com.dadkit.ios`（未签名 IPA，自签安装）

## 资源本地化架构

页面资源不再依赖服务器下发：Web 支持静态导出部署，Android 与 iOS 壳把
完整静态包内置在安装包里，启动与日常使用完全离线，只有家庭同步数据
请求云端 `/api/sync`。一套代码，四种形态（服务器托管 Web、静态托管 Web、
Android APK、iOS IPA）。

- 新增 `npm run build:static` 静态导出；App 发版流水线先导出再打包进壳。
- Android 改用 `WebViewAssetLoader` 以 `https://appassets.androidplatform.net`
  本地加载；外链一律转外部浏览器。
- iOS 新增手写壳工程：`WKWebView` + 自定义 `dadkit-local://localhost` scheme，
  主题桥与 Android 共名，外链走 SFSafariViewController。
- App 壳内跳过 Service Worker 注册与 PWA 安装提示；邀请链接统一指向公网 Web。

## 同步协议跨域支持

- `/api/sync` 新增 CORS 中间件：可信来源预检放行，暴露 `ETag`、
  `X-DadKit-Server-Time`、`Retry-After` 供跨域 fetch 读取。
- 认证新增 `Authorization: Bearer`（App 壳/静态托管场景），创建/加入空间的
  响应体回发 token；同源 Web 保持 HttpOnly Cookie 不变。
- Origin 策略放行两个 App 本地 origin 与 `DADKIT_TRUSTED_ORIGINS` 中的
  静态托管域名的跨站请求；Bearer 请求按 token 凭证放行，不适用 Cookie CSRF 检查。

## Android 旧数据自动迁移

旧版（versionCode ≤ 27，远程壳）的本地数据存于旧站点 origin 下。升级后
首次启动会静默加载一次旧站点，通过 `window.__dadkitLegacyExport` 导出
可移植数据（v11），复用既有原生迁移通道导入新版。已开启家庭同步的设备
直接从云端拉回；迁移失败自动重试（最多三次），兜底保留 JSON 导入。

## 部署改进

- `docker-deploy.sh` 支持交互式首次配置：域名 + HTTPS 或无域名 IP 直连
  （自动探测公网 IP、监听 `0.0.0.0`、关闭 HTTPS 强制），无需手改 `.env`。
- 注意发布顺序：先部署云端服务器，再发布 APK（旧数据迁移依赖服务器上的导出钩子）。
- 官方 APK/IPA 的同步地址在构建期固化为官方服务器；自建服务器需重新构建
  壳包（`NEXT_PUBLIC_DADKIT_API_BASE`），浏览器访问不受影响。

## 升级说明

- Android 直接覆盖安装（versionCode 28）；iOS 从构建产物下载未签名 IPA
  后用 Sideloadly/AltStore 自签安装（免费 Apple ID 七天重签一次）。
- 已安装的 PWA 与旧版远程壳 APK 不受影响：服务器继续托管完整 Web。

## 验收

- TypeScript、ESLint、生产构建、性能预算与双平台发布校验脚本全部通过。
- 70 个 Vitest 文件、449 项测试通过；Playwright Chromium + WebKit 全量
  端到端 65 项通过。
- 跨域冒烟：可信来源预检回显、恶意来源 403、跨站建空间返回 token、
  Bearer 拉取与 ETag 读取、无效 token 401、iOS 本地 scheme 来源放行。
- Android 本地 `gradlew assembleRelease` 通过；GitHub Actions 三条流水线
  （android-release / ios-release / docker）全部成功。
