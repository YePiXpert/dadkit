"use client";

import { useEffect, useState } from "react";

import {
  CHECKLIST_PERSISTENCE_EVENT,
  dismissStorageWarning,
  getChecklistPersistenceStatus,
  retryPendingChecklistStateSave,
  type ChecklistPersistenceStatus,
} from "@/lib/persistence-status";

export function PersistenceWarning() {
  const [status, setStatus] = useState<ChecklistPersistenceStatus>();

  useEffect(() => {
    const refresh = () => setStatus(getChecklistPersistenceStatus());

    refresh();
    window.addEventListener(CHECKLIST_PERSISTENCE_EVENT, refresh);
    window.addEventListener("online", refresh);

    return () => {
      window.removeEventListener(CHECKLIST_PERSISTENCE_EVENT, refresh);
      window.removeEventListener("online", refresh);
    };
  }, []);

  const message = status?.lastError ?? status?.storageWarning;

  if (!message) {
    return null;
  }

  return (
    <aside
      className="fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-card p-3 text-xs shadow-md ring-1 ring-destructive/30"
      role="alert"
    >
      <span>{status?.lastError ? "修改仍保留在当前页面，但尚未写入本机存储。" : message}</span>
      <button
        className="min-h-10 shrink-0 rounded-full bg-primary px-3 font-semibold text-primary-foreground"
        type="button"
        onClick={() => {
          if (status?.lastError) {
            retryPendingChecklistStateSave();
          } else {
            dismissStorageWarning();
          }
          setStatus(getChecklistPersistenceStatus());
        }}
      >
        {status?.lastError ? "重试" : "知道了"}
      </button>
    </aside>
  );
}
