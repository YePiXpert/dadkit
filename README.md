# DadKit

## 介绍

DadKit 是一个本地优先的待产包清单与宝宝成长记，支持网页、iPhone PWA 和内置资源的 Android APK。

- 144 个待产与月子物品，支持全部、待购买、待装包和已装包状态
- 准备出发模式，集中核对证件、临出门物品、随车准备和关键行李
- 医院档案，集中保存院区、地址、电话、入院入口、停车和医院要求
- 家庭分工与采购，按物品记录负责人、完成期限、预计/实际总价、购买渠道和实际存放位置
- 孕 8–40 周宝宝成长记
- 本机照片、恢复快照、WebDAV 备份和家庭同步
- 温暖马卡龙纸张、水粉与彩铅风格插画
- 离线可用，兼容既有 v3–v7 数据；v5/v6/v7 家庭设备可安全混合同步

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

最新可移植数据格式为 v7。新客户端通过 `X-DadKit-Data-Version: 7` 协商医院档案和家庭分工与采购数据；v6 客户端收到医院档案但不含 planning，未发送版本头的 v5 客户端继续收到不含医院档案和 planning 的合法投影。v5 设备推送时会保留 canonical 中的医院档案和 planning，v6 设备推送时会保留 planning。手动完整恢复 v3–v5 旧备份会清空医院档案和 planning；恢复 v6 会保留医院档案并为 planning 写入安全清空墓碑。

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
