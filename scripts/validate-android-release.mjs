import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const expected = {
  tag: "v1.0.0",
  versionName: "1.0.0",
  versionCode: 28,
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
const buildStatic = await readText("scripts/build-static.mjs");

assert(packageJson.version === expected.versionName, "package.json version");
assert(packageLock.version === expected.versionName, "package-lock.json version");
assert(packageJson.scripts?.["build:static"] === "node scripts/build-static.mjs", "static build script");
assert(!packageJson.scripts?.["android:bundle"], "retired Android bundle script");
assert(!packageJson.devDependencies?.["@bubblewrap/cli"], "Bubblewrap dependency must be absent");
assert(!packageLock.packages?.[""]?.devDependencies?.["@bubblewrap/cli"], "Bubblewrap lock entry must be absent");
assert(nextConfig.includes('output: "standalone"'), "standalone server build");
assert(nextConfig.includes('output: "export"'), "static export build branch");
assert(buildStatic.includes('"app/api"'), "static build excludes API routes");
assert(buildStatic.includes('"middleware.ts"'), "static build excludes middleware");
assert(gradle.includes(`applicationId "${expected.packageId}"`), "Gradle applicationId");
assert(gradle.includes(`versionCode ${expected.versionCode}`), "Gradle versionCode");
assert(gradle.includes(`versionName "${expected.versionName}"`), "Gradle versionName");
assert(gradle.includes("androidx.webkit:webkit"), "WebViewAssetLoader dependency");
assert(manifest.includes("android.permission.INTERNET"), "Internet permission");
assert(!manifest.includes("REQUEST_INSTALL_PACKAGES"), "retired APK install permission");
assert(!manifest.includes("androidx.core.content.FileProvider"), "retired APK FileProvider");
assert(manifest.includes('android:name=".LauncherActivity"'), "bundled launcher activity");
assert(manifest.includes('android:allowBackup="false"'), "private app data");
assert(!manifest.includes("trusted"), "TWA manifest entries must be absent");
assert(!manifest.includes("asset_statements"), "Digital Asset Links metadata must be absent");
assert(activity.includes("extends Activity"), "Android activity");
assert(activity.includes("new WebView(this)"), "bundled-assets WebView");
assert(activity.includes("WebViewAssetLoader"), "local asset loader");
assert(activity.includes(`LOCAL_HOST = "appassets.androidplatform.net"`), "local asset origin");
assert(activity.includes(`API_HOST = "${expected.host}"`), "production API host");
assert(activity.includes("source=apk&appVersionCode="), "APK start URL version");
assert(activity.includes(`APP_VERSION_CODE = ${expected.versionCode}`), "APK version code");
assert(activity.includes(`" DadKitAndroid/" + APP_VERSION_CODE`), "APK user agent version");
assert(activity.includes("DadKitAndroidLegacyExport"), "legacy origin export bridge");
assert(activity.includes("DadKitAndroidMigration"), "native-to-web data migration bridge");
assert(!activity.includes("DadKitAndroidUpdate"), "retired in-app update bridge");
assert(!activity.includes("app-version"), "retired update endpoint");
assert(activity.includes("WebResourceError"), "offline main-frame handling");
assert(activity.includes("loadDataWithBaseURL"), "error retry page");

// assets/www 是 CI 在打包前从 out/ 拷入的构建产物，源码树中必须保持缺失。
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
  `Validated local-assets APK ${expected.tag}: ${expected.packageId}, versionCode ${expected.versionCode}, API host ${expected.host}.`,
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
