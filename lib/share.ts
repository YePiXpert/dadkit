"use client";

import { showAppToast } from "@/lib/app-toast";

export type ShareTextResult = "cancelled" | "copied" | "failed" | "shared";

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  return copied;
}

export async function shareText(text: string, title = "DadKit"):
  Promise<ShareTextResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text, title });
      showAppToast({ message: "已分享给家人。", tone: "success" });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  try {
    if (await copyText(text)) {
      showAppToast({ message: "已复制，去粘贴给家人吧。", tone: "success" });
      return "copied";
    }
  } catch {
    // 继续使用统一的失败提示，让不支持剪贴板的浏览器也有反馈。
  }

  showAppToast({ message: "暂时无法分享，请手动复制内容。", tone: "warning" });
  return "failed";
}

export function formatFamilyInviteShareText(name: string, code: string) {
  return `邀请你加入「${name}」的 DadKit 家庭同步。打开 DadKit 后选择“加入家庭”，输入口令：${code}`;
}

export function formatChecklistShareText(percent: number) {
  return `我们的待产包已准备 ${percent}%，一起再核对一遍吧。`;
}

export function formatGrowthShareText(
  week: number,
  analogy: string,
  packingPercent: number,
) {
  return `孕 ${week} 周，宝宝大约像${analogy}，待产包已准备 ${packingPercent}%。`;
}
