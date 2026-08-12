import { createHash } from "node:crypto";
import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const expected = {
  tag: "v3.4.7",
  versionName: "3.4.7",
  versionCode: 20,
  packageId: "com.dadkit.mobile",
  host: "dadkit.505f.com",
};
const tag = process.env.GITHUB_REF_NAME || process.argv[2];

const packageJson = await readJson("package.json");
const packageLock = await readJson("package-lock.json");
const nextConfig = await readText("next.config.ts");
const gradle = await readText("android/app/build.gradle");
const manifest = await readText("android/app/src/main/AndroidManifest.xml");
const activity = await readText(
  "android/app/src/main/java/com/dadkit/mobile/LauncherActivity.java",
);

assert(packageJson.version === expected.versionName, "package.json version");
assert(packageLock.version === expected.versionName, "package-lock.json version");
assert(
  packageJson.scripts?.["android:bundle"] === "node scripts/build-android-web.mjs",
  "Android bundle script",
);
assert(!packageJson.devDependencies?.["@bubblewrap/cli"], "Bubblewrap dependency must be absent");
assert(!packageLock.packages?.[""]?.devDependencies?.["@bubblewrap/cli"], "Bubblewrap lock entry must be absent");
assert(nextConfig.includes('DADKIT_BUILD_TARGET === "android"'), "Android export target");
assert(nextConfig.includes('output: isAndroidBundle ? "export" : "standalone"'), "Android static export");
assert(nextConfig.includes("trailingSlash: isAndroidBundle"), "Android route directories");
assert(nextConfig.includes("NEXT_PUBLIC_DADKIT_ANDROID_BUNDLE"), "Android client build marker");
assert(gradle.includes(`applicationId "${expected.packageId}"`), "Gradle applicationId");
assert(gradle.includes(`versionCode ${expected.versionCode}`), "Gradle versionCode");
assert(gradle.includes(`versionName "${expected.versionName}"`), "Gradle versionName");
assert(gradle.includes('ignoreAssetsPattern = "default_checklist.json"'), "retired native asset exclusion");
assert(manifest.includes("android.permission.INTERNET"), "Internet permission");
assert(manifest.includes("android.permission.REQUEST_INSTALL_PACKAGES"), "APK install permission");
assert(manifest.includes("androidx.core.content.FileProvider"), "APK FileProvider");
assert(manifest.includes('android:name=".LauncherActivity"'), "bundled launcher activity");
assert(manifest.includes('android:allowBackup="false"'), "private app data");
assert(!manifest.includes("trusted"), "TWA manifest entries must be absent");
assert(!manifest.includes("asset_statements"), "Digital Asset Links metadata must be absent");
assert(activity.includes("extends Activity"), "Android activity");
assert(activity.includes("new WebView(this)"), "bundled WebView");
assert(activity.includes(`APP_HOST = "${expected.host}"`), "production API host");
assert(activity.includes(`source=apk&appVersionCode=${expected.versionCode}`), "APK start URL version");
assert(activity.includes(`DadKitAndroid/${expected.versionCode}`), "APK user agent version");
assert(activity.includes('getAssets().open("www/" + assetPath)'), "APK asset loader");
assert(activity.includes('path.startsWith("/api/")'), "production API passthrough");
assert(activity.includes("DadKitAndroidMigration"), "native-to-web data migration bridge");
assert(activity.includes("DadKitAndroidUpdate"), "in-app Android update bridge");
assert(activity.includes('MessageDigest.getInstance("SHA-256")'), "downloaded APK checksum");
assert(activity.includes("Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES"), "unknown-app install settings");
assert(activity.includes("FileProvider.getUriForFile"), "system APK installer handoff");
assert(activity.includes('"(?i)^[0-9a-f]{64}$"'), "mandatory update checksum");
assert(activity.includes('"/api/app-version/apk".equals'), "restricted update endpoint");
assert(activity.includes("UPDATE_MAX_BYTES"), "download size limit");

for (const retiredPath of [
  "android/app/src/main/java/com/dadkit/mobile/MainActivity.kt",
  "android/app/src/main/java/com/dadkit/mobile/ui/DadKitApp.kt",
  "android/twa-manifest.json",
  "android/twa-manifest.example.json",
  "scripts/generate-android-project.mjs",
  "scripts/prepare-native-android.mjs",
]) {
  await assertMissing(retiredPath);
}

const bundledRoot = path.join(root, "android", "app", "src", "main", "assets", "www");
for (const route of [
  "index.html",
  "checklist/index.html",
  "checklist/baby/index.html",
  "onboarding/index.html",
  "join/index.html",
  "baby/index.html",
  "baby/timeline/index.html",
  "tools/index.html",
  "growth/index.html",
  "departure/index.html",
  "hospital/index.html",
  "planning/index.html",
  "settings/index.html",
  "settings/about/index.html",
  "settings/backup/index.html",
  "settings/checklist/index.html",
  "settings/family/index.html",
  "settings/sync/index.html",
  "privacy/index.html",
  "support/index.html",
]) {
  await access(path.join(bundledRoot, ...route.split("/")));
}

const itemArt = await readdir(path.join(bundledRoot, "item-art"));
const growthArt = await readdir(path.join(bundledRoot, "growth"));
const itemArtCount = itemArt.filter((file) => file.endsWith(".webp")).length;
const growthArtCount = growthArt.filter((file) => file.endsWith(".webp")).length;
assert(itemArtCount === 144, "144 bundled item illustrations");
assert(growthArtCount === 33, "33 bundled growth illustrations");

const publicFiles = await listFiles(path.join(root, "public"));
for (const publicFile of publicFiles) {
  const relative = path.relative(path.join(root, "public"), publicFile);
  const bundledFile = path.join(bundledRoot, relative);
  await access(bundledFile);
  assert(
    (await digest(publicFile)) === (await digest(bundledFile)),
    `bundled public asset matches PWA: ${relative}`,
  );
}

const nextStaticFiles = await listFiles(path.join(bundledRoot, "_next", "static"));
assert(nextStaticFiles.length > 0, "bundled Next.js runtime assets");
assert((await stat(path.join(bundledRoot, "index.html"))).size > 1_000, "bundled home HTML");

if (tag) assert(tag === expected.tag, `release tag must be ${expected.tag}`);

console.log(
  `Validated full PWA APK ${expected.tag}: ${expected.packageId}, versionCode ${expected.versionCode}, ${publicFiles.length} public assets (${itemArtCount} item-art, ${growthArtCount} growth).`,
);

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

async function readText(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const pathname = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(pathname)));
    else if (entry.isFile()) files.push(pathname);
  }
  return files;
}

async function digest(pathname) {
  return createHash("sha256").update(await readFile(pathname)).digest("hex");
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
  if (!condition) throw new Error(`Android release validation failed: ${label}.`);
}
