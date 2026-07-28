# DadKit v2.1.1

DadKit 是一个本地优先的待产包清单与宝宝成长记应用。Android APK 将完整界面、清单、成长图和物品插画打包在应用中；网站也可作为 PWA 使用。清单、成长记录和照片默认只保存在当前设备，需要时可使用本地恢复快照、WebDAV 备份或家庭同步。

正式站点：[https://dadkit.505f.com/](https://dadkit.505f.com/)

最新 Android APK：[GitHub Release](https://github.com/YePiXpert/dadkit/releases/latest) · [DadKit-2.1.1.apk](https://github.com/YePiXpert/dadkit/releases/download/v2.1.1/DadKit-2.1.1.apk)

## 主要功能

- 清单按证件、妈妈、宝宝、月子、陪产、返家和临出门分组，并提供全部、待购买、待装包、已装包四个视图。
- 可新增、编辑、隐藏或恢复条目，并提供物品说明和本机照片。
- 宝宝成长记覆盖孕 8 至 40 周，每周配有独立的温暖纸感水粉插图。
- 141 个内置物品统一使用米色纸张、水粉与彩铅风格插画。
- 本地恢复快照、WebDAV 备份和家庭同步兼容既有 v3–v5 数据与同步 v5。
- 照片保存在 IndexedDB；接近视口时才读取，最长边压缩到 800px，原图限制 20 MiB。

DadKit 的清单和成长内容仅作准备参考，不替代医生、医院通知或医疗建议。

## 安装方式

### Android 本地 APK（推荐）

从 Release 下载并安装 APK。包名为 `com.dadkit.mobile`，应用界面、清单、成长图和物品图均随 APK 安装，首次打开和日常离线使用不依赖网站。清单、成长记录、偏好和照片保存在 Android 应用自己的本机沙箱中。

家庭同步、WebDAV、版本检查和 APK 下载属于可选联网功能，会访问正式站点。APK 不使用 TWA、Bubblewrap 或 Digital Asset Links，也不会从网站远程加载应用界面。

### Android 浏览器 PWA

在 Chrome 打开[正式站点](https://dadkit.505f.com/)，选择“安装应用”或“添加到主屏幕”。此方式的数据属于浏览器站点存储，与本地 APK 的应用存储相互独立。

### iPhone Safari PWA

在 Safari 打开[正式站点](https://dadkit.505f.com/)，点击分享，再选择“添加到主屏幕”。请使用 Safari，而不是内置浏览器，以获得稳定的离线与安装支持。

## 设备与本机数据

DadKit 不再提供加密设备迁移功能。清单和成长记录可通过 WebDAV 备份或家庭同步在设备间恢复；WebDAV 密码、家庭同步 token 和显示偏好需要重新设置。

本机照片不会随备份或同步转移，只保存在当前环境的 IndexedDB。清除应用数据、卸载 APK、清除浏览器站点数据或更换设备前，请自行保存需要保留的原图。

APK、Android 浏览器 PWA 和 iPhone PWA 各自使用独立存储。安装 APK 不会自动读取浏览器 PWA 的数据；旧包名的 Android 应用也无法覆盖安装当前 APK。

## 网站更新与 APK 更新

- 浏览器 PWA 的业务功能和样式通过网站与 Service Worker 更新。
- 本地 APK 的界面和静态内容随安装包发布，网站更新不会静默替换 APK 内置界面。
- APK 检测到更高的 `versionCode` 后会提示下载更新。后续版本号必须按 `2`、`3`、`4` 递增，不能复用或降低。
- 家庭同步和 WebDAV 等服务端能力可独立部署，但离线清单和成长记不依赖这些服务。

## 数据与隐私

- 清单数据使用独立的 `dadkit:v3:*` 命名空间，本机照片保存在 IndexedDB。
- 本地恢复快照和 WebDAV 备份不包含照片、WebDAV 凭据或家庭同步 token。
- Android 禁止系统备份应用数据；卸载 APK 会删除其本机沙箱。
- 家庭同步服务端使用异步 scrypt、原子文件替换和每个空间的串行锁，数据文件使用私有权限。
- WebDAV 代理仅允许 `DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS` 明确列出的 HTTPS 主机，并保留 SSRF 防护和限流。
- 本机写入失败时保留未落盘修改并提示重试；同步请求 15 秒超时，并按 5、15、30、120、300 秒退避。

## 本地开发与测试

推荐 Node.js 22：

```bash
npm ci
npm run lint
npm test
npm run build
npm run performance:check
```

端到端测试覆盖 Chromium 和 WebKit：

```bash
npm run test:e2e:install
npm run test:e2e
npm run test:docker
```

生产门禁要求首页、清单页和备份页首载 JS 不超过 200 kB。发布前还需在真机验证 APK 首次安装、离线重开、照片选择、本机持久化以及可选同步。

## Android 本地 APK 工程

仓库包含原生 WebView 壳、Gradle 工程和 wrapper，不包含签名密钥。静态站点先由 Next.js 导出，再写入 APK 的 `assets/www`；服务端 API 路由不会打入安装包。

- 包名：`com.dadkit.mobile`
- 本地启动地址：`https://dadkit.505f.com/?source=apk&appVersionCode=2`
- `versionName`：`2.1.1`
- `versionCode`：`2`
- 最低 Android：API 23

生成静态资源并检查配置：

```bash
npm run android:bundle
npm run android:validate -- v2.1.1
```

本机签名构建需要 JDK 17、Android SDK 以及以下环境变量；密钥文件、密码、本机 SDK 路径和构建产物均被 Git 忽略：

```bash
export ANDROID_KEYSTORE_PATH=/secure/path/dadkit-release.keystore
export ANDROID_KEYSTORE_PASSWORD='...'
export ANDROID_KEY_PASSWORD='...'
export ANDROID_KEY_ALIAS=dadkit
npm run android:bundle
cd android
./gradlew --no-daemon clean assembleRelease bundleRelease
```

签名密钥应为 RSA 4096、固定 alias `dadkit`、证书主体不含个人姓名。至少保留三份加密备份：密码管理器、离线介质和独立安全存储。丢失密钥后无法为该包名提供可覆盖安装的升级。

## GitHub Release 流程

`android-release` 工作流仅由 `v*` tag 触发，并拒绝不等于 `v2.1.1`、不属于 `main` 或不匹配 Android 配置的提交。流水线运行 lint、Vitest、生产构建、性能门禁、静态 APK 资源打包、Chromium/WebKit、Docker 集成测试、`zipalign` 和 `apksigner`，全部成功后创建公开 Release。

GitHub Actions Secrets：

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

维护者发布步骤：

1. 更新 `package.json`、Gradle 的 `versionName`/`versionCode`、APK 启动参数和校验脚本。
2. 运行 `npm run android:bundle`、`npm run android:validate -- v2.1.1`、lint、Vitest、生产构建和真机验证。
3. 推送已验证的 `main` 提交和 tag `v2.1.1`。
4. 确认公开 Release 包含 `DadKit-2.1.1.apk` 与 `DadKit-2.1.1.apk.sha256`；AAB 仅保存为 30 天私有 Actions Artifact。
5. 在 VPS 下载 APK 和 SHA-256，校验后执行站内 APK 发布脚本。

```bash
sha256sum -c DadKit-2.1.1.apk.sha256
sh scripts/release-apk.sh DadKit-2.1.1.apk 2 2.1.1 '本地 APK 正式发布'
```

发布脚本拒绝非正整数、重复或降低的 `versionCode`，并通过临时文件和原子 rename 发布。`GET /api/app-version` 返回版本、说明、大小、SHA-256 和发布时间；`GET|HEAD /api/app-version/apk?versionCode=N` 支持 ETag、Range、206 和 416。

## Docker 部署

容器默认仅绑定 VPS loopback，由 HTTPS 反向代理公开站点：

```dotenv
DADKIT_BIND_ADDRESS=127.0.0.1
DADKIT_PORT=3333
DADKIT_PUBLIC_ORIGIN=https://dadkit.505f.com
DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS=
```

首次部署：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-deploy.sh \
  | sudo env DADKIT_PUBLIC_ORIGIN=https://dadkit.505f.com sh
```

已有部署更新：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-upgrade.sh | sudo sh
```

发布前请备份权限为 `600` 的 `.env`、Docker named volume 和当前镜像摘要。

## 生产验证

```bash
curl -fsSI https://dadkit.505f.com/
curl -fsS https://dadkit.505f.com/manifest.webmanifest
curl -fsSI https://dadkit.505f.com/sw.js
curl -fsS http://127.0.0.1:3333/healthz
```

确认正式站点、Manifest、Service Worker 和图标均通过 HTTPS 返回，响应包含 HSTS。APK 另行用 `zipalign -c -v 4` 与 `apksigner verify --verbose --print-certs` 验证，并确认安装包包含 `assets/www/index.html`。

公开 APK 只能包含正式公开域名，不得包含凭据、个人信息或内部地址。
