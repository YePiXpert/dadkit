# DadKit v2.0 🧳

DadKit 是一个打开即用、本地优先的待产包清单 PWA。它不要求注册，也不要求先填写预产期、医院或生产方式；首次打开就会生成一份通用清单，像 Todo 一样逐项确认即可。

## V2 的产品原则

- **零输入启动**：没有引导表单，首页就是清单。
- **三个行动视图**：全部、待购买、待装包。
- **两项主导航**：清单、我的。
- **四种简单状态**：待处理、已备好、已装包、不需要。
- **资料完全可选**：预产期、地区、医院和生产方式只用于个性化提醒，不阻塞清单。
- **纯 PWA**：浏览器安装、离线缓存和本地存储；不再包含 Android、iOS 或 Capacitor 工程。

## 主要功能

- 通用待产包清单，按证件、妈妈、宝宝、陪产人、返家准备和临出门分组。
- 每项提供数量参考、简短说明和彩色语义图标。
- 自定义新增、编辑、标记不需要和恢复物品。
- 可为物品拍照或从相册上传，压缩后仅存当前设备，方便家人辨认实物。
- 医院确认、准备时间线、宫缩计时、临出门检查、分娩偏好、产后事项和导出分享作为按需工具。
- 数据默认仅保存在当前浏览器，可手动导入导出 JSON 或配置 WebDAV 备份。
- 可安装到手机桌面，并缓存核心页面供基础离线使用。

DadKit 不提供医疗判断、医院官方规则、电商推荐或商品链接。医院要求请以最近一次产检、入院须知和医院通知为准。

## 页面

- `/`：待产包清单，也是 PWA 启动页。
- `/settings`：我的资料、常用工具、备份与设置。
- `/setup`：可选资料。
- `/hospital`：医院确认。
- `/timeline`：按预产期生成的准备时间线。
- `/contractions`：宫缩计时。
- `/go`：临出门检查。
- `/birth-plan`：分娩偏好。
- `/postpartum`：产后事项。
- `/share`：导出与分享。
- `/privacy`、`/support`：隐私与支持。
- `/healthz`：部署健康检查。

## 本地开发

```bash
npm install
npm run dev
```

默认地址为 `http://localhost:3000`。提交前建议运行：

```bash
npm run lint
npm run test
npm run build
```

## PWA

PWA 元信息位于 `public/manifest.webmanifest`，离线缓存逻辑位于 `public/sw.js`。部署必须使用 HTTPS（本地开发环境除外），浏览器才会提供安装能力和完整的 Service Worker 支持。

V2 只保留 Web 发布链路：

```bash
npm run build
npm run start
```

## Docker 部署

容器默认监听 `3333`，建议只绑定服务器的 `127.0.0.1`，通过 Caddy 或 Nginx 的 HTTPS 反向代理对外提供服务。

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-deploy.sh \
  | sudo env DADKIT_PUBLIC_ORIGIN=https://dadkit.example.com sh
```

更新：

```bash
curl -fsSL https://raw.githubusercontent.com/YePiXpert/dadkit/main/scripts/docker-upgrade.sh | sudo sh
```

常用环境变量：

- `DADKIT_DIR`：部署目录，默认 `/opt/dadkit`。
- `DADKIT_PORT`：宿主机端口，默认 `3333`。
- `DADKIT_BIND_ADDRESS`：监听地址，默认 `127.0.0.1`。
- `DADKIT_PUBLIC_ORIGIN`：外部 HTTPS 地址。
- `DADKIT_WEBDAV_PROXY_ALLOWED_HOSTS`：允许 WebDAV 同源代理访问的精确主机列表。
- `DADKIT_BRANCH`：部署分支，默认 `main`。

公开部署时请在反向代理层配置认证或访问白名单，尤其是启用 WebDAV 代理时。

## 数据与隐私

DadKit 不需要账号或后端数据库。V2 的浏览器数据全部使用独立的 `dadkit:v2:*` 命名空间；不会读取或迁移 V1 数据，也不会在清理 V2 数据时删除旧命名空间。

主要数据包括：

- 可选资料与清单进度；
- 自定义物品和隐藏项；
- 医院确认、时间线、宫缩、分娩偏好与产后事项；
- 本地快照、WebDAV 配置和同步状态。
- 物品照片单独保存在 IndexedDB，不进入 JSON 或 WebDAV 备份。

WebDAV 密码默认只放在 `sessionStorage`；只有用户主动选择“记住密码在本设备”时才写入 `localStorage`。JSON 导出不包含 WebDAV 密码。

## 技术栈

- Next.js App Router / React 19 / TypeScript
- Tailwind CSS / 本地 UI 组件
- Zustand / localStorage / sessionStorage
- PWA manifest / Service Worker
- Vitest / ESLint
- Docker / Docker Compose
