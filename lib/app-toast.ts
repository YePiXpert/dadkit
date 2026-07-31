"use client";

export type AppToast = {
  actionLabel?: string;
  duration?: number;
  id: string;
  message: string;
  onAction?: () => void;
  tone?: "default" | "success" | "warning";
};

type AppToastInput = Omit<AppToast, "id">;

let currentToast: AppToast | undefined;
let sequence = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function showAppToast(input: AppToastInput) {
  const toast = {
    duration: 3600,
    tone: "default" as const,
    ...input,
    id: `dadkit-toast-${Date.now()}-${sequence++}`,
  };

  currentToast = toast;
  emit();

  return toast.id;
}

export function dismissAppToast(id?: string) {
  if (id && currentToast?.id !== id) {
    return;
  }

  currentToast = undefined;
  emit();
}

export function getAppToast() {
  return currentToast;
}

export function subscribeAppToast(listener: () => void) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}
