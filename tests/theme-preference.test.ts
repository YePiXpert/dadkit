import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyThemePreference,
  getThemePreference,
  resolveTheme,
} from "@/lib/use-theme";

function stubDom() {
  const toggle = vi.fn();
  vi.stubGlobal("document", {
    documentElement: { classList: { toggle } },
  });
  return toggle;
}

describe("theme preference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves night as a dimmed variant of dark", () => {
    expect(resolveTheme("night")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("accepts a stored night preference", () => {
    vi.stubGlobal("window", {
      localStorage: { getItem: () => "night" },
    });
    expect(getThemePreference()).toBe("night");
  });

  it("falls back to system for unknown stored values", () => {
    vi.stubGlobal("window", {
      localStorage: { getItem: () => "sepia" },
    });
    expect(getThemePreference()).toBe("system");
  });

  it("applies dark and night-dim classes for the night preference", () => {
    const toggle = stubDom();
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
    });
    applyThemePreference("night");
    expect(toggle).toHaveBeenCalledWith("dark", true);
    expect(toggle).toHaveBeenCalledWith("night-dim", true);
  });

  it("clears night-dim when switching back to light", () => {
    const toggle = stubDom();
    vi.stubGlobal("window", {
      matchMedia: () => ({ matches: false }),
    });
    applyThemePreference("light");
    expect(toggle).toHaveBeenCalledWith("dark", false);
    expect(toggle).toHaveBeenCalledWith("night-dim", false);
  });
});