import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("mobile store assets", () => {
  it("ships a Google Play feature graphic at the required draft size", () => {
    const buffer = readFileSync(
      join(process.cwd(), "resources", "store", "dadkit-google-play-feature.png"),
    );

    expect(buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(buffer.readUInt32BE(16)).toBe(1024);
    expect(buffer.readUInt32BE(20)).toBe(500);
    expect(buffer.readUInt8(25)).toBe(2);
  });
});
