import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const expected = {
  versionName: "1.0.0",
  bundleId: "com.dadkit.ios",
  apiHost: "dadkit.505f.com",
};

const packageJson = await readJson("package.json");
const infoPlist = await readText("ios/DadKit/Info.plist");
const pbxproj = await readText("ios/DadKit.xcodeproj/project.pbxproj");
const schemeHandler = await readText("ios/DadKit/LocalSchemeHandler.swift");
const viewController = await readText("ios/DadKit/DadKitViewController.swift");
const workflow = await readText(".github/workflows/ios-release.yml");

assert(packageJson.version === expected.versionName, "package.json version");
assert(
  infoPlist.includes(`<string>${expected.versionName}</string>`),
  "Info.plist CFBundleShortVersionString",
);
assert(pbxproj.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${expected.bundleId}`), "bundle identifier");
assert(pbxproj.includes("PBXNativeTarget") && pbxproj.includes("DadKit.app"), "app target");
assert(pbxproj.includes("lastKnownFileType = folder;") && pbxproj.includes("path = www"), "www folder reference");
assert(
  viewController.includes('localOrigin = "dadkit-local://localhost"'),
  "local scheme origin",
);
assert(viewController.includes("DadKitiOS/1"), "shell user agent marker");
assert(viewController.includes("WKURLSchemeHandler") === false, "handler lives in LocalSchemeHandler");
assert(schemeHandler.includes("WKURLSchemeHandler"), "custom scheme handler");
assert(schemeHandler.includes('appendingPathComponent("www")'), "bundled www root");
assert(
  viewController.includes("SFSafariViewController"),
  "external links open in Safari view controller",
);
assert(
  workflow.includes("CODE_SIGNING_ALLOWED=NO") && workflow.includes("DadKit-ios-unsigned.ipa"),
  "unsigned IPA pipeline",
);
assert(
  workflow.includes("NEXT_PUBLIC_DADKIT_API_BASE: https://" + expected.apiHost),
  "cloud sync API base",
);

// www 是 CI 在打包前从 out/ 拷入的构建产物，源码树中必须保持缺失。
await assertMissing("ios/DadKit/www");

console.log(
  `Validated local-assets iOS shell ${expected.versionName}: ${expected.bundleId}, API host ${expected.apiHost}.`,
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
  throw new Error(`iOS release validation failed: ${relativePath} still exists.`);
}

function assert(condition, label) {
  if (!condition) throw new Error(`iOS release validation failed: ${label}.`);
}
