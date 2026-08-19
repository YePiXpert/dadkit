import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isDadKitImportData,
  type DadKitExportData,
  type DadKitExportDataV5,
} from "@/lib/data/format";
import { hospitalValuesFromPortable, updateHospitalProfile } from "@/lib/hospital/portable";
import { getRequestedDataVersion } from "@/lib/sync/data-version";
import {
  createRandomSpace,
  createV2Invite,
  joinWithInvite,
  pullSpace,
  pushSpace,
} from "@/lib/sync/server-store";
import {
  portableTestItem,
  portableV5,
  portableV6,
} from "@/tests/helpers/portable-data";

let dataDir: string;

function withHospital(
  patch: Partial<Record<"hospitalName" | "address" | "maternityPhone", string>>,
  updatedAt: number,
) {
  const data = portableV6();
  const values = hospitalValuesFromPortable(data.hospital);

  Object.assign(values, patch);
  return portableV6({
    hospital: updateHospitalProfile(data.hospital, values, updatedAt).profile,
  });
}

async function twoDevices(name: string) {
  const first = await createRandomSpace(name, "v6 设备");
  const invite = await createV2Invite(first.token, 60);
  const second = await joinWithInvite(invite!.code, "v5 设备");

  if (!first || !second) {
    throw new Error("测试同步空间创建失败");
  }

  return { v6: first, v5: second };
}

function currentSpacePath() {
  const filename = readdirSync(dataDir).find((entry) => entry.endsWith(".json"));

  if (!filename) throw new Error("测试同步空间文件不存在");
  return path.join(dataDir, filename);
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-v6-"));
  vi.stubEnv("DADKIT_DATA_DIR", dataDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("v5/v6 family sync compatibility", () => {
  it("returns full hospital data to v6 and a legal, pure v5 projection", async () => {
    const { v6 } = await twoDevices("版本投影家庭");
    const canonical = withHospital(
      { hospitalName: "市妇幼保健院", address: "健康路 1 号" },
      100,
    );

    await pushSpace(v6.token, canonical, 6);
    const storedBefore = readFileSync(currentSpacePath(), "utf8");
    const forV6 = await pullSpace(v6.token, 6);
    const forV5 = await pullSpace(v6.token, 5);
    const storedAfter = readFileSync(currentSpacePath(), "utf8");

    expect(forV6?.data).toMatchObject({
      version: 6,
      hospital: {
        fields: {
          hospitalName: { value: "市妇幼保健院", updatedAt: 100 },
          address: { value: "健康路 1 号", updatedAt: 100 },
        },
      },
    });
    expect(forV5?.data?.version).toBe(5);
    expect(forV5?.data).not.toHaveProperty("hospital");
    expect(isDadKitImportData(forV5?.data)).toBe(true);
    expect(forV5?.version).toBe(forV6?.version);
    expect(storedAfter).toBe(storedBefore);
  });

  it("preserves canonical hospital data when a v5 device pushes checklist changes", async () => {
    const { v6, v5 } = await twoDevices("旧设备写入家庭");
    const initial = withHospital(
      { hospitalName: "市妇幼保健院", address: "新院区 8 号" },
      200,
    );

    await pushSpace(
      v6.token,
      portableV6({
        ...initial,
        checklist: [portableTestItem("from-v6", { updatedAt: 100 })],
      }),
      6,
    );
    const oldPush = await pushSpace(
      v5.token,
      portableV5({
        checklist: [portableTestItem("from-v5", { updatedAt: 300 })],
      }),
      5,
    );
    const final = (await pullSpace(v6.token, 6))?.data as DadKitExportData;

    expect(oldPush?.data?.version).toBe(5);
    expect(oldPush?.data).not.toHaveProperty("hospital");
    expect(final.hospital.fields.hospitalName.value).toBe("市妇幼保健院");
    expect(final.hospital.fields.address.value).toBe("新院区 8 号");
    expect(final.checklist.map((item) => item.id).sort()).toEqual([
      "from-v5",
      "from-v6",
    ]);
  });

  it("keeps v5 checklist and v6 hospital changes made offline on different devices", async () => {
    const { v6, v5 } = await twoDevices("离线合并家庭");
    const hospitalEdit = withHospital(
      { hospitalName: "中心医院", address: "建设路 18 号" },
      500,
    );

    await pushSpace(
      v5.token,
      portableV5({
        checklist: [
          portableTestItem("old-client-item", {
            status: "packed",
            updatedAt: 400,
          }),
        ],
      }),
      5,
    );
    await pushSpace(v6.token, hospitalEdit, 6);
    const final = (await pullSpace(v6.token, 6))?.data as DadKitExportData;
    const oldPull = (await pullSpace(v5.token, 5))?.data as DadKitExportDataV5;

    expect(final.hospital.fields.address.value).toBe("建设路 18 号");
    expect(final.checklist[0]).toMatchObject({
      id: "old-client-item",
      status: "packed",
    });
    expect(oldPull.version).toBe(5);
    expect(oldPull.checklist[0]?.id).toBe("old-client-item");
  });

  it("does not resurrect a phone cleared by v6 after a later v5 push", async () => {
    const { v6, v5 } = await twoDevices("清空墓碑家庭");
    const initial = withHospital(
      { hospitalName: "中心医院", maternityPhone: "010-12345678" },
      100,
    );
    const values = hospitalValuesFromPortable(initial.hospital);
    values.maternityPhone = "";
    const cleared = portableV6({
      hospital: updateHospitalProfile(initial.hospital, values, 300).profile,
    });

    await pushSpace(v6.token, initial, 6);
    await pushSpace(v6.token, cleared, 6);
    await pushSpace(
      v5.token,
      portableV5({
        checklist: [portableTestItem("v5-after-clear", { updatedAt: 400 })],
      }),
      5,
    );
    const final = (await pullSpace(v6.token, 6))?.data as DadKitExportData;

    expect(final.hospital.fields.maternityPhone).toEqual({
      value: "",
      updatedAt: 300,
    });
  });

  it("upgrades a stored v5 space to canonical v7 on its next valid push", async () => {
    const { v6 } = await twoDevices("旧空间升级家庭");
    const file = currentSpacePath();
    const stored = JSON.parse(readFileSync(file, "utf8")) as {
      data: DadKitExportDataV5 | DadKitExportData | null;
      version: number;
    };

    stored.data = portableV5({
      checklist: [portableTestItem("stored-v5", { updatedAt: 100 })],
    });
    writeFileSync(file, JSON.stringify(stored), "utf8");

    const upgradedPull = (await pullSpace(v6.token, 6))?.data as DadKitExportData;
    expect(upgradedPull.version).toBe(6);
    expect(upgradedPull.hospital.fields.hospitalName).toEqual({
      value: "",
      updatedAt: 0,
    });

    await pushSpace(
      v6.token,
      portableV6({
        checklist: [portableTestItem("new-v6", { updatedAt: 200 })],
      }),
      6,
    );
    const persisted = JSON.parse(readFileSync(file, "utf8")) as {
      data: DadKitExportData;
    };

    expect(persisted.data.version).toBe(10);
    expect(persisted.data).not.toHaveProperty("planning");
    expect(persisted.data.checklist.map((item) => item.id).sort()).toEqual([
      "new-v6",
      "stored-v5",
    ]);
  });

  it("defaults a missing or unknown data-version header to v5", () => {
    expect(getRequestedDataVersion(new Headers())).toBe(5);
    expect(
      getRequestedDataVersion(
        new Headers({ "X-DadKit-Data-Version": "5" }),
      ),
    ).toBe(5);
    expect(
      getRequestedDataVersion(
        new Headers({ "X-DadKit-Data-Version": "6" }),
      ),
    ).toBe(6);
    expect(
      getRequestedDataVersion(
        new Headers({ "X-DadKit-Data-Version": "7" }),
      ),
    ).toBe(7);
    expect(
      getRequestedDataVersion(
        new Headers({ "X-DadKit-Data-Version": "10" }),
      ),
    ).toBe(10);
    expect(
      getRequestedDataVersion(
        new Headers({ "X-DadKit-Data-Version": "999" }),
      ),
    ).toBe(5);
  });
});
