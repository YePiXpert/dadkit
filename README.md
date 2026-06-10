# DadKit v1.0

DadKit 是一个本地优先的准爸爸待产准备 PWA。它帮助家庭按预产期整理今天该做什么、哪些要买、哪些要洗、哪些证件要整理、哪些问题要问医院、爸爸负责什么、临出门拿什么，以及如何备份和恢复数据。

DadKit 不是母婴电商清单，不提供购物链接或商品推荐；也不是医疗建议工具或医院官方规则库。所有医院规则、入院动线、陪产要求、提供物品和产后办理材料，都应以最近一次产检、入院须知、医院通知或当地窗口为准。

## 核心功能

- 首页“今天该做”控制台：预产期倒计时、当前阶段、今日优先 3 项、核心进度和主要入口。
- 动态清单：根据预产期、地区、医院、生产方式和用户条件生成待产准备事项。
- PreparationKind 状态语义：购买、清洗、打包、证件、医院问题、爸爸任务、临出门和安装放置分开处理。
- 购物清单：只显示真正可能需要购买或补货、且未完成的项目。
- 医院确认：区分“下次产检要问”和“爸爸要确认”，医院提供物品通过问题回答状态处理。
- 准备时间线：按预产期前 6 周、4 周、3 周、1 周和临出门阶段安排任务。
- 临出门模式：只保留证件包、手机、充电器、眼镜/隐形眼镜、常用药清单、妈妈包、宝宝包、安全座椅、门窗水电燃气。
- 宫缩记录器：只记录开始、结束、持续、间隔和备注，可导出，不判断是否去医院。
- 分娩偏好 / 入院沟通卡：整理紧急联系人、陪产人、医院电话、过敏/用药和沟通偏好。
- 产后办理待确认：出生医学证明、出院结算、医保/生育保险、户口/居住地、产后复查、新生儿复查。
- 本地数据与备份：localStorage、JSON 导入导出、本地快照、WebDAV 手动备份。
- PWA：支持安装到手机桌面、基础离线访问和新版本提示。

## 页面结构

- `/`：今天该做控制台。
- `/setup`：首次创建或修改预产期、地区、医院、生产方式等资料。
- `/checklist`：清单、购物、证件、临出门等视图。
- `/hospital`：医院确认、下次产检要问、爸爸要确认。
- `/timeline`：按预产期生成准备时间线。
- `/go`：独立临出门检查。
- `/contractions`：宫缩记录。
- `/birth-plan`：分娩偏好 / 入院沟通卡。
- `/postpartum`：产后办理待确认。
- `/share`：爸爸执行版、临出门版、医院沟通版、分娩偏好卡、宫缩记录和 JSON 备份。
- `/settings`：资料、更多工具、本地快照、JSON 备份、WebDAV 备份、版本信息。
- `/healthz`：健康检查，返回 `ok`、`version`、`buildTime`。

## 本地开发

```bash
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:3000
```

最小验收命令：

```bash
npm run lint
npm run test
npm run build
```

## VPS Docker 部署

容器默认端口为 `3333`。

一键部署：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-deploy.sh | sudo sh
```

默认部署目录为 `/opt/dadkit`，访问地址：

```text
http://服务器IP:3333
```

健康检查：

```bash
curl http://127.0.0.1:3333/healthz
```

一键更新：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-upgrade.sh | sudo sh
```

如果服务器部署目录没有需要保留的本地修改，但远端历史被重写导致 fast-forward 失败，可以显式对齐远端：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-upgrade.sh | sudo env DADKIT_FORCE_RESET=1 sh
```

自定义目录、端口或分支：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-deploy.sh | sudo env DADKIT_DIR=/srv/dadkit DADKIT_PORT=3333 DADKIT_BRANCH=main sh
```

可用环境变量：

- `DADKIT_DIR`：部署目录，默认 `/opt/dadkit`
- `DADKIT_PORT`：宿主机和容器端口，默认 `3333`
- `DADKIT_BRANCH`：部署分支，默认 `main`
- `DADKIT_REPO`：部署仓库，默认 `https://github.com/YePiXpert/dadkit.git`
- `DADKIT_IMAGE`：Docker Compose 镜像名，默认 `dadkit:latest`
- `DADKIT_BUILD_TIME`：构建时间，脚本默认自动写入 UTC 时间
- `DADKIT_FORCE_RESET=1`：强制把部署目录对齐到 `origin/$DADKIT_BRANCH`

手动部署：

```bash
git clone https://github.com/YePiXpert/dadkit.git /opt/dadkit
cd /opt/dadkit
DADKIT_BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" docker compose up --build -d
```

手动更新：

```bash
cd /opt/dadkit
git pull --ff-only
DADKIT_BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" docker compose up --build -d --remove-orphans
docker image prune -f
```

常用运维命令：

```bash
cd /opt/dadkit
docker compose ps
docker compose logs -f
docker compose restart
docker compose down
```

## 数据和隐私

DadKit 不需要登录，不使用后端数据库。用户资料、清单状态、自定义项目、医院确认、时间线任务、宫缩记录、分娩偏好和产后办理清单保存在当前浏览器本地。

主要 localStorage key：

- `dadkit:user-profile`
- `dadkit:checklist`
- `dadkit:custom-items`
- `dadkit:hidden-template-items`
- `dadkit:hospital-overrides`
- `dadkit:hospital-answers`
- `dadkit:timeline-task-statuses`
- `dadkit:contractions`
- `dadkit:birth-plan`
- `dadkit:postpartum-tasks`
- `dadkit:checklist-mode`
- `dadkit:snapshots`
- `dadkit:webdav-config`
- `dadkit:webdav-sync-state`
- `dadkit:webdav-secret`：仅在用户选择记住 WebDAV 凭据时使用

sessionStorage key：

- `dadkit:webdav-session-secret`：默认用于保存当前会话的 WebDAV 密码 / 应用密码

JSON 导入导出不会包含 WebDAV 密码或应用密码。导入旧 JSON 时，缺失的新字段不会覆盖当前浏览器里的宫缩记录、分娩偏好、产后办理清单或时间线状态。导入失败会保持本地数据不变。

本地快照只在导入、恢复、清空、创建新清单等可能覆盖数据的操作前自动创建，最多保留最近 5 份，避免刷屏。

WebDAV 备份是手动上传 / 下载 JSON 备份。浏览器请求会经 DadKit 同源代理转发，避免 WebDAV 服务 CORS 限制；DadKit 不会重写 WebDAV 协议，也不会自动同步。

## 发布边界

- 不引入后端、登录、数据库或云同步。
- 不引入电商推荐、购物链接或商品导购。
- 不做医疗判断，不判断是否去医院。
- 不把未核验医院模板显示成官方规则。
- 不把证件、手机、爸爸任务、医院问题、安全座椅显示成“待购买”。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 风格本地组件
- Zustand
- localStorage
- date-fns
- PWA service worker
- Docker / Docker Compose
- ESLint
- Vitest
