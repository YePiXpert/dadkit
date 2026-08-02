import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReviewPageHref, PUBLIC_SUPPORT_PATH } from "@/lib/app-routes";

export const metadata: Metadata = {
  title: "隐私政策 | DadKit",
  description:
    "DadKit 的本地优先隐私说明：清单与宝宝记录默认保存在当前设备，家庭同步和 WebDAV 由用户主动启用。",
};

const localDataItems = [
  "待产清单进度、自定义项目、隐藏项和清单显示模式",
  "用户自行填写的医院名称、地址、电话和入院要求",
  "按物品填写的负责人、完成期限、预计和实际价格、购买渠道与存放位置",
  "保存在 IndexedDB 的宝宝昵称、出生日期与时间、性别，以及喂养、吸奶、尿布、睡眠和备注",
  "可选的宝宝称呼、预产期和产检时间表完成状态",
  "自动创建的本地恢复快照",
  "仅存于当前设备 IndexedDB 的物品照片",
  "WebDAV 服务器地址、用户名、备份路径和可选的本机保存密码",
];

const userControls = [
  "在“我的”中管理清单设置和备份恢复",
  "手动上传或下载 WebDAV 备份",
  "导出或完整恢复包含宝宝记录的 v8 JSON",
  "从自动创建的本地快照恢复完整便携数据",
  "清空当前浏览器中的清单、医院、家庭分工、宝宝记录和本机物品照片",
  "清除 WebDAV 配置和本机保存的凭据",
];

export default function PrivacyPage() {
  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <PageHeader
          kicker="DadKit"
          subtitle="生效日期：2026-08-01"
          title="隐私政策"
        />

        <Card>
          <CardHeader>
            <CardTitle>隐私政策</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>
              DadKit 是本地优先的待产清单工具，不要求注册账号，也不默认把清单上传到 DadKit 服务器。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>便携备份包含什么</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <p>
              JSON、本地恢复快照和 WebDAV 使用同一份 v8 便携备份数据，包括清单、医院档案、家庭分工与采购、宝宝成长记，以及宝宝昵称、出生资料、全部喂养、吸奶、尿布、睡眠记录、活动计时、删除墓碑和用户备注。包含宝宝事件的 v8 恢复快照保存在 IndexedDB，不写入 localStorage。
            </p>
            <p>
              这些备份不包含物品照片，也不包含 WebDAV 地址、用户名、备份路径、同步状态或密码等连接配置。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>本地保存的数据</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {localDataItems.map((item) => (
              <p
                className="rounded-lg border border-border bg-background p-3 text-sm leading-6"
                key={item}
              >
                {item}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>不会做的事</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <p>DadKit 当前不使用广告 SDK、第三方统计 SDK、账号系统或远程数据库。</p>
            <p>
              DadKit 不出售清单数据，不用清单内容做广告定向，也不会在未操作备份时主动上传清单。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WebDAV 备份</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <p>
              WebDAV 是用户手动配置的第三方备份位置。只有你主动测试连接、上传或下载时，DadKit 才会向你填写的 WebDAV 服务发送请求。
            </p>
            <p>
              WebDAV 用户名、服务器地址和备份路径保存在当前设备，但不会写入清单备份文件；应用密码默认只存在当前会话，只有开启“记住密码在本设备”时才会保存在本机。
            </p>
            <p>
              第三方网盘或 WebDAV 服务如何处理数据，取决于该服务自己的隐私政策和账号设置。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>家庭同步</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <p>
              加入家庭同步后，负责人、完成期限、预计和实际价格、购买渠道与存放位置会与同一家庭中的设备同步。不同设备对不同字段的修改会按字段时间戳合并。
            </p>
            <p>
              这些信息可能包含家庭安排和消费信息，请只与信任的家庭成员共享同步码，并妥善保管 WebDAV 账号。
            </p>
            <p>
              宝宝资料和照护记录也会进入家庭同步。照护事件按记录时间戳合并，删除和全局清空使用墓碑阻止旧设备数据复活；当前仍传输完整文档，不是增量事件同步。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>非医疗用途</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm leading-6 text-muted-foreground">
            <p>宝宝记录仅用于个人整理，不判断奶量是否充足、尿布次数是否异常、睡眠是否正常，也不提供就医建议。</p>
            <p>出现健康问题请联系医生或当地急救服务。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>用户控制</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {userControls.map((item) => (
              <p
                className="rounded-lg border border-border bg-background p-3 text-sm leading-6"
                key={item}
              >
                {item}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
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
              隐私政策如果更新，会在此页面调整生效日期，并同步说明 PWA 的数据处理方式。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
