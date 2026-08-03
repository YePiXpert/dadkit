import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReviewPageHref, PUBLIC_PRIVACY_PATH } from "@/lib/app-routes";

export const metadata: Metadata = {
  title: "支持与反馈 | DadKit",
  description:
    "DadKit 的支持入口：反馈问题、PWA 清单使用说明和 WebDAV 排查。",
};

const testChecklist = [
  "首次打开后确认首页直接显示清单，并能进入“我的”",
  "修改一个清单状态，刷新或重新打开 PWA，确认本地数据仍在",
  "在“备份与恢复”中创建恢复点，并尝试恢复一份不含真实隐私的测试清单",
  "如测试 WebDAV，请使用测试目录和应用密码，不要把真实清单截图发到反馈里",
];

const feedbackItems = [
  "设备型号、系统版本、DadKit 版本和发生问题的页面",
  "你刚才点击了什么，以及期望看到什么结果",
  "如果是 WebDAV 问题，提供服务商名称、非敏感路径和错误提示，不要发送账号或密码",
];

export default function SupportPage() {
  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <PageHeader
          kicker="DadKit"
          subtitle="反馈问题、PWA 清单使用说明和 WebDAV 排查。"
          title="支持与反馈"
        />

        <Card>
          <CardHeader>
            <CardTitle>支持</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>
              DadKit 是本地优先的待产清单工具。反馈问题时，请不要发送手机号、WebDAV 应用密码、身份证件或包含真实清单内容的截图。
            </p>
            <p>
              当前公开支持渠道是 GitHub Issues：
              <a
                className="font-semibold text-primary underline-offset-4 hover:underline"
                href="https://github.com/YePiXpert/dadkit/issues"
                rel="noreferrer"
                target="_blank"
              >
                github.com/YePiXpert/dadkit/issues
              </a>
              。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PWA 使用检查</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {testChecklist.map((item) => (
              <p
                className="rounded-lg bg-muted/35 p-3 text-sm leading-6"
                key={item}
              >
                {item}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>反馈时请附上</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {feedbackItems.map((item) => (
              <p
                className="rounded-lg bg-muted/35 p-3 text-sm leading-6"
                key={item}
              >
                {item}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WebDAV 排查</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <p>确认服务器地址包含协议和路径，例如服务商提供的 WebDAV 完整地址。</p>
            <p>优先使用服务商生成的应用密码，不要使用主账号密码。</p>
            <p>如果服务商限制目录权限，请确认 DadKit 的远端目录和备份文件名在授权范围内。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据与隐私</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>
              本地恢复快照和 WebDAV 备份清单与成长记中的便携数据，不包含物品照片、WebDAV 连接配置或凭据。
            </p>
            <p>
              隐私说明见{" "}
              <Link
                className="font-semibold text-primary underline-offset-4 hover:underline"
                href={getReviewPageHref(PUBLIC_PRIVACY_PATH)}
              >
                隐私政策
              </Link>
              。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
