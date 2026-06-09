"use client";

import { Copy, Download } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { ExportTextArea } from "@/components/ExportTextArea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generateDadExecutionShareText,
  generateLeanShareText,
  generateShareText,
} from "@/lib/export";
import { useDadKitStore } from "@/lib/store";

export default function SharePage() {
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
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
      <div className="mobile-shell grid gap-2 lg:max-w-none">
        <h1 className="text-3xl font-semibold tracking-normal">爸爸执行版</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          只保留要拿、要问、要确认的事，适合复制给自己或家人。
        </p>
      </div>

      <Card className="mobile-shell rounded-2xl bg-primary text-primary-foreground lg:max-w-none">
        <CardContent className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-2xl font-semibold tracking-normal">今天先完成 3 件事</p>
            <p className="mt-2 text-sm leading-6 text-primary-foreground/80">
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

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle>导出清单</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="dad">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dad">爸爸执行版</TabsTrigger>
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
              <div className="mb-3 rounded-lg bg-coral-soft px-3 py-2 text-sm leading-6 text-coral-foreground">
                爸爸执行版只保留要拿、要问、要确认的事，适合直接复制给家人。
              </div>
              <ExportTextArea value={dadText} />
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
