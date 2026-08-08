import Link from "next/link";
import {
  ChevronRight,
  ClipboardCheck,
  Cloud,
  Info,
  Share2,
  Users,
} from "lucide-react";

import { AppearanceCard } from "@/components/AppearanceCard";
import { InstallPromptSettingsEntry } from "@/components/InstallPromptSettingsEntry";
import { FamilySetupPrompt } from "@/components/household/FamilySetupPrompt";
import packageJson from "@/package.json";

const SETTINGS_ENTRIES = [
  {
    href: "/settings/sync",
    title: "家庭同步",
    description: "管理同步空间、邀请和已加入的设备。",
    icon: Share2,
    accent: "bg-tile-dad-bg text-tile-dad-fg",
  },
  {
    href: "/settings/family",
    title: "家庭成员",
    description: "管理照护者和这台设备的使用者。",
    icon: Users,
    accent: "bg-tile-baby-bg text-tile-baby-fg",
  },
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
    description: "管理本机恢复点、JSON 和 WebDAV 备份。",
    icon: Cloud,
    accent: "bg-tile-dad-bg text-tile-dad-fg",
  },
  {
    href: "/settings/about",
    title: "关于 DadKit",
    description: `当前版本 ${packageJson.version}，查看版本并检查更新。`,
    icon: Info,
    accent: "bg-tile-docs-bg text-tile-docs-fg",
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <header className="px-1 pb-1 text-center">
          <h1 className="py-2 text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
            我的
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            管理家庭同步、成员、清单偏好与数据备份。
          </p>
        </header>

        <div className="grid gap-3">
          <FamilySetupPrompt />
          {SETTINGS_ENTRIES.map((entry) => {
            const Icon = entry.icon;

            return (
              <Link
                className="group flex min-h-24 items-center gap-4 rounded-card bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                href={entry.href}
                key={entry.href}
              >
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${entry.accent}`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">
                    {entry.title}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    {entry.description}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
          <InstallPromptSettingsEntry />
        </div>

        <AppearanceCard />
      </section>
    </div>
  );
}
