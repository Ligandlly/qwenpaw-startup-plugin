import { build } from "esbuild";

// The Console injects React/antd through window.QwenPaw.host, so the bundle has
// no bare imports at all. JSX is compiled to React.createElement calls against
// the locally bound host React instance (classic runtime).
//
// `iife` (not `esm`) on purpose: the artifact is pure side effects — it
// registers itself with window.QwenPaw on load — and this way it runs whether
// the console loads it as a blob-URL module or as a classic script.
await build({
  entryPoints: ["src/index.tsx"],
  bundle: true,
  format: "iife",
  target: ["es2020"],
  jsx: "transform",
  outfile: "dist/index.js",
  legalComments: "none",
  minify: true,
  sourcemap: false,
  logLevel: "info",
});
