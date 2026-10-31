/**
 * Dev preview build: bundles dev/preview.tsx into a single self-contained
 * .preview/index.html that copies the console's design tokens, so the plugin
 * can be reviewed in a browser without starting QwenPaw.
 *
 *   npm run preview            (light)
 *   open .preview/index.html?theme=dark&lang=en
 */
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, ".preview");
mkdirSync(outDir, { recursive: true });

const bundle = await build({
  entryPoints: [join(root, "dev/preview.tsx")],
  bundle: true,
  write: false,
  format: "iife",
  jsx: "transform",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

/** Reuse the console's real tokens when the console checkout is available. */
function readTokens() {
  const candidates = [
    process.env.QWENPAW_CONSOLE,
    join(root, "../QwenPaw/console"),
    join(root, "../console"),
  ].filter(Boolean);
  for (const base of candidates) {
    try {
      return readFileSync(join(base, "src/styles/tokens.css"), "utf8");
    } catch {
      /* try the next candidate */
    }
  }
  console.warn("preview: console tokens.css not found — using fallback tokens");
  return `:root{--app-bg:#f9f8f4;--app-surface:#fff;--app-surface-subtle:#faf9f7;--app-border:#eae8e7;--app-border-subtle:#f0eeeb;--app-text:rgba(20,20,19,.88);--app-text-secondary:rgba(20,20,19,.58);--app-text-tertiary:rgba(20,20,19,.45);--app-accent:#ff7f16;--app-accent-soft:rgba(255,127,22,.1);--app-accent-faint:rgba(255,127,22,.04);--app-accent-border:rgba(255,127,22,.42);--app-accent-text:#c25e00;--app-selected-border:rgba(255,127,22,.42);--app-radius:10px;--app-radius-card:16px;--app-control-md:36px;--app-font-secondary:13px;--app-font-caption:12px;--app-font-body:14px}`;
}

const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Startup page preview</title>
<style>
${readTokens()}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:var(--app-bg);color:var(--app-text);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.app{display:flex;flex-direction:column;min-height:100vh}
.chat{flex:1;display:flex;align-items:center;justify-content:center;padding:24px 16px}
.composer{padding:0 16px 24px;display:flex;justify-content:center}
.composer-box{width:100%;max-width:760px;min-height:96px;padding:14px 16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border:1px solid var(--app-border);border-radius:var(--app-radius-card,16px);background:var(--app-surface)}
.composer-placeholder{font-size:var(--app-font-body,14px);color:var(--app-text-tertiary)}
.composer-send{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--app-accent-soft);color:var(--app-accent)}
</style>
</head>
<body>
<div id="root"></div>
<script>${bundle.outputFiles[0].text}</script>
</body>
</html>
`;

writeFileSync(join(outDir, "index.html"), html);
console.log(`preview → ${join(outDir, "index.html")}`);
