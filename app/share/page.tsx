"use client";

import Image from "next/image";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  Hospital,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { ExportTextArea } from "@/components/ExportTextArea";
import { PageIntro } from "@/components/PageIntro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generateDadExecutionShareText,
  generateGoShareText,
  generateHospitalCommunicationShareText,
  generateLeanShareText,
  generateShareText,
  generateTimelineShareText,
} from "@/lib/export";
import {
  formatBabyZodiacLine,
  getBabyMascot,
} from "@/lib/baby-profile";
import {
  generateBirthPlanShareText,
  generateContractionsShareText,
} from "@/lib/rc";
import {
  buildHomeReadinessMetrics,
  buildHomeSummary,
} from "@/lib/presentation/home-summary";
import { useDadKitStore } from "@/lib/store";
import { getDaysUntilDue } from "@/lib/timeline";
import type { HospitalAnswer, UserProfile } from "@/lib/types";

type SharePoster = {
  caption: string;
  detail: string;
  icon: LucideIcon;
  metric: string;
  tone: "mint" | "coral" | "lavender" | "amber";
  title: string;
};

export default function SharePage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const hospitalAnswers = useDadKitStore((state) => state.hospitalAnswers);
  const timelineTaskStatuses = useDadKitStore(
    (state) => state.timelineTaskStatuses,
  );
  const contractions = useDadKitStore((state) => state.contractions);
  const birthPlan = useDadKitStore((state) => state.birthPlan);
  const exportJson = useDadKitStore((state) => state.exportJson);

  if (!profile) {
    return (
      <div className="page-shell">
        <EmptyState
          title="还没有可导出的清单"
          description="创建清单后，可以生成纯文本、伴侣版和 JSON 备份。"
          actionHref="/setup"
          actionLabel="开始创建清单"
        />
      </div>
    );
  }

  const babyLine = formatBabyZodiacLine(profile);
  const mascot = getBabyMascot(profile);
  const posterCards = buildSharePosters(profile, checklist, hospitalAnswers);
  const leanText = generateLeanShareText(checklist, profile);
  const fullText = generateShareText(checklist, profile, "DadKit 完整待产准备清单");
  const dadText = generateDadExecutionShareText(checklist, profile);
  const goText = generateGoShareText(
    profile,
    checklist,
    timelineTaskStatuses,
    hospitalAnswers,
  );
  const hospitalText = generateHospitalCommunicationShareText(checklist, profile);
  const birthPlanText = generateBirthPlanShareText(birthPlan);
  const contractionsText = generateContractionsShareText(contractions);
  const timelineText = generateTimelineShareText(
    profile,
    checklist,
    timelineTaskStatuses,
    hospitalAnswers,
  );
  const jsonText = exportJson();

  function downloadJson() {
    const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dadkit-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="导出"
        title="导出与协作"
        description="汇总关键准备状态，可复制或保存备份。"
      />

      <Card className="mobile-shell app-hero-card lg:max-w-none">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="break-words text-2xl font-semibold tracking-normal">
              准备摘要
            </p>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
              {babyLine}
            </p>
            <p className="text-sm leading-6 text-primary-foreground/75">
              待产包 · 医院规则 · 临出门检查
            </p>
          </div>
          <Button
            className="bg-card text-primary hover:bg-card/90"
            onClick={() => navigator.clipboard.writeText(dadText)}
          >
            <Copy className="size-4" />
            复制清单
          </Button>
        </CardContent>
      </Card>

      <SharePosterSection cards={posterCards} mascot={mascot} />

      <Card className="mobile-shell macaron-panel lg:max-w-none">
        <CardHeader>
          <CardTitle>详细文本</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dad">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-9">
              <TabsTrigger value="dad">家人协作</TabsTrigger>
              <TabsTrigger value="go">临出门版</TabsTrigger>
              <TabsTrigger value="hospital">医院沟通版</TabsTrigger>
              <TabsTrigger value="birth-plan">分娩偏好卡</TabsTrigger>
              <TabsTrigger value="contractions">宫缩记录</TabsTrigger>
              <TabsTrigger value="timeline">时间线</TabsTrigger>
              <TabsTrigger value="lean">精简版</TabsTrigger>
              <TabsTrigger value="full">完整版</TabsTrigger>
              <TabsTrigger value="json">JSON 备份</TabsTrigger>
            </TabsList>
            <TabsContent value="lean">
              <ExportTextArea value={leanText} />
            </TabsContent>
            <TabsContent value="full">
              <ExportTextArea value={fullText} />
            </TabsContent>
            <TabsContent value="dad">
              <div className="macaron-note mb-3">
                只保留要拿、要问、要确认的事项，便于家人分工确认。
              </div>
              <ExportTextArea value={dadText} />
            </TabsContent>
            <TabsContent value="go">
              <ExportTextArea value={goText} />
            </TabsContent>
            <TabsContent value="hospital">
              <ExportTextArea value={hospitalText} />
            </TabsContent>
            <TabsContent value="birth-plan">
              <ExportTextArea value={birthPlanText} />
            </TabsContent>
            <TabsContent value="contractions">
              <ExportTextArea value={contractionsText} />
            </TabsContent>
            <TabsContent value="timeline">
              <ExportTextArea value={timelineText} />
            </TabsContent>
            <TabsContent value="json">
              <ExportTextArea value={jsonText} />
              <div className="mt-3 no-print">
                <Button variant="outline" onClick={downloadJson}>
                  <Download className="size-4" />
                  下载 JSON
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function SharePosterSection({
  cards,
  mascot,
}: {
  cards: SharePoster[];
  mascot: { alt: string; src: string };
}) {
  return (
    <section className="mobile-shell grid gap-3 lg:max-w-none">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-black tracking-normal">摘要卡片</h2>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-primary">
          {cards.length} 项
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card, index) => (
          <SharePosterCard
            card={card}
            key={card.title}
            mascot={index === 0 ? mascot : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function SharePosterCard({
  card,
  mascot,
}: {
  card: SharePoster;
  mascot?: { alt: string; src: string };
}) {
  const Icon = card.icon;
  const toneClass = {
    amber: "border-amber/35 bg-amber-soft/70 text-amber-foreground",
    coral: "border-coral/25 bg-secondary/75 text-primary",
    lavender: "border-lavender/40 bg-lavender/70 text-lavender-foreground",
    mint: "border-primary/20 bg-mint/70 text-primary",
  }[card.tone];

  return (
    <article className="relative min-h-[10.5rem] overflow-hidden rounded-lg border border-white/90 bg-card/95 p-4 shadow-soft">
      {mascot ? (
        <Image
          alt={mascot.alt}
          className="pointer-events-none absolute -right-6 bottom-[-1.25rem] h-28 w-28 object-contain opacity-95"
          height={1254}
          priority
          sizes="112px"
          src={mascot.src}
          width={1254}
        />
      ) : null}
      <div className="relative z-10 grid min-h-[8.5rem] content-between gap-4 pr-16">
        <div>
          <span
            className={`inline-flex size-10 items-center justify-center rounded-full border ${toneClass}`}
          >
            <Icon className="size-5" />
          </span>
          <h3 className="mt-3 break-words text-lg font-black leading-6 tracking-normal">
            {card.title}
          </h3>
          <p className="mt-1 break-words text-xs font-semibold leading-5 text-muted-foreground">
            {card.detail}
          </p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="text-2xl font-black text-primary">{card.metric}</p>
          <Button
            className="h-9 px-3 text-xs"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(card.caption)}
          >
            <Copy className="size-3.5" />
            复制摘要
          </Button>
        </div>
      </div>
    </article>
  );
}

function buildSharePosters(
  profile: UserProfile,
  checklist: Parameters<typeof buildHomeSummary>[0],
  hospitalAnswers: HospitalAnswer[],
): SharePoster[] {
  const dueDate = profile.dueDate ?? "待填写";
  const daysLeft = getDaysUntilDue(profile);
  const [packing, hospital, go] = buildHomeReadinessMetrics(
    buildHomeSummary(checklist, hospitalAnswers),
  );

  return [
    {
      caption: `待产准备摘要：预产期 ${dueDate}，距离预产期 ${formatDaysMetric(daysLeft)}。包含待产包、医院规则和临出门检查。`,
      detail: `预产期 ${dueDate}`,
      icon: Sparkles,
      metric: formatDaysMetric(daysLeft),
      title: "预产期倒计时",
      tone: "coral",
    },
    {
      caption: `待产包进度 ${packing.completed}/${packing.total}。优先确认证件、妈妈包和宝宝包。`,
      detail: packing.caption,
      icon: CheckCircle2,
      metric: `${packing.completed}/${packing.total}`,
      title: packing.label,
      tone: "mint",
    },
    {
      caption: `医院规则确认 ${hospital.completed}/${hospital.total}。医院提供物品、入院入口、陪产规则和缴费方式提前确认。`,
      detail: hospital.caption,
      icon: Hospital,
      metric: `${hospital.completed}/${hospital.total}`,
      title: hospital.label,
      tone: "lavender",
    },
    {
      caption: `临出门检查 ${go.completed}/${go.total}。证件、手机、充电器、妈妈包、宝宝包、医院电话和路线出发前集中确认。`,
      detail: go.caption,
      icon: CalendarClock,
      metric: `${go.completed}/${go.total}`,
      title: go.label,
      tone: "amber",
    },
    {
      caption: `分娩偏好卡：紧急联系人、陪产人、过敏/用药、沟通偏好，入院时便于家人和医护快速了解。`,
      detail: "入院沟通信息",
      icon: ClipboardList,
      metric: "已整理",
      title: "分娩偏好卡",
      tone: "mint",
    },
  ];
}

function formatDaysMetric(daysLeft?: number) {
  if (typeof daysLeft !== "number") {
    return "待填写";
  }

  if (daysLeft <= 0) {
    return "已到预产期";
  }

  return `${daysLeft} 天`;
}
