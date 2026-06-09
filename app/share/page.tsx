"use client";

import { Download } from "lucide-react";

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
      <Card>
        <CardHeader>
          <CardTitle>导出清单</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="lean">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="lean">精简版</TabsTrigger>
              <TabsTrigger value="full">完整版</TabsTrigger>
              <TabsTrigger value="dad">爸爸执行版</TabsTrigger>
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
