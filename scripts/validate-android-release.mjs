import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const expected = {
  tag: "v2.1.1",
  versionName: "2.1.1",
  versionCode: 2,
  packageId: "com.dadkit.mobile",
  host: "dadkit.505f.com",
};
const tag = process.env.GITHUB_REF_NAME || process.argv[2];

const packageJson = await readJson("package.json");
const packageLock = await readJson("package-lock.json");
const gradle = await readText("android/app/build.gradle");
const manifest = await readText("android/app/src/main/AndroidManifest.xml");
const activity = await readText(
  "android/app/src/main/java/com/dadkit/mobile/LauncherActivity.java",
);

assert(packageJson.version === expected.versionName, "package.json version");
assert(
  !packageJson.devDependencies?.["@bubblewrap/cli"],
  "Bubblewrap dependency must be removed",
);
assert(
  !packageLock.packages?.[""]?.devDependencies?.["@bubblewrap/cli"],
  "Bubblewrap lock entry must be removed",
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
assert(manifest.includes("android.permission.INTERNET"), "Internet permission");
assert(manifest.includes('android:allowBackup="false"'), "private app data");
assert(!manifest.includes("trusted"), "TWA manifest entries must be absent");
assert(!manifest.includes("asset_statements"), "Digital Asset Links metadata");
assert(activity.includes("extends Activity"), "native WebView activity");
assert(activity.includes("new WebView(this)"), "bundled WebView");
assert(activity.includes(`APP_HOST = "${expected.host}"`), "production API host");
assert(
  activity.includes(`source=apk&appVersionCode=${expected.versionCode}`),
  "bundled APK start URL",
);
assert(
  activity.includes('getAssets().open("www/" + assetPath)'),
  "APK asset loader",
);

for (const retiredPath of [
  "android/twa-manifest.json",
  "android/twa-manifest.example.json",
  "scripts/generate-android-project.mjs",
]) {
  await assertMissing(retiredPath);
}

const bundledRoot = path.join(
  root,
  "android",
  "app",
  "src",
  "main",
  "assets",
  "www",
);
await access(path.join(bundledRoot, "index.html"));
await access(path.join(bundledRoot, "growth", "index.html"));
await access(path.join(bundledRoot, "checklist", "baby", "index.html"));

const itemArt = await readdir(path.join(bundledRoot, "item-art"));
assert(
  itemArt.filter((file) => file.endsWith(".webp")).length === 64,
  "64 bundled item illustrations",
);

if (tag) {
  assert(tag === expected.tag, `release tag must be ${expected.tag}`);
}

console.log(
  `Validated bundled APK ${expected.tag}: ${expected.packageId}, versionCode ${expected.versionCode}, ${itemArt.length} item-art assets.`,
);

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function assertMissing(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    return;
  }
  throw new Error(`Android release validation failed: ${relativePath} still exists.`);
}

function assert(condition, label) {
  if (!condition) {
    throw new Error(`Android release validation failed: ${label}.`);
  }
}
