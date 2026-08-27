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
          <span className="flex size-10 items-center justify-center rounded-inset bg-secondary text-primary">
            <Download className="size-4" />
          </span>
          <span className="text-base">照片备份包</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm leading-6 text-muted-foreground">
          物品照片功能已在新版下线。此前拍摄的照片仍保存在本机照片库，可导出照片包留档，或导入到仍在使用旧版本的设备。
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
