# DadKit

本地优先的待产包清单与宝宝成长记，支持网页、PWA 和内置资源的 Android APK。

- 正式站点：[dadkit.505f.com](https://dadkit.505f.com/)
- 最新版本：[GitHub Release](https://github.com/YePiXpert/dadkit/releases/latest)
- Android APK：[DadKit-2.1.1.apk](https://github.com/YePiXpert/dadkit/releases/download/v2.1.1/DadKit-2.1.1.apk)

## 功能

- 141 个待产与月子物品，支持全部、待购买、待装包、已装包状态。
- 孕 8–40 周宝宝成长记。
- 统一的米色纸张、水粉与彩铅风格插画。
- 本机照片、本地恢复快照、WebDAV 备份和家庭同步。
- 本地优先、离线可用，兼容既有 v3–v5 数据与同步 v5。

内容仅作准备参考，不替代医生、医院通知或医疗建议。

## 安装

### Android 本地 APK

推荐安装 APK。应用界面、清单和插画均内置在安装包中，断网也能打开；数据保存在应用本机沙箱。家庭同步、WebDAV 和更新检查需要联网。

包名：`com.dadkit.mobile`

当前版本：`2.1.1`（`versionCode=2`）

### iPhone

用 Safari 打开正式站点，选择“分享 → 添加到主屏幕”。

### 电脑

直接使用网页，也可通过浏览器安装为 PWA。

## 数据说明

- APK、Android 浏览器 PWA 和 iPhone PWA 的本机数据相互独立。
- 清单和成长记录可通过 WebDAV 或家庭同步恢复。
- 本机照片不会随备份或同步转移，只保存在当前环境的 IndexedDB。
- WebDAV 密码和家庭同步 token 不写入备份。
- 卸载 APK、清除应用或浏览器数据前，请先保存重要照片和备份。
- 不再提供加密设备迁移功能。

## 开发与测试

需要 Node.js 22：

```bash
npm ci
npm run lint
npm test
npm run build
npm run performance:check
npm run test:e2e
```

Docker 集成测试：

```bash
npm run test:docker
```

## Android 构建

需要 JDK 17、Android SDK 和本机签名环境变量：

```bash
npm run android:bundle
npm run android:validate -- v2.1.1
cd android
./gradlew --no-daemon assembleRelease bundleRelease
```

签名密钥、密码、Android SDK 路径和构建产物均被 Git 忽略。长期签名密钥应使用固定 alias `dadkit`，并保留多份加密备份；密钥丢失后无法为现有包名提供覆盖升级。

## 发布

推送 `v2.1.1` tag 后，`android-release` 工作流会执行测试、构建、签名和验签，并发布：

- `DadKit-2.1.1.apk`
- `DadKit-2.1.1.apk.sha256`

AAB 只保存为 30 天的私有 Actions Artifact。

## Docker 部署

生产环境至少设置：

```dotenv
DADKIT_BIND_ADDRESS=127.0.0.1
DADKIT_PORT=3333
DADKIT_PUBLIC_ORIGIN=https://dadkit.505f.com
DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS=
```

```bash
docker compose up -d --build
curl -fsS http://127.0.0.1:3333/healthz
```

公开 APK、日志和仓库不得包含凭据、个人信息、旧域名或内部地址。
