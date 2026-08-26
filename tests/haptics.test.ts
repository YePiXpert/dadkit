import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveHapticPattern, triggerHaptic } from "@/lib/haptics";

describe("haptics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves stable vibration patterns", () => {
    expect(resolveHapticPattern("tap")).toEqual([10]);
    expect(resolveHapticPattern("success")).toEqual([14, 48, 20]);
  });

  it("returns false when vibration is unsupported", () => {
    vi.stubGlobal("navigator", {});
    expect(triggerHaptic()).toBe(false);
  });

  it("vibrates with the requested pattern when supported", () => {
    const vibrate = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { vibrate });
    expect(triggerHaptic("success")).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([14, 48, 20]);
  });

  it("swallows vibrate errors from the platform", () => {
    vi.stubGlobal("navigator", {
      vibrate: () => {
        throw new Error("denied");
      },
    });
    expect(triggerHaptic()).toBe(false);
  });
});