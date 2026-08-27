import type { Metadata } from "next";
import {
  CarFront,
  ClipboardCheck,
  Cloud,
  LifeBuoy,
  Share2,
  Sprout,
} from "lucide-react";

import { AboutCard } from "@/components/AboutCard";
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
  description: "管理成长工具、家庭同步、清单偏好、外观与本机备份。",
};

const SETTINGS_GROUPS: readonly { label: string; entries: readonly LinkEntry[] }[] = [
  {
    label: "常用工具",
    entries: [
      {
        href: "/growth",
        title: "孕期成长记",
        description: "孕 8–40 周宝宝发育类比、指标解读与产检提醒。",
        icon: Sprout,
        accent: "bg-tile-baby-bg text-tile-baby-fg",
      },
      {
        href: "/departure",
        title: "准备出发",
        description: "临产出发前的证件、随手物品、随车与行李确认。",
        icon: CarFront,
        accent: "bg-tile-car-bg text-tile-car-fg",
      },
    ],
  },
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
        description: "本机恢复点、JSON 备份与家庭同步。",
        icon: Cloud,
        accent: "bg-tile-car-bg text-tile-car-fg",
      },
    ],
  },
  {
    label: "管理与支持",
    entries: [
      {
        href: "/support",
        title: "帮助与反馈",
        description: "常见问题、联系我们与版本信息。",
        icon: LifeBuoy,
        accent: "bg-tile-mom-bg text-tile-mom-fg",
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
          subtitle="成长工具、家庭同步、偏好与备份都在这里。"
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
          <AboutCard appVersion={packageJson.version} />
        </section>
      </section>
    </div>
  );
}
