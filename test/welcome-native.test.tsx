import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { StartupWelcome } from "../src/StartupWelcome";

const agents = [
  { id: "default", name: "默认智能体", description: "处理日常问答" },
  { id: "ops", name: "运维值班", description: "日志与告警排查" },
];

function installHost(extra: Record<string, unknown> = {}): void {
  (window as unknown as { QwenPaw: unknown }).QwenPaw = {
    host: {
      React,
      fetch: async () => ({ ok: true, status: 200, json: async () => ({ agents }) }),
      ...extra,
    },
  };
}

describe("StartupWelcome native integration", () => {
  it("reuses the host avatar image", async () => {
    installHost();
    const { container } = render(
      <StartupWelcome
        hostProps={{ avatar: "/qwenpaw.png" }}
        onSkip={vi.fn()}
        launchImpl={() => ({ ok: true })}
      />,
    );
    expect(container.querySelector('img[src="/qwenpaw.png"]')).not.toBeNull();
    await screen.findByText("默认智能体");
  });

  it("falls back to the Q monogram without a host avatar", async () => {
    installHost();
    const { container } = render(
      <StartupWelcome onSkip={vi.fn()} launchImpl={() => ({ ok: true })} />,
    );
    expect(container.querySelector(".qpst-brand")?.textContent).toBe("Q");
    await screen.findByText("默认智能体");
  });

  it("takes the language from host.useLocale instead of localStorage", async () => {
    window.localStorage.setItem("language", "zh-CN");
    installHost({ useLocale: () => "en-US" });
    render(<StartupWelcome onSkip={vi.fn()} launchImpl={() => ({ ok: true })} />);
    expect(
      await screen.findByText("Who are we working with today?"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start chat" })).toBeTruthy();
  });

  it("marks the host's selected agent as current", async () => {
    window.sessionStorage.clear();
    installHost({ useSelectedAgent: () => ({ id: "ops" }) });
    render(<StartupWelcome onSkip={vi.fn()} launchImpl={() => ({ ok: true })} />);
    await screen.findByText("运维值班");
    expect(
      screen.getByText("运维值班").closest(".qpst-card")!.getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
    expect(screen.getByText("当前")).toBeTruthy();
  });

  it("keeps the launch button disabled until the list arrives", async () => {
    installHost();
    render(<StartupWelcome onSkip={vi.fn()} launchImpl={() => ({ ok: true })} />);
    const button = screen.getByRole("button", { name: /启动对话/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await screen.findByText("默认智能体");
    await waitFor(() => expect(button.disabled).toBe(false));
  });
});
