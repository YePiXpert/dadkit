"use client";

import { useCallback, useEffect, useState } from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export { THEME_STORAGE_KEY };

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function getThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : "system";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyThemePreference(preference: ThemePreference) {
  const dark = resolveTheme(preference) === "dark";
  document.documentElement.classList.toggle("dark", dark);
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
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    applyThemePreference(next);
    setPreferenceState(next);
    setResolvedTheme(resolveTheme(next));
  }, []);

  return { preference, resolvedTheme, setPreference };
}
