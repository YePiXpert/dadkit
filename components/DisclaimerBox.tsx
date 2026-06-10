import { DISCLAIMER_TEXT } from "@/lib/types";

export function DisclaimerBox() {
  return (
    <details className="text-xs leading-5 text-muted-foreground">
      <summary className="cursor-pointer font-medium">使用提醒</summary>
      <p className="mt-2">{DISCLAIMER_TEXT}</p>
    </details>
  );
}
