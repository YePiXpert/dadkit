import Link from "next/link";
import type { Metadata } from "next";
import {
  CarFront,
  ChevronRight,
  Hospital,
  Sprout,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "工具 | DadKit",
  description: "使用孕期成长、准备出发、医院档案和家庭分工工具。",
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
    href: "/planning",
    title: "家庭分工与采购",
    description: "谁负责买、谁负责带，全家分工一目了然。",
    icon: Users,
    accent: "bg-tile-mom-bg text-tile-mom-fg",
  },
] as const;

export default function ToolsPage() {
  return (
    <div className="page-shell page-shell-with-nav">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <header className="px-1 pb-1 text-center">
          <h1 className="py-2 text-2xl font-bold leading-tight tracking-tight sm:text-[28px]">
            工具
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            从孕周跟踪到出发待产，这些帮手随取随用。
          </p>
        </header>

        <div className="grid gap-3">
          {TOOL_ENTRIES.map((entry) => {
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
                  <span className="block text-base font-semibold text-foreground">
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
        </div>
      </section>
    </div>
  );
}
