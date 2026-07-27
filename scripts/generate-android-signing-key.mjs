import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const secretDir = path.join(root, ".secrets");
const keyPath = path.join(root, "android", "dadkit-release.keystore");
const envPath = path.join(secretDir, "android-signing.env");

if (existsSync(keyPath) || existsSync(envPath)) {
  throw new Error(
    "Signing material already exists. Refusing to rotate or overwrite it.",
  );
}

await mkdir(path.dirname(keyPath), { recursive: true });
await mkdir(secretDir, { recursive: true, mode: 0o700 });

const password = randomBytes(36).toString("base64url");
const keytool = process.platform === "win32" ? "keytool.exe" : "keytool";
const args = [
  "-genkeypair",
  "-v",
  "-keystore",
  keyPath,
  "-storetype",
  "PKCS12",
  "-storepass",
  password,
  "-keypass",
  password,
  "-alias",
  "dadkit",
  "-keyalg",
  "RSA",
  "-keysize",
  "4096",
  "-validity",
  "10000",
  "-dname",
  "CN=DadKit Release,OU=Mobile,O=DadKit,L=Private,ST=Private,C=CN",
];

await run(keytool, args);
await writeFile(
  envPath,
  [
    `ANDROID_KEYSTORE_PATH=${keyPath}`,
    "ANDROID_KEY_ALIAS=dadkit",
    `ANDROID_KEYSTORE_PASSWORD=${password}`,
    `ANDROID_KEY_PASSWORD=${password}`,
    "",
  ].join("\n"),
  { encoding: "utf8", mode: 0o600, flag: "wx" },
);

const listing = await run(keytool, [
  "-list",
  "-v",
  "-keystore",
  keyPath,
  "-storepass",
  password,
  "-alias",
  "dadkit",
]);
const fingerprint = listing.match(/SHA256:\s*([0-9A-F:]{95})/i)?.[1];

if (!fingerprint) {
  throw new Error("Key generated, but its SHA-256 fingerprint was not found.");
}

console.log(`SHA256=${fingerprint.toUpperCase()}`);
console.log(`KEYSTORE=${keyPath}`);
console.log(`PASSWORD_FILE=${envPath}`);
console.log(
  "Back up the encrypted keystore to two independent secure locations before tagging a release.",
);

async function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(`${stdout}\n${stderr}`);
      } else {
        reject(
          new Error(
            `${path.basename(command)} exited ${code}: ${stderr || stdout}`,
          ),
        );
      }
    });
  });
}
