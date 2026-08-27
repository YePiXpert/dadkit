"use client";

import { SunMoon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme, type ThemePreference } from "@/lib/use-theme";

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
  {
    value: "night",
    label: "夜间",
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
        <CardTitle className="flex items-center gap-2">
          <span className="icon-tile">
            <SunMoon className="size-4" />
          </span>
          外观
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select
          value={preference}
          onValueChange={(value) => {
            const option = THEME_OPTIONS.find((item) => item.value === value);

            if (option) {
              setPreference(option.value);
            }
          }}
        >
          <SelectTrigger aria-label="外观模式">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {preference === "night" ? (
          <p className="mt-3 text-[13px] leading-5 text-muted-foreground">
            夜间在深色基础上再降一档亮度，适合凌晨喂奶、换尿布时查看。
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
