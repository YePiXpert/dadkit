# DadKit v2.1.0

DadKit 是一个本地优先的待产包清单与宝宝成长记 PWA。数据默认只保存在当前设备；需要时可以使用本地恢复快照、WebDAV 备份或家庭同步。

正式站点：[https://dadkit.505f.com/](https://dadkit.505f.com/)

最新 Android APK：[GitHub Release](https://github.com/YePiXpert/dadkit/releases/latest) ｜ [DadKit-2.1.0.apk](https://github.com/YePiXpert/dadkit/releases/download/v2.1.0/DadKit-2.1.0.apk)

## 主要功能

- 清单按证件、妈妈、宝宝、月子、陪产、返家和临出门分组；使用全部、待购买、待装包、已装包四个视图逐项完成。
- 可新增、编辑、隐藏或恢复条目，并提供物品说明和本机照片。
- 宝宝成长记覆盖孕 8 至 40 周，每周配有独立的纸感水粉成长插图。
- 本地恢复快照、WebDAV 备份和家庭同步均兼容既有 v3–v5 数据与同步 v5。
- 物品照片默认只留在 IndexedDB；进入清单附近 600px 才读取，最长边压缩到 800px，原图限制 20 MiB。

DadKit 的清单和成长内容仅作准备参考，不替代医生、医院通知或医疗建议。

## 安装方式

### Android TWA（推荐 Android APK）

下载并安装最新 APK。它使用包名 `com.dadkit.mobile`，由 `dadkit.505f.com` 提供网页内容；验证通过时以全屏 Trusted Web Activity 打开，不显示地址栏。

首次安装或升级后请打开一次网络正常的应用，以完成 Digital Asset Links 验证。若出现地址栏，请检查 `/.well-known/assetlinks.json` 是否可通过 HTTPS 访问，以及 APK 签名指纹是否一致。

### Android 浏览器 PWA

在 Chrome 打开 [正式站点](https://dadkit.505f.com/)，选择浏览器菜单中的“安装应用”或“添加到主屏幕”。此方式不需要 APK，网站与 Service Worker 更新会自动生效。

### iPhone Safari PWA

在 Safari 打开 [正式站点](https://dadkit.505f.com/)，点分享按钮，选择“添加到主屏幕”。请用 Safari，而不是内置浏览器，以获得稳定的离线与安装支持。

## 设备与本机数据

DadKit 不再提供加密设备迁移功能。清单和成长记录可通过 WebDAV 备份或家庭同步在设备间恢复；WebDAV 密码、家庭同步 token 和浏览器偏好仍需在新设备重新设置。

本机照片不会随备份或同步转移，只保存在当前浏览器的 IndexedDB。清除站点数据、卸载应用或更换设备前，请先自行保存需要保留的原图。由于 Android 包名已经变更，旧 APK 不能覆盖安装新 APK；安装后会使用一套独立的本机存储。

## 网站更新与 APK 更新

- 普通业务功能、清单内容和样式通过网站部署及 Service Worker 更新；Android 浏览器 PWA、iPhone PWA 和 TWA 都会获得这些更新。
- 只有包名、域名、图标、启动参数、原生壳配置或 Android 签名变化时才发布新的 APK。
- 安装过 TWA 的设备会在站内检测到更高的 `versionCode` 后提示下载更新。后续 APK 必须按 `2`、`3`、`4` 递增，不能复用或降低版本号。

## 数据与隐私

- 清单数据存储在独立的 `dadkit:v3:*` 命名空间；本地照片在 IndexedDB。
- 普通本地恢复快照与 WebDAV 备份不包含照片、WebDAV 凭据或家庭同步 token。
- 家庭同步在服务端使用异步 scrypt、原子文件替换和每个空间的串行锁；数据文件权限为私有权限。
- WebDAV 代理只允许 `DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS` 中明确列出的 HTTPS 主机，并保留 SSRF 防护与请求限流。
- 本机写入失败时，页面会保留未落盘的修改并显示可重试提示；同步会在 15 秒超时后按 5、15、30、120、300 秒退避，期间的新修改会排入下一轮同步。

## 本地开发与测试

推荐 Node.js 22。安装依赖后运行：

```bash
npm ci
npm run lint
npm test
npm run build
```

端到端测试覆盖 Chromium 和 WebKit：

```bash
npm run test:e2e:install
npm run test:e2e
npm run test:docker
```

生产构建会输出各路由的 First Load JS；发布门禁要求首页、清单页和备份页首载 JS 不超过 200 kB，并在真机上验证 TWA 首装、无地址栏和离线重开。

## Android TWA 工程

仓库提交了可重复生成的 Bubblewrap 工程与 Gradle wrapper：

- 包名：`com.dadkit.mobile`
- Host：`dadkit.505f.com`
- 启动地址：`/?source=twa&appVersionCode=1`
- `versionName`：`2.1.0`
- `versionCode`：`1`
- Bubblewrap CLI：锁定为 `@bubblewrap/cli@1.24.1`

先验证配置：

```bash
npm run android:validate -- v2.1.0
```

本机构建需要 JDK 17、Android SDK 和下列环境变量；密钥文件、密码和本机 SDK 路径均被 Git 忽略：

```bash
export ANDROID_KEYSTORE_PATH=/secure/path/dadkit-release.keystore
export ANDROID_KEYSTORE_PASSWORD='...'
export ANDROID_KEY_PASSWORD='...'
export ANDROID_KEY_ALIAS=dadkit
cd android
./gradlew --no-daemon clean assembleRelease bundleRelease
```

签名密钥必须是 RSA 4096、固定 alias `dadkit`、不含个人姓名的证书主体。至少保存三份加密备份：密码管理器、离线介质和独立安全存储。丢失密钥后无法为该包名升级，只能更换包名重新发布。

## GitHub Release 流程

`android-release` 工作流只在 `v*` tag 上触发，并拒绝不是 `v2.1.0`、不属于 `main` 或不匹配 Android/TWA 配置的提交。工作流会运行 lint、Vitest、生产构建、Chromium/WebKit、Docker 集成测试、签名验证、`zipalign` 和 `apksigner`，最后才创建公开 Release。

GitHub Actions Secrets 名称如下；仓库、日志、Artifact 和 Release 均不得包含其值：

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

维护者发布步骤：

1. 更新 `package.json`、`android/twa-manifest.json`、Gradle 版本和 `assetlinks.json`，并提高 `versionCode`。
2. 运行 `npm run android:validate -- v2.1.0`、lint、Vitest、生产构建和真机验证。
3. 推送已验证的 `main` 提交和 tag `v2.1.0`。
4. 确认 GitHub Release 已公开，包含 `DadKit-2.1.0.apk` 与 `DadKit-2.1.0.apk.sha256`；AAB 仅作为 30 天私有 Actions Artifact。
5. 在 VPS 下载指定 APK 和 SHA-256，核验后执行站内 APK 发布脚本。

VPS 站内 APK 发布示例：

```bash
sha256sum -c DadKit-2.1.0.apk.sha256
sh scripts/release-apk.sh DadKit-2.1.0.apk 1 2.1.0 '首次正式发布'
```

脚本会拒绝非正整数、重复或降低的 `versionCode`，并在容器数据卷中以临时文件与原子 rename 发布。`GET /api/app-version` 返回版本、说明、大小、SHA-256 和发布时间；`GET`/`HEAD /api/app-version/apk?versionCode=N` 支持 ETag、Range、206 与 416。

## Docker 部署

容器默认只绑定 VPS loopback，由 HTTPS 反向代理公开站点。生产环境必须设置：

```dotenv
DADKIT_BIND_ADDRESS=127.0.0.1
DADKIT_PORT=3333
DADKIT_PUBLIC_ORIGIN=https://dadkit.505f.com
DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS=
```

示例部署：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-deploy.sh \
  | sudo env DADKIT_PUBLIC_ORIGIN=https://dadkit.505f.com sh
```

已有部署更新：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-upgrade.sh | sudo sh
```

`DADKIT_BIND_ADDRESS`、`DADKIT_PUBLIC_ORIGIN` 和 WebDAV 白名单会保存在权限 `600` 的 `.env` 中。发布前请备份 `.env`、Docker named volume 和当前镜像摘要。

## 生产验证与 Digital Asset Links 排错

```bash
curl -fsSI https://dadkit.505f.com/
curl -fsS https://dadkit.505f.com/.well-known/assetlinks.json
curl -fsS https://dadkit.505f.com/manifest.webmanifest
curl -fsSI https://dadkit.505f.com/sw.js
curl -fsS http://127.0.0.1:3333/healthz
```

检查正式站点、Manifest、Service Worker 和图标均为 HTTPS 200；确认响应带有 HSTS。`assetlinks.json` 的包名和 SHA-256 必须与 `apksigner verify --print-certs` 输出完全一致。若 TWA 出现地址栏，先清除应用数据、重新联网打开一次，再检查上述文件和证书指纹。

在网站、Release 和 VPS APK 通道验证完成后，立即从 DNS、反向代理、证书续期和日志配置中移除旧站点；不要为旧站点设置公开跳转，也不要在仓库、Release、APK 或日志中写入旧站点地址。
