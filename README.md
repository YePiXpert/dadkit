# DadKit

## 介绍

DadKit 是一个本地优先的家庭待产与新生儿记录工具，支持网页、可安装的 iPhone PWA，以及内置同一套 PWA 界面的 Android App。三端共享视觉、功能和内容资源。

- 164 个待产与月子物品，支持全部、待购买、待装包和已装包状态
- 首页家庭仪表盘与独立纯清单页：进度、出发、医院档案和宝宝记录一屏总览，物品核对集中在清单页
- 准备出发模式，集中核对证件、临出门物品、随车准备和关键行李
- 医院档案，集中保存院区、地址、电话、入院入口、停车和医院要求
- 首次使用引导和通用家庭档案，可自定义单亲、祖辈、月嫂等家庭成员或照护者，不强制使用“爸爸/妈妈”角色
- 单宝宝出生模式，支持亲喂、瓶喂、吸奶、尿布和睡眠计时与今日汇总
- 全部照护记录时间线，支持记录人、编辑、删除墓碑、离线保存和家庭合并
- 孕 8–40 周宝宝成长记
- 本机照片、恢复快照、WebDAV 备份和家庭同步
- 温暖马卡龙纸张、水粉与彩铅风格插画
- 离线可用，兼容既有备份和较旧的数据格式
- 随机家庭同步空间、同名家庭、私密邀请链接、设备角色与主动永久删除
- 统一设计系统：全站一致的状态徽章、骨架屏、危险操作区与表单控件，宝宝快速记录图标清晰可区分

![DadKit 应用预览](public/og.png)

| 成长记插画 | 清单物品插画 |
| --- | --- |
| ![孕 20 周成长记插画](public/growth/week-20-banana.webp) | ![宝宝纸尿裤插画](public/item-art/general-baby-diapers.webp) |

示例网址：

- [正式站点](https://dadkit.505f.com/)
- [宝宝成长记](https://dadkit.505f.com/growth)
- [待产清单](https://dadkit.505f.com/checklist)
- [宝宝清单](https://dadkit.505f.com/checklist/baby)
- [准备出发](https://dadkit.505f.com/departure)
- [医院档案](https://dadkit.505f.com/hospital)
- [家庭成员设置](https://dadkit.505f.com/settings/family)
- [家庭同步管理](https://dadkit.505f.com/settings/sync)
- [宝宝记录](https://dadkit.505f.com/baby)
- [备份与同步](https://dadkit.505f.com/settings/backup)
- [最新 Android APK](https://github.com/YePiXpert/dadkit/releases/latest)

## 部署方式

推荐直接拉取 GitHub Actions 已构建并测试通过的
`ghcr.io/yepixpert/dadkit:latest`，再通过 HTTPS 反向代理公开服务。
VPS 不需要运行 `npm`、`next build` 或 `docker build`。

```dotenv
DADKIT_BIND_ADDRESS=127.0.0.1
DADKIT_PORT=3333
DADKIT_PUBLIC_ORIGIN=https://dadkit.505f.com
DADKIT_TRUSTED_ORIGINS=https://dadkit.liyanpeng.com
DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS=
DADKIT_SYNC_REGISTRATION_MODE=open
DADKIT_SYNC_MAX_SPACE_BYTES=25165824
DADKIT_SYNC_MAX_DEVICES=12
DADKIT_SYNC_MAX_ACTIVE_INVITES=5
DADKIT_TRUST_PROXY_HOPS=1
DADKIT_SYNC_REQUIRE_HTTPS=true
```

```bash
git clone --depth 1 https://github.com/YePiXpert/dadkit.git /opt/dadkit
cd /opt/dadkit
cp .env.example .env
# 按实际域名编辑 .env 后：
docker compose pull dadkit
docker compose up -d --no-build --remove-orphans --wait
curl -fsS http://127.0.0.1:3333/healthz
```

`DADKIT_PUBLIC_ORIGIN` 是主入口；同一实例如需保留旧域名，可用
`DADKIT_TRUSTED_ORIGINS` 配置逗号分隔的精确 HTTPS Origin。该列表不支持通配符，
也不会开放跨站 CORS，只允许这些入口发起带会话的同源同步写操作。

这里克隆仓库只用于取得 Compose 配置和升级脚本；应用镜像直接从 GHCR
下载，不会在 VPS 本地编译。也可以使用 `sh scripts/docker-deploy.sh` 完成
首次部署，它执行相同的“拉镜像后启动”流程。

如需在开发机显式构建，可使用
`docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build`；
生产部署不要附加该 override 文件。

家庭同步的数据目录必须挂载到持久化卷（可用 `DADKIT_DATA_DIR` 指定）。当前服务使用单实例文件存储、进程内空间锁和单实例内存限流，不支持多个应用副本同时写同一个数据目录，也不提供共享限流。多实例部署属于后续版本范围。

新建空间使用与家庭显示名称无关的随机标识，因此完全相同的家庭名称可以并存。邀请凭据只放在链接 fragment 中，默认单次使用；新会话保存在 HttpOnly Cookie 中，不写入 localStorage。已有名称型空间和旧设备可继续使用，读取时会无损升级服务端元数据，原 token 和业务数据保持有效。

同步空间的管理员可以创建或撤销邀请、管理设备、重命名和永久删除服务器空间；普通成员可以同步全部业务数据、查看用量并修改本设备名称。设备角色不等于家庭成员账号权限，也不会改变业务数据可见性。撤销设备不会删除它曾同步的清单或宝宝记录。

每个空间默认最多 24 MiB、12 台有效设备和 5 个有效邀请。超出数据配额的推送会在写盘前原子拒绝，不修改空间文件或滚动备份。运营者可通过 `.env.example` 中的变量调整合理上限，也可关闭新空间注册而不影响已有空间。

正式公开部署必须使用 HTTPS。家庭同步当前不是端到端加密：服务器保存并可读取 canonical 同步数据，服务器运营者理论上能够读取内容。请勿公开邀请链接。`DADKIT_PUBLIC_ORIGIN` 应填写经过验证的正式 origin；单层 Nginx 可设置 `DADKIT_TRUST_PROXY_HOPS=1`，代码默认值为 0，不会无条件信任转发头。

家庭显示名称、成员名称、关系以及事件记录人会进入 JSON、IndexedDB 安全快照、WebDAV 和可选家庭同步；“当前设备使用者”只保存在当前设备，不作为独立设置进入任何备份或同步。当前可移植数据格式为 v10，不再写入已下线的家庭分工字段；较旧的 v7-v9 数据仍可导入或同步，其中的分工字段会被忽略。

宝宝资料与完整照护事件以 IndexedDB 为唯一持久层，备份包含资料、活动计时、历史事件、记录人和删除墓碑。本版本仍只支持一个宝宝。家庭同步仍为完整 canonical 文档合并；事件增量同步属于后续性能优化方向。

## 升级方式

网站升级：

```bash
cd /opt/dadkit
sh scripts/docker-upgrade.sh
curl -fsS http://127.0.0.1:3333/healthz
```

升级脚本只更新 Compose/脚本、执行 `docker compose pull dadkit`，再用
`--no-build` 重建容器，不会占用 VPS 资源编译应用。

Android APK 升级：

1. 3.4.12 起 APK 直接加载线上页面，日常页面、样式和业务功能会在下次启动时自动更新，不再需要重复安装 APK；成功联网使用一次后可通过缓存离线打开。
2. 「我的 → 关于 DadKit」分别显示页面版本和 Android 外壳 versionCode；只有原生外壳、权限或图标变化时才需要安装新版 APK。
3. 原生新版可在应用内检查；点「下载更新」后可查看进度，APK 完成 SHA-256 校验后会直接打开 Android 系统安装界面。
4. 第一次使用应用内更新时，Android 可能要求允许 DadKit「安装未知应用」；授权后回到 DadKit 再点一次下载即可。
5. 旧 APK 或浏览器环境会自动回退到外链下载；也可以随时打开[最新 Release](https://github.com/YePiXpert/dadkit/releases/latest)手动下载 `DadKit-*.apk`。
6. 包名保持 `com.dadkit.mobile`，`versionCode` 按版本递增，可直接覆盖安装旧版本。

本次版本的详细变更与验收结果见 [DadKit 3.4.13 发布说明](docs/release-v3.4.13.md)。

浏览器 PWA 与 Android WebView 均优先获取线上页面，网络不可用时回退到最近一次成功缓存。
