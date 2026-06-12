"use client";

import { Info } from "lucide-react";

import { ExportTextArea } from "@/components/ExportTextArea";
import { PageIntro } from "@/components/PageIntro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  POSTPARTUM_GROUP_LABELS,
  POSTPARTUM_STATUS_LABELS,
  generatePostpartumShareText,
  type PostpartumTaskGroup,
  type PostpartumTaskStatus,
} from "@/lib/rc";
import { useDadKitStore } from "@/lib/store";

export default function PostpartumPage() {
  const postpartumTasks = useDadKitStore((state) => state.postpartumTasks);
  const updatePostpartumTask = useDadKitStore(
    (state) => state.updatePostpartumTask,
  );
  const exportText = generatePostpartumShareText(postpartumTasks);

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="产后待办"
        title="产后办理待确认"
        description="不写死政策，只把出生证明、结算、保险、户口和复查事项整理成待确认清单。"
      />

      <section className="mobile-shell grid gap-3 lg:max-w-none">
        <Card className="bg-secondary/80">
          <CardContent className="flex gap-3 p-4 text-sm leading-6 text-primary">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>
              北京、玉泉等具体场景可以写进备注；最终以医院、窗口和官方渠道要求为准。
            </p>
          </CardContent>
        </Card>

        {(
          Object.entries(POSTPARTUM_GROUP_LABELS) as Array<
            [PostpartumTaskGroup, string]
          >
        ).map(([group, label]) => {
          const tasks = postpartumTasks.filter((task) => task.group === group);

          return (
            <Card className="rounded-lg" key={group}>
              <CardHeader>
                <CardTitle>{label}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {tasks.map((task) => (
                  <div
                    className="grid gap-3 rounded-lg border border-border bg-background p-3 lg:grid-cols-[1fr_11rem]"
                    key={task.id}
                  >
                    <div className="grid gap-2">
                      <p className="font-medium">{task.title}</p>
                      <Label htmlFor={`${task.id}-note`}>备注</Label>
                      <Textarea
                        id={`${task.id}-note`}
                        placeholder="记录电话确认结果、材料口径或办理窗口"
                        value={task.note ?? ""}
                        onChange={(event) =>
                          updatePostpartumTask(task.id, {
                            note: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid content-start gap-2">
                      <Label htmlFor={`${task.id}-status`}>状态</Label>
                      <Select
                        value={task.status}
                        onValueChange={(value) =>
                          updatePostpartumTask(task.id, {
                            status: value as PostpartumTaskStatus,
                          })
                        }
                      >
                        <SelectTrigger id={`${task.id}-status`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.entries(POSTPARTUM_STATUS_LABELS) as Array<
                              [PostpartumTaskStatus, string]
                            >
                          ).map(([status, statusLabel]) => (
                            <SelectItem key={status} value={status}>
                              {statusLabel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>导出待确认清单</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportTextArea value={exportText} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
