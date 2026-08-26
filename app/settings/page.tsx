import type { Metadata } from "next";
import {
  ClipboardCheck,
  Cloud,
  Share2,
} from "lucide-react";

import { AndroidUpdateSettingsCard } from "@/components/AndroidUpdateSettingsCard";
import { AppearanceCard } from "@/components/AppearanceCard";
import { InstallPromptSettingsEntry } from "@/components/InstallPromptSettingsEntry";
import {
  LinkEntryGrid,
  type LinkEntry,
} from "@/components/LinkEntryGrid";
import { PageHeader } from "@/components/PageHeader";
import packageJson from "@/package.json";

export const metadata: Metadata = {
  title: "我的设置 | DadKit",
  description: "管理家庭同步、清单显示方式、外观与本机备份。",
};

const SETTINGS_GROUPS: readonly { label: string; entries: readonly LinkEntry[] }[] = [
  {
    label: "家庭协作",
    entries: [
      {
        href: "/settings/sync",
        title: "家庭同步",
        description: "管理同步空间、邀请和已加入的设备。",
        icon: Share2,
        accent: "bg-tile-dad-bg text-tile-dad-fg",
      },
    ],
  },
  {
    label: "数据与偏好",
    entries: [
      {
        href: "/settings/checklist",
        title: "清单设置",
        description: "调整显示方式，并维护通用清单内容。",
        icon: ClipboardCheck,
        accent: "bg-tile-docs-bg text-tile-docs-fg",
      },
      {
        href: "/settings/backup",
        title: "备份与恢复",
        description: "本机恢复点、JSON 与 WebDAV 备份。",
        icon: Cloud,
        accent: "bg-tile-car-bg text-tile-car-fg",
      },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-6 sm:max-w-[42rem]">
        <PageHeader
          kicker="家庭与设置"
          subtitle="管理家庭同步、清单偏好与数据备份。"
          title="我的"
        />

        {SETTINGS_GROUPS.map((group) => (
          <section className="grid gap-2.5" key={group.label}>
            <h2 className="section-kicker px-2">{group.label}</h2>
            <LinkEntryGrid entries={group.entries} />
          </section>
        ))}

        <InstallPromptSettingsEntry />

        <section className="grid gap-3" aria-label="应用">
          <AppearanceCard />
          <AndroidUpdateSettingsCard appVersion={packageJson.version} />
        </section>
      </section>
    </div>
  );
}