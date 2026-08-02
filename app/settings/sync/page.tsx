import type { Metadata } from "next";

import { SyncSettingsWorkspace } from "@/components/sync/SyncSettingsWorkspace";

export const metadata: Metadata = {
  title: "家庭同步 | DadKit",
  description: "创建或加入家庭同步，并管理设备、邀请和服务器空间。",
};

export default function SyncSettingsPage() {
  return <SyncSettingsWorkspace />;
}
