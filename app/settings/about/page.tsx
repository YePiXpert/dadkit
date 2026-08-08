import type { Metadata } from "next";

import { AndroidUpdateSettingsCard } from "@/components/AndroidUpdateSettingsCard";
import { PageHeader } from "@/components/PageHeader";
import packageJson from "@/package.json";

export const metadata: Metadata = {
  title: "关于 DadKit",
  description: "查看 DadKit 当前版本并检查 Android 应用更新。",
};

export default function AboutSettingsPage() {
  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-4 sm:max-w-[42rem]">
        <PageHeader
          backHref="/settings"
          backLabel="返回我的"
          kicker="应用信息"
          subtitle="查看当前版本、检查更新并跟踪安装包下载状态。"
          title="关于 DadKit"
        />
        <AndroidUpdateSettingsCard appVersion={packageJson.version} />
      </section>
    </div>
  );
}
