# DadKit 3.4.8 发布说明

发布日期：2026-08-13

Android：versionCode 21 / `com.dadkit.mobile`

## 跨标签同步可靠性

- 按清单、医院档案、家庭成员、宝宝记录等业务域分别保留最新变更信号，避免不同数据域的通知互相覆盖。
- 保留 BroadcastChannel 和 storage 事件实时同步，并增加按域补读兜底，修复 WebKit 在高负载或后台标签页节流时偶发漏掉更新的问题。
- 对补读和实时通知统一去重，防止重复刷新或冲突提示重复出现。

## 验收结果

- ESLint、TypeScript、Vitest 95 个文件 / 633 项用例通过。
- Web 生产构建与全部性能预算通过。
- Playwright WebKit 的清单与医院档案双标签回归通过。
- GitHub Docker 工作流 73 项端到端测试通过，镜像构建和推送成功。
