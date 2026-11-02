import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const renderSlot = vi.fn(
  (_pluginId: string, _value: (props: Record<string, unknown>) => unknown) => ({
    dispose: vi.fn(),
  }),
);

const LAUNCHED_KEY = "qwenpaw-startup-page:launched";

let entry: { dispose: () => void } | undefined;

function installHost(options: { launched?: boolean } = {}): void {
  if (options.launched) {
    window.sessionStorage.setItem(LAUNCHED_KEY, "1");
  }
  (window as unknown as { QwenPaw: unknown }).QwenPaw = {
    host: { React },
    chat: { welcome: { render: renderSlot } },
  };
}

async function loadEntry(): Promise<void> {
  entry = (await import("../src/index")) as { dispose: () => void };
}

describe("plugin entry", () => {
  beforeEach(() => {
    entry?.dispose();
    entry = undefined;
    vi.resetModules();
    renderSlot.mockClear();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("registers the startup page in the chat welcome slot", async () => {
    installHost();
    await loadEntry();
    expect(renderSlot).toHaveBeenCalledTimes(1);
    expect(renderSlot.mock.calls[0]![0]).toBe("qwenpaw-startup-page");
    expect(typeof renderSlot.mock.calls[0]![1]).toBe("function");
    expect(document.getElementById("qpst-styles")).not.toBeNull();
  });

  it("stays out of the way for the conversation a launch opened", async () => {
    installHost({ launched: true });
    await loadEntry();
    expect(renderSlot).not.toHaveBeenCalled();
    expect(document.getElementById("qpst-styles")).toBeNull();
  });

  it("does nothing when the host has no chat welcome slot", async () => {
    (window as unknown as { QwenPaw: unknown }).QwenPaw = { host: { React: {} } };
    await loadEntry();
    expect(renderSlot).not.toHaveBeenCalled();
  });

  it("comes back for the next new chat requested from the chat page", async () => {
    installHost({ launched: true });
    window.history.replaceState({}, "", "/chat");
    await loadEntry();
    expect(renderSlot).not.toHaveBeenCalled();

    window.dispatchEvent(new CustomEvent("qwenpaw:sidebar-new-chat"));

    expect(renderSlot).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(LAUNCHED_KEY)).toBeNull();
  });

  it("comes back for a new chat requested from another page", async () => {
    vi.useFakeTimers();
    try {
      installHost({ launched: true });
      window.history.replaceState({}, "", "/chat");
      await loadEntry();
      expect(renderSlot).not.toHaveBeenCalled();

      window.history.replaceState({}, "", "/settings");
      vi.advanceTimersByTime(600);
      expect(renderSlot).not.toHaveBeenCalled();

      window.history.replaceState({}, "", "/chat");
      vi.advanceTimersByTime(600);
      expect(renderSlot).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("hands the slot back to the host when there is nothing to choose", async () => {
    installHost();
    await loadEntry();
    const dispose = renderSlot.mock.results[0]!.value.dispose;

    const element = renderSlot.mock.calls[0]![1]({}) as {
      props: { onSkip: () => void };
    };
    element.props.onSkip();

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(document.getElementById("qpst-styles")).toBeNull();
  });
});
