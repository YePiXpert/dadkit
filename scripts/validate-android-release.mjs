import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const expected = {
  tag: "v3.4.12",
  versionName: "3.4.12",
  versionCode: 25,
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
assert(!packageJson.scripts?.["android:bundle"], "retired Android bundle script");
assert(!packageJson.devDependencies?.["@bubblewrap/cli"], "Bubblewrap dependency must be absent");
assert(!packageLock.packages?.[""]?.devDependencies?.["@bubblewrap/cli"], "Bubblewrap lock entry must be absent");
assert(nextConfig.includes('output: "standalone"'), "standalone server build");
assert(!nextConfig.includes("DADKIT_BUILD_TARGET"), "retired Android export target");
assert(!nextConfig.includes("NEXT_PUBLIC_DADKIT_ANDROID_BUNDLE"), "retired Android build marker");
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
assert(activity.includes("new WebView(this)"), "remote WebView");
assert(activity.includes(`APP_HOST = "${expected.host}"`), "production API host");
assert(activity.includes(`source=apk&appVersionCode=${expected.versionCode}`), "APK start URL version");
assert(activity.includes(`DadKitAndroid/${expected.versionCode}`), "APK user agent version");
assert(!activity.includes("shouldInterceptRequest"), "no local request interception");
assert(!activity.includes('getAssets().open("www/"'), "no APK web asset loader");
assert(activity.includes("WebResourceError"), "offline main-frame handling");
assert(activity.includes("loadDataWithBaseURL"), "offline retry page");
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
  "scripts/build-android-web.mjs",
  "android/app/src/main/assets/www",
]) {
  await assertMissing(retiredPath);
}

if (tag) assert(tag === expected.tag, `release tag must be ${expected.tag}`);

console.log(
  `Validated remote PWA APK ${expected.tag}: ${expected.packageId}, versionCode ${expected.versionCode}, trusted host ${expected.host}.`,
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
  if (!condition) throw new Error(`Android release validation failed: ${label}.`);
}
