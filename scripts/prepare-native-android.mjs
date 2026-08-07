import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = await readFile(path.join(root, "lib", "templates", "general.ts"), "utf8");
const items = [];
let category;

for (const rawLine of source.split(/\r?\n/)) {
  const line = rawLine.trim();
  const section = line.match(/^\.\.\.section\("([^"]+)", \[$/);
  if (section) {
    category = section[1];
    continue;
  }
  if (category && line === "]),") {
    category = undefined;
    continue;
  }
  if (!category || !line.startsWith("[")) continue;

  const row = JSON.parse(line.replace(/,$/, ""));
  const [
    id,
    name,
    priority,
    timing,
    quantity,
    note,
    packTier,
    itemKind,
    preparationKind,
    bag,
    bulk,
    removable = true,
  ] = row;
  items.push({
    id: `general-${id}`,
    name,
    category,
    priority,
    ...(quantity ? { quantity } : {}),
    note,
    status: "todo",
    source: "general",
    sourceLabel: "通用模板",
    editable: true,
    removable,
    packTier,
    itemKind,
    ...(preparationKind ? { preparationKind } : {}),
    bag,
    bulk,
    timing,
    updatedAt: 0,
  });
}

if (items.length < 100) {
  throw new Error(`Native checklist generation only found ${items.length} items.`);
}

const assets = path.join(root, "android", "app", "src", "main", "assets");
// The Android app is fully native. Remove assets left by the retired WebView
// shell so a release can never silently ship a second browser-based UI.
await rm(path.join(assets, "www"), { force: true, recursive: true });
await mkdir(assets, { recursive: true });
await writeFile(
  path.join(assets, "default_checklist.json"),
  `${JSON.stringify(items, null, 2)}\n`,
  "utf8",
);

console.log(`Prepared ${items.length} native Android checklist items.`);
