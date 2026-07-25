# DadKit v2.0.0 🧳

DadKit 是一个打开即用、本地优先的待产包清单 PWA。它不要求注册或预先配置；首次打开就会生成一份通用清单，像 Todo 一样逐项确认即可。

## V2 的产品原则

- **零输入启动**：没有引导表单，首页就是清单。
- **三个行动视图**：全部、待购买、待装包。
- **两项主导航**：清单、我的。
- **四种简单状态**：待处理、已备好、已装包、不需要。
- **数据由用户掌控**：本机恢复点与 WebDAV 都由用户主动操作。
- **纯 PWA**：浏览器安装、离线缓存和本地存储；不再包含 Android、iOS 或 Capacitor 工程。

## 主要功能

- 通用待产包清单，按证件、妈妈、宝宝、月子妈妈、宝宝家中囤货、陪产人、返家准备和临出门分组；点击分类进入独立双列清单页。
- 每个实物条目提供数量参考、可完整显示或全局隐藏的说明，以及独立原创 SVG 插画。
- 奶油色背景、珊瑚色行动强调和全新的奶瓶清单 PWA 图标，更适合长时间逐项核对。
- 自定义新增、编辑、标记不需要和恢复物品。
- 可为物品拍照或从相册上传，压缩后仅存当前设备，方便家人辨认实物。
- 宝宝成长记覆盖孕 8 至 40 周，可选填写宝宝称呼和预产期，包含逐周发育参考与常见产检时间表。
- 数据默认仅保存在当前浏览器，可使用本机恢复点，或手动配置 WebDAV 备份。
- 可安装到手机桌面，并缓存核心页面供基础离线使用。

DadKit 不提供医疗判断、医院官方规则或商品链接。成长记中的孕周发育与产检时间窗仅作一般参考，地区、医院和个人情况可能不同；请以产检医生、入院须知和医院通知为准。

## 清单怎么用

- `全部`：查看所有仍需处理的任务与实物。
- `待购买`：只看尚未备齐、并且确实需要购买的实物。
- `待装包`：只看已经备好或无需购买、但还没有装入对应包袋的实物。
- 实物通常按 `待处理 → 已备好 → 已装包` 推进；不适合自己的条目可以标记为“不需要”，之后仍可恢复。

## 页面

- `/`：待产包清单，也是 PWA 启动页。
- `/checklist/[sectionId]`：八个清单分类的独立物品页。
- `/growth`：孕 8 至 40 周宝宝成长记。
- `/settings`：“我的”入口。
- `/settings/checklist`：说明显示、清单模式、恢复默认物品与危险操作。
- `/settings/backup`：本机恢复点和 WebDAV 备份。
- `/privacy`、`/support`：隐私与支持。
- `/healthz`：部署健康检查。

## 本地开发

推荐使用 Node.js 22。仓库包含 lockfile，首次安装依赖请运行：

```bash
npm ci
npm run dev
```

默认地址为 `http://localhost:3000`。提交前建议运行：

```bash
npm run lint
npm run test
npm run build
```

## PWA

PWA 元信息位于 `public/manifest.webmanifest`，离线缓存逻辑位于 `public/sw.js`。部署必须使用 HTTPS（本地开发环境除外），浏览器才会提供安装能力和完整的 Service Worker 支持。检测到新版本后，页面会提示刷新；离线时会回退到已经缓存的核心页面。

V2 只保留 Web 发布链路：

```bash
npm run build
npm run start
```

## Docker 一键部署与更新

前置条件：Linux 服务器已安装 `git`、Docker 和 Docker Compose v2，当前用户可以执行 Docker。脚本不会自动安装这些依赖。

### 一键部署

下面的命令会拉取 `main` 分支到 `/opt/dadkit`，构建并启动容器，等待 `/healthz` 通过后再退出。容器默认只绑定 `127.0.0.1:3333`，适合由 Caddy 或 Nginx 提供 HTTPS 反向代理。

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-deploy.sh \
  | sudo env DADKIT_PUBLIC_ORIGIN=https://dadkit.example.com sh
```

如果暂时只在服务器本机使用，可以省略 `DADKIT_PUBLIC_ORIGIN`：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-deploy.sh | sudo sh
```

### 一键更新

下面的命令会将现有部署快进到 `main` 最新版本，重新构建并启动容器，同时保留部署目录中已有的 `.env`：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-upgrade.sh | sudo sh
```

### 验证部署

```bash
curl http://127.0.0.1:3333/healthz
cd /opt/dadkit
sudo docker compose ps
```

健康检查返回包含 `"ok":true` 的 JSON，且容器状态为 `healthy` 即表示部署完成。

### 常用环境变量

- `DADKIT_DIR`：部署目录，默认 `/opt/dadkit`。
- `DADKIT_PORT`：宿主机端口，默认 `3333`。
- `DADKIT_BIND_ADDRESS`：监听地址，默认 `127.0.0.1`。
- `DADKIT_PUBLIC_ORIGIN`：外部 HTTPS 地址。
- `DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS`：允许 WebDAV 同源代理访问的精确主机列表。
- `DADKIT_BRANCH`：部署分支，默认 `main`。
- `DADKIT_REPO`：首次部署使用的 Git 仓库地址，默认当前 GitHub 仓库。
- `DADKIT_WAIT_TIMEOUT`：等待容器健康的秒数，默认 `120`。

首次运行时，显式传入的端口、监听地址、公开地址和 WebDAV 白名单会写入权限为 `600` 的 `.env`；已有 `.env` 不会被部署或更新脚本覆盖。后续要修改这些配置，请编辑部署目录中的 `.env` 再执行一键更新。

如果首次部署使用了自定义目录，更新时只需传入相同的目录：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-upgrade.sh \
  | sudo env DADKIT_DIR=/srv/dadkit sh
```

脚本默认只接受 Git 的快进更新。仅当你已经确认部署目录没有需要保留的本地修改时，才可使用 `DADKIT_FORCE_RESET=1` 强制对齐远端分支。

公开部署时请配置 HTTPS，并在反向代理层增加认证或访问白名单，尤其是启用 WebDAV 代理时。

## 数据与隐私

DadKit 不需要账号或后端数据库。清单数据使用独立的 `dadkit:v3:*` 命名空间，成长记录使用单独的本机存储键；这是全新数据模型，不读取或迁移更早版本的应用数据，也不会在清理当前数据时误删无关网站数据。

当前产品数据包括：

- 清单进度、自定义物品、隐藏项和清单显示模式；
- 可选的宝宝称呼、预产期、最近查看孕周和产检时间表完成状态；
- 自动保留的本地恢复快照；
- WebDAV 地址、用户名、备份路径和同步状态；
- 单独保存在 IndexedDB 的本机物品照片。

本地恢复快照和 WebDAV 使用同一份便携备份数据，覆盖清单与成长记资料。它们都不包含物品照片，也不包含 WebDAV 地址、用户名、路径、同步状态或密码等连接配置。

WebDAV 密码默认只放在 `sessionStorage`；只有用户主动选择“记住密码在本设备”时才写入 `localStorage`。连接配置和凭据不会写入恢复快照或远端备份文件。

破坏性操作前会自动创建本地恢复快照，最多保留最近 5 份。恢复缺失的默认物品不会覆盖已有进度或删除自定义物品；完整重建与清空只放在清单设置的危险区，并要求输入确认词。清空还会移除 WebDAV 配置和本机物品照片，操作前生成的恢复点会保留。

WebDAV 只在用户手动上传或下载时同步，地址必须使用 HTTPS。浏览器会优先走 DadKit 的同源代理；部署端必须通过 `DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS` 明确允许目标主机，代理会拒绝本机和内网地址。单份备份上限为 2 MiB，代理请求上限为 3 MiB、上游响应上限为 8 MiB，超时时间为 30 秒。

## 技术栈

- Next.js App Router / React 19 / TypeScript
- Tailwind CSS / 本地 UI 组件
- Zustand / localStorage / sessionStorage / IndexedDB（物品照片）
- PWA manifest / Service Worker
- Vitest / ESLint
- Docker / Docker Compose
