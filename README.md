# DadKit

## 介绍

DadKit 是一个本地优先的家庭待产与新生儿记录工具，支持网页、iPhone PWA 和内置资源的 Android APK。

- 144 个待产与月子物品，支持全部、待购买、待装包和已装包状态
- 准备出发模式，集中核对证件、临出门物品、随车准备和关键行李
- 医院档案，集中保存院区、地址、电话、入院入口、停车和医院要求
- 家庭分工与采购，按物品记录负责人、完成期限、预计/实际总价、购买渠道和实际存放位置
- 单宝宝出生模式，支持亲喂、瓶喂、吸奶、尿布和睡眠计时与今日汇总
- 全部照护记录时间线，支持编辑、删除墓碑、离线保存和家庭合并
- 孕 8–40 周宝宝成长记
- 本机照片、恢复快照、WebDAV 备份和家庭同步
- 温暖马卡龙纸张、水粉与彩铅风格插画
- 离线可用，兼容既有 v3–v8 数据；v5/v6/v7/v8 家庭设备可安全混合同步

![DadKit 应用预览](public/og.png)

| 成长记插画 | 清单物品插画 |
| --- | --- |
| ![孕 20 周成长记插画](public/growth/week-20-banana.webp) | ![宝宝纸尿裤插画](public/item-art/general-baby-diapers.webp) |

示例网址：

- [正式站点](https://dadkit.505f.com/)
- [宝宝成长记](https://dadkit.505f.com/growth)
- [宝宝清单](https://dadkit.505f.com/checklist/baby)
- [准备出发](https://dadkit.505f.com/departure)
- [医院档案](https://dadkit.505f.com/hospital)
- [家庭分工与采购](https://dadkit.505f.com/planning)
- [宝宝记录](https://dadkit.505f.com/baby)
- [备份与同步](https://dadkit.505f.com/settings/backup)
- [最新 Android APK](https://github.com/YePiXpert/dadkit/releases/latest)

## 部署方式

推荐使用 Docker，并通过 HTTPS 反向代理公开服务。

```dotenv
DADKIT_BIND_ADDRESS=127.0.0.1
DADKIT_PORT=3333
DADKIT_PUBLIC_ORIGIN=https://dadkit.505f.com
DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS=
```

```bash
git clone https://github.com/YePiXpert/dadkit.git
cd dadkit
docker compose up -d --build
curl -fsS http://127.0.0.1:3333/healthz
```

家庭同步的数据目录应挂载到持久化卷（可用 `DADKIT_DATA_DIR` 指定）。当前同步服务采用进程内文件锁，并在每次写入前保留最近 5 份空间文件滚动备份；因此家庭同步必须以**单实例**部署，不支持多个应用副本同时写同一个数据目录。

最新可移植数据格式为 v8。新客户端通过 `X-DadKit-Data-Version: 8` 协商医院档案、家庭分工和宝宝数据；v5/v6/v7 客户端分别收到自己支持的合法投影，旧设备推送时会保留 canonical 中它不支持的 hospital、planning 和 baby。手动完整恢复 v3–v7 旧备份会以安全清空墓碑处理缺少的宝宝资料与照护记录，而家庭同步收到旧版本时会保留本地及 canonical baby 数据。

宝宝资料与完整照护事件以 IndexedDB 为唯一持久层，普通 JSON、IndexedDB 安全快照和 WebDAV v8 备份包含资料、活动计时、历史事件和删除墓碑。本版本只支持一个宝宝。家庭同步仍为完整 canonical 文档合并；事件增量同步属于后续性能优化方向。

## 升级方式

网站升级：

```bash
cd dadkit
git pull --ff-only origin main
docker compose up -d --build
curl -fsS http://127.0.0.1:3333/healthz
```

Android APK 升级：

1. 打开[最新 Release](https://github.com/YePiXpert/dadkit/releases/latest)。
2. 下载最新版 `DadKit-*.apk`。
3. 直接安装覆盖旧版本；包名保持 `com.dadkit.mobile`，`versionCode` 按版本递增。

浏览器 PWA 会随网站和 Service Worker 自动更新；必要时关闭并重新打开应用。
