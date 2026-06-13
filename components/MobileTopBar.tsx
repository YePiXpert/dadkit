"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, CalendarClock } from "lucide-react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "DadKit", subtitle: "准爸爸好帮手" },
  "/setup": { title: "创建资料", subtitle: "生成专属待产清单" },
  "/checklist": { title: "清单工作台", subtitle: "按分类整理，不遗漏" },
  "/hospital": { title: "医院确认", subtitle: "把入院规则问清楚" },
  "/timeline": { title: "时间线", subtitle: "重要节点一步步完成" },
  "/go": { title: "临出门检查", subtitle: "出门前最后确认" },
  "/contractions": { title: "宫缩记录", subtitle: "记录每一次节奏" },
  "/birth-plan": { title: "分娩偏好卡", subtitle: "给医生和家人的沟通卡" },
  "/postpartum": { title: "产后办理", subtitle: "手续和材料慢慢确认" },
  "/settings": { title: "设置", subtitle: "数据与备份都在这里" },
  "/share": { title: "分享导出", subtitle: "复制给自己或家人" },
};

export function MobileTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const copy = pageTitles[pathname] ?? { title: "DadKit", subtitle: "准爸爸好帮手" };
  const isHome = pathname === "/";
  const contentFirstRoutes = [
    "/checklist",
    "/hospital",
    "/timeline",
    "/go",
    "/contractions",
    "/settings",
  ];
  const showInlineCopy = pathname !== "/setup";
  const showRightAvatar = isHome || pathname === "/setup";

  if (isHome) {
    return null;
  }

  if (contentFirstRoutes.some((route) => pathname.startsWith(route))) {
    return null;
  }

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/80 bg-card/95 px-4 py-2.5 shadow-sm backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-[480px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {isHome ? (
            <span className="relative flex size-11 shrink-0 overflow-hidden rounded-lg border border-coral/20 bg-accent shadow-sm">
              <Image
                alt="DadKit 小熊助手"
                className="object-contain p-0.5"
                fill
                sizes="44px"
                src="/illustrations/dadkit-bear-transparent.png"
              />
            </span>
          ) : (
            <button
              aria-label="返回上一页"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/80 bg-cream text-primary shadow-sm"
              type="button"
              onClick={goBack}
            >
              <ArrowRight className="size-5 rotate-180" />
            </button>
          )}

          {showInlineCopy ? (
            <div className="min-w-0">
              <p className="truncate text-lg font-bold leading-tight text-primary">
                {copy.title}
              </p>
              <p className="truncate text-xs font-medium text-muted-foreground">
                {copy.subtitle}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isHome ? (
            <button
              aria-label="查看提醒"
              className="flex size-9 items-center justify-center rounded-full border border-white/80 bg-cream text-primary shadow-sm"
              type="button"
            >
              <CalendarClock className="size-4" />
            </button>
          ) : null}
          {showRightAvatar ? (
            <span className="relative flex size-9 overflow-hidden rounded-full border border-white/80 bg-peach shadow-sm">
              <Image
                alt="小熊头像"
                className="object-contain p-0.5"
                fill
                sizes="36px"
                src="/illustrations/dadkit-bear-transparent.png"
              />
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
