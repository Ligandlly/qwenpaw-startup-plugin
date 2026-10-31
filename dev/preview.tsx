/**
 * Dev-only harness: renders the real StartupWelcome on a page that copies the
 * console's chat layout, so the plugin can be looked at without booting the
 * backend. Build it with `npm run preview`, then open .preview/index.html
 * (append `?theme=dark` for the dark variant).
 */
import * as React from "react";
import { createRoot } from "react-dom/client";

import { StartupWelcome } from "../src/StartupWelcome";
import { injectStyles } from "../src/styles";

const AGENTS = [
  {
    id: "default",
    name: "默认智能体",
    description: "通用助手，日常问答与文档整理",
  },
  {
    id: "ops",
    name: "运维值班",
    description: "日志检索、告警排查与发布核对",
  },
  {
    id: "data",
    name: "数据分析师",
    description: "SQL 取数、指标口径与看板解释",
  },
  {
    id: "writer",
    name: "文案助手",
    description: "把要点写成可直接发送的邮件与说明",
  },
  {
    id: "off",
    name: "内测智能体",
    description: "尚未开放使用",
    enabled: false,
  },
];

const params = new URLSearchParams(window.location.search);
const theme = params.get("theme") === "dark" ? "dark" : "light";
const locale = params.get("lang") === "en" ? "en-US" : "zh-CN";

if (theme === "dark") document.documentElement.classList.add("dark-mode");

interface FakeResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

(window as unknown as { QwenPaw: unknown }).QwenPaw = {
  host: {
    React,
    useTheme: () => theme,
    useLocale: () => locale,
    useSelectedAgent: () => ({ id: "data" }),
    fetch: async (): Promise<FakeResponse> => ({
      ok: true,
      status: 200,
      json: async () => ({ agents: AGENTS }),
    }),
  },
};

injectStyles();

function Preview() {
  return (
    <div className="app">
      <main className="chat">
        <StartupWelcome
          hostProps={{ avatar: "qwenpaw.png" }}
          onSkip={() => console.log("skip → host welcome")}
          launchImpl={(agentId) => {
            console.log("launch", agentId);
            return { ok: true };
          }}
        />
      </main>
      <footer className="composer">
        <div className="composer-box">
          <span className="composer-placeholder">
            发消息给智能体，@ 引用文件…
          </span>
          <span className="composer-send" aria-hidden="true">
            ↑
          </span>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Preview />);

// The real console page fills the viewport; keep the harness honest about it.
document.getElementById("root")!.style.minHeight = "100vh";
