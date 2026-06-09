import { AlertTriangle } from "lucide-react";

import { DISCLAIMER_TEXT } from "@/lib/types";

export function DisclaimerBox() {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4" />
        <span>使用提醒</span>
      </div>
      <p>{DISCLAIMER_TEXT}</p>
    </section>
  );
}
