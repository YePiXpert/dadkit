import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

import { APP_VERSION } from "./mobile-env.mjs";

export const handoffArchiveName = `dadkit-${APP_VERSION}-mobile-handoff.zip`;
export const handoffArchivePath = join(
  process.cwd(),
  "dist",
  "mobile-handoff",
  handoffArchiveName,
);

export function createMobileHandoffArchive({
  handoffDir = join(process.cwd(), "dist", "mobile-handoff"),
  archiveName = handoffArchiveName,
} = {}) {
  if (!existsSync(handoffDir)) {
    throw new Error(`Mobile handoff directory not found: ${handoffDir}`);
  }

  const archivePath = join(handoffDir, archiveName);
  const files = collectArchiveFiles(handoffDir, archiveName);

  if (files.length === 0) {
    throw new Error(`No files found for mobile handoff archive: ${handoffDir}`);
  }

  rmSync(archivePath, { force: true });
  mkdirSync(handoffDir, { recursive: true });

  const zipBuffer = createZipBuffer(
    files.map((file) => ({
      name: file.name,
      data: readFileSync(file.path),
      mtime: statSync(file.path).mtime,
    })),
  );
  writeFileSync(archivePath, zipBuffer);

  return {
    path: archivePath,
    name: archiveName,
    bytes: zipBuffer.length,
    entryCount: files.length,
    sha256: createHash("sha256").update(zipBuffer).digest("hex"),
  };
}

export function collectArchiveFiles(handoffDir, archiveName = handoffArchiveName) {
  const files = [];

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      const name = relative(handoffDir, path).split(sep).join("/");

      if (entry.isDirectory()) {
        walk(path);
        continue;
      }

      if (!entry.isFile() || entry.name === archiveName || entry.name.endsWith(".zip")) {
        continue;
      }

      files.push({ path, name });
    }
  }

  walk(handoffDir);

  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export function createZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data);
    const crc = crc32(data);
    const { date, time } = toDosDateTime(entry.mtime ?? new Date());
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localDirectory = Buffer.concat(localParts);
  const endRecord = Buffer.alloc(22);

  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(localDirectory.length, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([localDirectory, centralDirectory, endRecord]);
}

export function readZipEntryNames(zipPath) {
  const buffer = readFileSync(zipPath);
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let offset = buffer.readUInt32LE(eocdOffset + 16);
  const names = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory at offset ${offset}`);
    }

    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;

    names.push(buffer.subarray(nameStart, nameEnd).toString("utf8"));
    offset = nameEnd + extraLength + commentLength;
  }

  return names;
}

function findEndOfCentralDirectory(buffer) {
  const minimumOffset = Math.max(0, buffer.length - 65557);

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("ZIP end of central directory record not found");
}

function toDosDateTime(dateValue) {
  const date = new Date(dateValue);
  const year = Math.max(date.getFullYear(), 1980);

  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
  };
}

const crcTable = new Uint32Array(256);

for (let index = 0; index < crcTable.length; index += 1) {
  let crc = index;

  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }

  crcTable[index] = crc >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const archive = createMobileHandoffArchive();

  console.log(`Created mobile handoff archive: ${archive.path}`);
  console.log(`Entries: ${archive.entryCount}`);
  console.log(`SHA-256: ${archive.sha256}`);
}
