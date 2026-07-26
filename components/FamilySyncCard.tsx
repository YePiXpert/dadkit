"use client";

import { useState, type ReactNode } from "react";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  joinSpace,
  leaveSpace,
  syncNow,
  useSyncStatusStore,
} from "@/lib/sync/client";

export function FamilySyncCard() {
  const syncStatus = useSyncStatusStore();
  const [syncName, setSyncName] = useState("");
  const [syncCode, setSyncCode] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [syncMessageOk, setSyncMessageOk] = useState<boolean>();
  const [syncBusy, setSyncBusy] = useState(false);

  async function startFamilySync() {
    const name = syncName.trim();
    const code = syncCode.trim();

    if (name.length < 2 || name.length > 32) {
      setSyncMessage("空间名需要 2 到 32 个字符。");
      setSyncMessageOk(false);
      return;
    }

    if (code.length < 6 || code.length > 64) {
      setSyncMessage("同步码需要 6 到 64 个字符。");
      setSyncMessageOk(false);
      return;
    }

    setSyncBusy(true);
    setSyncMessage("");
    const outcome = await joinSpace(name, code);
    setSyncBusy(false);

    setSyncMessage(
      outcome.ok
        ? "已加入家庭同步，之后两台设备会自动保持一致。"
        : (outcome.message ?? "加入家庭同步失败。"),
    );
    setSyncMessageOk(outcome.ok);

    if (outcome.ok) {
      setSyncCode("");
    }
  }

  async function runFamilySyncNow() {
    setSyncBusy(true);
    const outcome = await syncNow();
    setSyncBusy(false);
    setSyncMessage(
      outcome.ok
        ? "同步完成。"
        : (outcome.message ?? "同步失败，请稍后再试。"),
    );
    setSyncMessageOk(outcome.ok);
  }

  async function stopFamilySync() {
    if (
      !window.confirm(
        "退出后这台设备不再自动同步；本机和服务器上的数据都会保留。确定退出家庭同步？",
      )
    ) {
      return;
    }

    setSyncBusy(true);
    await leaveSpace();
    setSyncBusy(false);
    setSyncMessage("已退出家庭同步。");
    setSyncMessageOk(true);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Users className="size-4" />
          </span>
          <span className="text-base">家庭同步</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {syncStatus.joined ? (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              已连接。这台设备的勾选、新增和删除会在几秒内同步给另一台设备；数据只保存在你们自己的服务器上。
            </p>
            <div className="grid gap-1 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
              <span>
                上次同步：
                {syncStatus.syncing
                  ? "同步中…"
                  : formatOptionalTime(syncStatus.lastSyncAt)}
              </span>
              {syncStatus.lastError ? (
                <span className="text-destructive">{syncStatus.lastError}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={syncBusy} variant="outline" onClick={runFamilySyncNow}>
                立即同步
              </Button>
              <Button disabled={syncBusy} variant="ghost" onClick={stopFamilySync}>
                退出同步
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              两台设备输入同一个空间名和同步码，就能共用同一份清单与成长记：谁勾选了物品，另一台几秒内就能看到。数据只保存在你们自己的服务器上。
            </p>
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/35 p-3 sm:grid-cols-2">
              <Field label="空间名" htmlFor="sync-name">
                <Input
                  autoComplete="off"
                  id="sync-name"
                  placeholder="例如：我们的小家"
                  value={syncName}
                  onChange={(event) => setSyncName(event.target.value)}
                />
              </Field>
              <Field label="同步码" htmlFor="sync-code">
                <Input
                  autoComplete="new-password"
                  id="sync-code"
                  placeholder="6 位以上，只有你们知道的暗号"
                  type="password"
                  value={syncCode}
                  onChange={(event) => setSyncCode(event.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              第一次输入会创建空间；另一台设备输入相同的空间名和同步码即可加入。同步码请妥善保管，泄露后他人可读写你们的数据。
            </p>
            <Button
              className="justify-self-start"
              disabled={syncBusy}
              onClick={startFamilySync}
            >
              {syncBusy ? "正在加入…" : "开始使用同步"}
            </Button>
          </>
        )}
        <Feedback message={syncMessage} ok={syncMessageOk} />
      </CardContent>
    </Card>
  );
}

function Field({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function formatOptionalTime(value?: string) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("zh-CN", { hour12: false });
}
