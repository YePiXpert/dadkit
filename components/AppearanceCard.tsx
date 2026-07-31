"use client";

import { SunMoon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme, type ThemePreference } from "@/lib/use-theme";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  {
    value: "system",
    label: "跟随系统",
  },
  {
    value: "light",
    label: "浅色",
  },
  {
    value: "dark",
    label: "深色",
  },
] as const satisfies readonly {
  value: ThemePreference;
  label: string;
}[];

export function AppearanceCard() {
  const { preference, setPreference } = useTheme();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="icon-tile">
            <SunMoon className="size-4" />
          </span>
          外观
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="外观模式">
          {THEME_OPTIONS.map((option) => {
            const active = preference === option.value;

            return (
              <button
                aria-pressed={active}
                className={cn(
                  "min-h-11 rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary bg-secondary text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/35",
                )}
                key={option.value}
                onClick={() => setPreference(option.value)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
