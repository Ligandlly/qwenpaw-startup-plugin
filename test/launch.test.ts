import { describe, expect, it, vi } from "vitest";

import { AGENT_STORAGE_KEY, LAUNCHED_FLAG_KEY, LAST_USED_AGENT_KEY, PENDING_NEW_CHAT_KEY } from "../src/constants";
import { isLaunched, launchAgent, markLaunched, withSelectedAgent } from "../src/launch";

describe("withSelectedAgent", () => {
  it("keeps every other persisted field", () => {
    const raw = JSON.stringify({
      state: {
        selectedAgent: "old",
        agents: [{ id: "a" }],
        lastChatIdByAgent: { old: "s1" },
      },
      version: 3,
    });

    expect(JSON.parse(withSelectedAgent(raw, "new"))).toEqual({
      state: {
        selectedAgent: "new",
        agents: [{ id: "a" }],
        lastChatIdByAgent: { old: "s1" },
      },
      version: 3,
    });
  });

  it("rebuilds a fresh object when the stored value is not JSON", () => {
    expect(JSON.parse(withSelectedAgent("{not json", "new"))).toEqual({
      state: { selectedAgent: "new" },
      version: 0,
    });
  });

  it("rebuilds when the stored value has no state", () => {
    expect(JSON.parse(withSelectedAgent('"oops"', "new"))).toEqual({
      state: { selectedAgent: "new" },
      version: 0,
    });
  });

  it("handles a missing value", () => {
    expect(JSON.parse(withSelectedAgent(null, "new"))).toEqual({
      state: { selectedAgent: "new" },
      version: 0,
    });
  });
});

describe("launch flag", () => {
  it("is false until marked", () => {
    expect(isLaunched(window.sessionStorage)).toBe(false);
    markLaunched(window.sessionStorage);
    expect(isLaunched(window.sessionStorage)).toBe(true);
    expect(window.sessionStorage.getItem(LAUNCHED_FLAG_KEY)).toBe("1");
  });

  it("is false when storage throws", () => {
    const storage = {
      getItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    expect(isLaunched(storage)).toBe(false);
  });
});

describe("launchAgent", () => {
  it("writes the agent, the pending-new-chat flag and then navigates", () => {
    const raw = JSON.stringify({
      state: { selectedAgent: "old", agents: [{ id: "a" }] },
    });
    window.sessionStorage.setItem(AGENT_STORAGE_KEY, raw);
    window.localStorage.setItem(AGENT_STORAGE_KEY, raw);
    const navigate = vi.fn();

    const result = launchAgent("target", {
      sessionStorage: window.sessionStorage,
      localStorage: window.localStorage,
      navigate,
    });

    expect(result).toEqual({ ok: true });
    expect(JSON.parse(window.sessionStorage.getItem(AGENT_STORAGE_KEY)!)).toEqual({
      state: { selectedAgent: "target", agents: [{ id: "a" }] },
    });
    expect(window.localStorage.getItem(LAST_USED_AGENT_KEY)).toBe("target");
    expect(
      JSON.parse(window.localStorage.getItem(AGENT_STORAGE_KEY)!).state
        .selectedAgent,
    ).toBe("target");
    expect(window.sessionStorage.getItem(PENDING_NEW_CHAT_KEY)).toBe("1");
    expect(isLaunched(window.sessionStorage)).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/chat");
  });

  it("rebuilds a fresh session object when the tab has no stored state", () => {
    const navigate = vi.fn();
    launchAgent("target", {
      sessionStorage: window.sessionStorage,
      localStorage: window.localStorage,
      navigate,
    });
    expect(JSON.parse(window.sessionStorage.getItem(AGENT_STORAGE_KEY)!)).toEqual({
      state: { selectedAgent: "target" },
      version: 0,
    });
    expect(navigate).toHaveBeenCalledWith("/chat");
  });

  it("does not invent a shared localStorage state when none exists", () => {
    launchAgent("target", {
      sessionStorage: window.sessionStorage,
      localStorage: window.localStorage,
      navigate: () => {},
    });
    expect(window.localStorage.getItem(AGENT_STORAGE_KEY)).toBeNull();
  });

  it("reports a storage failure without navigating", () => {
    const navigate = vi.fn();
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    } as unknown as Storage;

    const result = launchAgent("target", {
      sessionStorage: storage,
      localStorage: window.localStorage,
      navigate,
    });

    expect(result).toEqual({ ok: false, error: "storage" });
    expect(navigate).not.toHaveBeenCalled();
    expect(isLaunched(window.sessionStorage)).toBe(false);
  });
});
