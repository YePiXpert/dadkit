"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Copy, Download, ShieldCheck, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Feedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTransferArchive,
  generateTransferPassword,
  importTransferArchive,
} from "@/lib/migration/transfer";

export function MigrationTransferCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [archive, setArchive] = useState<File>();
  const [busy, setBusy] = useState<"export" | "import">();
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState<boolean>();

  function generatePassword() {
    const next = generateTransferPassword();

    setPassword(next);
    setMessage("已生成一次性密码。请先保存到密码管理器，再导出迁移包。");
    setMessageOk(true);
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setMessage("一次性密码已复制。");
      setMessageOk(true);
    } catch {
      setMessage("无法自动复制，请手动保存一次性密码。");
      setMessageOk(false);
    }
  }

  async function exportArchive() {
    setBusy("export");
    setMessage("");

    try {
      const blob = await createTransferArchive(password);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `DadKit-${date}.dadkit-transfer`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setMessage(
        "迁移包已导出。确认新设备导入成功后，请删除迁移文件和一次性密码。",
      );
      setMessageOk(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "迁移包导出失败。",
      );
      setMessageOk(false);
    } finally {
      setBusy(undefined);
    }
  }

  function chooseArchive(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];

    setArchive(file);
    setMessage("");
  }

  async function importArchive() {
    if (!archive) {
      setMessage("请先选择 .dadkit-transfer 文件。");
      setMessageOk(false);
      return;
    }

    setBusy("import");
    setMessage("");

    const result = await importTransferArchive(archive, password);

    setMessage(
      result.ok
        ? `${result.message} 已恢复 ${result.photoCount ?? 0} 张照片，页面即将刷新。`
        : result.message,
    );
    setMessageOk(result.ok);
    setBusy(undefined);

    if (result.ok) {
      setTimeout(() => window.location.reload(), 1_200);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" />
          加密设备迁移
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="transfer-password">一次性密码（12–128 个字符）</Label>
          <div className="flex gap-2">
            <Input
              autoComplete="new-password"
              id="transfer-password"
              maxLength={128}
              minLength={12}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button type="button" variant="outline" onClick={generatePassword}>
              生成
            </Button>
            <Button
              aria-label="复制一次性密码"
              disabled={!password}
              size="icon"
              type="button"
              variant="outline"
              onClick={() => void copyPassword()}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>

        <section className="grid gap-3 rounded-2xl border border-border/70 p-4">
          <div>
            <p className="text-sm font-semibold">从当前设备导出</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              先完成导出并保存密码，再卸载旧 APK 或删除旧 PWA。
            </p>
          </div>
          <Button
            disabled={busy !== undefined || password.length < 12}
            type="button"
            onClick={() => void exportArchive()}
          >
            <Download className="size-4" />
            {busy === "export" ? "正在加密…" : "导出加密迁移包"}
          </Button>
        </section>

        <section className="grid gap-3 rounded-2xl border border-border/70 p-4">
          <div>
            <p className="text-sm font-semibold">导入到此设备</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              导入会替换此设备的数据；照片先进入 staging，全部校验通过后才提交。
            </p>
          </div>
          <input
            ref={fileInputRef}
            accept=".dadkit-transfer,application/vnd.dadkit.transfer+json"
            className="sr-only"
            type="file"
            onChange={chooseArchive}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            选择迁移包
          </Button>
          {archive ? (
            <p className="break-all text-xs text-muted-foreground">
              {archive.name} · {(archive.size / 1024 / 1024).toFixed(1)} MiB
            </p>
          ) : null}
          <Button
            disabled={
              busy !== undefined || password.length < 12 || !archive
            }
            type="button"
            onClick={() => void importArchive()}
          >
            <Upload className="size-4" />
            {busy === "import" ? "正在校验并导入…" : "导入并替换本机数据"}
          </Button>
        </section>

        <p className="text-xs leading-5 text-muted-foreground">
          迁移包不包含 WebDAV 密码、家庭同步 token、缓存或站点来源。导入后请重新输入
          WebDAV 密码并重新加入原家庭同步空间。
        </p>
        {message ? <Feedback message={message} ok={messageOk} /> : null}
      </CardContent>
    </Card>
  );
}
