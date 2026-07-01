import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

import { withMobileBuildEnv } from "./mobile-env.mjs";

const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const androidDir = join(process.cwd(), "android");
const gradlePath = join(androidDir, gradleCommand);

if (!existsSync(gradlePath)) {
  console.error(
    "Android project is missing. Run `npm run mobile:sync` after adding the Android platform.",
  );
  process.exit(1);
}

const env = withMobileBuildEnv(process.env);

const child =
  process.platform === "win32"
    ? spawn(
        process.env.ComSpec ?? "cmd.exe",
        ["/d", "/s", "/c", "gradlew.bat assembleDebug"],
        {
          cwd: androidDir,
          env,
          stdio: "inherit",
        },
      )
    : spawn(gradleCommand, ["assembleDebug"], {
        cwd: androidDir,
        env,
        stdio: "inherit",
      });

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
