import type { Metadata } from "next";
import {
  CarFront,
  DatabaseBackup,
  Hospital,
  LifeBuoy,
  ListChecks,
  RefreshCw,
  Sprout,
  Users,
} from "lucide-react";

import {
  LinkEntryGrid,
  type LinkEntry,
} from "@/components/LinkEntryGrid";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "工具 | DadKit",
  description: "使用孕期成长、准备出发和医院档案工具。",
};

const TOOL_ENTRIES = [
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
  {
    href: "/hospital",
    title: "医院档案",
    description: "建档医院信息、就诊卡、路线与紧急联系。",
    icon: Hospital,
    accent: "bg-tile-docs-bg text-tile-docs-fg",
  },
  {
    href: "/settings/checklist",
    title: "清单设置",
    description: "自定义分类、模板与不需要的物品。",
    icon: ListChecks,
    accent: "bg-tile-mom-bg text-tile-mom-fg",
  },
] as const satisfies readonly LinkEntry[];

const SUPPORT_ENTRIES = [
  {
    href: "/settings/family",
    title: "家庭成员",
    description: "管理家庭名称和宝宝记录人。",
    icon: Users,
    accent: "bg-tile-docs-bg text-tile-docs-fg",
  },
  {
    href: "/settings/backup",
    title: "备份与恢复",
    description: "本地导出、WebDAV 与自动备份。",
    icon: DatabaseBackup,
    accent: "bg-tile-car-bg text-tile-car-fg",
  },
  {
    href: "/settings/sync",
    title: "家庭同步",
    description: "和家人实时共享清单与进度。",
    icon: RefreshCw,
    accent: "bg-tile-baby-bg text-tile-baby-fg",
  },
  {
    href: "/support",
    title: "帮助与反馈",
    description: "常见问题、联系我们与版本信息。",
    icon: LifeBuoy,
    accent: "bg-tile-mom-bg text-tile-mom-fg",
  },
] as const satisfies readonly LinkEntry[];

export default function ToolsPage() {
  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <PageHeader
          kicker="顺手工具"
          subtitle="从孕周跟踪到出发待产，这些帮手随取随用。"
          title="工具"
        />

        <LinkEntryGrid entries={TOOL_ENTRIES} />

        <section aria-labelledby="tools-support-title" className="grid gap-3">
          <h2
            className="px-1 text-[15px] font-semibold"
            id="tools-support-title"
          >
            管理与支持
          </h2>
          <LinkEntryGrid entries={SUPPORT_ENTRIES} />
        </section>
      </section>
    </div>
  );
}
