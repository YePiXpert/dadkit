import { cp } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

// `next build` intentionally leaves public and static files outside the
// standalone directory. Docker copies them during image assembly; mirror that
// step here so browser tests exercise the same server entrypoint.
await cp(path.join(root, "public"), path.join(standalone, "public"), {
  force: true,
  recursive: true,
});
await cp(
  path.join(root, ".next", "static"),
  path.join(standalone, ".next", "static"),
  { force: true, recursive: true },
);

process.chdir(standalone);
await import(pathToFileURL(path.join(standalone, "server.js")).href);
