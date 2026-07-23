"use client";

import { Button } from "@/components/ui/button";
import type { ChecklistMode } from "@/lib/types";

type ModeToggleProps = {
  mode: ChecklistMode;
  onChange: (mode: ChecklistMode) => void;
};

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="grid grid-cols-2 rounded-lg border border-border bg-muted p-1">
      {(["lean", "full"] satisfies ChecklistMode[]).map((candidate) => (
        <Button
          className="h-9 rounded-md"
          key={candidate}
          variant={mode === candidate ? "default" : "ghost"}
          onClick={() => onChange(candidate)}
        >
          {candidate === "lean" ? "精简模式" : "完整模式"}
        </Button>
      ))}
    </div>
  );
}
