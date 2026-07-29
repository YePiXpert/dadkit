"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadSyncSession } from "@/lib/data/settings-repository";
import {
  createInvite,
  createSpace,
  joinSpace,
  leaveSpace,
  syncNow,
  type SyncInvite,
  useSyncStatusStore,
} from "@/lib/sync/client";

export function FamilySyncCard() {
  const syncStatus = useSyncStatusStore();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [syncName, setSyncName] = useState("");
  const [syncCode, setSyncCode] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invite, setInvite] = useState<SyncInvite>();
  const [copied, setCopied] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncMessageOk, setSyncMessageOk] = useState<boolean>();
  const [syncBusy, setSyncBusy] = useState(false);

  useEffect(() => {
    setInviteName(loadSyncSession()?.spaceName ?? "");
  }, [syncStatus.joined]);

  function validateName(name: string) {
    if (name.length < 2 || name.length > 32) {
      setSyncMessage("家庭名称需要 2 到 32 个字符。");
      setSyncMessageOk(false);
      return false;
    }

    return true;
  }

  async function createFamily() {
    const name = syncName.trim();

    if (!validateName(name)) {
      return;
    }

    setSyncBusy(true);
    setSyncMessage("");
    const outcome = await createSpace(name);
    setSyncBusy(false);

    if (outcome.ok && outcome.invite) {
      setInviteName(name);
      setInvite(outcome.invite);
      setSyncMessage("家庭已创建。把下面的一次性口令发给另一台设备即可。");
      setSyncMessageOk(true);
      return;
    }

    setSyncMessage(outcome.message ?? "创建家庭同步失败。");
    setSyncMessageOk(false);
  }

  async function joinFamily() {
    const name = syncName.trim();
    const code = syncCode.trim();

    if (!validateName(name)) {
      return;
    }

    if (code.length < 6 || code.length > 64) {
      setSyncMessage("请输入 8 位加入口令；现有家庭也可以继续输入旧同步码。");
      setSyncMessageOk(false);
      return;
    }

    setSyncBusy(true);
    setSyncMessage("");
    const outcome = await joinSpace(name, code);
    setSyncBusy(false);

    setSyncMessage(
      outcome.ok
        ? "已加入家庭同步，之后各台设备会自动保持一致。"
        : (outcome.message ?? "加入家庭同步失败。"),
    );
    setSyncMessageOk(outcome.ok);

    if (outcome.ok) {
      setSyncCode("");
    }
  }

  async function generateInvite() {
    const name = inviteName.trim();

    if (!validateName(name)) {
      return;
    }

    setSyncBusy(true);
    setSyncMessage("");
    const outcome = await createInvite(name);
    setSyncBusy(false);

    if (outcome.ok && outcome.invite) {
      setInvite(outcome.invite);
      setCopied(false);
      setSyncMessage("新的加入口令已生成。");
      setSyncMessageOk(true);
      return;
    }

    setSyncMessage(outcome.message ?? "生成加入口令失败。");
    setSyncMessageOk(false);
  }

  async function copyInvite() {
    if (!invite) {
      return;
    }

    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setSyncMessage(`请手动复制口令：${invite.code}`);
      setSyncMessageOk(false);
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
    setInvite(undefined);
    setInviteName("");
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
              已连接。这台设备的勾选、新增和删除会在几秒内同步给其他设备。
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
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/35 p-3">
              <Field label="家庭名称" htmlFor="sync-invite-name">
                <Input
                  autoComplete="off"
                  id="sync-invite-name"
                  placeholder="创建或加入时使用的家庭名称"
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                />
              </Field>
              <Button
                className="justify-self-start"
                disabled={syncBusy}
                variant="outline"
                onClick={generateInvite}
              >
                {syncBusy ? "正在生成…" : "生成 8 位加入口令"}
              </Button>
              {invite ? (
                <div className="grid gap-2 rounded-2xl bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <strong
                      className="font-mono text-2xl tracking-[0.16em]"
                      id="sync-invite-code"
                    >
                      {invite.code}
                    </strong>
                    <Button
                      aria-label="复制加入口令"
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={copyInvite}
                    >
                      {copied ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    10 分钟内有效，仅能成功加入一次，到期或生成新口令后自动失效。
                  </p>
                </div>
              ) : null}
              <p className="text-xs leading-5 text-muted-foreground">
                已加入的设备不会受影响。现有家庭第一次使用新口令成功加入后，旧同步码将停止接纳新设备。
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-muted-foreground">
              创建家庭后会自动生成 8 位一次性口令。另一台设备输入相同的家庭名称和口令，即可共用清单与成长记。
            </p>
            <div className="flex gap-2">
              <Button
                aria-pressed={mode === "create"}
                size="sm"
                variant={mode === "create" ? "default" : "outline"}
                onClick={() => setMode("create")}
              >
                创建家庭
              </Button>
              <Button
                aria-pressed={mode === "join"}
                size="sm"
                variant={mode === "join" ? "default" : "outline"}
                onClick={() => setMode("join")}
              >
                加入家庭
              </Button>
            </div>
            <div className="grid gap-3 rounded-2xl border border-border bg-muted/35 p-3">
              <Field label="家庭名称" htmlFor="sync-name">
                <Input
                  autoComplete="off"
                  id="sync-name"
                  placeholder="例如：我们的小家"
                  value={syncName}
                  onChange={(event) => setSyncName(event.target.value)}
                />
              </Field>
              {mode === "join" ? (
                <Field label="加入口令或旧同步码" htmlFor="sync-code">
                  <Input
                    autoCapitalize="characters"
                    autoComplete="off"
                    id="sync-code"
                    maxLength={64}
                    placeholder="例如：7K9M-3XQF"
                    value={syncCode}
                    onChange={(event) => setSyncCode(event.target.value)}
                  />
                </Field>
              ) : null}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {mode === "create"
                ? "口令不含容易混淆的 0、O、1、I，10 分钟有效，并且只能成功加入一次。"
                : "新家庭使用 8 位口令；现有家庭仍可在这里输入原同步码。连续尝试错误会被暂时限流。"}
            </p>
            <Button
              className="justify-self-start"
              disabled={syncBusy}
              onClick={mode === "create" ? createFamily : joinFamily}
            >
              {syncBusy
                ? mode === "create"
                  ? "正在创建…"
                  : "正在加入…"
                : mode === "create"
                  ? "创建并生成口令"
                  : "加入家庭同步"}
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
