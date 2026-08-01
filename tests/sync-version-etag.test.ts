import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createRoute } from "@/app/api/sync/create/route";
import { POST as joinRoute } from "@/app/api/sync/join/route";
import { GET as pullRoute } from "@/app/api/sync/pull/route";
import { POST as pushRoute } from "@/app/api/sync/push/route";
import {
  isDadKitImportData,
  type DadKitExportData,
  type DadKitExportDataV5,
} from "@/lib/data/format";
import {
  hospitalValuesFromPortable,
  updateHospitalProfile,
} from "@/lib/hospital/portable";
import {
  DADKIT_DATA_VERSION_HEADER,
  createSyncEtag,
} from "@/lib/sync/data-version";
import { joinSpace, pullSpace, pushSpace } from "@/lib/sync/server-store";
import {
  portableTestItem,
  portableV5,
  portableV6,
} from "@/tests/helpers/portable-data";

let dataDir: string;

function canonicalHospital(updatedAt = 100) {
  const data = portableV6();
  const values = hospitalValuesFromPortable(data.hospital);

  values.hospitalName = "市妇幼保健院";
  values.address = "健康路 1 号";

  return portableV6({
    hospital: updateHospitalProfile(data.hospital, values, updatedAt).profile,
  });
}

function syncRequest(
  pathname: "/api/sync/pull" | "/api/sync/push",
  token: string,
  options: {
    body?: unknown;
    dataVersion?: 5 | 6;
    etag?: string;
  } = {},
) {
  const headers = new Headers({
    authorization: `Bearer ${token}`,
    "x-forwarded-for": "203.0.113.21",
  });

  if (options.dataVersion) {
    headers.set(DADKIT_DATA_VERSION_HEADER, String(options.dataVersion));
  }
  if (options.etag) {
    headers.set("if-none-match", options.etag);
  }
  if (options.body) {
    headers.set("content-type", "application/json");
  }

  return new Request(`https://dadkit.test${pathname}`, {
    method: options.body ? "POST" : "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

beforeEach(() => {
  dataDir = mkdtempSync(path.join(tmpdir(), "dadkit-sync-etag-"));
  vi.stubEnv("DADKIT_DATA_DIR", dataDir);
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dataDir, { recursive: true, force: true });
});

describe("version-negotiated sync ETags", () => {
  it("does not let a v5 ETag produce 304 after the client upgrades to v6", async () => {
    const device = await joinSpace("ETag 升级家庭", "升级同步码", false, 6);
    if (!device) throw new Error("测试同步空间创建失败");

    await pushSpace(device.token, canonicalHospital(), 6);

    const v5Response = await pullRoute(
      syncRequest("/api/sync/pull", device.token),
    );
    const v5Payload = (await v5Response.json()) as {
      data: DadKitExportDataV5;
      version: number;
    };
    const v5Etag = v5Response.headers.get("etag");

    expect(v5Response.status).toBe(200);
    expect(v5Payload.data.version).toBe(5);
    expect(v5Payload.data).not.toHaveProperty("hospital");
    expect(isDadKitImportData(v5Payload.data)).toBe(true);
    expect(v5Etag).toBe(createSyncEtag(v5Payload.version, 5));
    expect(v5Response.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);

    const upgradedResponse = await pullRoute(
      syncRequest("/api/sync/pull", device.token, {
        dataVersion: 6,
        etag: v5Etag ?? undefined,
      }),
    );
    const upgradedPayload = (await upgradedResponse.json()) as {
      data: DadKitExportData;
      version: number;
    };
    const v6Etag = upgradedResponse.headers.get("etag");

    expect(upgradedResponse.status).toBe(200);
    expect(upgradedPayload.data.version).toBe(6);
    expect(upgradedPayload.data.hospital.fields.hospitalName.value).toBe(
      "市妇幼保健院",
    );
    expect(v6Etag).toBe(createSyncEtag(upgradedPayload.version, 6));
    expect(v6Etag).not.toBe(v5Etag);
    expect(upgradedResponse.headers.get("vary")).toBe(
      DADKIT_DATA_VERSION_HEADER,
    );

    const unchangedV6 = await pullRoute(
      syncRequest("/api/sync/pull", device.token, {
        dataVersion: 6,
        etag: v6Etag ?? undefined,
      }),
    );
    const unchangedV5 = await pullRoute(
      syncRequest("/api/sync/pull", device.token, {
        dataVersion: 5,
        etag: v5Etag ?? undefined,
      }),
    );

    for (const [response, etag] of [
      [unchangedV6, v6Etag],
      [unchangedV5, v5Etag],
    ] as const) {
      expect(response.status).toBe(304);
      expect(response.headers.get("etag")).toBe(etag);
      expect(response.headers.get("vary")).toBe(
        DADKIT_DATA_VERSION_HEADER,
      );
    }
  });

  it("returns representation-specific ETags for v5 and v6 pushes", async () => {
    const device = await joinSpace("ETag 推送家庭", "推送同步码", false, 6);
    if (!device) throw new Error("测试同步空间创建失败");

    await pushSpace(device.token, canonicalHospital(), 6);
    const v5Response = await pushRoute(
      syncRequest("/api/sync/push", device.token, {
        body: {
          data: portableV5({
            checklist: [
              portableTestItem("v5-push", {
                status: "packed",
                updatedAt: 200,
              }),
            ],
          }),
        },
        dataVersion: 5,
      }),
    );
    const v5Payload = (await v5Response.json()) as {
      data: DadKitExportDataV5;
      version: number;
    };

    expect(v5Payload.data.version).toBe(5);
    expect(v5Payload.data).not.toHaveProperty("hospital");
    expect(v5Response.headers.get("etag")).toBe(
      createSyncEtag(v5Payload.version, 5),
    );
    expect(v5Response.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);

    const afterV5 = (await pullSpace(device.token, 6))?.data as DadKitExportData;
    expect(afterV5.hospital.fields.hospitalName.value).toBe("市妇幼保健院");

    const changedHospital = canonicalHospital(300);
    const changedValues = hospitalValuesFromPortable(changedHospital.hospital);
    changedValues.address = "健康路 2 号";
    const v6Data = portableV6({
      hospital: updateHospitalProfile(
        changedHospital.hospital,
        changedValues,
        400,
      ).profile,
    });
    const v6Response = await pushRoute(
      syncRequest("/api/sync/push", device.token, {
        body: { data: v6Data },
        dataVersion: 6,
      }),
    );
    const v6Payload = (await v6Response.json()) as {
      data: DadKitExportData;
      version: number;
    };

    expect(v6Payload.data.version).toBe(6);
    expect(v6Payload.data.hospital.fields.address.value).toBe("健康路 2 号");
    expect(v6Response.headers.get("etag")).toBe(
      createSyncEtag(v6Payload.version, 6),
    );
    expect(v6Response.headers.get("vary")).toBe(DADKIT_DATA_VERSION_HEADER);
  });

  it("adds versioned ETag and Vary headers to create and join responses", async () => {
    const createResponse = await createRoute(
      new Request("https://dadkit.test/api/sync/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [DADKIT_DATA_VERSION_HEADER]: "6",
          "x-forwarded-for": "203.0.113.31",
        },
        body: JSON.stringify({ name: "响应头家庭" }),
      }),
    );
    const created = (await createResponse.json()) as {
      invite: { code: string };
      version: number;
    };

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get("etag")).toBe(
      createSyncEtag(created.version, 6),
    );
    expect(createResponse.headers.get("vary")).toBe(
      DADKIT_DATA_VERSION_HEADER,
    );

    const joinResponse = await joinRoute(
      new Request("https://dadkit.test/api/sync/join", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "203.0.113.32",
        },
        body: JSON.stringify({
          name: "响应头家庭",
          code: created.invite.code,
          existingOnly: true,
        }),
      }),
    );
    const joined = (await joinResponse.json()) as { version: number };

    expect(joinResponse.status).toBe(200);
    expect(joinResponse.headers.get("etag")).toBe(
      createSyncEtag(joined.version, 5),
    );
    expect(joinResponse.headers.get("vary")).toBe(
      DADKIT_DATA_VERSION_HEADER,
    );
  });
});
