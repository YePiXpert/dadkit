"use client";

import { Copy, Download } from "lucide-react";

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
  generateBirthPlanShareText,
  generateContractionsShareText,
} from "@/lib/rc";
import { useDadKitStore } from "@/lib/store";

export default function SharePage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
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

  const leanText = generateLeanShareText(checklist, profile);
  const fullText = generateShareText(checklist, profile, "DadKit 完整待产准备清单");
  const dadText = generateDadExecutionShareText(checklist, profile);
  const goText = generateGoShareText(profile, checklist, timelineTaskStatuses);
  const hospitalText = generateHospitalCommunicationShareText(checklist, profile);
  const birthPlanText = generateBirthPlanShareText(birthPlan);
  const contractionsText = generateContractionsShareText(contractions);
  const timelineText = generateTimelineShareText(
    profile,
    checklist,
    timelineTaskStatuses,
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
        eyebrow="一键分享"
        title="爸爸执行版"
        description="只保留要拿、要问、要确认的事，适合复制给自己或家人。"
      />

      <Card className="mobile-shell app-hero-card lg:max-w-none">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-2xl font-semibold tracking-normal">今天先完成 3 件事</p>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
              保存电话 · 确认路线 · 确认证件包
            </p>
          </div>
          <Button
            className="bg-card text-primary hover:bg-card/90"
            onClick={() => navigator.clipboard.writeText(dadText)}
          >
            <Copy className="size-4" />
            复制
          </Button>
        </CardContent>
      </Card>

      <Card className="mobile-shell macaron-panel lg:max-w-none">
        <CardHeader>
          <CardTitle>导出清单</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dad">
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-9">
              <TabsTrigger value="dad">爸爸执行版</TabsTrigger>
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
                爸爸执行版只保留要拿、要问、要确认的事，适合直接复制给家人。
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
