"use client";

import { Info } from "lucide-react";

import { ExportTextArea } from "@/components/ExportTextArea";
import { PageIntro } from "@/components/PageIntro";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  mergePostpartumTasks,
  type PostpartumTaskGroup,
  type PostpartumTaskStatus,
} from "@/lib/rc";
import { useDadKitStore } from "@/lib/store";

export default function PostpartumPage() {
  const postpartumTasks = useDadKitStore((state) => state.postpartumTasks);
  const updatePostpartumTask = useDadKitStore(
    (state) => state.updatePostpartumTask,
  );
  const mergedPostpartumTasks = mergePostpartumTasks(postpartumTasks);
  const completedTasks = mergedPostpartumTasks.filter(
    (task) => task.status !== "todo",
  ).length;
  const progress =
    mergedPostpartumTasks.length === 0
      ? 0
      : Math.round((completedTasks / mergedPostpartumTasks.length) * 100);
  const exportText = generatePostpartumShareText(postpartumTasks);

  return (
    <div className="page-shell">
      <PageIntro
        eyebrow="产后待办"
        illustrationVariant="postpartumPaperwork"
        title="产后办理待确认"
        description="不写死政策，只把出生证明、结算、保险、户口和复查事项整理成待确认清单。"
      />

      <section className="mobile-shell grid gap-3 lg:max-w-none">
        <Card className="pony-soft-card">
          <CardContent className="grid gap-3 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-primary">产后提醒</p>
                <h2 className="mt-1 break-words text-lg font-black leading-6">
                  出院后要问、要存、要办理
                </h2>
              </div>
              <span className="shrink-0 text-sm font-black text-primary">
                {completedTasks}/{mergedPostpartumTasks.length}
              </span>
            </div>
            <Progress className="h-2 bg-primary/12" value={progress} />
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-amber-soft text-amber-foreground">
                窗口待确认
              </Badge>
              <Badge variant="soft">用户备注</Badge>
              <Badge variant="outline">不适用可标记</Badge>
            </div>
            <p className="text-xs font-semibold leading-5 text-muted-foreground">
              这里记录办理事项和材料口径，不判断政策是否最新，也不代替窗口要求。
            </p>
          </CardContent>
        </Card>

        <Card className="app-list-card">
          <CardContent className="app-list-row p-3 text-sm leading-6 text-primary">
            <span className="app-icon-tile">
              <Info className="size-4" />
            </span>
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
          const tasks = mergedPostpartumTasks.filter((task) => task.group === group);

          return (
            <Card className="macaron-panel" key={group}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{label}</span>
                  <span className="text-xs font-black text-primary">
                    {
                      tasks.filter((task) => task.status !== "todo").length
                    }/{tasks.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {tasks.map((task) => (
                  <div
                    className="soft-detail grid gap-3 lg:grid-cols-[1fr_11rem]"
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

        <Card className="macaron-panel">
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
