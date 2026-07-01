import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReviewPageHref, PUBLIC_SUPPORT_PATH } from "@/lib/app-routes";

export const metadata: Metadata = {
  title: "隐私政策 | DadKit",
  description:
    "DadKit 的本地优先隐私说明：不需要账号，不默认上传个人资料，WebDAV 由用户手动配置。",
};

const localDataItems = [
  "预产期、地区、医院、生产方式等准备资料",
  "待产清单、自定义项目、医院确认记录和时间线状态",
  "宫缩记录、临出门沟通卡、产后提醒和本地快照",
  "WebDAV 服务器地址、用户名、备份路径和可选的本机保存密码",
];

const userControls = [
  "在“我的”页面复制或导入 JSON 备份",
  "手动上传或下载 WebDAV 备份",
  "清空当前浏览器或 App WebView 中的本地数据",
  "清除 WebDAV 配置和本机保存的凭据",
];

export default function PrivacyPage() {
  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-3 lg:max-w-3xl">
        <Card className="macaron-panel">
          <CardHeader>
            <p className="section-kicker">DadKit</p>
            <CardTitle className="text-2xl leading-tight">隐私政策</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>
              生效日期：2026-06-30。DadKit 是本地优先的待产准备工具，不要求注册账号，也不默认把个人资料上传到 DadKit 服务器。
            </p>
            <p>
              DadKit 用来整理家庭准备事项，不提供医疗诊断、治疗建议或医院官方入院要求。医院规则和临产处理请以医生、助产士、护士、医院通知和当地政策为准。
            </p>
          </CardContent>
        </Card>

        <Card className="app-list-card">
          <CardHeader>
            <CardTitle>本地保存的数据</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {localDataItems.map((item) => (
              <p className="soft-detail text-sm leading-6" key={item}>
                {item}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card className="app-list-card">
          <CardHeader>
            <CardTitle>不会做的事</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <p>DadKit 当前不使用广告 SDK、第三方统计 SDK、账号系统或远程数据库。</p>
            <p>
              DadKit 不出售个人数据，不用用户资料做广告定向，也不会在未操作备份时主动上传待产资料。
            </p>
          </CardContent>
        </Card>

        <Card className="app-list-card">
          <CardHeader>
            <CardTitle>WebDAV 备份</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <p>
              WebDAV 是用户手动配置的第三方备份位置。只有你主动测试连接、上传或下载时，DadKit 才会向你填写的 WebDAV 服务发送请求。
            </p>
            <p>
              WebDAV 用户名、服务器地址和备份路径保存在当前设备；应用密码默认只存在当前会话，只有开启“记住密码在本设备”时才会保存在本机。
            </p>
            <p>
              第三方网盘或 WebDAV 服务如何处理数据，取决于该服务自己的隐私政策和账号设置。
            </p>
          </CardContent>
        </Card>

        <Card className="app-list-card">
          <CardHeader>
            <CardTitle>用户控制</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {userControls.map((item) => (
              <p className="soft-detail text-sm leading-6" key={item}>
                {item}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card className="app-list-card">
          <CardHeader>
            <CardTitle>联系与更新</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>
              反馈问题或申请支持，请访问{" "}
              <Link
                className="font-semibold text-primary underline-offset-4 hover:underline"
                href={getReviewPageHref(PUBLIC_SUPPORT_PATH)}
              >
                支持与反馈
              </Link>
              。
            </p>
            <p>
              隐私政策如果更新，会在此页面调整生效日期，并保持与 App Store Connect / TestFlight 元数据一致。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
