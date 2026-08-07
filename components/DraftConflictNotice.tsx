"use client";

import { Button } from "@/components/ui/button";

export function DraftConflictNotice({
  fields,
  onAcceptExternal,
  onKeepLocal,
}: {
  fields: string[];
  onAcceptExternal(): void;
  onKeepLocal(): void;
}) {
  if (fields.length === 0) return null;

  return (
    <section className="grid gap-3 rounded-xl bg-warning p-3 text-sm text-warning-foreground" role="alert">
      <p>
        其他页面也修改了{fields.length ? `“${fields.join("、")}”` : "当前内容"}。
        请选择要采用的版本后再保存。
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onAcceptExternal} size="sm" variant="outline">
          采用其他页面版本
        </Button>
        <Button onClick={onKeepLocal} size="sm">
          保留本页修改
        </Button>
      </div>
    </section>
  );
}
