# DadKit 待产包助手

DadKit 是一个为准爸爸和家庭成员设计的待产准备工具。它会根据预产期、地区、医院、生产方式和用户自定义条件生成动态待产清单，帮助家庭在临近生产前知道“要带什么、要问什么、谁来做什么”。

它不是普通固定清单，也不是电商导购式的“大礼包推荐”。DadKit 的核心目标是降低焦虑、减少遗漏，让爸爸能照着做。默认采用精简模式，只展示必须带、必须确认和临出门必须执行的事项；低频或因人而异的可选物品不会删除，可以切换完整模式查看。

项目定位为本地优先、手机端优先、适合 PWA 安装和开源发布。它不需要登录，不使用后端数据库，不接入支付、电商导购或真实联网 API。用户资料、清单状态和自定义内容都保存在浏览器本地。

## 项目内容

DadKit 目前包含以下核心内容：

- 首页概览：展示预产期倒计时、打包进度、医院确认进度和临出门检查进度。
- 资料配置：录入预产期、生产方式、住院天数、哺乳、陪产、寒冷季节和医院相关信息。
- 动态清单：按地区模板、医院模板、用户条件和自定义覆盖生成待产清单。
- 精简/完整模式：精简模式聚焦必须项，完整模式保留更多备用和个人习惯项。
- 包位分组：按证件包、妈妈包、宝宝包、爸爸背包、车上/交通、临出门等场景组织物品。
- 医院确认：把入院材料、陪产规则、押金、医院提供物品等不确定事项单独列出。
- 爸爸执行版：提供更适合陪产人临场查看的任务和导出内容。
- 物品/任务/问题分离：支付、押金、路线、电话、停车和安全座椅等事项作为任务或问题，不计入待产包打包进度。
- 本地持久化：使用 `localStorage` 保存用户资料、清单状态、清单模式、自定义项和医院覆盖信息。
- JSON 备份：导入前校验版本和字段结构，失败时不会覆盖当前本地数据。
- 本地快照：在导入、重置、清空、恢复备份或创建新清单前自动保留最近 5 份本地快照。
- WebDAV 手动备份：可把 DadKit JSON 备份手动上传到用户自己的 WebDAV 存储，也可手动下载后恢复。
- PWA 支持：提供 manifest、图标和 service worker，支持安装到手机桌面与基础离线访问。
- Docker 部署：提供非 root 生产镜像、Compose 健康检查和一键部署/升级脚本。

## 页面结构

- `/`：首页，总览预产期、关键进度和主要入口。
- `/setup`：资料设置页，创建或修改个人待产配置。
- `/checklist`：清单页，按分类、包位、优先级和状态管理待产事项。
- `/hospital`：医院页，选择医院模板并记录医院提供物品与待确认事项。
- `/share`：爸爸执行版/导出页，用于临场查看和复制清单文本。
- `/settings`：设置页，管理本地数据、本地快照、JSON 备份和 WebDAV 手动备份。

## 适合场景

- 第一次准备待产包，不想被过长清单淹没。
- 希望把“要带的物品”和“要向医院确认的问题”分开管理。
- 准爸爸或陪产人需要一个能临场照着执行的清单。
- 不希望把孕产信息上传到云端，偏好本地保存。
- 想把待产清单作为开源项目继续扩展医院模板、地区模板或家庭协作功能。

## 功能截图占位

- 首页与预产期倒计时：`docs/screenshots/home.png`
- 精简清单、爸爸任务与进度：`docs/screenshots/checklist.png`
- 医院模板覆盖：`docs/screenshots/hospital.png`
- 导出与爸爸执行版：`docs/screenshots/share.png`

## 本地运行

```bash
npm install
npm run dev
```

默认本地开发地址为 `http://localhost:3000`。

常用命令：

```bash
npm run lint
npm run test
npm run build
```

## Docker 部署

Docker 部署时，容器内外端口统一为 `3333`：

### 一键部署

适用于已经安装 Docker、Docker Compose v2 和 Git 的 Linux 服务器：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-deploy.sh | sudo sh
```

部署目录默认为 `/opt/dadkit`，访问地址：

```text
http://服务器IP:3333
```

### 一键升级

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-upgrade.sh | sudo sh
```

升级脚本会进入 `/opt/dadkit`，拉取 `main` 分支最新代码，并重新构建启动容器。

如果部署目录没有本地修改，但远端历史曾被重写导致 fast-forward 失败，可以显式强制对齐远端：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-upgrade.sh | sudo env DADKIT_FORCE_RESET=1 sh
```

`DADKIT_FORCE_RESET=1` 会在部署目录执行 `git reset --hard origin/main`。仅在确认部署目录没有需要保留的本地改动时使用。

### 自定义部署目录或端口

默认端口是 `3333`，容器内部和外部端口保持一致。如果确实需要换端口，可以同步覆盖：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-deploy.sh | sudo env DADKIT_DIR=/srv/dadkit DADKIT_PORT=3333 sh
```

可用环境变量：

- `DADKIT_DIR`：部署目录，默认 `/opt/dadkit`
- `DADKIT_PORT`：宿主机和容器端口，默认 `3333`
- `DADKIT_BRANCH`：部署分支，默认 `main`
- `DADKIT_REPO`：部署仓库，仅部署脚本使用
- `DADKIT_IMAGE`：Compose 镜像名，默认 `dadkit:latest`
- `DADKIT_FORCE_RESET=1`：部署/升级时强制把部署目录对齐到 `origin/$DADKIT_BRANCH`

### 手动部署

```bash
git clone https://github.com/YePiXpert/dadkit.git /opt/dadkit
cd /opt/dadkit
docker compose up --build -d
```

### 手动升级

```bash
cd /opt/dadkit
git pull --ff-only
docker compose up --build -d --remove-orphans
```

如果远端历史被重写且部署目录无需保留本地改动：

```bash
cd /opt/dadkit
git fetch origin main
git reset --hard origin/main
docker compose up --build -d --remove-orphans
```

### 常用运维命令

```bash
cd /opt/dadkit
docker compose ps
docker compose logs -f
docker compose restart
docker compose down
```

`docker compose ps` 会显示容器健康状态。生产镜像使用 Next.js standalone 输出，并以非 root 用户运行。

本机访问地址：

```text
http://localhost:3333
```

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 风格本地组件
- Zustand
- localStorage 持久化
- date-fns
- PWA 基础支持
- Docker / Docker Compose
- ESLint
- Vitest

## WebDAV 备份

DadKit WebDAV 备份支持手动上传 / 下载，不做自动同步、后台同步或实时双向同步。上传会把当前 DadKit JSON 数据保存为一个 WebDAV 备份文件；下载成功后会先展示远端备份摘要，用户确认后才会覆盖本地数据。

WebDAV 备份文件可能包含预产期、医院、备注、自定义清单等隐私信息。推荐使用自己信任的 WebDAV 服务，并优先使用应用密码，不要使用主密码。WebDAV 密码 / 应用密码默认只保存在 `sessionStorage`，只有用户打开“记住密码在本设备”后才会保存到 `localStorage`。只应在可信设备保存 WebDAV 凭据。

浏览器直连 WebDAV 可能受 CORS 限制。如果 WebDAV 服务没有允许浏览器跨域访问，DadKit 会提示用户改用支持 CORS 的 WebDAV 服务，或继续使用 JSON 备份手动导入导出。

## 目录结构

```text
app/                    Next.js App Router 页面
  page.tsx              首页概览
  setup/page.tsx        待产资料配置
  checklist/page.tsx    动态清单管理
  hospital/page.tsx     医院模板与医院确认
  share/page.tsx        爸爸执行版与导出
  settings/page.tsx     本地设置与数据管理
components/             业务组件
components/ui/          shadcn/ui 风格基础组件
lib/                    类型、规则、状态、存储、导出和展示逻辑
lib/templates/          通用模板、地区模板和医院模板
public/                 PWA manifest、service worker 和图标
tests/                  规则引擎单元测试
types/                  第三方依赖类型补充
scripts/                一键 Docker 部署与升级脚本
Dockerfile              Next.js standalone 生产镜像
docker-compose.yml      Docker Compose 部署配置
```

## 数据模型说明

核心类型在 `lib/types.ts`：

- `UserProfile`：预产期、地区、医院模式、生产方式、住院天数、哺乳、陪产、寒冷季节、医院提供物品和备注。
- `ChecklistItem`：名称、分类、优先级、数量、状态、备注、来源、编辑/删除能力、适用条件和准备时机。
- `packTier`：`core` 默认精简模式显示、`confirm` 默认精简模式显示、`optional` 默认折叠、`hidden` 仅完整模式显示。
- `itemKind`：`item` 真实要打包的物品、`task` 爸爸/陪产人要完成的任务、`question` 需要向医院确认的问题。
- `bag`：证件包、妈妈包、宝宝包、爸爸背包、车上/交通、临出门或无需打包。
- `HospitalProfile`：医院基本信息、可信度、证件要求、提供物品、推荐确认事项、不建议携带物品和备注。
- `RegionTemplate`：地区证件、推荐项和提醒。
- `UserHospitalOverride`：用户对医院模板的覆盖信息。

## 模板规则说明

`lib/rules.ts` 中的 `generateChecklist(profile, persistence)` 会合并：

- 通用模板
- 北京通用地区模板
- 医院模板
- 生产方式条件
- 哺乳、陪产、寒冷季节条件
- 用户明确向医院确认提供的物品
- 用户自定义物品、隐藏模板项和手动状态

规则会按“同名 + 同分类”去重，并保留用户手动修改的状态、数量和备注。

DadKit 默认少而准：证件、妈妈少数关键物品、宝宝出院与基础备用、爸爸负责事项、医院待确认问题优先显示。充电宝、毛巾、宝宝指甲剪等低频或个人习惯项默认不进入精简模式，但保留在完整模式。

前端 UI 采用温暖米色纸感背景、深青绿主色、琥珀待确认提醒和珊瑚临出门提示。移动端优先展示预产期倒计时、打包进度、医院确认、临出门检查和爸爸执行入口。

主打包进度只统计真正要打包的物品，不包含“到下次产检时问清楚”和“临出门检查”。医院确认和临出门检查会作为单独进度显示，避免把待确认问题混进打包完成率。

以下事项默认不作为待产包物品，也不进入主打包进度：支付方式、住院押金、医保结算、停车、入院路线、产科/住院处电话、安全座椅安装。它们会以 `task` 或 `question` 进入爸爸负责、医院确认、临出门或车上任务。

## 医院模板可信度说明

内置的清华大学玉泉医院（清华大学中西医结合医院）模板为 `unverified`，只用于帮助用户记录待确认事项，不作为官方入院要求。

所有医院规则都允许用户修改。医院入院要求、陪产规则、提供物品可能变化，请以最近一次产检、入院须知或医院通知为准。

医院提供物品采用谨慎语义：只有用户明确从医院确认过，才会把匹配物品标记为“医院提供”。医院模板中的“不确定”不会自动改变任何物品状态。

## 隐私说明

- DadKit 不需要登录。
- 用户资料、清单状态、自定义项和医院覆盖信息保存在本地浏览器 `localStorage`。
- 应用不上传用户隐私数据。
- JSON 导入/导出仅在用户本机操作。

使用的 localStorage key：

- `dadkit:user-profile`
- `dadkit:checklist`
- `dadkit:custom-items`
- `dadkit:hidden-template-items`
- `dadkit:hospital-overrides`
- `dadkit:checklist-mode`
- `dadkit:snapshots`
- `dadkit:webdav-config`
- `dadkit:webdav-sync-state`
- `dadkit:webdav-secret`，仅在用户选择记住 WebDAV 凭据时使用

使用的 sessionStorage key：

- `dadkit:webdav-session-secret`，默认用于保存当前会话的 WebDAV 密码 / 应用密码

JSON 导入只支持 `version: 1`。`checklist`、`customItems`、`hiddenTemplateItemIds`、`hospitalOverrides` 如果存在必须是数组；`checklistMode` 如果存在必须是 `lean` 或 `full`。导入失败会返回明确错误，并保持本地数据不变。

JSON 导入 / 导出不会包含 WebDAV 密码或应用密码。清空本地数据会清除 WebDAV 配置和本设备保存的 WebDAV 凭据，但不会删除最近本地快照，除非用户在设置页明确删除快照。

## 免责声明

DadKit 仅用于整理待产准备事项，不提供医疗诊断、治疗建议或医院官方入院要求。不同医院、病区、床位、生产方式和时间节点的要求可能不同，请以医生、助产士、护士、医院入院须知及当地政策为准。

DadKit 不是医疗建议，也不是任何医院的官方清单。医院规则、陪产政策、入院入口、住院押金和提供物品都应以最近一次产检、入院须知或医院通知为准。

## Roadmap

- 医院模板社区贡献
- 多城市模板
- 家庭成员协作
- 云端同步
- 产检资料提醒
- 待产包打印模板
- 多语言支持
- 导入/导出 JSON
- 医院模板来源标注
- PWA 离线模式增强
