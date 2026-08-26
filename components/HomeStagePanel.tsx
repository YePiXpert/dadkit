"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Baby, ChevronRight } from "lucide-react";
import { useEffect } from "react";

import { GrowthAnalogyIllustration } from "@/components/GrowthAnalogyIllustration";
import { HomeHeroIllustration } from "@/components/HomeHeroIllustration";
import { HomeStageSkeleton } from "@/components/HomeDashboardSkeletons";
import { birthDayNumber } from "@/lib/baby/date";
import { hasBabyMode } from "@/lib/baby/portable";
import { useBabyStore } from "@/lib/baby/store";
import {
  getCurrentGrowthWeekFromDueDate,
  getDaysUntilDueDate,
  getGrowthWeek,
  MAX_GROWTH_WEEK,
} from "@/lib/growth";
import { useGrowthStore } from "@/lib/growth-store";

const BabyHomeCard = dynamic(
  () =>
    import("@/components/baby/BabyHomeCard").then(
      (module) => module.BabyHomeCard,
    ),
  { ssr: false },
);

export function HomeStagePanel({ onReady }: { onReady?: () => void }) {
  const babyProfile = useBabyStore((state) => state.profile);
  const babyHydrated = useBabyStore((state) => state.hydrated);
  const hydrateBaby = useBabyStore((state) => state.hydrate);
  const dueDate = useGrowthStore((state) => state.dueDate);
  const growthHydrated = useGrowthStore((state) => state.hydrated);
  const hydrateGrowth = useGrowthStore((state) => state.hydrate);

  useEffect(() => {
    hydrateGrowth();
    void hydrateBaby().finally(() => onReady?.());
  }, [hydrateBaby, hydrateGrowth, onReady]);

  if (!babyHydrated || !growthHydrated) {
    return <HomeStageSkeleton />;
  }

  const babyBorn = hasBabyMode(babyProfile);

  return (
    <>
      <StageHero
        babyBirthDate={babyProfile.fields.birthDate.value}
        babyBorn={babyBorn}
        babyNickname={babyProfile.fields.nickname.value}
        dueDate={dueDate}
      />
      {babyBorn ? <BabyHomeCard /> : null}
    </>
  );
}

function StageHero({
  babyBirthDate,
  babyBorn,
  babyNickname,
  dueDate,
}: {
  babyBirthDate: string;
  babyBorn: boolean;
  babyNickname: string;
  dueDate: string;
}) {
  if (babyBorn) {
    const days = birthDayNumber(babyBirthDate) ?? 1;
    const nickname = babyNickname.trim() || "宝宝";

    return (
      <Link
        className="app-highlight-card group flex items-center gap-4 p-5 transition-opacity active:opacity-90 sm:p-6"
        href="/baby"
        prefetch={false}
      >
        <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-inset bg-on-highlight/15 text-on-highlight">
          <Baby aria-hidden="true" className="size-6" />
        </span>
        <span className="relative z-10 min-w-0 flex-1">
          <span className="block text-sm font-semibold text-on-highlight">
            宝宝已经来到身边
          </span>
          <span className="mt-1 block break-words text-2xl font-bold leading-tight text-on-highlight">
            {nickname}出生第 {days} 天
          </span>
          <span className="mt-1 block text-sm leading-6 text-on-highlight">
            点这里记录喂养、尿布和睡眠。
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="relative z-10 size-5 shrink-0 text-on-highlight transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    );
  }

  const daysUntilDue = getDaysUntilDueDate(dueDate);

  if (daysUntilDue === undefined) {
    return (
      <Link
        className="app-highlight-card group block p-5 transition-opacity active:opacity-90 sm:p-6"
        href="/growth"
        prefetch={false}
      >
        <span className="relative z-10 flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-on-highlight">
              孕周状态
            </span>
            <span className="mt-1 block text-2xl font-bold leading-tight text-on-highlight">
              宝宝现在多大了？
            </span>
          </span>
          <HomeHeroIllustration className="w-24 shrink-0 sm:w-28" />
        </span>
        <span className="relative z-10 mt-2 block text-sm leading-6 text-on-highlight">
          设置预产期后，这里会显示孕周、倒计时和成长类比。
        </span>
        <span className="relative z-10 mt-4 inline-flex min-h-11 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm">
          设置预产期
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </Link>
    );
  }

  const daysPregnant = Math.max(0, 280 - daysUntilDue);
  const overdue = daysUntilDue < 0;
  const displayWeek = Math.min(MAX_GROWTH_WEEK, Math.floor(daysPregnant / 7));
  const displayDay = overdue ? 0 : daysPregnant % 7;
  const weekData = getGrowthWeek(getCurrentGrowthWeekFromDueDate(dueDate));

  return (
    <Link
      className="app-highlight-card group block p-5 transition-opacity active:opacity-90 sm:p-6"
      href="/growth"
      prefetch={false}
    >
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-highlight">
            {weekData.trimester}
          </p>
          <p className="mt-1 text-3xl font-bold leading-tight text-on-highlight">
            孕 {displayWeek} 周{displayDay > 0 ? ` + ${displayDay} 天` : ""}
          </p>
          <p className="mt-1.5 text-sm font-medium text-on-highlight">
            {overdue
              ? `预产期已过 ${Math.abs(daysUntilDue)} 天`
              : `距预产期约 ${daysUntilDue} 天`}
          </p>
          <p className="mt-1 text-sm leading-6 text-on-highlight">
            宝宝现在约有{weekData.analogy}那么大。
          </p>
        </div>
        <GrowthAnalogyIllustration
          analogy={weekData.analogy}
          className="w-24 shrink-0 sm:w-28"
          week={weekData.week}
        />
      </div>
    </Link>
  );
}
