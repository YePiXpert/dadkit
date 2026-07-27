"use client";

import { useEffect, useState } from "react";

import {
  CHECKLIST_PERSISTENCE_EVENT,
  getChecklistPersistenceStatus,
  retryPendingChecklistStateSave,
  type ChecklistPersistenceStatus,
} from "@/lib/data/local-repository";

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

  if (!status?.lastError) {
    return null;
  }

  return (
    <aside
      className="fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-[430px] items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-card p-3 text-xs shadow-md"
      role="alert"
    >
      <span>修改仍保留在当前页面，但尚未写入本机存储。</span>
      <button
        className="min-h-10 shrink-0 rounded-full bg-primary px-3 font-semibold text-primary-foreground"
        type="button"
        onClick={() => {
          retryPendingChecklistStateSave();
          setStatus(getChecklistPersistenceStatus());
        }}
      >
        重试
      </button>
    </aside>
  );
}
