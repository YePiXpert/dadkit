"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Database,
  Download,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { DangerZone } from "@/components/DangerZone";
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
import { Feedback } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getReviewPageHref,
  PUBLIC_PRIVACY_PATH,
  PUBLIC_SUPPORT_PATH,
} from "@/lib/app-routes";
import {
  clearSnapshotsAsync,
  buildLatestPortableData,
  importDataAsync,
  loadSnapshotsAsync,
  restoreSnapshotAsync,
  type DadKitSnapshot,
} from "@/lib/storage";
import { useDadKitStore } from "@/lib/store";
import {
  leaveSpace,
  refreshSyncStatus,
  useSyncStatusStore,
} from "@/lib/sync/client";

const FamilySyncCard = dynamic(
  () =>
    import("@/components/FamilySyncCard").then(
      (module) => module.FamilySyncCard,
    ),
);
const ConfirmDialog = dynamic(
  () =>
    import("@/components/ConfirmDialog").then(
      (module) => module.ConfirmDialog,
    ),
);
const PhotoBackupCard = dynamic(
  () =>
    import("@/components/PhotoBackupCard").then(
      (module) => module.PhotoBackupCard,
    ),
  { ssr: false },
);

type BackupConfirmation =
  | { type: "restoreSnapshot"; snapshotId: string }
  | { type: "restoreJson" }
  | { type: "deleteSnapshots" };

export default function BackupSettingsPage() {
  const clearAll = useDadKitStore((state) => state.clearAll);
  const hydrate = useDadKitStore((state) => state.hydrate);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  const [snapshotMessageOk, setSnapshotMessageOk] = useState<boolean>();
  const [clearMessage, setClearMessage] = useState("");
  const [clearMessageOk, setClearMessageOk] = useState<boolean>();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState("");
  const [snapshots, setSnapshots] = useState<DadKitSnapshot[]>([]);
  const [photoPackageBusy, setPhotoPackageBusy] = useState(false);
  const [photoPackageMessage, setPhotoPackageMessage] = useState("");
  const [photoPackageMessageOk, setPhotoPackageMessageOk] = useState<boolean>();
  const [confirmation, setConfirmation] = useState<BackupConfirmation>();
  const photoPackageInputRef = useRef<HTMLInputElement>(null);
  const jsonBackupInputRef = useRef<HTMLInputElement>(null);
  const [jsonBackupBusy, setJsonBackupBusy] = useState(false);
  const [jsonBackupMessage, setJsonBackupMessage] = useState("");
  const [jsonBackupMessageOk, setJsonBackupMessageOk] = useState<boolean>();
  const [pendingJsonBackup, setPendingJsonBackup] = useState<string>();
  const syncJoined = useSyncStatusStore((state) => state.joined);
  const recentSnapshots = snapshots.slice(0, 2);

  async function refreshSnapshots() {
    try {
      setSnapshots(await loadSnapshotsAsync());
    } catch {
      setSnapshots([]);
    }
  }

  useEffect(() => {
    hydrate();
    void refreshSnapshots();
    refreshSyncStatus();
  }, [hydrate]);

  async function restoreLocalSnapshot(id: string) {
    const result = await restoreSnapshotAsync(id);

    await refreshSnapshots();
    setSnapshotMessage(result.message);
    setSnapshotMessageOk(result.ok);
  }

  async function deleteAllSnapshots() {
    await clearSnapshotsAsync();
    await refreshSnapshots();
    setSnapshotMessage("本机恢复点已删除。");
    setSnapshotMessageOk(true);
  }

  async function clearData() {
    if (clearConfirmation !== "清空全部数据") {
      return;
    }

    await leaveSpace();

    try {
      await clearAll();
    } catch (error) {
      await refreshSnapshots();
      setClearMessage(
        error instanceof Error && error.message
          ? error.message
          : "无法创建恢复点，本地数据未清空。",
      );
      setClearMessageOk(false);
      return;
    }

    setClearDialogOpen(false);
    setClearConfirmation("");
    await refreshSnapshots();
    setClearMessage("本机数据已清空，并生成一份全新的通用清单。");
    setClearMessageOk(true);
  }

  async function exportPhotoPackage() {
    setPhotoPackageBusy(true);
    setPhotoPackageMessage("");

    try {
      const { exportItemPhotos } = await import("@/lib/item-photos");
      const backup = await exportItemPhotos();
      downloadJsonFile(
        backup,
        `dadkit-photos-${backup.exportedAt.slice(0, 10)}.json`,
      );
      setPhotoPackageMessage(
        backup.photos.length > 0
          ? `已导出 ${backup.photos.length} 张物品照片。`
          : "当前没有可导出的物品照片，已下载空照片备份包。",
      );
      setPhotoPackageMessageOk(true);
    } catch (error) {
      setPhotoPackageMessage(
        error instanceof Error && error.message
          ? error.message
          : "导出照片备份包失败，请稍后重试。",
      );
      setPhotoPackageMessageOk(false);
    } finally {
      setPhotoPackageBusy(false);
    }
  }

  async function exportJsonBackup() {
    setJsonBackupBusy(true);
    setJsonBackupMessage("");
    try {
      const data = await buildLatestPortableData();
      downloadJsonFile(data, `dadkit-backup-${data.exportedAt.slice(0, 10)}.json`);
      setJsonBackupMessage("完整 JSON 备份已导出，包含宝宝资料、照护事件和删除墓碑。");
      setJsonBackupMessageOk(true);
    } catch (error) {
      setJsonBackupMessage(error instanceof Error && error.message ? error.message : "JSON 备份导出失败，请稍后重试。");
      setJsonBackupMessageOk(false);
    } finally {
      setJsonBackupBusy(false);
    }
  }

  async function chooseJsonBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > 32 * 1024 * 1024) {
      setJsonBackupMessage("JSON 备份不能超过 32 MiB。");
      setJsonBackupMessageOk(false);
      return;
    }
    try {
      setPendingJsonBackup(await file.text());
      setConfirmation({ type: "restoreJson" });
    } catch {
      setJsonBackupMessage("无法读取 JSON 备份文件。");
      setJsonBackupMessageOk(false);
    }
  }

  async function restoreJsonBackup() {
    if (!pendingJsonBackup) return;
    setJsonBackupBusy(true);
    const result = await importDataAsync(pendingJsonBackup);
    setPendingJsonBackup(undefined);
    setJsonBackupBusy(false);
    await refreshSnapshots();
    setJsonBackupMessage(result.message);
    setJsonBackupMessageOk(result.ok);
  }

  async function importPhotoPackage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    input.value = "";

    if (!file) {
      return;
    }

    setPhotoPackageBusy(true);
    setPhotoPackageMessage("");

    try {
      const payload: unknown = JSON.parse(await file.text());
      const { importItemPhotoBackup } = await import("@/lib/item-photos");
      const imported = await importItemPhotoBackup(payload);

      setPhotoPackageMessage(
        imported > 0 ? `已导入 ${imported} 张物品照片。` : "照片备份包中没有照片。",
      );
      setPhotoPackageMessageOk(true);
    } catch (error) {
      setPhotoPackageMessage(
        error instanceof Error && error.message
          ? error.message
          : "导入照片备份包失败，请确认文件完整后重试。",
      );
      setPhotoPackageMessageOk(false);
    } finally {
      setPhotoPackageBusy(false);
    }
  }

  return (
    <div className="page-shell">
      <section className="mobile-shell grid gap-5 sm:max-w-[42rem]">
        <PageHeader
          backHref="/settings"
          backLabel="返回我的"
          title="备份与恢复"
        />

        <section className="hero-card p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
              <ShieldCheck className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold tracking-tight">本机优先保存</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                清单默认只保存在这个浏览器，换设备前请主动备份。
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-inset bg-card/75 px-4 py-3 shadow-sm">
              <p className="text-[13px] text-muted-foreground">家庭同步</p>
              <p className="mt-1 text-lg font-bold">
                {syncJoined ? "已连接" : "未连接"}
              </p>
            </div>
            <div className="rounded-inset bg-card/75 px-4 py-3 shadow-sm">
              <p className="text-[13px] text-muted-foreground">本机恢复点</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{snapshots.length} 份</p>
            </div>
          </div>
        </section>

        <FamilySyncCard />

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-inset bg-secondary text-primary">
                <Database className="size-4" />
              </span>
              <span className="text-base">本机恢复点</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm leading-6 text-muted-foreground">
              恢复、清空或重建前自动保存完整便携数据，包含宝宝资料与照护记录，最多保留 2 份。恢复点保存在 IndexedDB，不含照片。
            </p>
            {recentSnapshots.length === 0 ? (
              <p className="rounded-inset bg-muted px-4 py-4 text-sm text-muted-foreground">
                暂无恢复点。
              </p>
            ) : (
              <div className="grid gap-2">
                {recentSnapshots.map((snapshot) => (
                  <SnapshotRow
                    key={snapshot.id}
                    snapshot={snapshot}
                    onRestore={(snapshotId) =>
                      setConfirmation({
                        type: "restoreSnapshot",
                        snapshotId,
                      })
                    }
                  />
                ))}
              </div>
            )}
            {snapshots.length > 0 ? (
              <Button className="justify-self-start" size="sm" variant="ghost" onClick={() => setConfirmation({ type: "deleteSnapshots" })}>
                <Trash2 />
                删除全部恢复点
              </Button>
            ) : null}
            <Feedback message={snapshotMessage} ok={snapshotMessageOk} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-10 items-center justify-center rounded-inset bg-secondary text-primary"><Database className="size-4" /></span>
              <span className="text-base">完整 JSON 备份</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm leading-6 text-muted-foreground">导出完整 JSON 可携带清单、宝宝资料、全部照护事件、活动计时和删除墓碑。导入属于完整恢复；不含宝宝数据的旧备份会安全清空本机宝宝记录。</p>
            <input ref={jsonBackupInputRef} accept="application/json,.json" aria-label="选择 JSON 备份文件" className="sr-only" type="file" onChange={chooseJsonBackup} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={jsonBackupBusy} onClick={() => void exportJsonBackup()}><Download />导出 JSON 备份</Button>
              <Button disabled={jsonBackupBusy} onClick={() => jsonBackupInputRef.current?.click()} variant="outline"><Upload />导入 JSON 备份</Button>
            </div>
            <Feedback message={jsonBackupMessage} ok={jsonBackupMessageOk} />
          </CardContent>
        </Card>

        <PhotoBackupCard
          busy={photoPackageBusy}
          inputRef={photoPackageInputRef}
          message={photoPackageMessage}
          messageOk={photoPackageMessageOk}
          onExport={exportPhotoPackage}
          onImport={importPhotoPackage}
        />

        <DangerZone title="清空并重新开始" description="清单、宝宝记录、本机恢复点、家庭同步登录状态和本机物品照片都会清除。请先导出 JSON 备份；本操作完成后无法从本机恢复点找回。">
          <Button
            className="justify-self-start"
            variant="destructive"
            onClick={() => {
              setClearMessage("");
              setClearMessageOk(undefined);
              setClearDialogOpen(true);
            }}
          >
            <RotateCcw />
            清空并生成新清单
          </Button>
          {!clearDialogOpen ? (
            <Feedback message={clearMessage} ok={clearMessageOk} />
          ) : null}
        </DangerZone>

        <Dialog
          open={clearDialogOpen}
          onOpenChange={(open) => {
            setClearDialogOpen(open);
            if (!open) setClearConfirmation("");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认清空本机数据</DialogTitle>
              <DialogDescription>
                系统会先验证完整恢复点能够成功写入；随后清单、宝宝记录、全部本机恢复点和本机物品照片都会清除，已连接的家庭同步会退出。请先导出外部备份。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="clear-data-confirmation">
                输入“清空全部数据”以继续
              </Label>
              <Input
                autoComplete="off"
                id="clear-data-confirmation"
                value={clearConfirmation}
                onChange={(event) => setClearConfirmation(event.target.value)}
              />
            </div>
            <Feedback message={clearMessage} ok={clearMessageOk} />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button
                disabled={clearConfirmation !== "清空全部数据"}
                variant="destructive"
                onClick={clearData}
              >
                清空本机数据
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {confirmation ? (
          <ConfirmDialog
            confirmLabel={
              confirmation.type === "restoreSnapshot"
                ? "恢复恢复点"
                : confirmation.type === "restoreJson"
                  ? "导入 JSON 备份"
                  : "删除全部恢复点"
            }
            description={
              confirmation.type === "restoreSnapshot"
                ? "恢复此恢复点会完整替换当前便携数据，包括宝宝资料与照护记录。"
                : confirmation.type === "restoreJson"
                  ? "JSON 导入属于完整恢复。系统会先创建恢复点；不含宝宝数据的旧备份会安全清空宝宝资料和照护记录。"
                  : "全部本机恢复点将被永久删除。"
            }
            onConfirm={() => {
              if (confirmation.type === "restoreSnapshot") {
                void restoreLocalSnapshot(confirmation.snapshotId);
              } else if (confirmation.type === "restoreJson") {
                void restoreJsonBackup();
              } else {
                void deleteAllSnapshots();
              }
            }}
            onOpenChange={(open) => {
              if (!open) setConfirmation(undefined);
            }}
            open
            title={
              confirmation.type === "restoreSnapshot"
                ? "确认恢复本机恢复点？"
                : confirmation.type === "restoreJson"
                  ? "确认导入 JSON 备份？"
                  : "确认删除全部恢复点？"
            }
            variant={confirmation.type === "deleteSnapshots" ? "destructive" : "default"}
          />
        ) : null}

        <footer className="grid gap-2 px-3 pb-4 pt-1 text-center text-[13px] leading-5 text-muted-foreground">
          <p>数据默认保存在当前浏览器。</p>
          <p className="flex items-center justify-center gap-3">
            <Link className="inline-flex min-h-11 items-center px-1 text-primary hover:underline" href={getReviewPageHref(PUBLIC_PRIVACY_PATH)}>
              隐私说明
            </Link>
            <span aria-hidden="true">·</span>
            <Link className="inline-flex min-h-11 items-center px-1 text-primary hover:underline" href={getReviewPageHref(PUBLIC_SUPPORT_PATH)}>
              支持与反馈
            </Link>
          </p>
        </footer>
      </section>
    </div>
  );
}

function SnapshotRow({
  snapshot,
  onRestore,
}: {
  snapshot: DadKitSnapshot;
  onRestore: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-inset bg-muted/40 p-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{formatSnapshotTime(snapshot.createdAt)}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{snapshot.reason}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => onRestore(snapshot.id)}>
        恢复
      </Button>
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

function downloadJsonFile(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.download = filename;
  anchor.href = url;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

