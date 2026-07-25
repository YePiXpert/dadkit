import Link from "next/link";
import { Baby, ChevronRight, ClipboardCheck, Cloud } from "lucide-react";

const SETTINGS_ENTRIES = [
  {
    href: "/growth",
    title: "宝宝成长记",
    description: "按孕周查看宝宝发育与常见产检参考。",
    icon: Baby,
    accent: "bg-[#f8e4df] text-[#a24f43]",
  },
  {
    href: "/settings/checklist",
    title: "清单设置",
    description: "调整显示方式，并维护通用清单内容。",
    icon: ClipboardCheck,
    accent: "bg-[#e8efe5] text-[#557050]",
  },
  {
    href: "/settings/backup",
    title: "备份与恢复",
    description: "管理本机恢复点和 WebDAV 备份。",
    icon: Cloud,
    accent: "bg-[#e8edf4] text-[#536b86]",
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <header className="px-1 pb-1 text-center">
          <h1 className="py-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            我的
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            查看成长参考，管理清单偏好与数据备份。
          </p>
        </header>

        <div className="grid gap-3">
          {SETTINGS_ENTRIES.map((entry) => {
            const Icon = entry.icon;

            return (
              <Link
                className="group flex min-h-24 items-center gap-4 rounded-[1.75rem] border border-[#eadfce] bg-card p-4 shadow-[0_10px_30px_rgba(76,55,40,0.035)] transition-colors hover:bg-muted/35"
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
