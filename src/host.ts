import type * as ReactNS from "react";

import { AGENT_STORAGE_KEY } from "./constants";

/**
 * The slice of `window.QwenPaw.host` this plugin uses. Everything is optional
 * except React: the Console owns React, the plugin never bundles it.
 */
export interface HostExternals {
  React: typeof ReactNS;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ReactDOM?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  antd?: any;
  apiBaseUrl?: string;
  getApiUrl?: (path: string) => string;
  getApiToken?: () => string | null;
  useTheme?: () => "light" | "dark";
  useLocale?: () => string;
  useSelectedAgent?: () => { id: string };
  getSelectedAgentId?: () => string;
  getCurrentSessionId?: () => string | null;
  fetch?: (path: string, init?: RequestInit) => Promise<Response>;
}

export interface QwenPawGlobal {
  host: HostExternals;
  chat?: {
    welcome?: {
      render?: (pluginId: string, value: unknown) => { dispose: () => void };
    };
  };
}

declare global {
  interface Window {
    QwenPaw?: QwenPawGlobal;
  }
}

/**
 * Resolved lazily: unit tests (and a plugin loaded before the host bridge is
 * ready) must not crash at import time.
 */
export function getHost(): HostExternals | null {
  return window.QwenPaw?.host ?? null;
}

export function getReact(): typeof ReactNS | null {
  return getHost()?.React ?? null;
}

/** The console's own antd instance — used for native buttons and avatars. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAntd(): any {
  return getHost()?.antd ?? null;
}

/**
 * Host hooks must be called during render, so they are looked up once per
 * render rather than called through `getHost()` deep inside effects.
 */
export function getUseLocale(): (() => string) | null {
  const hook = getHost()?.useLocale;
  return typeof hook === "function" ? hook : null;
}

export function getUseTheme(): (() => "light" | "dark") | null {
  const hook = getHost()?.useTheme;
  return typeof hook === "function" ? hook : null;
}

export function getUseSelectedAgent(): (() => { id: string }) | null {
  const hook = getHost()?.useSelectedAgent;
  return typeof hook === "function" ? hook : null;
}

/** `agentStore` writes this key per tab and shares it across tabs. */
export function readSelectedAgentId(): string {
  try {
    const raw =
      window.sessionStorage.getItem(AGENT_STORAGE_KEY) ??
      window.localStorage.getItem(AGENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const selected = parsed?.state?.selectedAgent;
      if (typeof selected === "string" && selected) return selected;
    }
  } catch {
    /* fall through to the host accessor */
  }
  try {
    return getHost()?.getSelectedAgentId?.() ?? "default";
  } catch {
    return "default";
  }
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const host = getHost();
  try {
    const token = host?.getApiToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    /* ignore */
  }
  const agent = readSelectedAgentId();
  if (agent) headers["X-Agent-Id"] = agent;
  return headers;
}

/** Prefer the host's authenticated fetch; fall back to a raw one. */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const host = getHost();
  const headers = new Headers(init.headers ?? {});
  for (const [key, value] of Object.entries(authHeaders())) {
    if (!headers.has(key)) headers.set(key, value);
  }
  if (host?.fetch) {
    return host.fetch(path, { ...init, headers });
  }
  const url = host?.getApiUrl
    ? host.getApiUrl(path)
    : `${host?.apiBaseUrl ?? ""}${path}`;
  return globalThis.fetch(url, { ...init, headers });
}
