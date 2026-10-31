#!/usr/bin/env node
/**
 * Build the offline install package: a zip whose root holds one directory,
 * `qwenpaw-startup-page/`, with the manifest and the built bundle inside.
 * `qwenpaw plugin install <zip>` accepts exactly this shape.
 *
 * The plugin is frontend-only, so "offline" simply means: nothing to fetch at
 * install time — no npm, no PyPI, no network.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
const { id, version } = manifest;

const bundle = join(root, "dist/index.js");
if (!existsSync(bundle)) {
  console.error("dist/index.js is missing — run `npm run build` first.");
  process.exit(1);
}

const releaseDir = join(root, "release");
const stageRoot = join(releaseDir, ".staging");
const stage = join(stageRoot, id);
const zipName = `${id}-${version}.zip`;
const zipPath = join(releaseDir, zipName);

rmSync(stageRoot, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

// Only what the host needs to load the plugin, plus the licence and a
// pointer back to the repo. Docs/screenshots stay out to keep the zip small.
for (const file of ["plugin.json", "dist", "README.md", "LICENSE"]) {
  const from = join(root, file);
  if (!existsSync(from)) continue;
  cpSync(from, join(stage, file), { recursive: true });
}

rmSync(zipPath, { force: true });
// `zip -r <archive> <dir>` from the staging root keeps `<id>/` as the single
// top-level directory, which is what the installer looks for.
execFileSync("zip", ["-qr", zipPath, id], { cwd: stageRoot, stdio: "inherit" });

const digest = createHash("sha256").update(readFileSync(zipPath)).digest("hex");
writeFileSync(`${zipPath}.sha256`, `${digest}  ${zipName}\n`);

rmSync(stageRoot, { recursive: true, force: true });

console.log(`\n${zipName}`);
console.log(`  sha256 ${digest}`);
console.log(`  install with: qwenpaw plugin install ./release/${zipName}`);
