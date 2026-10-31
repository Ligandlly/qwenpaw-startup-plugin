import * as React from "react";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * Smoke test for the shipped artifact: the console loads `dist/index.js` as a
 * plain script (blob URL + dynamic import), so it must register itself with
 * nothing but `window.QwenPaw` available — no imports, no bundler runtime.
 */
const DIST = resolve(process.cwd(), "dist/index.js");

function runBundle(): void {
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(DIST, "utf8"))();
}

describe("dist/index.js", () => {
  it("registers the welcome slot when loaded as a plain script", () => {
    if (!existsSync(DIST)) throw new Error("run `npm run build` first");
    const render = vi.fn(
      (_pluginId: string, _value: (props: Record<string, unknown>) => unknown) => ({
        dispose: vi.fn(),
      }),
    );
    (window as unknown as { QwenPaw: unknown }).QwenPaw = {
      host: { React, antd: undefined },
      chat: { welcome: { render } },
    };

    runBundle();

    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0]![0]).toBe("qwenpaw-startup-page");
    expect(document.getElementById("qpst-styles")).not.toBeNull();
  });

  it("ships no bare imports the host would have to resolve", () => {
    const code = readFileSync(DIST, "utf8");
    expect(code).not.toMatch(/\brequire\s*\(/);
    expect(code).not.toMatch(/^\s*import\s/m);
    // No ESM wrapper either, so the same file also works as a classic script.
    expect(code).not.toMatch(/\bexport\s*\{/);
  });
});
