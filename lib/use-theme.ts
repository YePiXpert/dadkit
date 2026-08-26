"use client";

import { useCallback, useEffect, useState } from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme";

export type ThemePreference = "system" | "light" | "dark" | "night";
export type ResolvedTheme = "light" | "dark";

export { THEME_STORAGE_KEY };

function isThemePreference(value: string | null): value is ThemePreference {
  return (
    value === "system" ||
    value === "light" ||
    value === "dark" ||
    value === "night"
  );
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  // 夜间低亮度是深色主题的再降亮度版本，解析结果仍按深色处理。
  if (preference === "night") return "dark";
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyThemePreference(preference: ThemePreference) {
  const dark = resolveTheme(preference) === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("night-dim", preference === "night");
  (
    window as Window & {
      DadKitAndroidShell?: { setDarkTheme(dark: boolean): void };
    }
  ).DadKitAndroidShell?.setDarkTheme(dark);
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const initial = getThemePreference();
    applyThemePreference(initial);
    setPreferenceState(initial);
    setResolvedTheme(resolveTheme(initial));
  }, []);

  useEffect(() => {
    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyThemePreference("system");
      setResolvedTheme(resolveTheme("system"));
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? `外观偏好尚未写入本机存储：${error.message}`
          : "外观偏好尚未写入本机存储。";
      void import("@/lib/persistence-status")
        .then(({ recordStorageWarning }) => {
          recordStorageWarning(message);
        })
        .catch(() => undefined);
    }
    applyThemePreference(next);
    setPreferenceState(next);
    setResolvedTheme(resolveTheme(next));
  }, []);

  return { preference, resolvedTheme, setPreference };
}
