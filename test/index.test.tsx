import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const renderSlot = vi.fn(
  (_pluginId: string, _value: (props: Record<string, unknown>) => unknown) => ({
    dispose: vi.fn(),
  }),
);

function installHost(options: { launched?: boolean } = {}): void {
  if (options.launched) {
    window.sessionStorage.setItem("qwenpaw-startup-page:launched", "1");
  }
  (window as unknown as { QwenPaw: unknown }).QwenPaw = {
    host: { React },
    chat: { welcome: { render: renderSlot } },
  };
}

describe("plugin entry", () => {
  beforeEach(() => {
    vi.resetModules();
    renderSlot.mockClear();
    window.sessionStorage.clear();
  });

  it("registers the startup page in the chat welcome slot", async () => {
    installHost();
    await import("../src/index");
    expect(renderSlot).toHaveBeenCalledTimes(1);
    expect(renderSlot.mock.calls[0]![0]).toBe("qwenpaw-startup-page");
    expect(typeof renderSlot.mock.calls[0]![1]).toBe("function");
    expect(document.getElementById("qpst-styles")).not.toBeNull();
  });

  it("stays out of the way once this tab has launched", async () => {
    installHost({ launched: true });
    await import("../src/index");
    expect(renderSlot).not.toHaveBeenCalled();
    expect(document.getElementById("qpst-styles")).toBeNull();
  });

  it("does nothing when the host has no chat welcome slot", async () => {
    (window as unknown as { QwenPaw: unknown }).QwenPaw = { host: { React: {} } };
    await import("../src/index");
    expect(renderSlot).not.toHaveBeenCalled();
  });

  it("hands the slot back to the host when there is nothing to choose", async () => {
    installHost();
    await import("../src/index");
    const dispose = renderSlot.mock.results[0]!.value.dispose;

    const element = renderSlot.mock.calls[0]![1]({}) as {
      props: { onSkip: () => void };
    };
    element.props.onSkip();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(document.getElementById("qpst-styles")).toBeNull();
  });
});
