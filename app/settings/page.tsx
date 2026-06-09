"use client";

import Link from "next/link";
import { useState } from "react";
import { Info, RotateCcw, Upload } from "lucide-react";

import { DisclaimerBox } from "@/components/DisclaimerBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useDadKitStore } from "@/lib/store";

export default function SettingsPage() {
  const clearAll = useDadKitStore((state) => state.clearAll);
  const exportJson = useDadKitStore((state) => state.exportJson);
  const importJson = useDadKitStore((state) => state.importJson);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");

  function clearData() {
    if (!window.confirm("确认清空本地数据？此操作只会影响当前浏览器。")) {
      return;
    }

    clearAll();
    setMessage("本地数据已清空。");
  }

  function importData() {
    try {
      importJson(importText);
      setMessage("JSON 已导入。");
      setImportText("");
    } catch {
      setMessage("JSON 格式无法导入，请检查内容。");
    }
  }

  return (
    <div className="page-shell">
      <Card>
        <CardHeader>
          <CardTitle>设置</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline">
            <Link href="/setup">修改个人资料</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/hospital">修改地区/医院</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/hospital">编辑医院信息</Link>
          </Button>
          <Button variant="outline" onClick={clearData}>
            <RotateCcw className="size-4" />
            清空本地数据
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-4 text-primary" />
            JSON 导入 / 导出
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Textarea
            className="min-h-[180px] font-mono text-sm"
            placeholder="粘贴 DadKit JSON 备份"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={importData}>导入 JSON</Button>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(exportJson())}
            >
              复制当前 JSON
            </Button>
          </div>
          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            关于 DadKit
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm leading-6 text-muted-foreground">
          <p>
            DadKit 是一个开源待产准备清单工具，第一版不需要登录，数据保存在本地浏览器，不上传用户隐私数据。
          </p>
          <p>
            医院模板用于帮助整理待确认事项。未核验模板不会作为官方入院要求，也不会写死医院一定提供某些物品。
          </p>
        </CardContent>
      </Card>

      <DisclaimerBox />
    </div>
  );
}
