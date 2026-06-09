"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, History, Info, RotateCcw, Trash2, Upload } from "lucide-react";

import { DisclaimerBox } from "@/components/DisclaimerBox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useDadKitStore } from "@/lib/store";
import {
  clearSnapshots,
  loadSnapshots,
  restoreSnapshot,
  type DadKitSnapshot,
} from "@/lib/storage";

export default function SettingsPage() {
  const clearAll = useDadKitStore((state) => state.clearAll);
  const exportJson = useDadKitStore((state) => state.exportJson);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const importJson = useDadKitStore((state) => state.importJson);
  const profile = useDadKitStore((state) => state.profile);
  const checklist = useDadKitStore((state) => state.checklist);
  const checklistMode = useDadKitStore((state) => state.checklistMode);
  const customItems = useDadKitStore((state) => state.customItems);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState<boolean | undefined>();
  const [snapshots, setSnapshots] = useState<DadKitSnapshot[]>([]);

  function refreshSnapshots() {
    setSnapshots(loadSnapshots());
  }

  useEffect(() => {
    refreshSnapshots();
  }, []);

  function clearData() {
    if (!window.confirm("确认清空本地数据？此操作只会影响当前浏览器。")) {
      return;
    }

    clearAll();
    refreshSnapshots();
    setMessage("本地数据已清空。");
    setMessageOk(true);
  }

  function importData() {
    const result = importJson(importText);

    refreshSnapshots();
    setMessage(result.message);
    setMessageOk(result.ok);

    if (result.ok) {
      setImportText("");
    }
  }

  function restoreLocalSnapshot(id: string) {
    if (!window.confirm("恢复此备份会替换当前资料和清单。是否继续？")) {
      return;
    }

    const result = restoreSnapshot(id);

    if (result.ok) {
      hydrate();
    }

    refreshSnapshots();
    setMessage(result.message);
    setMessageOk(result.ok);
  }

  function deleteAllSnapshots() {
    if (!window.confirm("确认删除全部本地备份？")) {
      return;
    }

    clearSnapshots();
    refreshSnapshots();
    setMessage("本地备份已删除。");
    setMessageOk(true);
  }

  return (
    <div className="page-shell">
      <div className="mobile-shell grid gap-2 lg:max-w-none">
        <h1 className="text-3xl font-semibold tracking-normal">本地数据</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          数据只在当前浏览器。导入会先校验 JSON，失败时不会修改本地数据。
        </p>
      </div>

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            本地存储状态
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-4">
          <StatusTile label="个人资料" value={profile ? "已创建" : "未创建"} />
          <StatusTile label="清单项目" value={`${checklist.length} 项`} />
          <StatusTile
            label="清单模式"
            value={checklistMode === "lean" ? "精简" : "完整"}
          />
          <StatusTile label="自定义项" value={`${customItems.length} 项`} />
        </CardContent>
      </Card>

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" />
            最近备份
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {snapshots.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              暂无本地备份。DadKit 会在导入、重置、清空或创建新清单前自动保存最近备份。
            </p>
          ) : (
            <>
              <div className="grid gap-2">
                {snapshots.map((snapshot) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
                    key={snapshot.id}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {formatSnapshotTime(snapshot.createdAt)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {snapshot.reason}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreLocalSnapshot(snapshot.id)}
                    >
                      恢复
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                className="justify-self-start"
                variant="outline"
                onClick={deleteAllSnapshots}
              >
                <Trash2 className="size-4" />
                删除全部快照
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle>常用设置</CardTitle>
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

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-4 text-primary" />
            JSON 备份
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
            <Button onClick={importData}>
              <Upload className="size-4" />
              校验并导入
            </Button>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(exportJson())}
            >
              <Copy className="size-4" />
              复制当前 JSON
            </Button>
          </div>
          {message ? (
            <p
              className={`rounded-xl px-3 py-2 text-sm ${
                messageOk === false
                  ? "bg-coral-soft text-coral-foreground"
                  : "bg-secondary text-primary"
              }`}
            >
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mobile-shell rounded-2xl lg:max-w-none">
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

function formatSnapshotTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", { hour12: false });
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
