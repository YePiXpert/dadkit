"use client";

import { FileText, ListRestart, ListTodo } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDadKitStore } from "@/lib/store";
import { useChecklistDescriptionPreference } from "@/lib/use-checklist-description-preference";
import { cn } from "@/lib/utils";
import type { ChecklistMode } from "@/lib/types";

const CHECKLIST_MODES = [
  {
    value: "lean",
    label: "精简",
    description: "优先显示核心物品和需要确认的事项。",
  },
  {
    value: "full",
    label: "完整",
    description: "显示通用清单中的全部建议物品。",
  },
] as const satisfies readonly {
  value: ChecklistMode;
  label: string;
  description: string;
}[];

export default function ChecklistSettingsPage() {
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const setChecklistMode = useDadKitStore((state) => state.setChecklistMode);
  const resetChecklist = useDadKitStore((state) => state.resetChecklist);
  const restoreMissingTemplateItems = useDadKitStore(
    (state) => state.restoreMissingTemplateItems,
  );
  const { showFullDescriptions, setShowFullDescriptions } =
    useChecklistDescriptionPreference();
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState<boolean>();
  const [rebuildDialogOpen, setRebuildDialogOpen] = useState(false);
  const [rebuildConfirmation, setRebuildConfirmation] = useState("");

  function restoreMissingItems() {
    try {
      const count = restoreMissingTemplateItems();

      setMessage(
        count > 0
          ? `已补回 ${count} 项缺失的通用物品，现有进度和自定义物品均已保留。`
          : "通用物品已完整，现有清单没有变化。",
      );
      setMessageOk(true);
    } catch {
      setMessage("暂时无法补回通用物品，请稍后再试。");
      setMessageOk(false);
    }
  }

  function rebuildChecklist() {
    if (rebuildConfirmation !== "重新开始") return;

    try {
      resetChecklist();
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "恢复点保存失败，清单未重建。",
      );
      setMessageOk(false);
      return;
    }

    setRebuildDialogOpen(false);
    setRebuildConfirmation("");
    setMessage("清单已重建，自定义物品和原有进度已清除。");
    setMessageOk(true);
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <header className="px-1 pb-1 text-center">
          <h1 className="py-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            清单设置
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            只调整当前设备上的清单显示与通用物品。
          </p>
        </header>

        <Card className="border-[#eadfce]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary">
                <FileText className="size-4" />
              </span>
              物品说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted/40 p-4">
              <div className="min-w-0">
                <Label htmlFor="show-full-descriptions">显示物品说明</Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  开启后完整显示补充说明；关闭后卡片只保留名称和数量。
                </p>
              </div>
              <Switch
                checked={showFullDescriptions}
                id="show-full-descriptions"
                onCheckedChange={setShowFullDescriptions}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#eadfce]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary">
                <ListTodo className="size-4" />
              </span>
              清单范围
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="清单显示范围">
              {CHECKLIST_MODES.map((mode) => {
                const active = checklistMode === mode.value;

                return (
                  <button
                    aria-pressed={active}
                    className={cn(
                      "min-h-24 rounded-2xl border p-3 text-left transition-colors",
                      active
                        ? "border-primary bg-secondary text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/35",
                    )}
                    key={mode.value}
                    onClick={() => setChecklistMode(mode.value)}
                    type="button"
                  >
                    <span className="block text-sm font-semibold">{mode.label}</span>
                    <span className="mt-1.5 block text-xs leading-5">
                      {mode.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-1 grid gap-2 rounded-2xl border border-border bg-muted/35 p-4">
              <p className="text-sm font-semibold">补回缺失的通用物品</p>
              <p className="text-xs leading-5 text-muted-foreground">
                仅补回被移除的默认物品，不会清除勾选进度，也不会删除自定义物品。
              </p>
              <Button
                className="mt-1 justify-self-start"
                variant="outline"
                onClick={restoreMissingItems}
              >
                补回缺失物品
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/25 bg-destructive/[0.025]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">危险区</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              重建会清除当前进度与自定义物品。执行前必须成功创建本机恢复点，否则操作会中止。
            </p>
            <Button
              className="justify-self-start"
              variant="destructive"
              onClick={() => {
                setMessage("");
                setMessageOk(undefined);
                setRebuildDialogOpen(true);
              }}
            >
              <ListRestart />
              重建通用清单
            </Button>
          </CardContent>
        </Card>

        {!rebuildDialogOpen ? (
          <Feedback message={message} ok={messageOk} />
        ) : null}

        <Dialog
          open={rebuildDialogOpen}
          onOpenChange={(open) => {
            setRebuildDialogOpen(open);
            if (!open) setRebuildConfirmation("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认重建清单</DialogTitle>
              <DialogDescription>
                当前勾选进度和自定义物品会被清除。系统会先保存本机恢复点，保存失败时不会继续。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="rebuild-checklist-confirmation">
                输入“重新开始”以继续
              </Label>
              <Input
                autoComplete="off"
                id="rebuild-checklist-confirmation"
                value={rebuildConfirmation}
                onChange={(event) => setRebuildConfirmation(event.target.value)}
              />
            </div>
            <Feedback message={message} ok={messageOk} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button
                disabled={rebuildConfirmation !== "重新开始"}
                variant="destructive"
                onClick={rebuildChecklist}
              >
                重建清单
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}

function Feedback({ message, ok }: { message: string; ok?: boolean }) {
  if (!message) return null;

  return (
    <p
      aria-live="polite"
      className={cn(
        "rounded-xl px-3 py-2 text-sm",
        ok === false
          ? "bg-destructive/10 text-destructive"
          : "bg-secondary text-primary",
      )}
      role={ok === false ? "alert" : "status"}
    >
      {message}
    </p>
  );
}
