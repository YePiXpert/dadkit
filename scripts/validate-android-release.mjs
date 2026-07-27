import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const expected = {
  tag: "v2.1.0",
  versionName: "2.1.0",
  versionCode: 1,
  packageId: "com.dadkit.mobile",
  host: "dadkit.505f.com",
};

const packageJson = await readJson("package.json");
const packageLock = await readJson("package-lock.json");
const twaManifest = await readJson("android/twa-manifest.json");
const assetLinks = await readJson("public/.well-known/assetlinks.json");
const gradle = await readFile(
  path.join(root, "android", "app", "build.gradle"),
  "utf8",
);
const tag = process.env.GITHUB_REF_NAME || process.argv[2];

assert(packageJson.version === expected.versionName, "package.json version");
assert(
  packageLock.packages?.[""]?.devDependencies?.["@bubblewrap/cli"] ===
    "1.24.1",
  "Bubblewrap must be pinned to 1.24.1",
);
assert(twaManifest.packageId === expected.packageId, "TWA packageId");
assert(twaManifest.host === expected.host, "TWA host");
assert(
  twaManifest.startUrl === "/?source=twa&appVersionCode=1",
  "TWA startUrl",
);
assert(
  twaManifest.appVersionName === expected.versionName,
  "TWA versionName",
);
assert(
  twaManifest.appVersionCode === expected.versionCode,
  "TWA versionCode",
);
assert(
  Array.isArray(twaManifest.additionalTrustedOrigins) &&
    twaManifest.additionalTrustedOrigins.length === 0,
  "additional trusted origins must be empty",
);
assert(
  gradle.includes(`applicationId "${expected.packageId}"`),
  "Gradle applicationId",
);
assert(
  gradle.includes(`versionCode ${expected.versionCode}`),
  "Gradle versionCode",
);
assert(
  gradle.includes(`versionName "${expected.versionName}"`),
  "Gradle versionName",
);

const urls = collectHttpsUrls(twaManifest);
assert(urls.length > 0, "TWA HTTPS URL list");
for (const value of urls) {
  assert(new URL(value).hostname === expected.host, `unexpected URL ${value}`);
}

assert(Array.isArray(assetLinks) && assetLinks.length === 1, "assetlinks entry");
assert(
  assetLinks[0]?.target?.package_name === expected.packageId,
  "assetlinks package",
);
assert(
  JSON.stringify(assetLinks[0]?.target?.sha256_cert_fingerprints) ===
    JSON.stringify(twaManifest.fingerprints.map((entry) => entry.value)),
  "assetlinks fingerprint",
);

if (tag) {
  assert(tag === expected.tag, `release tag must be ${expected.tag}`);
}

console.log(
  `Validated ${expected.tag}: ${expected.packageId}, versionCode ${expected.versionCode}, host ${expected.host}.`,
);

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function collectHttpsUrls(value, output = []) {
  if (typeof value === "string" && value.startsWith("https://")) {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const entry of value) collectHttpsUrls(entry, output);
  } else if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectHttpsUrls(entry, output);
  }
  return output;
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Android release validation failed: ${label}.`);
  }
}
