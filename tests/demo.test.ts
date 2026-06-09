import { afterEach, describe, expect, it, vi } from "vitest";

import { createDemoChecklist } from "@/lib/demo";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("demo checklist", () => {
  it("generates a demo checklist without localStorage", () => {
    const localStorage = {
      getItem: vi.fn(() => {
        throw new Error("demo should not read localStorage");
      }),
      setItem: vi.fn(() => {
        throw new Error("demo should not write localStorage");
      }),
      removeItem: vi.fn(() => {
        throw new Error("demo should not remove localStorage keys");
      }),
      clear: vi.fn(() => {
        throw new Error("demo should not clear localStorage");
      }),
    };

    vi.stubGlobal("window", { localStorage });

    const checklist = createDemoChecklist();

    expect(checklist.length).toBeGreaterThan(0);
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(localStorage.clear).not.toHaveBeenCalled();
  });
});
