import { spawn } from "node:child_process";

const env = {
  ...process.env,
  DADKIT_CAPACITOR_EXPORT: "1",
  NEXT_PUBLIC_DADKIT_CAPACITOR_EXPORT: "1",
};

const child =
  process.platform === "win32"
    ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm run build"], {
        env,
        stdio: "inherit",
      })
    : spawn("npm", ["run", "build"], {
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
