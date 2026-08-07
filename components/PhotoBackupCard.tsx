"use client";

import type { ChangeEvent, RefObject } from "react";
import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";

export function PhotoBackupCard({
  busy,
  inputRef,
  message,
  messageOk,
  onExport,
  onImport,
}: {
  busy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  message: string;
  messageOk?: boolean;
  onExport: () => void;
  onImport: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Download className="size-4" />
          </span>
          <span className="text-base">照片备份包</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          物品照片保存在设备的本地照片库，不会混入普通恢复点或 WebDAV 备份。换设备前可导出独立照片备份包，并在新设备导入。
        </p>
        <input
          ref={inputRef}
          accept="application/json,.json"
          aria-label="导入照片备份包"
          className="sr-only"
          type="file"
          onChange={onImport}
        />
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={onExport}>
            <Download />
            导出照片包
          </Button>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            导入照片包
          </Button>
        </div>
        <Feedback message={message} ok={messageOk} />
      </CardContent>
    </Card>
  );
}
