"use client";

import { useState } from "react";
import { Check, Copy, Printer, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ExportTextAreaProps = {
  value: string;
};

export function ExportTextArea({ value }: ExportTextAreaProps) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function shareText() {
    if (!navigator.share) {
      await copyText();
      return;
    }

    await navigator.share({
      title: "DadKit 待产准备清单",
      text: value,
    });
  }

  return (
    <div className="grid gap-3">
      <Textarea
        className="max-h-[50dvh] min-h-64 resize-y overflow-y-auto bg-card font-mono text-sm leading-6"
        readOnly
        value={value}
      />
      <div className="flex flex-wrap gap-2 no-print">
        <Button onClick={copyText}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "已复制" : "复制文本"}
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          打印
        </Button>
        <Button variant="outline" onClick={shareText}>
          <Share2 className="size-4" />
          系统分享
        </Button>
      </div>
    </div>
  );
}
