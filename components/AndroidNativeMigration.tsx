"use client";

import { useEffect, useRef, useState } from "react";

const COMPLETE_EVENT = "dadkit:android-migration-complete";

type NativeDataMigrationBridge = {
  getNativeData(): string;
  getRecordedByMemberId(): string;
  markMigrationComplete(): void;
};

export function AndroidNativeMigration({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [migrating, setMigrating] = useState(false);
  const [failed, setFailed] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    function complete() {
      if (completedRef.current) return;
      completedRef.current = true;
      window.dispatchEvent(new Event(COMPLETE_EVENT));
      onCompleteRef.current?.();
    }

    const bridge = (
      window as Window & { DadKitAndroidMigration?: NativeDataMigrationBridge }
    ).DadKitAndroidMigration;
    const nativeData = bridge?.getNativeData().trim();

    if (!bridge || !nativeData) {
      complete();
      return;
    }

    setMigrating(true);
    void migrateNativeAndroidData(bridge, nativeData)
      .then((ok) => setFailed(!ok))
      .catch(() => setFailed(true))
      .finally(() => {
        setMigrating(false);
        complete();
      });
  }, []);

  if (migrating) {
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-background/95 px-6 text-center">
        <div>
          <p className="text-base font-semibold">正在升级 DadKit 数据</p>
          <p className="mt-2 text-sm text-muted-foreground">请稍候，不要关闭应用。</p>
        </div>
      </div>
    );
  }

  return failed ? (
    <div className="safe-bottom-toast fixed inset-x-3 z-[100] mx-auto max-w-md rounded-card border border-destructive/30 bg-card p-4 text-sm shadow-md">
      <p className="font-semibold">旧版 Android 数据暂未迁移</p>
      <p className="mt-1 text-muted-foreground">请保留应用并重新打开重试，原数据仍保存在设备中。</p>
    </div>
  ) : null;
}

async function migrateNativeAndroidData(
  bridge: NativeDataMigrationBridge,
  nativeData: string,
) {
  const [storage, merger, identity] = await Promise.all([
    import("@/lib/storage"),
    import("@/lib/sync/merge"),
    import("@/lib/device-identity/repository"),
  ]);
  const validation = storage.validateImportData(nativeData);

  if (!validation.ok || !validation.data) return false;

  const localData = await storage.buildLatestPortableData();
  const merged = merger.mergeExportData(localData, validation.data);
  const result = await storage.applyImportDataAsync(merged);

  if (!result.ok) return false;

  const memberId = bridge.getRecordedByMemberId().trim();
  if (memberId) {
    const currentIdentity = identity.loadDeviceIdentity();
    try {
      identity.saveDeviceIdentity({
        ...currentIdentity,
        currentMemberId: memberId,
        onboardingCompletedAt:
          currentIdentity.onboardingCompletedAt ?? Date.now(),
      });
    } catch {
      // A removed/invalid native member should not block the document migration.
    }
  }

  bridge.markMigrationComplete();
  return true;
}
